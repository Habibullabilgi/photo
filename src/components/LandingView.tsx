import React, { useRef } from 'react';
import { Upload, Sparkles, Image as ImageIcon } from 'lucide-react';
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadImage(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col font-sans text-zinc-900 select-none">
      {/* Top Navbar */}
      <header className="h-16 border-b border-zinc-200 bg-white px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-1 text-2xl font-black tracking-tight">
            <span>PhoText</span>
            <span className="text-pink-600">.ai</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-600">
            <span className="text-pink-600 cursor-pointer">Edit Text</span>
            <span className="hover:text-zinc-950 cursor-pointer">Remove Text</span>
            <span className="hover:text-zinc-950 cursor-pointer">Add Text</span>
            <span className="hover:text-zinc-950 cursor-pointer">Translate Text</span>
            <span className="hover:text-zinc-950 cursor-pointer">Identify Fonts</span>
          </nav>
        </div>

        <button className="px-4 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-950">
          Log In
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 mt-4 mb-3">
          Edit Text in Image Online
        </h1>
        <p className="text-sm md:text-base text-zinc-500 max-w-xl mb-10">
          The easiest way to edit text in an image: click the text and type. No design skills needed.
        </p>

        {/* Upload Card */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="w-full max-w-2xl bg-white border-2 border-dashed border-zinc-300 hover:border-pink-500 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer shadow-sm hover:shadow-md transition-all group"
        >
          <div className="w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6 text-pink-600" />
          </div>

          <button className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl mb-3 shadow-md">
            Open Image
          </button>
          <span className="text-xs text-zinc-400">
            Drag & drop an image here, or browse (JPG, PNG, JPEG, WEBP, PDF)
          </span>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onUploadImage(e.target.files[0]);
              }
            }}
          />
        </div>

        {/* Preset Samples */}
        <div className="mt-14 w-full">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 text-center">
            Or try one of our sample templates
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SAMPLE_PRESETS.map((preset) => (
              <div
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className="group relative bg-white rounded-xl border border-zinc-200 overflow-hidden cursor-pointer shadow-xs hover:shadow-md hover:border-pink-500 transition-all text-left"
              >
                <div className="aspect-4/3 w-full bg-zinc-100 overflow-hidden">
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-bold text-zinc-800 truncate">{preset.name}</div>
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3 h-3 text-pink-500" />
                    <span>Editable Text</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
