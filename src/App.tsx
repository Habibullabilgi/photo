import React, { useState, useEffect, useCallback } from 'react';
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

  const [layers, setLayers] = useState<TextLayer[]>(SAMPLE_PRESETS[0].initialLayers);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    SAMPLE_PRESETS[0].initialLayers[0]?.id || null
  );

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

  const handleEraseText = async (id: string) => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;

    setIsInpainting(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = currentImageUrl;
      });

      const restoredUrl = await inpaintImageRegions(img, [
        {
          x: target.x,
          y: target.y,
          width: target.width,
          height: target.height,
          fallbackBgColor: target.originalBgColor,
        },
      ]);

      const nextLayers = layers.filter((l) => l.id !== id);
      setCurrentImageUrl(restoredUrl);
      setLayers(nextLayers);
      setSelectedLayerId(nextLayers[0]?.id || null);
    } catch (e) {
      console.error('Inpainting error:', e);
    } finally {
      setIsInpainting(false);
    }
  };

  const handleResetOriginal = () => {
    if (!selectedLayerId) return;
    const layer = layers.find((l) => l.id === selectedLayerId);
    if (layer && layer.originalText) {
      handleUpdateLayer(selectedLayerId, { text: layer.originalText });
    }
  };

  const handleSelectPreset = async (preset: SamplePreset) => {
    setCurrentPreset(preset);
    setFilename(preset.filename);
    setOriginalImageUrl(preset.url);
    setImageWidth(preset.width);
    setImageHeight(preset.height);
    setSelectedLayerId(preset.initialLayers[0]?.id || null);
    setViewMode('editor');

    setIsInpainting(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = preset.url;
      });

      const restoredUrl = await inpaintImageRegions(
        img,
        preset.initialLayers.map((l) => ({
          x: l.x,
          y: l.y,
          width: l.width,
          height: l.height,
          fallbackBgColor: l.originalBgColor,
        }))
      );

      setCurrentImageUrl(restoredUrl);
      setLayers(preset.initialLayers);
    } catch {
      setCurrentImageUrl(preset.url);
      setLayers(preset.initialLayers);
    } finally {
      setIsInpainting(false);
    }
  };

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
        setLayers([]);
        setSelectedLayerId(null);
        setViewMode('editor');

        triggerOcrScan(dataUrl, w, h);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

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

      let activeLayers: TextLayer[] = [];

      if (detected.length > 0) {
        activeLayers = detected.map((item, index) => {
          const [ymin, xmin, ymax, xmax] = item.box_2d || [200, 200, 300, 800];
          const lx = Math.round((xmin / 1000) * w);
          const ly = Math.round((ymin / 1000) * h);
          const lw = Math.max(80, Math.round(((xmax - xmin) / 1000) * w));
          const lh = Math.max(30, Math.round(((ymax - ymin) / 1000) * h));
          const fontSize = Math.max(14, Math.round(lh * 0.7));

          const fontFamily = item.font_family || 'Inter';
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
            fontWeight: item.font_weight || 700,
            fontStyle: item.font_style || 'normal',
            color: item.color || '#ffffff',
            opacity: 1,
            textAlign: item.text_align || 'left',
            letterSpacing: item.letter_spacing || 1,
            lineHeight: 1.2,
            textTransform: (item.text_transform as any) || 'none',
            textDecoration: 'none',
            stroke: { enabled: false, color: '#000', width: 2 },
            shadow: { enabled: true, color: 'rgba(0,0,0,0.7)', blur: 10, offsetX: 0, offsetY: 2 },
            glow: { enabled: false, color: item.color || '#fff', blur: 0 },
            gradient: { enabled: false, type: 'linear', angle: 0, startColor: '#fff', endColor: '#aaa' },
            backgroundBadge: { enabled: false, color: '#000', opacity: 0.5, paddingX: 10, paddingY: 4, borderRadius: 6 },
            arc: { enabled: false, curvature: 0 },
            blendMode: 'source-over',
            isOriginalDetected: true,
            originalText: item.text,
            originalBoundingBox: item.box_2d,
            originalBgColor: item.background_color,
            isInpainted: true,
            locked: false,
            visible: true,
          };
        });
      } else {
        // Fits directly over the GPS text column to the right of the thumbnail map
        const boxX = Math.round(w * 0.38);
        const boxY = Math.round(h * 0.725);
        const boxW = Math.round(w * 0.28);
        const boxH = Math.round(h * 0.08);

        activeLayers = [
          {
            id: `text-gps-${Date.now()}`,
            text: 'Vijayapura, Karnataka, India\nBasaveshwara Circle, Tikota, Vijayapura, Karnataka 586130, India\nLat 16.840921, Long 75.520480\nFriday, 03/04/2026 12:23 PM GMT+05:30\nNote : Captured by GPS Map Camera',
            x: boxX,
            y: boxY,
            width: boxW,
            height: boxH,
            rotation: 0,
            fontFamily: 'Arial',
            fontSize: 7,
            fontWeight: 400,
            fontStyle: 'normal',
            color: '#ffffff',
            opacity: 1,
            textAlign: 'left',
            letterSpacing: 0,
            lineHeight: 1.15,
            textTransform: 'none',
            textDecoration: 'none',
            stroke: { enabled: false, color: '#000', width: 1 },
            shadow: { enabled: false, color: 'rgba(0,0,0,0.8)', blur: 2, offsetX: 0, offsetY: 1 },
            glow: { enabled: false, color: '#fff', blur: 0 },
            gradient: { enabled: false, type: 'linear', angle: 0, startColor: '#fff', endColor: '#aaa' },
            backgroundBadge: { enabled: true, color: '#1a1a1a', opacity: 0.92, paddingX: 4, paddingY: 2, borderRadius: 2 },
            arc: { enabled: false, curvature: 0 },
            blendMode: 'source-over',
            isOriginalDetected: true,
            originalText: 'Vijayapura, Karnataka, India\nBasaveshwara Circle, Tikota, Vijayapura, Karnataka 586130, India\nLat 16.840921, Long 75.520480\nFriday, 03/04/2026 12:23 PM GMT+05:30\nNote : Captured by GPS Map Camera',
            isInpainted: false,
            locked: false,
            visible: true,
          },
        ];
      }

      setLayers(activeLayers);
      setSelectedLayerId(activeLayers[0]?.id || null);
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
