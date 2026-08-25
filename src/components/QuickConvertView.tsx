import React, { useState, useRef } from 'react';
import { 
  Repeat, 
  UploadCloud, 
  Sparkles, 
  Check, 
  Download, 
  Save, 
  Sliders, 
  X, 
  Layers, 
  FileCheck2, 
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SupportedFormat, ConversionOptions, FileItem, User } from '../types';
import { convertFile, formatBytes, getAvailableConversions } from '../lib/converter';
import { recordSuccessfulConversion } from '../lib/conversions';

interface QuickConvertViewProps {
  currentUser: User;
  onSavedConvertedFile: (file: FileItem) => void;
}

export const QuickConvertView: React.FC<QuickConvertViewProps> = ({
  currentUser,
  onSavedConvertedFile,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<SupportedFormat>('webp');
  const [quality, setQuality] = useState<number>(0.9);
  const [scalePercent, setScalePercent] = useState<number>(100);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<{
    blob: Blob;
    convertedName: string;
    format: SupportedFormat;
    size: number;
    previewUrl: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setResult(null);
      setErrorMsg(null);

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const available = getAvailableConversions(ext);
      setTargetFormat(available[0] || 'webp');
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) return;
    setIsConverting(true);
    setErrorMsg(null);

    try {
      const options: ConversionOptions = {
        targetFormat,
        quality,
      };
      if (scalePercent < 100) {
        options.maxWidth = Math.round(1920 * (scalePercent / 100));
        options.maxHeight = Math.round(1080 * (scalePercent / 100));
      }

      const res = await convertFile(selectedFile, selectedFile.name, options);
      const previewUrl = URL.createObjectURL(res.blob);
      setResult({
        ...res,
        previewUrl,
      });

      const sourceExt = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      recordSuccessfulConversion(
        currentUser.id,
        selectedFile.name,
        sourceExt,
        targetFormat
      );

      try {
        confetti({
          particleCount: 50,
          spread: 70,
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

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.previewUrl;
    a.download = result.convertedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveToFiles = () => {
    if (!result) return;
    const ext = result.convertedName.split('.').pop()?.toLowerCase() || targetFormat;
    const newFileItem: FileItem = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUser.id,
      name: result.convertedName,
      size: result.size,
      type: result.blob.type || `application/${ext}`,
      extension: ext,
      uploadedAt: new Date().toISOString(),
      blob: result.blob,
      dataUrl: result.previewUrl,
      conversionFormat: result.format,
    };
    onSavedConvertedFile(newFileItem);
    setSelectedFile(null);
    setResult(null);
  };

  const allFormats: SupportedFormat[] = ['webp', 'jpeg', 'png', 'pdf', 'heic', 'svg', 'txt', 'bmp'];

  return (
    <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 dark:border-slate-800 max-w-3xl mx-auto transition-colors">
      <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
        <span className="text-[11px] font-bold uppercase tracking-wider text-lime-700 dark:text-[#a3e635] bg-lime-100 dark:bg-lime-950/80 px-2.5 py-1 rounded-full inline-flex items-center gap-1 mb-2 border border-transparent dark:border-lime-700/40">
          <Repeat size={12} /> Instant File Converter
        </span>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Convert Any File on the Fly
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Transform your images, documents, and assets into modern, compressed web formats (JPEG, PNG, WebP, PDF, HEIC, SVG) in milliseconds.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {/* File Selector Dropzone */}
        {!selectedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#eefce0] dark:bg-[#111c10]/80 border-2 border-dashed border-[#a3e635] dark:border-[#a3e635]/80 rounded-3xl p-10 text-center cursor-pointer hover:bg-[#e7f9d5] dark:hover:bg-[#152313] transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-12 h-12 bg-[#a3e635] text-slate-950 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
              <UploadCloud size={24} className="stroke-[2.5]" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Select a file to convert
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Supports PNG, JPG, WebP, HEIC, PDF, SVG, TXT, BMP (up to 100MB)
            </p>
          </div>
        ) : (
          /* Selected File Card */
          <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-lime-100 dark:bg-lime-950/80 text-lime-800 dark:text-[#a3e635] flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-lime-200 dark:border-lime-700/40">
                {selectedFile.name.split('.').pop() || 'FILE'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{formatBytes(selectedFile.size)}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedFile(null);
                setResult(null);
              }}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Format & Settings Options (if file chosen) */}
        {selectedFile && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Convert Target Format
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {allFormats.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => {
                      setTargetFormat(fmt);
                      setResult(null);
                    }}
                    className={`p-3 rounded-xl border text-center text-xs font-bold uppercase transition-all ${
                      targetFormat === fmt
                        ? 'border-lime-500 dark:border-[#a3e635] bg-lime-100/70 dark:bg-[#a3e635]/20 text-slate-950 dark:text-white ring-2 ring-lime-400 dark:ring-[#a3e635]'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Tuning */}
            {['jpeg', 'webp', 'heic'].includes(targetFormat) && (
              <div className="bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span>Output Quality</span>
                  <span className="font-mono text-lime-700 dark:text-[#a3e635] font-bold">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-lime-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* Action Bar */}
            {!result ? (
              <button
                id="quick-convert-action-btn"
                onClick={handleConvert}
                disabled={isConverting}
                className="w-full py-3 bg-slate-900 dark:bg-[#a3e635] hover:bg-slate-800 dark:hover:bg-[#bef264] text-white dark:text-slate-950 font-bold rounded-xl text-xs shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isConverting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-lime-400 dark:border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Converting Deliverable...</span>
                  </>
                ) : (
                  <>
                    <Repeat size={14} className="text-[#a3e635] dark:text-slate-950" />
                    <span>Convert Now</span>
                  </>
                )}
              </button>
            ) : (
              /* Success Result Card */
              <div className="p-5 bg-[#eefce0] dark:bg-[#111c10] border border-[#a3e635] dark:border-[#a3e635]/80 rounded-2xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-lime-800 dark:text-[#a3e635] font-bold text-xs">
                    <Check size={16} className="text-lime-600 dark:text-[#a3e635]" />
                    <span>Conversion Succeeded!</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-lime-800 dark:text-[#a3e635] px-2 py-0.5 rounded-md border border-lime-200 dark:border-slate-700">
                    {formatBytes(result.size)}
                  </span>
                </div>

                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {result.convertedName}
                </p>

                <div className="flex gap-2 pt-2 border-t border-lime-200/80 dark:border-slate-800">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 bg-slate-900 dark:bg-[#a3e635] hover:bg-slate-800 dark:hover:bg-[#bef264] text-white dark:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download size={14} className="text-[#a3e635] dark:text-slate-950" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={handleSaveToFiles}
                    className="flex-1 py-2.5 bg-lime-200 dark:bg-slate-800 hover:bg-lime-300 dark:hover:bg-slate-700 text-lime-900 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-lime-300 dark:border-slate-700"
                  >
                    <Save size={14} />
                    <span>Save to Portal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
