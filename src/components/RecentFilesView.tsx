import React, { useState } from 'react';
import { 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  Repeat, 
  Download, 
  Eye, 
  Trash2, 
  ArrowRight, 
  Sparkles, 
  Tag as TagIcon, 
  UploadCloud, 
  FolderOpen, 
  Share2, 
  CheckCircle2, 
  Copy, 
  CheckSquare, 
  Square,
  Zap,
  HardDrive
} from 'lucide-react';
import JSZip from 'jszip';
import { FileItem } from '../types';
import { formatBytes, getFileCategory } from '../lib/converter';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface RecentFilesViewProps {
  files: FileItem[];
  onPreview: (file: FileItem) => void;
  onConvert: (file: FileItem) => void;
  onDelete: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onDownload: (file: FileItem) => void;
  onNavigateToAllFiles: () => void;
  onTriggerUpload: () => void;
}

export const RecentFilesView: React.FC<RecentFilesViewProps> = ({
  files,
  onPreview,
  onConvert,
  onDelete,
  onBatchDelete,
  onDownload,
  onNavigateToAllFiles,
  onTriggerUpload,
}) => {
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Delete confirmation modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'single' | 'batch';
    file?: FileItem;
    ids?: string[];
  }>({
    isOpen: false,
    type: 'single',
  });

  // Take only the last 5 files sorted by uploadedAt descending
  const recentFiles = [...files]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 5);

  const selectedFiles = recentFiles.filter((f) => selectedFileIds.includes(f.id));
  const totalRecentBytes = recentFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  const toggleSelectFile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFileIds.length === recentFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(recentFiles.map((f) => f.id));
    }
  };

  const handleCopyLink = (file: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin + '#' + file.id);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBatchDownloadZip = async () => {
    if (selectedFiles.length === 0) return;
    try {
      setIsZipping(true);
      const zip = new JSZip();

      for (let i = 0; i < selectedFiles.length; i++) {
        const item = selectedFiles[i];
        let fileData: Blob | ArrayBuffer | string | null = item.blob || null;

        if (!fileData && item.dataUrl) {
          const res = await fetch(item.dataUrl);
          fileData = await res.blob();
        }

        if (fileData) {
          zip.file(item.name, fileData);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `filefly-recent-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to create ZIP bundle:', err);
      selectedFiles.forEach((file) => onDownload(file));
    } finally {
      setIsZipping(false);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const getFormatBadgeStyle = (ext: string) => {
    const e = ext.toLowerCase();
    if (e === 'heic') return 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-transparent dark:border-amber-700/40';
    if (e === 'pdf') return 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-transparent dark:border-red-700/40';
    if (e === 'png') return 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-transparent dark:border-blue-700/40';
    if (['jpg', 'jpeg'].includes(e)) return 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-transparent dark:border-sky-700/40';
    if (e === 'webp') return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-transparent dark:border-emerald-700/40';
    if (e === 'svg') return 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-transparent dark:border-purple-700/40';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent dark:border-slate-700';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner & Context */}
      <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#a3e635] text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Clock size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Active Project Work
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#a3e635]/20 text-lime-800 dark:text-[#a3e635] border border-[#a3e635]/40 flex items-center gap-1">
                  <Zap size={12} /> Last 5 Uploads
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Quick-access hub for your latest deliverables and categorized tags. Convert formats, download deliverables, or share with clients instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              id="recent-upload-trigger-btn"
              onClick={onTriggerUpload}
              className="px-4 py-2.5 bg-[#a3e635] hover:bg-[#bef264] text-slate-950 text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <UploadCloud size={16} />
              <span>Upload New</span>
            </button>
            <button
              id="recent-view-all-btn"
              onClick={onNavigateToAllFiles}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-all"
            >
              <span>All Files ({files.length})</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Quick Highlights Row */}
        {recentFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                Active Items
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {recentFiles.length} files
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                Recent Total Size
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                {formatBytes(totalRecentBytes)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                Latest Activity
              </span>
              <span className="text-base font-bold text-lime-600 dark:text-[#a3e635]">
                {formatRelativeTime(recentFiles[0].uploadedAt)}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Main Recent Files Content */}
      <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {/* Header toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Clock size={16} className="text-[#a3e635]" />
              Latest 5 Uploads
            </h4>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              ({recentFiles.length} of {files.length} total)
            </span>
          </div>

          {recentFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                id="recent-select-all-btn"
                onClick={toggleSelectAll}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                {selectedFileIds.length === recentFiles.length ? (
                  <>
                    <CheckSquare size={14} className="text-lime-600 dark:text-[#a3e635]" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square size={14} />
                    <span>Select All 5</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Batch Actions Toolbar when selected */}
        {selectedFileIds.length > 0 && (
          <div 
            id="recent-bulk-actions-toolbar"
            className="m-4 p-3 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800 animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-3 text-xs font-bold pl-2">
              <div className="w-5 h-5 rounded-lg bg-[#a3e635] text-slate-950 flex items-center justify-center font-extrabold text-[11px]">
                {selectedFileIds.length}
              </div>
              <span className="text-white">
                {selectedFileIds.length} recent {selectedFileIds.length === 1 ? 'file' : 'files'} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="recent-batch-download-btn"
                onClick={handleBatchDownloadZip}
                disabled={isZipping}
                className="px-3 py-1.5 bg-[#a3e635] hover:bg-[#bef264] text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                {isZipping ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <Download size={13} className="stroke-[2.5]" />
                )}
                <span>Download ZIP</span>
              </button>

              <button
                id="recent-batch-delete-btn"
                onClick={() => {
                  setDeleteModalState({
                    isOpen: true,
                    type: 'batch',
                    ids: selectedFileIds,
                  });
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {recentFiles.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-4">
              <FolderOpen size={28} />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No recent files yet
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-6">
              Upload client deliverables, HEIC photos, PDFs, or design exports to quickly access, tag, and convert them here.
            </p>
            <button
              onClick={onTriggerUpload}
              className="px-5 py-2.5 bg-slate-900 dark:bg-[#a3e635] text-white dark:text-slate-950 text-xs font-bold rounded-xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center gap-2"
            >
              <UploadCloud size={16} />
              <span>Upload Your First File</span>
            </button>
          </div>
        ) : (
          /* Detailed 5-Item Recent Cards List */
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {recentFiles.map((file, index) => {
              const isSelected = selectedFileIds.includes(file.id);
              const isImg = file.type.startsWith('image/');
              const fileTags = file.tags || [];

              return (
                <div
                  key={file.id}
                  id={`recent-item-${file.id}`}
                  onClick={() => onPreview(file)}
                  className={`p-5 sm:p-6 transition-colors cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected ? 'bg-lime-50/60 dark:bg-[#a3e635]/10' : ''
                  }`}
                >
                  {/* Left: Index badge, Checkbox, Icon, Name & Metadata */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                    {/* Index & Checkbox */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-5 text-[11px] font-extrabold text-slate-400 dark:text-slate-500 font-mono text-center">
                        #{index + 1}
                      </span>
                      <label
                        className="p-1 rounded-md cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                        onClick={(e) => toggleSelectFile(file.id, e)}
                      >
                        <input
                          id={`recent-checkbox-${file.id}`}
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectFile(file.id)}
                          className="sr-only"
                        />
                        {isSelected ? (
                          <CheckSquare size={17} className="text-lime-600 dark:text-[#a3e635]" />
                        ) : (
                          <Square size={17} className="text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400" />
                        )}
                      </label>
                    </div>

                    {/* File Icon */}
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs">
                      {isImg ? <ImageIcon size={20} /> : <FileText size={20} />}
                    </div>

                    {/* Name & Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-xs sm:max-w-md">
                          {file.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${getFormatBadgeStyle(
                            file.extension
                          )}`}
                        >
                          {file.extension}
                        </span>
                        {file.conversionFormat && (
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 text-[10px] font-bold rounded-md flex items-center gap-1">
                            <Sparkles size={9} /> Converted
                          </span>
                        )}
                      </div>

                      {/* Tags & Time row */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                        <span className="text-lime-700 dark:text-[#a3e635] font-semibold flex items-center gap-1">
                          <Clock size={12} /> {formatRelativeTime(file.uploadedAt)}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          {formatBytes(file.size)}
                        </span>
                        {file.clientName && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                              <TagIcon size={10} /> {file.clientName}
                            </span>
                          </>
                        )}
                        {fileTags.length > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {fileTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-semibold"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action buttons */}
                  <div
                    className="flex items-center gap-2 shrink-0 self-end sm:self-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Quick Convert */}
                    <button
                      id={`recent-convert-btn-${file.id}`}
                      onClick={() => onConvert(file)}
                      className="px-3.5 py-2 bg-lime-100 dark:bg-lime-950/80 hover:bg-lime-200 dark:hover:bg-lime-900/60 text-lime-800 dark:text-[#a3e635] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-lime-200 dark:border-[#a3e635]/40 shadow-2xs"
                      title="Convert to another format"
                    >
                      <Repeat size={13} />
                      <span>Convert</span>
                    </button>

                    {/* Preview */}
                    <button
                      id={`recent-preview-btn-${file.id}`}
                      onClick={() => onPreview(file)}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                      title="Preview file"
                    >
                      <Eye size={16} />
                    </button>

                    {/* Copy Link */}
                    <button
                      id={`recent-share-btn-${file.id}`}
                      onClick={(e) => handleCopyLink(file, e)}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors relative"
                      title="Copy Share Link"
                    >
                      {copiedId === file.id ? (
                        <CheckCircle2 size={16} className="text-[#a3e635]" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>

                    {/* Download */}
                    <button
                      id={`recent-download-btn-${file.id}`}
                      onClick={() => onDownload(file)}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                      title="Download file"
                    >
                      <Download size={16} />
                    </button>

                    {/* Delete */}
                    <button
                      id={`recent-delete-btn-${file.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModalState({
                          isOpen: true,
                          type: 'single',
                          file,
                        });
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                      title="Delete file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, type: 'single' })}
        onConfirm={() => {
          if (deleteModalState.type === 'single' && deleteModalState.file) {
            onDelete(deleteModalState.file.id);
          } else if (deleteModalState.type === 'batch' && deleteModalState.ids) {
            onBatchDelete(deleteModalState.ids);
            setSelectedFileIds([]);
          }
        }}
        title={deleteModalState.type === 'batch' ? 'Delete Selected Recent Files' : 'Delete File'}
        itemName={deleteModalState.file?.name}
        itemCount={deleteModalState.type === 'batch' ? deleteModalState.ids?.length || 0 : 1}
      />
    </div>
  );
};
