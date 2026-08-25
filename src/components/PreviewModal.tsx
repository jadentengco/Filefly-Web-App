import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Repeat, 
  Trash2, 
  FileText, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Calendar, 
  HardDrive, 
  Tag as TagIcon, 
  Layers,
  Copy,
  Check,
  Plus
} from 'lucide-react';
import { FileItem } from '../types';
import { formatBytes } from '../lib/converter';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileItem: FileItem | null;
  onConvert: (file: FileItem) => void;
  onDelete: (id: string) => void;
  onDownload: (file: FileItem) => void;
  onUpdateTags?: (fileIds: string[], tags: string[]) => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  fileItem,
  onConvert,
  onDelete,
  onDownload,
  onUpdateTags,
}) => {
  if (!isOpen || !fileItem) return null;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    let activeUrl: string | null = null;

    if (fileItem.blob) {
      activeUrl = URL.createObjectURL(fileItem.blob);
      setPreviewUrl(activeUrl);

      // If text file, read text
      if (
        fileItem.type.startsWith('text/') ||
        ['txt', 'md', 'json', 'csv', 'js', 'ts', 'html'].includes(fileItem.extension)
      ) {
        fileItem.blob.text().then(setTextContent).catch(() => setTextContent(null));
      } else {
        setTextContent(null);
      }
    } else if (fileItem.downloadUrl) {
      setPreviewUrl(fileItem.downloadUrl);
      if (
        fileItem.type.startsWith('text/') ||
        ['txt', 'md', 'json', 'csv', 'js', 'ts', 'html'].includes(fileItem.extension)
      ) {
        fetch(fileItem.downloadUrl)
          .then((res) => res.text())
          .then(setTextContent)
          .catch(() => setTextContent(null));
      } else {
        setTextContent(null);
      }
    } else if (fileItem.dataUrl) {
      setPreviewUrl(fileItem.dataUrl);
    }

    setZoomLevel(1);

    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [fileItem]);

  const isImage =
    fileItem.type.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'svg', 'bmp', 'gif', 'avif'].includes(fileItem.extension);

  const isPdf =
    fileItem.type === 'application/pdf' || fileItem.extension === 'pdf';

  const isText =
    fileItem.type.startsWith('text/') ||
    ['txt', 'md', 'json', 'csv', 'js', 'ts'].includes(fileItem.extension);

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed || !onUpdateTags) return;
    const currentTags = fileItem.tags || [];
    if (!currentTags.includes(trimmed)) {
      onUpdateTags([fileItem.id], [...currentTags, trimmed]);
    }
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!onUpdateTags) return;
    const currentTags = fileItem.tags || [];
    onUpdateTags(
      [fileItem.id],
      currentTags.filter((t) => t !== tagToRemove)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="preview-modal-card"
        className="bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transition-colors"
      >
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-lime-500/20 text-lime-400 flex items-center justify-center border border-lime-500/30 shrink-0">
              {isImage ? <Maximize2 size={18} /> : <FileText size={18} />}
            </div>
            <div className="min-w-0 pr-2">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {fileItem.name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="font-mono">{formatBytes(fileItem.size)}</span>
                <span>•</span>
                <span className="uppercase font-bold text-lime-400">{fileItem.extension}</span>
                {fileItem.clientName && (
                  <>
                    <span>•</span>
                    <span className="text-slate-300">Client: {fileItem.clientName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDownload(fileItem)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
              title="Download"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => {
                onClose();
                onConvert(fileItem);
              }}
              className="px-3 py-1.5 bg-[#a3e635] hover:bg-lime-400 text-slate-950 rounded-xl font-bold transition-colors flex items-center gap-1.5 text-xs shadow-xs"
              title="Convert Format"
            >
              <Repeat size={14} />
              <span>Convert</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tags Sub-header */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
              <TagIcon size={12} className="text-[#a3e635]" /> Tags:
            </span>
            {(fileItem.tags || []).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs"
              >
                <span>#{tag}</span>
                {onUpdateTags && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                    title={`Remove tag #${tag}`}
                  >
                    <X size={10} />
                  </button>
                )}
              </span>
            ))}

            {onUpdateTags && !showTagInput && (
              <button
                onClick={() => setShowTagInput(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-[#a3e635] border border-dashed border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <Plus size={12} />
                <span>Add Tag</span>
              </button>
            )}

            {onUpdateTags && showTagInput && (
              <form onSubmit={handleAddTag} className="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder="New tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  autoFocus
                  className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-900 dark:text-white w-28 focus:outline-hidden focus:border-[#a3e635]"
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-[#a3e635] text-slate-950 rounded-md text-xs font-bold"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowTagInput(false)}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={12} />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Content Viewer Section */}
        <div className="flex-1 bg-slate-950/95 overflow-auto p-4 sm:p-8 flex items-center justify-center relative min-h-[340px]">
          {isImage && previewUrl && (
            <div className="relative flex flex-col items-center justify-center max-w-full">
              <img
                src={previewUrl}
                alt={fileItem.name}
                referrerPolicy="no-referrer"
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
              />

              {/* Zoom Controls */}
              <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-md rounded-xl p-1 flex items-center gap-1 border border-slate-700">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="text-[11px] text-slate-300 font-mono px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>
          )}

          {isPdf && previewUrl && (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900/60 rounded-2xl border border-slate-800">
              <FileText size={48} className="text-lime-400 mb-3" />
              <p className="text-sm font-bold text-white mb-1">PDF Document Loaded</p>
              <p className="text-xs text-slate-400 mb-4 max-w-md">
                This PDF is ready for viewing, downloading, or converting directly into text or other formats.
              </p>
              <div className="flex gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-lime-500 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Maximize2 size={13} />
                  Open in New Tab
                </a>
                <button
                  onClick={() => onDownload(fileItem)}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <Download size={13} />
                  Download
                </button>
              </div>
            </div>
          )}

          {isText && textContent !== null && (
            <div className="w-full max-w-2xl bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-800 font-mono text-xs text-slate-200 max-h-[55vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-800 text-slate-400">
                <span>Text Viewer</span>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-[11px] hover:text-lime-400 transition-colors"
                >
                  {copied ? <Check size={12} className="text-lime-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed">
                {textContent}
              </pre>
            </div>
          )}

          {!isImage && !isPdf && !isText && (
            <div className="text-center p-8">
              <Layers size={48} className="text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-white mb-1">Binary File Preview</p>
              <p className="text-xs text-slate-400">
                You can download this file or convert it to compatible formats.
              </p>
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400 transition-colors">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
              Uploaded: {new Date(fileItem.uploadedAt).toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <HardDrive size={14} className="text-slate-400 dark:text-slate-500" />
              Type: {fileItem.type}
            </span>
          </div>

          <button
            id="preview-delete-file-btn"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2.5 py-1 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            Delete File
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          onDelete(fileItem.id);
          onClose();
        }}
        title="Delete File"
        itemName={fileItem.name}
      />
    </div>
  );
};
