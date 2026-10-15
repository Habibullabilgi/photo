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

  // Layers list - empty by default so no floating boxes or text appear
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

  // Upload Custom Image: Completely clean image without any unwanted text/boxes
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
        // Clear all layers so no boxes or misplaced text appear on canvas
        setLayers([]);
        setSelectedLayerId(null);
        setViewMode('editor');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const triggerOcrScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 1000);
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
