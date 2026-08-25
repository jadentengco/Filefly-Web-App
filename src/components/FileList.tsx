import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Repeat, 
  Trash2, 
  Download, 
  Eye, 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  MinusSquare,
  LayoutGrid, 
  List, 
  ArrowUpDown,
  Tag as TagIcon,
  Sparkles,
  Calendar,
  Layers,
  FolderOpen,
  Archive,
  CheckCircle2,
  X,
  Plus,
  Hash
} from 'lucide-react';
import JSZip from 'jszip';
import { FileItem, SupportedFormat } from '../types';
import { formatBytes, getFileCategory } from '../lib/converter';
import { TagManagerModal } from './TagManagerModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface FileListProps {
  files: FileItem[];
  onPreview: (file: FileItem) => void;
  onConvert: (file: FileItem) => void;
  onDelete: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onDownload: (file: FileItem) => void;
  onBatchDownload?: (files: FileItem[]) => void;
  onUpdateTags: (fileIds: string[], tags: string[]) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onPreview,
  onConvert,
  onDelete,
  onBatchDelete,
  onDownload,
  onBatchDownload,
  onUpdateTags,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'image' | 'document' | 'vector' | 'converted'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isZipping, setIsZipping] = useState(false);

  // Tag manager modal states
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagModalTargetFiles, setTagModalTargetFiles] = useState<FileItem[]>([]);

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

  // Collect all unique tags and tag counts across all files
  const { allUniqueTags, tagCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    files.forEach((f) => {
      f.tags?.forEach((t) => {
        const clean = t.trim();
        if (clean) {
          counts[clean] = (counts[clean] || 0) + 1;
        }
      });
    });
    const unique = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return { allUniqueTags: unique, tagCounts: counts };
  }, [files]);

  // Filter files based on search, category, and selected tag
  const filteredFiles = files.filter((file) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      file.name.toLowerCase().includes(query) ||
      (file.clientName && file.clientName.toLowerCase().includes(query)) ||
      file.extension.toLowerCase().includes(query) ||
      file.tags?.some((t) => t.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    // Category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'converted') {
        if (!file.convertedFromId && !file.conversionFormat) return false;
      } else {
        if (getFileCategory(file.extension) !== selectedCategory) return false;
      }
    }

    // Tag filter
    if (selectedTagFilter) {
      if (!file.tags || !file.tags.includes(selectedTagFilter)) return false;
    }

    return true;
  });

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'date') {
      comp = new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    } else if (sortBy === 'name') {
      comp = a.name.localeCompare(b.name);
    } else if (sortBy === 'size') {
      comp = b.size - a.size;
    }
    return sortOrder === 'asc' ? -comp : comp;
  });

  const selectedFiles = sortedFiles.filter((f) => selectedFileIds.includes(f.id));
  const totalSelectedBytes = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  const isAllSelected = sortedFiles.length > 0 && selectedFileIds.length === sortedFiles.length;
  const isPartiallySelected = selectedFileIds.length > 0 && selectedFileIds.length < sortedFiles.length;

  const toggleSelectAll = () => {
    if (selectedFileIds.length === sortedFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(sortedFiles.map((f) => f.id));
    }
  };

  const toggleSelectFile = (id: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e) e.stopPropagation();
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenTagModalForSingle = (file: FileItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTagModalTargetFiles([file]);
    setTagModalOpen(true);
  };

  const handleOpenTagModalForSelected = () => {
    if (selectedFiles.length === 0) return;
    setTagModalTargetFiles(selectedFiles);
    setTagModalOpen(true);
  };

  const handleRemoveSingleTag = (file: FileItem, tagToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = (file.tags || []).filter((t) => t !== tagToRemove);
    onUpdateTags([file.id], updated);
  };

  const handleBatchDeleteAction = () => {
    if (selectedFileIds.length === 0) return;
    setDeleteModalState({
      isOpen: true,
      type: 'batch',
      ids: selectedFileIds,
    });
  };

  const handleBatchDownloadZip = async () => {
    if (selectedFiles.length === 0) return;
    
    if (onBatchDownload) {
      onBatchDownload(selectedFiles);
      return;
    }

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
          const filename = item.name;
          zip.file(filename, fileData);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `filefly-bundle-${new Date().toISOString().slice(0, 10)}.zip`;
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
    <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1 transition-colors">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h4 className="font-bold text-slate-900 dark:text-white text-base">Files & Deliverables</h4>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            ({sortedFiles.length} of {files.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="file-search-input"
              type="text"
              placeholder="Search by name, tag, format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-lime-500 dark:focus:border-[#a3e635] w-40 sm:w-56"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="hidden md:flex items-center p-0.5 bg-slate-200/60 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
            {[
              { id: 'all', label: 'All' },
              { id: 'image', label: 'Images' },
              { id: 'document', label: 'PDFs' },
              { id: 'converted', label: 'Converted' },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`filter-tab-${tab.id}`}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedCategory === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Toggle (Table / Grid) */}
          <div className="flex items-center p-0.5 bg-slate-200/60 dark:bg-slate-800 rounded-xl">
            <button
              id="view-table-btn"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Table View"
            >
              <List size={14} />
            </button>
            <button
              id="view-grid-btn"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Tag Management & Category Filter Bar */}
      <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-[#111827] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <TagIcon size={12} className="text-[#a3e635]" /> Filter by Tag:
          </span>

          {/* All Tags Pill */}
          <button
            id="tag-filter-all"
            onClick={() => setSelectedTagFilter(null)}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
              selectedTagFilter === null
                ? 'bg-slate-900 dark:bg-[#a3e635] text-white dark:text-slate-950 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>All Tags</span>
          </button>

          {/* Individual Tag Pills */}
          {allUniqueTags.map((tag) => {
            const isSelected = selectedTagFilter === tag;
            const count = tagCounts[tag] || 0;

            return (
              <button
                key={tag}
                id={`tag-filter-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-[#a3e635] text-slate-950 border-[#a3e635] shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-lime-400 dark:hover:border-[#a3e635]'
                }`}
              >
                <span>#{tag}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    isSelected
                      ? 'bg-slate-950 text-white'
                      : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {allUniqueTags.length === 0 && (
            <span className="text-[11px] text-slate-400 italic">
              No tags created yet. Add tags to organize project files!
            </span>
          )}
        </div>

        {/* Create/Manage Tag Button */}
        <button
          id="manage-tags-toolbar-btn"
          onClick={() => {
            if (files.length > 0) {
              setTagModalTargetFiles(files.slice(0, 1));
              setTagModalOpen(true);
            }
          }}
          className="text-xs font-bold text-lime-700 dark:text-[#a3e635] hover:underline flex items-center gap-1 shrink-0 ml-auto"
        >
          <Plus size={13} />
          <span>New Custom Tag</span>
        </button>
      </div>

      {/* Batch Actions Bar (when items are selected) */}
      {selectedFileIds.length > 0 && (
        <div 
          id="bulk-actions-toolbar"
          className="m-4 p-3 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3 text-xs font-bold pl-2">
            <div className="w-5 h-5 rounded-lg bg-[#a3e635] text-slate-950 flex items-center justify-center font-extrabold text-[11px]">
              {selectedFileIds.length}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">
                {selectedFileIds.length} {selectedFileIds.length === 1 ? 'file' : 'files'} selected
              </span>
              <span className="text-slate-400 font-mono font-medium text-[11px]">
                ({formatBytes(totalSelectedBytes)})
              </span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Bulk Tag Management Button */}
            <button
              id="batch-tag-btn"
              onClick={handleOpenTagModalForSelected}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-700 shadow-xs transition-all"
              title="Add or edit tags for selected files"
            >
              <TagIcon size={13} className="text-[#a3e635]" />
              <span>Tag Selected ({selectedFileIds.length})</span>
            </button>

            {/* Bulk Download Button */}
            <button
              id="batch-download-btn"
              onClick={handleBatchDownloadZip}
              disabled={isZipping}
              className="px-3.5 py-1.5 bg-[#a3e635] hover:bg-[#bef264] text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
              title="Download selected items as ZIP archive"
            >
              {isZipping ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <Download size={13} className="stroke-[2.5]" />
              )}
              <span>{isZipping ? 'Bundling ZIP...' : `Download ${selectedFileIds.length > 1 ? `ZIP (${selectedFileIds.length})` : ''}`}</span>
            </button>

            {/* Bulk Delete Button */}
            <button
              id="batch-delete-btn"
              onClick={handleBatchDeleteAction}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
              title="Delete all selected files"
            >
              <Trash2 size={13} />
              <span>Delete ({selectedFileIds.length})</span>
            </button>

            {/* Deselect Button */}
            <button
              id="batch-deselect-btn"
              onClick={() => setSelectedFileIds([])}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1"
              title="Clear selection"
            >
              <X size={13} />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}

      {/* Files Display */}
      {sortedFiles.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-3">
            <FolderOpen size={24} />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No files found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {searchQuery || selectedTagFilter
              ? 'No files match your current filters. Try resetting search or tag selection.'
              : 'Upload your design assets or documents to convert and manage them in Filefly.'}
          </p>
          {(searchQuery || selectedTagFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTagFilter(null);
                setSelectedCategory('all');
              }}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse" id="file-portal-table">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="py-3.5 px-6 w-12 text-center">
                  <label 
                    className="inline-flex items-center justify-center cursor-pointer p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={isAllSelected ? 'Deselect all files' : 'Select all files'}
                  >
                    <input
                      id="select-all-files-checkbox"
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartiallySelected;
                      }}
                      onChange={toggleSelectAll}
                      className="sr-only"
                    />
                    {isAllSelected ? (
                      <CheckSquare size={16} className="text-lime-600 dark:text-[#a3e635]" />
                    ) : isPartiallySelected ? (
                      <MinusSquare size={16} className="text-lime-600 dark:text-[#a3e635]" />
                    ) : (
                      <Square size={16} className="text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400" />
                    )}
                  </label>
                </th>
                <th
                  className="py-3 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                  onClick={() => {
                    if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortBy('name');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>File Name</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="py-3 px-6">Tags & Category</th>
                <th className="py-3 px-6 text-center">Format</th>
                <th
                  className="py-3 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                  onClick={() => {
                    if (sortBy === 'size') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortBy('size');
                      setSortOrder('desc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>File Size</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th
                  className="py-3 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                  onClick={() => {
                    if (sortBy === 'date') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortBy('date');
                      setSortOrder('desc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Upload Date</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50 dark:divide-slate-800/80">
              {sortedFiles.map((file) => {
                const isSelected = selectedFileIds.includes(file.id);
                const isImg = file.type.startsWith('image/');
                const fileTags = file.tags || [];

                return (
                  <tr
                    key={file.id}
                    id={`file-row-${file.id}`}
                    onClick={() => onPreview(file)}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-lime-50/60 dark:bg-[#a3e635]/10' : ''
                    }`}
                  >
                    {/* Checkbox Column */}
                    <td 
                      className="py-3.5 px-6 text-center w-12" 
                      onClick={(e) => toggleSelectFile(file.id, e)}
                    >
                      <label 
                        className="inline-flex items-center justify-center cursor-pointer p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          id={`checkbox-file-${file.id}`}
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectFile(file.id, e)}
                          className="sr-only"
                        />
                        {isSelected ? (
                          <CheckSquare size={16} className="text-lime-600 dark:text-[#a3e635]" />
                        ) : (
                          <Square size={16} className="text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400" />
                        )}
                      </label>
                    </td>

                    {/* Name & Icon */}
                    <td className="py-3.5 px-6 font-semibold text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                          {isImg ? <ImageIcon size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="min-w-0 max-w-xs sm:max-w-md">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                            {file.conversionFormat && (
                              <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 text-[10px] font-bold rounded-md flex items-center gap-1">
                                <Sparkles size={9} /> Converted
                              </span>
                            )}
                          </div>
                          {file.clientName && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                              <TagIcon size={10} /> {file.clientName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tags Column with Interactive Badges & Add Tag */}
                    <td className="py-3.5 px-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                        {fileTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-lime-100 dark:hover:bg-[#a3e635]/20 text-slate-700 dark:text-slate-300 hover:text-lime-900 dark:hover:text-[#a3e635] text-[11px] font-bold rounded-md border border-slate-200 dark:border-slate-700 transition-colors group"
                          >
                            <span>#{tag}</span>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveSingleTag(file, tag, e)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-0.2"
                              title={`Remove tag #${tag}`}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}

                        {/* Inline Add Tag Button */}
                        <button
                          id={`add-tag-btn-${file.id}`}
                          type="button"
                          onClick={(e) => handleOpenTagModalForSingle(file, e)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-lime-700 dark:hover:text-[#a3e635] bg-slate-50 dark:bg-slate-900/60 hover:bg-lime-50 dark:hover:bg-lime-950/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-md transition-colors"
                          title="Manage custom tags"
                        >
                          <Plus size={10} />
                          <span>Tag</span>
                        </button>
                      </div>
                    </td>

                    {/* Format Badge */}
                    <td className="py-3.5 px-6 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase inline-block ${getFormatBadgeStyle(
                          file.extension
                        )}`}
                      >
                        {file.extension}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {formatBytes(file.size)}
                    </td>

                    {/* Upload Date */}
                    <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400 text-xs">
                      {new Date(file.uploadedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-6 text-right space-x-2">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Convert Button */}
                        <button
                          id={`convert-btn-${file.id}`}
                          onClick={() => onConvert(file)}
                          className="px-3 py-1 bg-lime-100 dark:bg-lime-950/80 text-lime-700 dark:text-[#a3e635] rounded-lg text-xs font-bold border border-lime-200 dark:border-[#a3e635]/40 hover:bg-lime-200 dark:hover:bg-lime-900/60 transition-colors inline-flex items-center gap-1"
                          title="Convert Format"
                        >
                          <Repeat size={12} />
                          <span>Convert</span>
                        </button>

                        {/* Download Button */}
                        <button
                          id={`download-btn-${file.id}`}
                          onClick={() => onDownload(file)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors inline-block align-middle"
                          title="Download"
                        >
                          <Download size={15} />
                        </button>

                        {/* Delete Button */}
                        <button
                          id={`delete-btn-${file.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalState({
                              isOpen: true,
                              type: 'single',
                              file,
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors inline-block align-middle"
                          title="Delete File"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid / Card View */
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedFiles.map((file) => {
            const isSelected = selectedFileIds.includes(file.id);
            const isImg = file.type.startsWith('image/');
            const fileTags = file.tags || [];

            return (
              <div
                key={file.id}
                id={`file-card-${file.id}`}
                onClick={() => onPreview(file)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-lime-500 dark:border-[#a3e635] bg-lime-50/40 dark:bg-[#a3e635]/10 ring-2 ring-lime-300 dark:ring-[#a3e635]/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151f32] hover:border-lime-400 dark:hover:border-[#a3e635] hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                      {isImg ? <ImageIcon size={18} /> : <FileText size={18} />}
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${getFormatBadgeStyle(
                          file.extension
                        )}`}
                      >
                        {file.extension}
                      </span>
                      {/* Checkbox in card */}
                      <label 
                        className="p-1 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title={isSelected ? 'Deselect' : 'Select'}
                      >
                        <input
                          id={`checkbox-card-${file.id}`}
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectFile(file.id, e)}
                          className="sr-only"
                        />
                        {isSelected ? (
                          <CheckSquare size={16} className="text-lime-600 dark:text-[#a3e635]" />
                        ) : (
                          <Square size={16} />
                        )}
                      </label>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-lime-600 dark:group-hover:text-[#a3e635] transition-colors">
                    {file.name}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                    <span>{formatBytes(file.size)}</span>
                    <span>•</span>
                    <span>
                      {new Date(file.uploadedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {file.clientName && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold rounded-md border border-slate-100 dark:border-slate-700">
                      <TagIcon size={10} /> {file.clientName}
                    </div>
                  )}

                  {/* Tags in Grid Card */}
                  <div 
                    className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {fileTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700 group/tag"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveSingleTag(file, tag, e)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={(e) => handleOpenTagModalForSingle(file, e)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-lime-700 dark:hover:text-[#a3e635] bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-md transition-colors"
                      title="Manage custom tags"
                    >
                      <Plus size={9} />
                      <span>Tag</span>
                    </button>
                  </div>
                </div>

                {/* Card Action footer */}
                <div
                  className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onConvert(file)}
                    className="flex-1 py-1.5 bg-lime-100 dark:bg-lime-950/80 hover:bg-lime-200 dark:hover:bg-lime-900/60 text-lime-800 dark:text-[#a3e635] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-lime-200 dark:border-[#a3e635]/40"
                  >
                    <Repeat size={13} />
                    Convert
                  </button>

                  <button
                    onClick={() => onDownload(file)}
                    className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download size={15} />
                  </button>

                  <button
                    id={`grid-delete-btn-${file.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModalState({
                        isOpen: true,
                        type: 'single',
                        file,
                      });
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Delete File"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tag Manager Modal */}
      <TagManagerModal
        isOpen={tagModalOpen}
        onClose={() => {
          setTagModalOpen(false);
          setTagModalTargetFiles([]);
        }}
        targetFiles={tagModalTargetFiles}
        allKnownTags={allUniqueTags}
        onApplyTags={(fileIds, tags) => {
          onUpdateTags(fileIds, tags);
        }}
      />

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
        title={deleteModalState.type === 'batch' ? 'Delete Selected Files' : 'Delete File'}
        itemName={deleteModalState.file?.name}
        itemCount={deleteModalState.type === 'batch' ? deleteModalState.ids?.length || 0 : 1}
      />
    </section>
  );
};
