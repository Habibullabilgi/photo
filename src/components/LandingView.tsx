import React, { useRef } from 'react';
import { Upload, Sparkles, ArrowRight, MousePointer2 } from 'lucide-react';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadImage(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-zinc-900 flex flex-col justify-between p-6 md:p-12 select-none">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto text-center pt-4 md:pt-10">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4 font-sans">
          Edit Text in Image Online
        </h1>

        {/* Decorative Stars Divider */}
        <div className="flex items-center justify-center gap-2 mb-4 text-pink-400">
          <span className="text-[10px] opacity-40">✦</span>
          <span className="text-xs opacity-60">✦</span>
          <span className="text-sm font-bold text-pink-500 scale-125">✦</span>
          <span className="text-xs opacity-60">✦</span>
          <span className="text-[10px] opacity-40">✦</span>
        </div>

        <p className="text-base md:text-lg text-zinc-500 font-normal max-w-2xl mx-auto leading-relaxed">
          The easiest way to edit text in an image: click the text and type. No design skills needed.
        </p>
      </div>

      {/* Main Content: Before/After Illustration + Upload Box */}
      <div className="max-w-6xl mx-auto w-full my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Visual Before/After Cards Illustration */}
        <div className="lg:col-span-6 relative flex items-center justify-center py-6">
          {/* Background decorative blob */}
          <div className="absolute w-72 h-72 md:w-96 md:h-96 rounded-full bg-gradient-to-tr from-pink-100/70 to-rose-50/50 -z-0 blur-2xl pointer-events-none" />

          {/* Before Card */}
          <div className="relative w-52 md:w-64 bg-white p-3 rounded-2xl shadow-xl border border-zinc-200/80 -rotate-8 transform transition-transform hover:rotate-0 duration-300 z-10">
            <div className="absolute -top-3.5 left-4 bg-zinc-800 text-white font-extrabold text-[11px] tracking-wider px-2.5 py-0.5 rounded shadow">
              BEFORE
            </div>
            <div className="bg-zinc-100 rounded-xl overflow-hidden aspect-square relative border border-zinc-200/50">
              <img
                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80"
                alt="Before demo"
                className="w-full h-full object-cover filter brightness-95"
              />
              <div className="absolute inset-0 bg-black/20 flex flex-col justify-between p-3 text-white">
                <div className="bg-white/90 backdrop-blur text-zinc-900 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit shadow">
                  📍 LAKESIDE
                </div>
                <div className="bg-white/90 backdrop-blur text-zinc-900 p-2 rounded-lg shadow">
                  <div className="text-[9px] text-zinc-500 font-bold uppercase">DAY PASS</div>
                  <div className="text-sm font-extrabold line-through text-rose-500">$99</div>
                </div>
              </div>
            </div>
          </div>

          {/* Curved connecting line & pointer */}
          <div className="absolute z-20 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 animate-bounce">
              <MousePointer2 className="w-5 h-5 fill-white stroke-pink-500" />
            </div>
          </div>

          {/* After Card */}
          <div className="relative w-56 md:w-72 bg-white p-3.5 rounded-2xl shadow-2xl border border-zinc-200 rotate-4 transform transition-transform hover:rotate-0 duration-300 z-15 -ml-8 mt-12">
            <div className="absolute -top-3.5 left-4 bg-pink-600 text-white font-extrabold text-[11px] tracking-wider px-2.5 py-0.5 rounded shadow">
              AFTER
            </div>
            <div className="bg-zinc-100 rounded-xl overflow-hidden aspect-square relative border border-zinc-200/60 ring-2 ring-pink-500/20">
              <img
                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80"
                alt="After demo"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/10 flex flex-col justify-between p-3 text-white">
                <div className="bg-white text-zinc-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full w-fit shadow">
                  📍 LAKESIDE
                </div>
                <div className="bg-white text-zinc-900 p-2 rounded-lg shadow border border-pink-400">
                  <div className="text-[9px] text-zinc-500 font-bold uppercase">DAY PASS</div>
                  <div className="text-base font-black text-zinc-900 flex items-center gap-1">
                    <span className="text-pink-600 bg-pink-50 px-1 rounded">$69</span>
                    <span className="text-[10px] text-emerald-600 font-bold">(-30%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Upload Box + Samples (Screenshot 1 Exact Layout) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-zinc-200/80 p-6 md:p-8 shadow-xl shadow-zinc-200/40">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-zinc-300 hover:border-pink-500 rounded-2xl p-8 md:p-12 text-center transition-all bg-zinc-50/50 hover:bg-pink-50/20 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="text-sm font-medium text-zinc-600 mb-4">
              Drag &amp; drop an image here, or
            </p>

            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm shadow-lg shadow-zinc-900/20 transition-all hover:scale-105 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Open Image</span>
            </button>

            <p className="text-[11px] text-zinc-400 mt-4 tracking-wider uppercase font-medium">
              JPG, PNG, JPEG, WEBP, PDF
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* "No Image? try one of these:" */}
          <div className="mt-6 pt-5 border-t border-zinc-100">
            <div className="text-xs font-semibold text-zinc-600 mb-3">
              No Image? try one of these:
            </div>

            <div className="grid grid-cols-3 gap-3">
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  className="group relative rounded-xl overflow-hidden border border-zinc-200 hover:border-pink-500 transition-all text-left bg-zinc-50 hover:shadow-md cursor-pointer"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden relative">
                    <img
                      src={preset.thumbnail || preset.url}
                      alt={preset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  </div>
                  <div className="p-2">
                    <div className="text-[11px] font-bold text-zinc-800 truncate">
                      {preset.name}
                    </div>
                    <div className="text-[9px] text-zinc-400 truncate">
                      {preset.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto text-center text-xs text-zinc-400 pb-2">
        PhoText AI • Automatic text recognition, seamless background restoration &amp; vector typography export.
      </div>
    </div>
  );
};
