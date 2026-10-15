import React, { useState } from 'react';
import {
  Download,
  X,
  FileCode,
  FileText,
  Image as ImageIcon,
  Copy,
  Check,
  Sparkles,
  Printer,
} from 'lucide-react';
import { TextLayer } from '../types';
import {
  generateVectorSVG,
  generateVectorPDF,
  renderHighResImage,
} from '../utils/vectorExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  backgroundImageUrl: string;
  width: number;
  height: number;
  layers: TextLayer[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  backgroundImageUrl,
  width,
  height,
  layers,
}) => {
  const [activeTab, setActiveTab] = useState<'svg' | 'pdf' | 'png'>('svg');
  const [pdfPageSize, setPdfPageSize] = useState<'original' | 'a4' | 'letter'>('original');
  const [rasterScale, setRasterScale] = useState<number>(2);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // Generate SVG string
  const svgString = generateVectorSVG(backgroundImageUrl, width, height, layers);

  // Copy SVG markup to clipboard
  const handleCopySvg = async () => {
    try {
      await navigator.clipboard.writeText(svgString);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch {
      // fallback
    }
  };

  // Download SVG
  const handleDownloadSvg = () => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photext-vector-export-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Vector PDF
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const pdfBlob = await generateVectorPDF(
        backgroundImageUrl,
        width,
        height,
        layers,
        pdfPageSize
      );
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photext-vector-document-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  // Download High Res Raster (PNG/WebP)
  const handleDownloadRaster = async (format: 'image/png' | 'image/webp') => {
    setIsExporting(true);
    try {
      const dataUrl = await renderHighResImage(
        backgroundImageUrl,
        width,
        height,
        layers,
        rasterScale,
        format
      );
      const ext = format === 'image/webp' ? 'webp' : 'png';
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `photext-${rasterScale}x-${Date.now()}.${ext}`;
      a.click();
    } catch (e) {
      console.error('Raster export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Export Composition</h2>
              <p className="text-xs text-zinc-400">
                Vector SVG, Vector PDF, and High-Resolution formats
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('svg')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'svg'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Vector SVG (Recommended)</span>
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'pdf'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Vector PDF Document</span>
          </button>
          <button
            onClick={() => setActiveTab('png')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'png'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>High-Res PNG / WebP</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* TAB 1: VECTOR SVG */}
          {activeTab === 'svg' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <strong>True Scalable Vector:</strong> Export contains the restored background
                  image and crisp, selectable SVG typography tags with Google Font imports,
                  transforms, and gradient filters. Opens natively in Figma, Adobe Illustrator, or
                  any browser.
                </div>
              </div>

              {/* SVG Code Preview Box */}
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                  <span>SVG Markup Preview</span>
                  <button
                    onClick={handleCopySvg}
                    className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded transition-colors"
                  >
                    {copiedSvg ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSvg ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                  </button>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-400 h-32 overflow-y-auto select-all leading-relaxed">
                  {svgString.slice(0, 1000)}...
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleCopySvg}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors"
                >
                  Copy to Figma
                </button>
                <button
                  onClick={handleDownloadSvg}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .SVG</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: VECTOR PDF */}
          {activeTab === 'pdf' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700/60 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
                <Printer className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                <div>
                  <strong>Print-Ready Vector PDF:</strong> Embeds the artwork and compiles typography
                  as searchable vector text elements at infinite zoom level.
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">Page Dimensions</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'original', label: 'Original Ratio', sub: `${width}×${height}pt` },
                    { id: 'a4', label: 'ISO A4', sub: 'Standard document' },
                    { id: 'letter', label: 'US Letter', sub: '8.5 × 11 in' },
                  ].map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setPdfPageSize(format.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        pdfPageSize === format.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="font-medium text-xs text-zinc-200">{format.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{format.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Generating PDF...' : 'Download Vector .PDF'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: HIGH-RES RASTER */}
          {activeTab === 'png' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">Resolution &amp; Scale</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { factor: 1, label: '1x Standard', res: `${width}×${height}px`, tag: 'Web' },
                    {
                      factor: 2,
                      label: '2x Retina',
                      res: `${width * 2}×${height * 2}px`,
                      tag: 'High DPI',
                    },
                    {
                      factor: 4,
                      label: '4x Ultra HD',
                      res: `${width * 4}×${height * 4}px`,
                      tag: '300 DPI Print',
                    },
                  ].map((res) => (
                    <button
                      key={res.factor}
                      onClick={() => setRasterScale(res.factor)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        rasterScale === res.factor
                          ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs text-zinc-200">{res.label}</span>
                        <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-400">
                          {res.tag}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 font-mono">{res.res}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => handleDownloadRaster('image/webp')}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors disabled:opacity-50"
                >
                  Download .WebP
                </button>
                <button
                  onClick={() => handleDownloadRaster('image/png')}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Exporting...' : 'Download PNG'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
