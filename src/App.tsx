import React, { useState, useEffect } from 'react';
import { LandingView } from './components/LandingView';
import { StudioEditor } from './components/StudioEditor';
import { ExportModal } from './components/ExportModal';
import { TextLayer, DetectedTextResponse } from './types';
import { SAMPLE_PRESETS, SamplePreset } from './utils/sampleImages';
import { inpaintImageRegions } from './utils/inpainter';
import { ensureFontLoaded } from './utils/fonts';

export default function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'editor'>('landing');

  const [currentPreset, setCurrentPreset] = useState<SamplePreset>(SAMPLE_PRESETS[0]);
  const [filename, setFilename] = useState<string>(SAMPLE_PRESETS[0].filename);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>(SAMPLE_PRESETS[0].url);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(SAMPLE_PRESETS[0].url);
  const [imageWidth, setImageWidth] = useState<number>(SAMPLE_PRESETS[0].width);
  const [imageHeight, setImageHeight] = useState<number>(SAMPLE_PRESETS[0].height);

  // Layers list - start completely empty for uploaded photos
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isInpainting, setIsInpainting] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  useEffect(() => {
    layers.forEach((l) => ensureFontLoaded(l.fontFamily));
  }, [layers]);

  const handleUpdateLayer = (id: string, updated: Partial<TextLayer>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updated } : l))
    );
  };

  // Erase or delete selected layer
  const handleEraseText = async (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setSelectedLayerId(null);
  };

  const handleResetOriginal = () => {
    if (!selectedLayerId) return;
    const layer = layers.find((l) => l.id === selectedLayerId);
    if (layer && layer.originalText) {
      handleUpdateLayer(selectedLayerId, { text: layer.originalText });
    }
  };

  // Preset Selection
  const handleSelectPreset = async (preset: SamplePreset) => {
    setCurrentPreset(preset);
    setFilename(preset.filename);
    setOriginalImageUrl(preset.url);
    setCurrentImageUrl(preset.url);
    setImageWidth(preset.width);
    setImageHeight(preset.height);
    setLayers(preset.initialLayers);
    setSelectedLayerId(preset.initialLayers[0]?.id || null);
    setViewMode('editor');
  };

  // Upload Custom Image: Cleans out ALL layers and boxes completely
  const handleUploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 1200;
        const h = img.naturalHeight || 800;
        setImageWidth(w);
        setImageHeight(h);
        setOriginalImageUrl(dataUrl);
        setCurrentImageUrl(dataUrl);
        setFilename(file.name || 'image.png');
        // REMOVED ALL FLOATING FALLBACK LAYERS:
        setLayers([]);
        setSelectedLayerId(null);
        setViewMode('editor');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Scan text present in the image
  const triggerOcrScan = async (imgDataUrl?: string, customW?: number, customH?: number) => {
    const targetUrl = imgDataUrl || currentImageUrl;
    const w = customW || imageWidth;
    const h = customH || imageHeight;

    setIsScanning(true);
    try {
      let base64 = targetUrl;
      if (targetUrl.startsWith('http')) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = targetUrl;
        });
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || 1200;
        c.height = img.naturalHeight || 800;
        const ctx = c.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        base64 = c.toDataURL('image/jpeg', 0.85);
      }

      let detected: DetectedTextResponse[] = [];
      try {
        const res = await fetch('/api/detect-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const data = await res.json();
        detected = data.detectedTexts || [];
      } catch (err) {
        console.warn('Backend API endpoint not available.');
      }

      if (detected.length > 0) {
        const activeLayers: TextLayer[] = detected.map((item, index) => {
          const [ymin, xmin, ymax, xmax] = item.box_2d || [200, 200, 300, 800];
          const lx = Math.round((xmin / 1000) * w);
          const ly = Math.round((ymin / 1000) * h);
          const lw = Math.max(80, Math.round(((xmax - xmin) / 1000) * w));
          const lh = Math.max(30, Math.round(((ymax - ymin) / 1000) * h));
          const fontSize = Math.max(14, Math.round(lh * 0.7));

          const fontFamily = item.font_family || 'Arial';
          ensureFontLoaded(fontFamily);

          return {
            id: `text-${index}-${Date.now()}`,
            text: item.text,
            x: lx,
            y: ly,
            width: lw,
            height: lh,
            rotation: item.rotation || 0,
            fontFamily,
            fontSize,
            fontWeight: item.font_weight || 500,
            fontStyle: item.font_style || 'normal',
            color: item.color || '#ffffff',
            opacity: 1,
            textAlign: item.text_align || 'left',
            letterSpacing: item.letter_spacing || 0,
            lineHeight: 1.2,
            textTransform: (item.text_transform as any) || 'none',
            textDecoration: 'none',
            stroke: { enabled: false, color: '#000', width: 1 },
            shadow: { enabled: true, color: 'rgba(0,0,0,0.85)', blur: 2, offsetX: 0, offsetY: 1 },
            glow: { enabled: false, color: '#fff', blur: 0 },
            gradient: { enabled: false, type: 'linear', angle: 0, startColor: '#fff', endColor: '#aaa' },
            backgroundBadge: { enabled: false, color: '#000000', opacity: 0, paddingX: 0, paddingY: 0, borderRadius: 0 },
            arc: { enabled: false, curvature: 0 },
            blendMode: 'source-over',
            isOriginalDetected: true,
            originalText: item.text,
            originalBoundingBox: item.box_2d,
            originalBgColor: item.background_color,
            isInpainted: false,
            locked: false,
            visible: true,
          };
        });

        setLayers(activeLayers);
        setSelectedLayerId(activeLayers[0]?.id || null);
      } else {
        // If nothing detected, keep layers completely empty so no weird boxes appear!
        setLayers([]);
        setSelectedLayerId(null);
      }
    } catch (e) {
      console.error('Scan text failed:', e);
    } finally {
      setIsScanning(false);
      setIsInpainting(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#fafbfc]">
      {viewMode === 'landing' ? (
        <LandingView
          onSelectPreset={handleSelectPreset}
          onUploadImage={handleUploadImage}
        />
      ) : (
        <StudioEditor
          filename={filename}
          imageUrl={currentImageUrl}
          originalImageUrl={originalImageUrl}
          width={imageWidth}
          height={imageHeight}
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onUpdateLayer={handleUpdateLayer}
          onEraseText={handleEraseText}
          onResetOriginal={handleResetOriginal}
          onOpenExport={() => setIsExportModalOpen(true)}
          onBackToHome={() => setViewMode('landing')}
          onSelectPreset={handleSelectPreset}
          onUploadImage={handleUploadImage}
          onScanText={() => triggerOcrScan()}
          isScanning={isScanning}
          isInpainting={isInpainting}
        />
      )}

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        backgroundImageUrl={currentImageUrl}
        width={imageWidth}
        height={imageHeight}
        layers={layers}
      />
    </div>
  );
}
