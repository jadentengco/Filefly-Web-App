import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  X, 
  Layers, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { FileItem } from '../types';
import { formatBytes } from '../lib/converter';

interface FileUploadProps {
  userId: string;
  onFilesUploaded: (files: FileItem[]) => void;
  defaultClientTag?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  userId,
  onFilesUploaded,
  defaultClientTag = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentUploadingName, setCurrentUploadingName] = useState<string>('');
  const [clientTag, setClientTag] = useState(defaultClientTag);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragging(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files) as File[]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      processFiles(files);
    }
  };

  const processFiles = async (filesToProcess: File[]) => {
    if (filesToProcess.length === 0 || isUploading) return;
    setIsUploading(true);
    setUploadProgress(10);

    const createdItems: FileItem[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      setCurrentUploadingName(file.name);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'dat';
      
      const fileItem: FileItem = {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        userId: userId || 'guest',
        name: file.name,
        size: file.size,
        type: file.type || `application/${ext}`,
        extension: ext,
        uploadedAt: new Date().toISOString(),
        blob: file,
        clientName: clientTag.trim() || undefined,
      };

      createdItems.push(fileItem);
      const targetPercent = Math.round(((i + 1) / filesToProcess.length) * 100);
      setUploadProgress(targetPercent);
      await new Promise((r) => setTimeout(r, 60)); // smooth progress feel
    }

    onFilesUploaded(createdItems);
    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentUploadingName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }, 200);
  };

  return (
    <div
      id="file-upload-section"
      className="space-y-4"
    >
      {/* Client / Project Tag Bar */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>Fast File Upload & Ingestion</span>
          </h3>
        </div>

        {/* Optional Project / Client Tagging */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#111827] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
          <Tag size={13} className="text-slate-400 dark:text-[#a3e635] shrink-0" />
          <input
            id="client-tag-input"
            type="text"
            placeholder="Client tag (optional)"
            value={clientTag}
            onChange={(e) => setClientTag(e.target.value)}
            className="bg-transparent outline-hidden font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 w-36 sm:w-44 text-xs"
          />
        </div>
      </div>

      {/* Main Drag-and-Drop Area */}
      <section
        id="dropzone-area"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!isUploading) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            fileInputRef.current?.click();
          }
        }}
        className={`relative bg-[#eefce0] dark:bg-[#111c10]/80 border-2 border-dashed border-[#a3e635] dark:border-[#a3e635]/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 overflow-hidden ${
          isDragging ? 'bg-[#e0f8c8] dark:bg-[#172615] scale-[1.01] border-lime-500 shadow-lg ring-4 ring-lime-400/20' : 'hover:bg-[#e7f9d5] dark:hover:bg-[#152313]'
        } ${isUploading ? 'opacity-80 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          id="file-input-hidden"
        />

        <div className="w-12 h-12 bg-[#a3e635] rounded-2xl flex items-center justify-center mb-3 shadow-md text-slate-950 transition-transform duration-200 group-hover:scale-105">
          {isUploading ? (
            <Loader2 size={24} className="animate-spin text-slate-950" />
          ) : (
            <UploadCloud size={24} className="stroke-[2.5]" />
          )}
        </div>

        {isUploading ? (
          <div className="w-full max-w-sm space-y-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <span>Uploading & Processing...</span>
              <span className="text-xs font-mono font-bold text-lime-700 dark:text-[#a3e635]">{uploadProgress}%</span>
            </h3>
            {currentUploadingName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs mx-auto">
                {currentUploadingName}
              </p>
            )}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#a3e635] rounded-full transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload your files</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Drag and drop or <span className="text-lime-700 dark:text-[#a3e635] font-bold underline">browse</span> to start converting
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-2 uppercase font-bold tracking-widest">
              Supports HEIC, PDF, PNG, JPG, WEBP, SVG & more
            </p>
          </>
        )}
      </section>
    </div>
  );
};
