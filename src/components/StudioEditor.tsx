import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  ChevronDown,
  Sparkles,
  Sliders,
  Eraser,
  Plus,
  Wand2,
  Type,
  Bot,
  Keyboard,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  SplitSquareVertical,
  Pipette,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TextLayer } from '../types';
import { ensureFontLoaded } from '../utils/fonts';
import { SAMPLE_PRESETS, SamplePreset } from '../utils/sampleImages';

interface StudioEditorProps {
  filename: string;
  imageUrl: string;
  originalImageUrl: string;
  width: number;
  height: number;
  layers: TextLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, updated: Partial<TextLayer>) => void;
  onEraseText: (id: string) => void;
  onResetOriginal: () => void;
  onOpenExport: () => void;
  onBackToHome: () => void;
  onSelectPreset: (preset: SamplePreset) => void;
  onUploadImage: (file: File) => void;
  onScanText: () => void;
  isScanning: boolean;
  isInpainting: boolean;
}

export const StudioEditor: React.FC<StudioEditorProps> = ({
  filename,
  imageUrl,
  originalImageUrl,
  width,
  height,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onEraseText,
  onResetOriginal,
  onOpenExport,
  onBackToHome,
  onSelectPreset,
  onUploadImage,
  onScanText,
  isScanning,
  isInpainting,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zoom & Pan
  const [zoom, setZoom] = useState<number>(0.65);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging & Resizing Box on Canvas
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [isResizingLayer, setIsResizingLayer] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Manual Drawing of Selection Area
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  // Compare mode
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // Tools & tabs
  const [activeTool, setActiveTool] = useState<string>('text');
  const [fontCategory, setFontCategory] = useState<string>('Local Fonts');

  // Accordions
  const [openSections, setOpenSections] = useState<{
    position: boolean;
    original: boolean;
    shadow: boolean;
    effect: boolean;
  }>({
    position: false,
    original: false,
    shadow: false,
    effect: false,
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || layers[0] || null;

  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth > 0 && clientHeight > 0 && width > 0 && height > 0) {
      const padding = 100;
      const fitZoom = Math.min(
        (clientWidth - padding) / width,
        (clientHeight - padding) / height
      );
      setZoom(Math.max(0.2, Math.min(1, Number(fitZoom.toFixed(2)))));
      setPan({ x: 0, y: 0 });
    }
  }, [width, height]);

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(2.5, Math.max(0.2, Number((prev + delta).toFixed(2)))));
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getImageCoordinates = (e: React.MouseEvent) => {
    if (!imageContainerRef.current) return { x: 0, y: 0 };
    const rect = imageContainerRef.current.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) / zoom),
      y: Math.round((e.clientY - rect.top) / zoom),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.target === containerRef.current && e.shiftKey)) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Click on canvas background to start drawing a selection box
    if (imageContainerRef.current && (e.target === imageContainerRef.current || (e.target as HTMLElement).tagName === 'IMG')) {
      const coords = getImageCoordinates(e);
      setIsDrawingSelection(true);
      setDrawStart(coords);

      if (selectedLayer) {
        onUpdateLayer(selectedLayer.id, {
          x: coords.x,
          y: coords.y,
          width: 10,
          height: 10,
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }

    if (isDraggingSplit && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percent = Math.max(5, Math.min(95, (relativeX / rect.width) * 100));
      setSplitPos(percent);
    }

    // Drawing new selection box by dragging
    if (isDrawingSelection && drawStart && selectedLayer) {
      const coords = getImageCoordinates(e);
      const newX = Math.min(drawStart.x, coords.x);
      const newY = Math.min(drawStart.y, coords.y);
      const newW = Math.max(20, Math.abs(coords.x - drawStart.x));
      const newH = Math.max(20, Math.abs(coords.y - drawStart.y));

      onUpdateLayer(selectedLayer.id, {
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
    }

    // Moving existing box
    if (isDraggingLayer && selectedLayer) {
      const coords = getImageCoordinates(e);
      onUpdateLayer(selectedLayer.id, {
        x: coords.x - dragOffset.x,
        y: coords.y - dragOffset.y,
      });
    }

    // Resizing existing box from arrow handle
    if (isResizingLayer && selectedLayer) {
      const coords = getImageCoordinates(e);
      const newW = Math.max(30, coords.x - selectedLayer.x);
      onUpdateLayer(selectedLayer.id, { width: newW });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingSplit(false);
    setIsDrawingSelection(false);
    setIsDraggingLayer(false);
    setIsResizingLayer(false);
    setDrawStart(null);
  };

  const handleEyeDropper = async () => {
    if ('EyeDropper' in window && selectedLayer) {
      try {
        // @ts-ignore
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        onUpdateLayer(selectedLayer.id, { color: result.sRGBHex });
      } catch {
        // user cancelled
      }
    }
  };

  const handleIdentifyFont = () => {
    setIsIdentifying(true);
    setTimeout(() => {
      setIsIdentifying(false);
      if (selectedLayer) {
        onUpdateLayer(selectedLayer.id, { fontFamily: 'Arial', fontWeight: 400 });
      }
    }, 600);
  };

  const FONT_PREVIEWS = [
    { name: 'Arial', family: 'Arial', sample: '0123456789,.+-' },
    { name: 'Helvetica', family: 'Helvetica', sample: '0123456789,.+-' },
    { name: 'Microsoft YaHei', family: 'Microsoft YaHei', sample: '0123456789,.+-' },
    { name: 'Calibri', family: 'Calibri', sample: '0123456789,.+-' },
    { name: 'Courier New', family: 'Courier New', sample: 'Courier New' },
    { name: 'Arial Black', family: 'Arial Black', sample: 'Arial Black' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#eef0f3] text-zinc-900 select-none overflow-hidden font-sans">
      {/* 1. Header */}
      <header className="h-13 bg-white border-b border-zinc-200 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-950 text-xs font-semibold px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-1 text-lg font-black tracking-tight text-zinc-900">
            <span>photext</span>
            <span className="text-pink-600">.ai</span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-100 text-xs font-medium text-zinc-700 transition-colors"
          >
            <span>{filename}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl p-1.5 z-50">
              <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Switch Sample Photo
              </div>
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onSelectPreset(preset);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                    filename === preset.filename
                      ? 'bg-pink-50 text-pink-600 font-semibold'
                      : 'hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <span className="truncate">{preset.name}</span>
                  {filename === preset.filename && <Check className="w-3.5 h-3.5 text-pink-600" />}
                </button>
              ))}
              <div className="h-px bg-zinc-100 my-1" />
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-zinc-700 hover:bg-zinc-100 font-medium"
              >
                + Upload New Photo
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onScanText}
            disabled={isScanning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isScanning
                ? 'bg-pink-50 text-pink-600 border-pink-200 animate-pulse'
                : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 text-pink-500 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Detecting...' : 'Scan Text in Image'}</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onUploadImage(e.target.files[0]);
              }
            }}
          />
        </div>
      </header>

      {/* 2. Main Studio Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar */}
        <aside className="w-16 bg-white border-r border-zinc-200 flex flex-col items-center py-3 select-none shrink-0 z-20">
          <div className="space-y-1 w-full px-2">
            {[
              { id: 'adjust', label: 'Adjust', icon: Sliders },
              { id: 'removal', label: 'Removal', icon: Eraser },
              { id: 'add', label: 'Add', icon: Plus },
              { id: 'effects', label: 'Effects', icon: Sparkles },
              { id: 'text', label: 'Text', icon: Type, active: true },
              { id: 'ai', label: 'AI', icon: Bot },
            ].map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id || tool.active;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-full flex flex-col items-center justify-center py-2 rounded-xl text-[10px] font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto space-y-1 w-full px-2 pt-2 border-t border-zinc-100">
            <button
              onClick={() => onScanText()}
              className="w-full flex flex-col items-center justify-center py-1.5 text-zinc-500 hover:text-zinc-900 text-[10px]"
            >
              <Keyboard className="w-4 h-4 mb-0.5" />
              <span>Scan</span>
            </button>
            <button
              onClick={onBackToHome}
              className="w-full flex flex-col items-center justify-center py-1.5 text-zinc-500 hover:text-zinc-900 text-[10px]"
            >
              <MessageSquare className="w-4 h-4 mb-0.5" />
              <span>Home</span>
            </button>
          </div>
        </aside>

        {/* Center Canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 h-full bg-[#f1f3f6] relative overflow-hidden flex items-center justify-center cursor-crosshair"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #d4d7dc 1px, transparent 0)`,
            backgroundSize: '16px 16px',
          }}
        >
          {/* Rulers */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-white border-b border-zinc-200 z-10 flex items-center pointer-events-none opacity-60">
            <div className="w-full flex justify-between px-2 font-mono text-[8px] text-zinc-400">
              <span>0</span>
              <span>200</span>
              <span>400</span>
              <span>600</span>
              <span>800</span>
              <span>1000</span>
              <span>1200</span>
            </div>
          </div>
          <div className="absolute top-0 bottom-0 left-0 w-4 bg-white border-r border-zinc-200 z-10 flex flex-col justify-between py-6 pointer-events-none opacity-60">
            <div className="h-full flex flex-col justify-between items-center font-mono text-[8px] text-zinc-400">
              <span>0</span>
              <span>200</span>
              <span>400</span>
              <span>600</span>
              <span>800</span>
            </div>
          </div>

          {/* Interactive Image & Selection Container */}
          <div
            ref={imageContainerRef}
            className="relative transition-transform duration-75 origin-center shadow-xl rounded-sm bg-white"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <img
              src={imageUrl}
              alt="Uploaded Preview"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
            />

            {/* Split comparison view */}
            {compareMode && (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none z-20"
                style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
              >
                <img
                  src={originalImageUrl}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain"
                  draggable={false}
                />
              </div>
            )}

            {/* Pink Selection Box & Interactive Overlay */}
            {layers.map((layer) => {
              if (!layer.visible || layer.isRemoved) return null;
              const isSelected = selectedLayerId === layer.id;

              return (
                <div
                  key={layer.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLayer(layer.id);
                  }}
                  onMouseDown={(e) => {
                    if (isSelected) {
                      e.stopPropagation();
                      setIsDraggingLayer(true);
                      const coords = getImageCoordinates(e);
                      setDragOffset({
                        x: coords.x - layer.x,
                        y: coords.y - layer.y,
                      });
                    }
                  }}
                  className={`absolute transition-all cursor-move ${
                    isSelected
                      ? 'border-2 border-dashed border-pink-500 z-30'
                      : 'hover:border-2 hover:border-dashed hover:border-pink-300 z-10'
                  }`}
                  style={{
                    left: `${layer.x}px`,
                    top: `${layer.y}px`,
                    width: `${layer.width}px`,
                    minHeight: `${layer.height}px`,
                    transform: `rotate(${layer.rotation}deg)`,
                    opacity: layer.opacity,
                  }}
                >
                  {/* Subtle rendering of current text value */}
                  <div
                    className="relative whitespace-pre-wrap leading-tight p-0.5 pointer-events-none"
                    style={{
                      fontFamily: `"${layer.fontFamily}", Arial, sans-serif`,
                      fontSize: `${layer.fontSize}px`,
                      fontWeight: layer.fontWeight,
                      fontStyle: layer.fontStyle,
                      color: layer.color,
                      textAlign: layer.textAlign,
                      letterSpacing: `${layer.letterSpacing}px`,
                      lineHeight: layer.lineHeight,
                      textTransform: layer.textTransform,
                      textShadow: layer.shadow.enabled
                        ? `${layer.shadow.offsetX}px ${layer.shadow.offsetY}px ${layer.shadow.blur}px ${layer.shadow.color}`
                        : 'none',
                    }}
                  >
                    {layer.text}
                  </div>

                  {/* Corner Handles and Resize Controls */}
                  {isSelected && (
                    <>
                      <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-pink-500 shadow border-2 border-white pointer-events-none" />
                      <div className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-pink-500 shadow border-2 border-white pointer-events-none" />

                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setIsResizingLayer(true);
                        }}
                        className="absolute -right-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-pink-500 font-extrabold text-xs cursor-ew-resize hover:scale-125 transition-transform"
                      >
                        ↔
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Left Compare */}
          <div className="absolute bottom-5 left-8 z-30">
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-md transition-colors ${
                compareMode
                  ? 'bg-pink-600 text-white border-pink-600'
                  : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Compare</span>
            </button>
          </div>

          {/* Bottom Right Zoom */}
          <div className="absolute bottom-5 right-8 z-30 flex items-center bg-white border border-zinc-200 rounded-lg shadow-md px-1 py-0.5 text-xs text-zinc-700">
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-12 text-center font-mono text-[11px] font-semibold text-zinc-700">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.1)}
              className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. RIGHT INSPECTOR COLUMN: Edit the Selected Text directly here */}
        <aside className="w-80 xl:w-96 bg-white border-l border-zinc-200 flex flex-col text-xs text-zinc-800 select-none overflow-hidden shrink-0 shadow-sm z-20">
          {selectedLayer ? (
            <>
              {/* Unselect / Reset */}
              <div className="p-3 border-b border-zinc-200 flex items-center justify-between">
                <button
                  onClick={() => onSelectLayer(null)}
                  className="text-zinc-500 hover:text-zinc-900 text-xs font-medium underline"
                >
                  Unselect
                </button>
                <button
                  onClick={onResetOriginal}
                  className="text-rose-600 hover:text-rose-700 text-xs font-medium underline"
                >
                  Reset
                </button>
              </div>

              {/* Editable Text Area synced with the box on the image */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <textarea
                    autoFocus
                    value={selectedLayer.text}
                    onChange={(e) => onUpdateLayer(selectedLayer.id, { text: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-medium text-xs leading-relaxed focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 resize-none shadow-xs"
                    placeholder="Type or edit text selected in image..."
                  />
                  <div className="flex justify-end mt-1">
                    <button
                      onClick={() => onEraseText(selectedLayer.id)}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-medium hover:underline flex items-center gap-1"
                    >
                      <Eraser className="w-3 h-3" />
                      <span>Erase from Image</span>
                    </button>
                  </div>
                </div>

                {/* Font Selector */}
                <div className="space-y-2.5 pt-1 border-t border-zinc-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-800 text-xs">Font</span>
                    <button
                      onClick={handleIdentifyFont}
                      disabled={isIdentifying}
                      className="text-[11px] text-zinc-600 hover:text-pink-600 flex items-center gap-1 font-medium"
                    >
                      <Wand2 className={`w-3 h-3 text-pink-500 ${isIdentifying ? 'animate-spin' : ''}`} />
                      <span>{isIdentifying ? 'Identifying...' : 'Identify font'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5 text-[11px] text-zinc-500">
                    <button className="p-0.5 hover:text-zinc-900">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {['Preset', 'Local Fonts', 'Sans Serif', 'Serif', 'Display'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFontCategory(cat)}
                        className={`px-1.5 py-0.5 rounded ${
                          fontCategory === cat
                            ? 'text-zinc-900 font-bold border-b-2 border-zinc-900'
                            : 'hover:text-zinc-900'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                    <button className="p-0.5 hover:text-zinc-900">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-0.5">
                    {FONT_PREVIEWS.map((f) => (
                      <button
                        key={f.name}
                        onClick={() => {
                          ensureFontLoaded(f.family);
                          onUpdateLayer(selectedLayer.id, { fontFamily: f.family });
                        }}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          selectedLayer.fontFamily === f.family
                            ? 'border-pink-500 bg-pink-50/40 text-pink-900 font-bold'
                            : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/30 text-zinc-700'
                        }`}
                      >
                        <div className="text-xs truncate font-medium">{f.name}</div>
                        <div
                          className="text-[10px] text-zinc-400 mt-0.5 truncate"
                          style={{ fontFamily: f.family }}
                        >
                          {f.sample}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Typography Controls */}
                <div className="space-y-3 pt-2 border-t border-zinc-100">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 font-medium">Font Size</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={6}
                        max={72}
                        value={selectedLayer.fontSize}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })
                        }
                        className="w-24 accent-pink-600"
                      />
                      <span className="font-mono text-zinc-800 text-[11px] w-8 text-right">
                        {selectedLayer.fontSize}px
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 font-medium">Text Color</span>
                    <div className="flex items-center gap-2">
                      {'EyeDropper' in window && (
                        <button
                          onClick={handleEyeDropper}
                          className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                          title="Pick color from image"
                        >
                          <Pipette className="w-3 h-3" />
                        </button>
                      )}
                      <input
                        type="color"
                        value={selectedLayer.color}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { color: e.target.value })
                        }
                        className="w-7 h-7 rounded border border-zinc-200 cursor-pointer p-0.5"
                      />
                      <span className="font-mono text-[11px] text-zinc-600 uppercase">
                        {selectedLayer.color}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 font-medium">Letter Spacing</span>
                    <input
                      type="range"
                      min={-2}
                      max={15}
                      value={selectedLayer.letterSpacing}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          letterSpacing: Number(e.target.value),
                        })
                      }
                      className="w-32 accent-pink-600"
                    />
                  </div>
                </div>

                {/* Collapsible Accordions */}
                <div className="pt-2 border-t border-zinc-100 space-y-1">
                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleSection('position')}
                      className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50/50 hover:bg-zinc-50 text-left font-semibold text-zinc-700 text-xs"
                    >
                      <span>Position</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                          openSections.position ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openSections.position && (
                      <div className="p-3 bg-white grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">X:</span>
                          <input
                            type="number"
                            value={selectedLayer.x}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, { x: Number(e.target.value) })
                            }
                            className="w-full border border-zinc-200 rounded px-1.5 py-0.5 font-mono text-zinc-800"
                          />
                        </div>
                        <div>
                          <span className="text-zinc-400">Y:</span>
                          <input
                            type="number"
                            value={selectedLayer.y}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, { y: Number(e.target.value) })
                            }
                            className="w-full border border-zinc-200 rounded px-1.5 py-0.5 font-mono text-zinc-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleSection('original')}
                      className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50/50 hover:bg-zinc-50 text-left font-semibold text-zinc-700 text-xs"
                    >
                      <span>Original Text</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                          openSections.original ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openSections.original && (
                      <div className="p-3 bg-white text-[11px] text-zinc-600 font-mono whitespace-pre-wrap bg-zinc-50 rounded m-2">
                        {selectedLayer.originalText || selectedLayer.text}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
              <Type className="w-8 h-8 mb-2 opacity-40 text-pink-500" />
              <p className="text-xs font-semibold text-zinc-700">No Text Block Selected</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Drag on the photo to draw a box, or click the pink dashed box.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
