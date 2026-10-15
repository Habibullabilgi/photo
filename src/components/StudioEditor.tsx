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
  Maximize2,
  SplitSquareVertical,
  Pipette,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Crop,
  Layers,
} from 'lucide-react';
import { TextLayer } from '../types';
import { AVAILABLE_FONTS, ensureFontLoaded } from '../utils/fonts';
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

  // Zoom & Pan
  const [zoom, setZoom] = useState<number>(0.65);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Compare mode
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // Left sidebar active tool
  const [activeTool, setActiveTool] = useState<string>('text');

  // Right Inspector Font Category tab
  const [fontCategory, setFontCategory] = useState<string>('Local Fonts');

  // Collapsible Accordions
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

  // Switch template dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Identify Font simulation / status
  const [isIdentifying, setIsIdentifying] = useState(false);

  // Selected layer
  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || layers[0] || null;

  // Auto-fit zoom on mount
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

  // Eyedropper API
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
        onUpdateLayer(selectedLayer.id, { fontFamily: 'Inter', fontWeight: 700 });
      }
    }, 700);
  };

  // Font category cards
  const FONT_PREVIEWS = [
    { name: 'Arial', family: 'Inter', sample: '0123456789,.+-' },
    { name: 'Helvetica', family: 'Roboto', sample: '0123456789,.+-' },
    { name: 'Microsoft YaHei', family: 'Poppins', sample: '0123456789,.+-' },
    { name: 'Calibri', family: 'Montserrat', sample: '0123456789,.+-' },
    { name: 'Courier New', family: 'Fira Code', sample: 'Courier New' },
    { name: 'Arial Black', family: 'Bebas Neue', sample: 'Arial Black' },
    { name: 'Playfair', family: 'Playfair Display', sample: 'Editorial Serif' },
    { name: 'Dancing Script', family: 'Dancing Script', sample: 'Handwritten Script' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#eef0f3] text-zinc-900 select-none overflow-hidden font-sans">
      {/* 1. TOP NAVBAR (Screenshot 2: photext.ai, filename dropdown, Download button) */}
      <header className="h-13 bg-white border-b border-zinc-200 px-4 flex items-center justify-between z-30 shrink-0 shadow-xs">
        {/* Logo & Back */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-950 text-xs font-semibold px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
            title="Back to Landing page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-1 text-lg font-black tracking-tight text-zinc-900">
            <span>photext</span>
            <span className="text-pink-600">.ai</span>
          </div>
        </div>

        {/* Filename dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-100 text-xs font-medium text-zinc-700 transition-colors"
          >
            <span>{filename}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in">
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

        {/* Right: Download Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onScanText}
            disabled={isScanning}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isScanning
                ? 'bg-pink-50 text-pink-600 border-pink-200 animate-pulse'
                : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700 shadow-2xs'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 text-pink-500 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Detecting...' : 'Scan Text in Image'}</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-md shadow-zinc-900/10 transition-all cursor-pointer"
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

      {/* 2. MAIN WORKSPACE (Left tool strip + Canvas with rulers + Right Text Inspector) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT TOOL STRIP (Screenshot 2: Adjust, Removal, Add, Effects, Text, AI, Shortcuts, Feedback) */}
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
              title="Rescan text"
            >
              <Keyboard className="w-4 h-4 mb-0.5" />
              <span>Scan</span>
            </button>
            <button
              onClick={onBackToHome}
              className="w-full flex flex-col items-center justify-center py-1.5 text-zinc-500 hover:text-zinc-900 text-[10px]"
              title="Home"
            >
              <MessageSquare className="w-4 h-4 mb-0.5" />
              <span>Home</span>
            </button>
          </div>
        </aside>

        {/* CENTER CANVAS WITH RULERS (Screenshot 2: rulers along top & left, canvas with photo & pink dashed box) */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 h-full bg-[#f1f3f6] relative overflow-hidden flex items-center justify-center select-none cursor-default"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #d4d7dc 1px, transparent 0)`,
            backgroundSize: '16px 16px',
          }}
        >
          {/* Top Ruler simulation */}
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

          {/* Left Ruler simulation */}
          <div className="absolute top-0 bottom-0 left-0 w-4 bg-white border-r border-zinc-200 z-10 flex flex-col justify-between py-6 pointer-events-none opacity-60">
            <div className="h-full flex flex-col justify-between items-center font-mono text-[8px] text-zinc-400">
              <span>0</span>
              <span>200</span>
              <span>400</span>
              <span>600</span>
              <span>800</span>
            </div>
          </div>

          {/* Inpainting status alert */}
          {isInpainting && (
            <div className="absolute top-6 z-40 bg-zinc-900/90 text-white text-xs px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur">
              <Wand2 className="w-3.5 h-3.5 text-pink-400 animate-spin" />
              <span>Seamlessly restoring photo background...</span>
            </div>
          )}

          {/* The Photo & Interactive Text Canvas */}
          <div
            className="relative transition-transform duration-75 origin-center shadow-xl rounded-sm bg-white"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
            onClick={() => onSelectLayer(null)}
          >
            {/* Background Image (Inpainted background when text is edited) */}
            <img
              src={imageUrl}
              alt="Artwork"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
            />

            {/* Split Comparison View */}
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
                <div className="absolute top-4 left-4 bg-black/75 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                  Original Photo
                </div>
              </div>
            )}

            {compareMode && (
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDraggingSplit(true);
                }}
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-30 flex items-center justify-center shadow-md"
                style={{ left: `${splitPos}%` }}
              >
                <div className="w-5 h-5 rounded-full bg-white text-zinc-900 shadow flex items-center justify-center text-[9px] font-bold">
                  ↔
                </div>
              </div>
            )}

            {/* Text items detected in photo */}
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
                  className={`absolute select-none cursor-pointer transition-all ${
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
                  {/* Background badge if enabled */}
                  {layer.backgroundBadge.enabled && (
                    <div
                      className="absolute inset-0 rounded pointer-events-none"
                      style={{
                        backgroundColor: layer.backgroundBadge.color,
                        opacity: layer.backgroundBadge.opacity,
                        margin: `-${layer.backgroundBadge.paddingY}px -${layer.backgroundBadge.paddingX}px`,
                        borderRadius: `${layer.backgroundBadge.borderRadius}px`,
                      }}
                    />
                  )}

                  {/* Rendered Text */}
                  <div
                    className="relative whitespace-pre-wrap leading-tight p-0.5"
                    style={{
                      fontFamily: `"${layer.fontFamily}", sans-serif`,
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

                  {/* Pink Anchor Handles when selected (Screenshot 2 exact style) */}
                  {isSelected && (
                    <>
                      {/* Top-Left & Bottom-Right circles */}
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-pink-500 shadow border border-white" />
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-pink-500 shadow border border-white" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-full bg-pink-500 shadow border border-white" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full bg-pink-500 shadow border border-white" />

                      {/* Right Edge Arrow Handle: ↔ */}
                      <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-pink-500 font-extrabold text-xs">
                        ↔
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Left: Compare Button (Screenshot 2: [ 📷 Compare ]) */}
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

          {/* Bottom Right: Zoom Controls (Screenshot 2: [ 🔍- ] [ 62% ] [ 🔍+ ]) */}
          <div className="absolute bottom-5 right-8 z-30 flex items-center bg-white border border-zinc-200 rounded-lg shadow-md px-1 py-0.5 text-xs text-zinc-700">
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-12 text-center font-mono text-[11px] font-semibold text-zinc-700">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.1)}
              className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. RIGHT PANEL: EXACT PHOTEXT TEXT INSPECTOR (Screenshot 2) */}
        <aside className="w-80 xl:w-96 bg-white border-l border-zinc-200 flex flex-col text-xs text-zinc-800 select-none overflow-hidden shrink-0 shadow-sm z-20">
          {selectedLayer ? (
            <>
              {/* Top Action Bar: Unselect on left, Reset in red on right */}
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

              {/* Scrollable Inspector Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Multiline Text Input Area (Screenshot 2: shows location/date or text content) */}
                <div>
                  <textarea
                    value={selectedLayer.text}
                    onChange={(e) => onUpdateLayer(selectedLayer.id, { text: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 hover:bg-white text-zinc-900 font-medium text-xs leading-relaxed focus:outline-none focus:border-zinc-900 focus:bg-white transition-all resize-none shadow-2xs"
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

                {/* Font Section (Screenshot 2) */}
                <div className="space-y-2.5 pt-1 border-t border-zinc-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-800 text-xs">Font</span>
                    <button
                      onClick={handleIdentifyFont}
                      disabled={isIdentifying}
                      className="text-[11px] text-zinc-600 hover:text-pink-600 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Wand2 className={`w-3 h-3 text-pink-500 ${isIdentifying ? 'animate-spin' : ''}`} />
                      <span>{isIdentifying ? 'Identifying...' : 'Identify font'}</span>
                    </button>
                  </div>

                  {/* Category carousel: < Preset | Local Fonts | Sans Serif | Serif | Display | Handwriting > */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5 text-[11px] text-zinc-500">
                    <button className="p-0.5 hover:text-zinc-900">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {['Preset', 'Local Fonts', 'Sans Serif', 'Serif', 'Display'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFontCategory(cat)}
                        className={`px-1.5 py-0.5 rounded transition-colors ${
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

                  {/* 2-Column Font Cards Grid (Screenshot 2: Arial, Helvetica, Microsoft YaHei, Calibri, etc.) */}
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
                            ? 'border-pink-500 bg-pink-50/40 text-pink-900 shadow-2xs font-bold'
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

                {/* Typography Controls: Size, Weight, Color */}
                <div className="space-y-3 pt-2 border-t border-zinc-100">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 font-medium">Font Size</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={10}
                        max={120}
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
                          className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
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
                      max={20}
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

                {/* Collapsible Accordions (Screenshot 2: Position, Original Text, Shadow, Effect) */}
                <div className="pt-2 border-t border-zinc-100 space-y-1">
                  {/* Position Accordion */}
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

                  {/* Original Text Accordion */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleSection('original')}
                      className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50/50 hover:bg-zinc-50 text-left font-semibold text-zinc-700 text-xs"
                    >
                      <span className="flex items-center gap-1">
                        Original Text <span className="text-zinc-400 font-normal">⍰</span>
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                          openSections.original ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openSections.original && (
                      <div className="p-3 bg-white text-[11px] text-zinc-600 leading-relaxed font-mono whitespace-pre-wrap bg-zinc-50 rounded m-2">
                        {selectedLayer.originalText || '(No original text detected)'}
                      </div>
                    )}
                  </div>

                  {/* Shadow Accordion */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleSection('shadow')}
                      className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50/50 hover:bg-zinc-50 text-left font-semibold text-zinc-700 text-xs"
                    >
                      <span>Shadow</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                          openSections.shadow ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openSections.shadow && (
                      <div className="p-3 bg-white space-y-2 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span>Enable Shadow</span>
                          <input
                            type="checkbox"
                            checked={selectedLayer.shadow.enabled}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                shadow: { ...selectedLayer.shadow, enabled: e.target.checked },
                              })
                            }
                            className="accent-pink-600 rounded"
                          />
                        </div>
                        {selectedLayer.shadow.enabled && (
                          <div>
                            <span className="text-zinc-500">Blur:</span>
                            <input
                              type="range"
                              min={0}
                              max={30}
                              value={selectedLayer.shadow.blur}
                              onChange={(e) =>
                                onUpdateLayer(selectedLayer.id, {
                                  shadow: {
                                    ...selectedLayer.shadow,
                                    blur: Number(e.target.value),
                                  },
                                })
                              }
                              className="w-full accent-pink-600"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Effect Accordion */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleSection('effect')}
                      className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50/50 hover:bg-zinc-50 text-left font-semibold text-zinc-700 text-xs"
                    >
                      <span>Effect</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                          openSections.effect ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openSections.effect && (
                      <div className="p-3 bg-white space-y-2 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span>Curved Arc Text</span>
                          <input
                            type="checkbox"
                            checked={selectedLayer.arc.enabled}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                arc: { ...selectedLayer.arc, enabled: e.target.checked },
                              })
                            }
                            className="accent-pink-600 rounded"
                          />
                        </div>
                        {selectedLayer.arc.enabled && (
                          <input
                            type="range"
                            min={-40}
                            max={40}
                            value={selectedLayer.arc.curvature}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                arc: { ...selectedLayer.arc, curvature: Number(e.target.value) },
                              })
                            }
                            className="w-full accent-pink-600"
                          />
                        )}
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
                Click on the pink dashed box in the photo to edit.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
