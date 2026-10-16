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
  Loader2,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [zoom, setZoom] = useState<number>(0.65);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string>('text');
  const [fontCategory, setFontCategory] = useState<string>('Local Fonts');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || e.button === 1) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
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
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingSplit(false);
  };

  const handleEyeDropper = async () => {
    if ('EyeDropper' in window && selectedLayer) {
      try {
        // @ts-ignore
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        onUpdateLayer(selectedLayer.id, { color: result.sRGBHex });
      } catch {
        // cancelled
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
            <span>PhoText</span>
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
            <span>{isScanning ? 'Scanning...' : 'Scan Text in Image'}</span>
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
          className="flex-1 h-full bg-[#f1f3f6] relative overflow-hidden flex items-center justify-center"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #d4d7dc 1px, transparent 0)`,
            backgroundSize: '16px 16px',
          }}
        >
          {/* Laser Scan Animation Overlay */}
          {isScanning && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
              <div className="flex flex-col items-center gap-3 bg-white/95 px-6 py-4 rounded-2xl shadow-2xl">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-sm font-bold text-zinc-800">Scanning Image Text...</span>
              </div>
              <div
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-bounce"
                style={{ top: '45%' }}
              />
            </div>
          )}

          {/* Canvas container */}
          <div
            className="relative transition-transform duration-75 origin-center shadow-xl rounded-sm bg-white overflow-hidden"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
            onClick={() => onSelectLayer(null)}
          >
            <img
              src={imageUrl}
              alt="Artwork"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
            />

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

            {/* Rendered Discrete Detected Lines */}
            {!isScanning &&
              layers.map((layer) => {
                if (!layer.visible || layer.isRemoved) return null;
                const isSelected = selectedLayerId === layer.id;
                const isHovered = hoveredLayerId === layer.id;

                return (
                  <div
                    key={layer.id}
                    onMouseEnter={() => setHoveredLayerId(layer.id)}
                    onMouseLeave={() => setHoveredLayerId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLayer(layer.id);
                    }}
                    className={`absolute transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 border-dashed border-pink-500 z-30'
                        : isHovered
                        ? 'border-2 border-dashed border-emerald-400 bg-emerald-500/10 z-20'
                        : 'border border-transparent z-10'
                    }`}
                    style={{
                      left: `${layer.x}px`,
                      top: `${layer.y}px`,
                      width: `${layer.width}px`,
                      height: `${layer.height}px`,
                    }}
                  >
                    {/* Live text line - transparent background */}
                    <div
                      className="relative z-10 whitespace-nowrap overflow-hidden text-ellipsis leading-none select-none flex items-center h-full px-0.5"
                      style={{
                        fontFamily: `"${layer.fontFamily}", Arial, sans-serif`,
                        fontSize: `${layer.fontSize}px`,
                        fontWeight: layer.fontWeight,
                        color: layer.color || '#ffffff',
                        textShadow: layer.shadow?.enabled
                          ? `${layer.shadow.offsetX}px ${layer.shadow.offsetY}px ${layer.shadow.blur}px ${layer.shadow.color}`
                          : 'none',
                      }}
                    >
                      {layer.text}
                    </div>

                    {/* Pink selection corners & resize handles */}
                    {isSelected && (
                      <>
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-pink-500 shadow border border-white pointer-events-none" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full bg-pink-500 shadow border border-white pointer-events-none" />
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          className="absolute -right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-pink-500 font-extrabold text-xs cursor-ew-resize hover:scale-125 transition-transform select-none"
                        >
                          ↔
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Bottom Left: Compare */}
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

          {/* Bottom Right: Zoom */}
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

        {/* 3. RIGHT INSPECTOR COLUMN */}
        <aside className="w-80 xl:w-96 bg-white border-l border-zinc-200 flex flex-col text-xs text-zinc-800 select-none overflow-hidden shrink-0 shadow-sm z-20">
          {selectedLayer ? (
            <>
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

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Selected Text Line
                  </label>
                  <textarea
                    autoFocus
                    value={selectedLayer.text}
                    onChange={(e) => onUpdateLayer(selectedLayer.id, { text: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-medium text-xs leading-relaxed focus:outline-none focus:border-pink-500 resize-none shadow-xs"
                    placeholder="Type replacement text..."
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
                        max={48}
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
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
              <Type className="w-8 h-8 mb-2 opacity-40 text-pink-500" />
              <p className="text-xs font-semibold text-zinc-700">No Text Selected</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Hover or click on any text line in the photo to edit.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
