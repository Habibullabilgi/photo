import React, { useRef, useState } from 'react';
import { Upload, Sparkles, ChevronDown, Check } from 'lucide-react';
import { SAMPLE_PRESETS, SamplePreset } from '../utils/sampleImages';

interface LandingViewProps {
  onSelectPreset: (preset: SamplePreset) => void;
  onUploadImage: (file: File) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onSelectPreset,
  onUploadImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(1);

  const startUploadSimulation = (file: File) => {
    setIsUploading(true);
    setUploadPercent(1);

    const interval = setInterval(() => {
      setUploadPercent((prev) => {
        if (prev >= 98) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            onUploadImage(file);
          }, 300);
          return 100;
        }
        return prev + Math.floor(Math.random() * 25) + 10;
      });
    }, 120);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      startUploadSimulation(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col font-sans text-zinc-900 select-none">
      {/* 1. TOP NAVBAR (photext.ai layout) */}
      <header className="h-16 border-b border-zinc-200/80 bg-white px-8 flex items-center justify-between z-30">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-1 text-2xl font-black tracking-tight text-zinc-900 cursor-pointer">
            <span>PhoText</span>
            <span className="text-pink-600">.ai</span>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-semibold text-zinc-600">
            <span className="text-zinc-950 hover:text-pink-600 transition-colors cursor-pointer">
              Edit Text
            </span>
            <span className="hover:text-zinc-950 transition-colors cursor-pointer">
              Remove Text
            </span>
            <span className="hover:text-zinc-950 transition-colors cursor-pointer">
              Add Text
            </span>
            <span className="hover:text-zinc-950 transition-colors cursor-pointer">
              Translate Text
            </span>
            <span className="hover:text-zinc-950 transition-colors cursor-pointer">
              Identify Fonts
            </span>
            <span className="hover:text-zinc-950 transition-colors cursor-pointer flex items-center gap-1">
              <span>More</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </span>
          </nav>
        </div>

        <button className="px-5 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-950 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all cursor-pointer">
          Log In
        </button>
      </header>

      {/* 2. HERO CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col items-center text-center">
        {/* Title & Sparkles */}
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-900 mb-2">
          Edit Text in Image Online
        </h1>

        <div className="flex items-center justify-center gap-1 text-pink-500 mb-3 text-xs">
          <span>✦</span>
          <span className="text-sm">✦</span>
          <span>✦</span>
        </div>

        <p className="text-sm md:text-base text-zinc-500 max-w-xl mb-12 font-medium">
          The easiest way to edit text in an image: click the text and type. No design skills needed.
        </p>

        {/* 3. BEFORE / AFTER CARD + UPLOAD ZONE (Two-column layout from photext.ai) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
          {/* Left Column: Interactive Before / After showcase */}
          <div className="relative bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm overflow-hidden flex items-center justify-center aspect-4/3 group">
            <div className="flex items-center gap-4 relative">
              {/* Before Card */}
              <div className="w-44 h-56 bg-gradient-to-b from-sky-100 to-amber-100 rounded-2xl shadow-md border-4 border-white p-3 flex flex-col justify-between -rotate-3 transition-transform group-hover:-rotate-6">
                <span className="inline-block px-2 py-0.5 rounded bg-zinc-900 text-white font-extrabold text-[9px] uppercase self-start">
                  Before
                </span>
                <div className="bg-white/90 backdrop-blur rounded-lg px-2.5 py-1 text-left shadow-xs self-start">
                  <div className="text-[10px] font-bold text-zinc-800 flex items-center gap-1">
                    <span className="text-pink-500">📍</span> LAKESIDE
                  </div>
                </div>
              </div>

              {/* After Card */}
              <div className="w-44 h-56 bg-gradient-to-b from-rose-100 to-indigo-100 rounded-2xl shadow-xl border-4 border-white p-3 flex flex-col justify-between rotate-3 transition-transform group-hover:rotate-6">
                <span className="inline-block px-2 py-0.5 rounded bg-pink-600 text-white font-extrabold text-[9px] uppercase self-start">
                  After
                </span>
                <div className="bg-white/90 backdrop-blur rounded-lg px-2.5 py-1 text-left shadow-xs self-start border border-pink-500">
                  <div className="text-[10px] font-black text-pink-600 flex items-center gap-1">
                    <span className="text-pink-500">📍</span> MOUNTAIN
                  </div>
                </div>
              </div>
            </div>

            {/* Pink cursor icon */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-pink-600 text-white flex items-center justify-center shadow-lg font-bold text-xs pointer-events-none">
              ➤
            </div>
          </div>

          {/* Right Column: Upload Card */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className="w-full bg-white border border-zinc-200 hover:border-pink-500 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer shadow-sm hover:shadow-md transition-all aspect-4/3"
          >
            <div className="w-full h-full border-2 border-dashed border-zinc-300 hover:border-pink-400 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-pink-100 border-t-pink-600 animate-spin" />
                  <span className="text-sm font-bold text-zinc-800">
                    Uploading — {uploadPercent}%
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-zinc-500 font-medium mb-4">
                    Drag & drop an image here, or
                  </p>

                  <button className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-md hover:scale-105 transition-transform mb-4">
                    <Upload className="w-4 h-4" />
                    <span>Open Image</span>
                  </button>

                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                    JPG, PNG, JPEG, WEBP, PDF
                  </span>
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    startUploadSimulation(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* 4. PRESET SAMPLES */}
        <div className="mt-14 w-full max-w-4xl">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-4 text-center">
            Or try one of our sample templates
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SAMPLE_PRESETS.map((preset) => (
              <div
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className="group relative bg-white rounded-2xl border border-zinc-200 overflow-hidden cursor-pointer shadow-xs hover:shadow-md hover:border-pink-500 transition-all text-left"
              >
                <div className="aspect-4/3 w-full bg-zinc-100 overflow-hidden">
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="text-xs font-bold text-zinc-800 truncate">
                    {preset.name}
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
