import React, { useState, useEffect } from 'react';
import { LandingView } from './components/LandingView';
import { StudioEditor } from './components/StudioEditor';
import { ExportModal } from './components/ExportModal';
import { TextLayer } from './types';
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

  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isInpainting, setIsInpainting] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  useEffect(() => {
    layers.forEach((l) => ensureFontLoaded(l.fontFamily));
  }, [layers]);

  // Direct pixel replacement: inpaint the original text beneath when altered
  const handleUpdateLayer = async (id: string, updated: Partial<TextLayer>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updated } : l))
    );

    const target = layers.find((l) => l.id === id);
    if (target && !target.isInpainted && updated.text !== undefined && updated.text !== target.originalText) {
      setIsInpainting(true);
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = currentImageUrl;
        });

        const cleanedUrl = await inpaintImageRegions(img, [
          {
            x: target.x,
            y: target.y,
            width: target.width,
            height: target.height,
            fallbackBgColor: target.originalBgColor || '#14171b',
          },
        ]);

        setCurrentImageUrl(cleanedUrl);
        setLayers((prev) =>
          prev.map((l) => (l.id === id ? { ...l, isInpainted: true } : l))
        );
      } catch (err) {
        console.error('Inpaint error:', err);
      } finally {
        setIsInpainting(false);
      }
    }
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
          fallbackBgColor: target.originalBgColor || '#14171b',
        },
      ]);

      setCurrentImageUrl(restoredUrl);
      setLayers((prev) => prev.filter((l) => l.id !== id));
      setSelectedLayerId(null);
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
    setCurrentImageUrl(preset.url);
    setImageWidth(preset.width);
    setImageHeight(preset.height);
    setLayers(preset.initialLayers);
    setSelectedLayerId(preset.initialLayers[0]?.id || null);
    setViewMode('editor');
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
        setIsScanning(true);

        // Laser scan animation simulation matching PhoText.ai
        setTimeout(() => {
          setIsScanning(false);

          // Lines detected specifically on the GPS watermark card
          const detectedItems = [
            { text: 'Vijayapura, Karnataka, India', relY: 0.772, relH: 0.028, fontSize: 8.5, fontWeight: 600 },
            { text: 'Basaveshwara Circle, Tikota, Vijayapura, Karnataka 586130, India', relY: 0.804, relH: 0.028, fontSize: 7.5, fontWeight: 400 },
            { text: 'Lat 16.840921, Long 75.520480', relY: 0.836, relH: 0.025, fontSize: 7.5, fontWeight: 400 },
            { text: 'Friday, 03/04/2026 12:23 PM GMT+05:30', relY: 0.864, relH: 0.028, fontSize: 7.5, fontWeight: 400 },
            { text: 'Note : Captured by GPS Map Camera', relY: 0.895, relH: 0.028, fontSize: 7.5, fontWeight: 400 },
          ];

          const lineLayers: TextLayer[] = detectedItems.map((item, idx) => ({
            id: `line-${idx}-${Date.now()}`,
            text: item.text,
            x: Math.round(w * 0.246),
            y: Math.round(h * item.relY),
            width: Math.round(w * 0.380),
            height: Math.round(h * item.relH),
            rotation: 0,
            fontFamily: 'Arial',
            fontSize: item.fontSize,
            fontWeight: item.fontWeight,
            fontStyle: 'normal',
            color: '#ffffff',
            opacity: 1,
            textAlign: 'left',
            letterSpacing: 0,
            lineHeight: 1.2,
            textTransform: 'none',
            textDecoration: 'none',
            stroke: { enabled: false, color: '#000', width: 0 },
            shadow: { enabled: true, color: 'rgba(0,0,0,0.85)', blur: 2, offsetX: 0, offsetY: 1 },
            glow: { enabled: false, color: '#fff', blur: 0 },
            gradient: { enabled: false, type: 'linear', angle: 0, startColor: '#fff', endColor: '#aaa' },
            backgroundBadge: { enabled: false, color: '#16191d', opacity: 0, paddingX: 0, paddingY: 0, borderRadius: 0 },
            arc: { enabled: false, curvature: 0 },
            blendMode: 'source-over',
            isOriginalDetected: true,
            originalText: item.text,
            isInpainted: false,
            locked: false,
            visible: true,
          }));

          setLayers(lineLayers);
          setSelectedLayerId(lineLayers[0].id);
        }, 2000);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const triggerOcrScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      if (layers.length > 0) {
        setSelectedLayerId(layers[0].id);
      }
    }, 1200);
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
          onScanText={triggerOcrScan}
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
