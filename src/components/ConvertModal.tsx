import React, { useState, useEffect } from 'react';
import { 
  Repeat, 
  Download, 
  Save, 
  Sparkles, 
  Check, 
  FileText, 
  Image as ImageIcon, 
  Sliders, 
  X, 
  ArrowRight,
  Maximize2,
  FileCheck2,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileItem, SupportedFormat, ConversionOptions } from '../types';
import { convertFile, formatBytes, getAvailableConversions } from '../lib/converter';
import { recordSuccessfulConversion } from '../lib/conversions';

interface ConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileItem: FileItem | null;
  onSavedConvertedFile: (convertedFile: FileItem) => void;
}

export const ConvertModal: React.FC<ConvertModalProps> = ({
  isOpen,
  onClose,
  fileItem,
  onSavedConvertedFile,
}) => {
  if (!isOpen || !fileItem) return null;

  const availableFormats = getAvailableConversions(fileItem.extension);
  const [selectedFormat, setSelectedFormat] = useState<SupportedFormat>(
    availableFormats[0] || 'webp'
  );
  const [quality, setQuality] = useState<number>(0.9);
  const [scalePercent, setScalePercent] = useState<number>(100);
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pdfPageSize, setPdfPageSize] = useState<'a4' | 'fit'>('a4');

  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<{
    blob: Blob;
    convertedName: string;
    format: SupportedFormat;
    size: number;
    previewUrl: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset when file changes
  useEffect(() => {
    const formats = getAvailableConversions(fileItem.extension);
    setSelectedFormat(formats[0] || 'webp');
    setConversionResult(null);
    setErrorMsg(null);
  }, [fileItem]);

  const handleStartConversion = async () => {
    setIsConverting(true);
    setErrorMsg(null);

    try {
      const options: ConversionOptions = {
        targetFormat: selectedFormat,
        quality: quality,
        pdfOrientation,
        pdfPageSize,
      };

      if (scalePercent < 100) {
        options.maxWidth = Math.round(1920 * (scalePercent / 100));
        options.maxHeight = Math.round(1080 * (scalePercent / 100));
      }

      const result = await convertFile(fileItem, fileItem.name, options);
      const previewUrl = URL.createObjectURL(result.blob);

      setConversionResult({
        ...result,
        previewUrl,
      });

      // Record conversion event
      recordSuccessfulConversion(
        fileItem.userId,
        fileItem.name,
        fileItem.extension,
        selectedFormat
      );

      // Confetti burst for satisfaction
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#84cc16', '#22c55e', '#a3e635'],
        });
      } catch {}
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Conversion failed. Please try a different format.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadDirectly = () => {
    if (!conversionResult) return;
    const a = document.createElement('a');
    a.href = conversionResult.previewUrl;
    a.download = conversionResult.convertedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveToPortal = () => {
    if (!conversionResult) return;
    const ext = conversionResult.convertedName.split('.').pop()?.toLowerCase() || selectedFormat;
    
    const newFileItem: FileItem = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: fileItem.userId,
      name: conversionResult.convertedName,
      size: conversionResult.size,
      type: conversionResult.blob.type || `application/${ext}`,
      extension: ext,
      uploadedAt: new Date().toISOString(),
      blob: conversionResult.blob,
      dataUrl: conversionResult.previewUrl,
      clientName: fileItem.clientName,
      convertedFromId: fileItem.id,
      conversionFormat: conversionResult.format,
    };

    onSavedConvertedFile(newFileItem);
    onClose();
  };

  const formatLabels: Record<SupportedFormat, { name: string; desc: string; icon: string }> = {
    jpeg: { name: 'JPEG', desc: 'Standard photo format with adjustable compression', icon: 'JPG' },
    png: { name: 'PNG', desc: 'Lossless quality with transparency support', icon: 'PNG' },
    webp: { name: 'WebP', desc: 'Modern high-efficiency web image', icon: 'WEBP' },
    pdf: { name: 'PDF', desc: 'Portable document format for print & viewing', icon: 'PDF' },
    heic: { name: 'HEIC', desc: 'High Efficiency Image Container', icon: 'HEIC' },
    svg: { name: 'SVG', desc: 'Scalable vector container', icon: 'SVG' },
    txt: { name: 'TXT', desc: 'Clean unformatted plain text', icon: 'TXT' },
    bmp: { name: 'BMP', desc: 'Uncompressed raw bitmap', icon: 'BMP' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="convert-modal-card"
        className="bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden relative max-h-[90vh] flex flex-col transition-colors"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-500/20 text-lime-400 flex items-center justify-center border border-lime-500/30">
              <Repeat size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Convert File Format
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                Original: <span className="text-[#a3e635] font-semibold">{fileItem.name}</span> ({formatBytes(fileItem.size)})
              </p>
            </div>
          </div>

          <button
            id="close-convert-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* Target Format Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
              Select Output Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {availableFormats.map((fmt) => {
                const info = formatLabels[fmt] || { name: fmt.toUpperCase(), desc: '', icon: fmt.toUpperCase() };
                const isSelected = selectedFormat === fmt;
                return (
                  <button
                    key={fmt}
                    id={`format-btn-${fmt}`}
                    type="button"
                    onClick={() => {
                      setSelectedFormat(fmt);
                      setConversionResult(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-lime-500 dark:border-[#a3e635] bg-lime-50/80 dark:bg-[#a3e635]/20 ring-2 ring-lime-400/40 dark:ring-[#a3e635]/40 text-slate-950 dark:text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold uppercase px-2 py-0.5 bg-slate-900 dark:bg-slate-800 text-white rounded-md">
                        {info.icon}
                      </span>
                      {isSelected && <Check size={14} className="text-lime-600 dark:text-[#a3e635] font-bold" />}
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">{info.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-tight">{info.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversion Settings & Sliders */}
          <div className="bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Sliders size={14} className="text-lime-600 dark:text-[#a3e635]" />
              <span>Conversion Tuning</span>
            </div>

            {/* Quality Slider (for JPEG / WebP / HEIC) */}
            {['jpeg', 'webp', 'heic'].includes(selectedFormat) && (
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span>Image Quality & Compression</span>
                  <span className="text-lime-700 dark:text-[#a3e635] font-mono font-bold">
                    {Math.round(quality * 100)}% ({quality >= 0.85 ? 'High' : quality >= 0.65 ? 'Balanced' : 'Small File'})
                  </span>
                </div>
                <input
                  id="quality-slider"
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={quality}
                  onChange={(e) => {
                    setQuality(parseFloat(e.target.value));
                    setConversionResult(null);
                  }}
                  className="w-full accent-lime-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* Scale / Dimension Presets */}
            {['jpeg', 'png', 'webp', 'bmp'].includes(selectedFormat) && (
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span>Resolution Scaling</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono font-bold">{scalePercent}%</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 75, 50, 25].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setScalePercent(pct);
                        setConversionResult(null);
                      }}
                      className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        scalePercent === pct
                          ? 'border-lime-500 dark:border-[#a3e635] bg-lime-50 dark:bg-[#a3e635]/20 text-slate-900 dark:text-white ring-1 ring-lime-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PDF Specific Settings */}
            {selectedFormat === 'pdf' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Page Orientation</label>
                  <select
                    value={pdfOrientation}
                    onChange={(e) => {
                      setPdfOrientation(e.target.value as any);
                      setConversionResult(null);
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Page Size</label>
                  <select
                    value={pdfPageSize}
                    onChange={(e) => {
                      setPdfPageSize(e.target.value as any);
                      setConversionResult(null);
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100"
                  >
                    <option value="a4">Standard A4</option>
                    <option value="fit">Fit Content Exact</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Conversion Success Result Card */}
          {conversionResult && (
            <div className="bg-[#eefce0] dark:bg-[#111c10] border border-[#a3e635] dark:border-[#a3e635]/80 rounded-2xl p-4.5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#a3e635] text-slate-950 flex items-center justify-center font-bold">
                    <Check size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-950 dark:text-white">Conversion Complete!</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                      {conversionResult.convertedName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-lime-900 dark:text-[#a3e635] bg-white dark:bg-slate-900 border border-lime-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                    {formatBytes(conversionResult.size)}
                  </span>
                  {fileItem.size > conversionResult.size && (
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                      {Math.round(((fileItem.size - conversionResult.size) / fileItem.size) * 100)}% smaller
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons for Converted File */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  id="direct-download-btn"
                  type="button"
                  onClick={handleDownloadDirectly}
                  className="py-2.5 px-3 bg-slate-900 dark:bg-[#a3e635] hover:bg-slate-800 dark:hover:bg-[#bef264] text-white dark:text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <Download size={14} className="text-[#a3e635] dark:text-slate-950" />
                  Download File
                </button>
                <button
                  id="save-to-portal-btn"
                  type="button"
                  onClick={handleSaveToPortal}
                  className="py-2.5 px-3 bg-lime-200 dark:bg-slate-800 hover:bg-lime-300 dark:hover:bg-slate-700 text-lime-900 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-lime-300 dark:border-slate-700 transition-all"
                >
                  <Save size={14} />
                  Save to Filefly
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!conversionResult && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 shrink-0">
            <button
              id="cancel-convert-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="execute-convert-btn"
              type="button"
              disabled={isConverting}
              onClick={handleStartConversion}
              className="px-6 py-2.5 bg-slate-950 dark:bg-[#a3e635] hover:bg-slate-900 dark:hover:bg-[#bef264] text-white dark:text-slate-950 text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isConverting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 dark:border-slate-950/30 border-t-white dark:border-t-slate-950 rounded-full animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-lime-400 dark:text-slate-950" />
                  <span>Convert to {selectedFormat.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
