import React, { useState } from 'react';
import { 
  X, 
  Tag as TagIcon, 
  Plus, 
  Check, 
  Trash2, 
  Sparkles, 
  FolderPlus,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { FileItem } from '../types';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFiles: FileItem[];
  allKnownTags: string[];
  onApplyTags: (fileIds: string[], tags: string[]) => void;
}

const PRESET_SUGGESTIONS = [
  'Branding',
  'Final',
  'Draft',
  'Approved',
  'Client Review',
  'High-Res',
  'Print-Ready',
  'Web',
  'Social Media',
  'Packaging',
  'Vector',
  'Confidential',
];

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
  targetFiles,
  allKnownTags,
  onApplyTags,
}) => {
  if (!isOpen || targetFiles.length === 0) return null;

  // Initialize selected tags:
  // If 1 file, start with its existing tags.
  // If multiple, start with the intersection or common tags, or empty.
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (targetFiles.length === 1) {
      return [...(targetFiles[0].tags || [])];
    }
    // For multiple files, find union of all tags initially or empty
    const allTags = new Set<string>();
    targetFiles.forEach((f) => f.tags?.forEach((t) => allTags.add(t)));
    return Array.from(allTags);
  });

  const [customTagInput, setCustomTagInput] = useState('');

  const isMultiple = targetFiles.length > 1;

  const combinedSuggestions = Array.from(
    new Set([...allKnownTags, ...PRESET_SUGGESTIONS])
  ).filter(Boolean);

  const toggleTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setSelectedTags((prev) =>
      prev.some((t) => t.toLowerCase() === trimmed.toLowerCase())
        ? prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())
        : [...prev, trimmed]
    );
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    if (!selectedTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setCustomTagInput('');
  };

  const handleSave = () => {
    const fileIds = targetFiles.map((f) => f.id);
    onApplyTags(fileIds, selectedTags);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="tag-manager-modal-card"
        className="bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col transition-colors animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 dark:bg-lime-950/80 text-lime-800 dark:text-[#a3e635] flex items-center justify-center border border-lime-200 dark:border-[#a3e635]/40 shrink-0 shadow-2xs">
              <TagIcon size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isMultiple ? `Manage Tags (${targetFiles.length} files)` : 'Manage File Tags'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-sm">
                {isMultiple
                  ? `Categorize ${targetFiles.length} selected files simultaneously`
                  : targetFiles[0].name}
              </p>
            </div>
          </div>
          <button
            id="close-tag-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Custom Tag Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Add New Custom Tag
            </label>
            <form onSubmit={handleAddCustomTag} className="flex gap-2">
              <div className="relative flex-1">
                <TagIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="custom-tag-input-field"
                  type="text"
                  placeholder="e.g. Social Campaign, Q3 Deliverable..."
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-[#a3e635] focus:ring-1 focus:ring-[#a3e635]"
                />
              </div>
              <button
                id="add-tag-submit-btn"
                type="submit"
                disabled={!customTagInput.trim()}
                className="px-4 py-2.5 bg-slate-900 dark:bg-[#a3e635] text-white dark:text-slate-950 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-[#bef264] disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Active / Assigned Tags on this selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Assigned Tags ({selectedTags.length})
              </span>
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold"
                >
                  Clear all
                </button>
              )}
            </div>

            {selectedTags.length === 0 ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  No tags assigned yet. Choose from suggestions below or create custom tags.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#a3e635]/20 text-lime-900 dark:text-[#a3e635] border border-[#a3e635]/40 rounded-xl text-xs font-bold shadow-2xs group"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="p-0.5 hover:bg-lime-300/40 dark:hover:bg-lime-900/60 rounded-md transition-colors"
                      title={`Remove tag ${tag}`}
                    >
                      <X size={12} className="stroke-[2.5]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Suggested / Available Tags to click */}
          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#a3e635]" />
              Suggested & Existing Tags
            </span>

            <div className="flex flex-wrap gap-2">
              {combinedSuggestions.map((tag) => {
                const isSelected = selectedTags.some(
                  (t) => t.toLowerCase() === tag.toLowerCase()
                );
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-lime-400 dark:hover:border-[#a3e635] hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isSelected ? (
                      <Check size={12} className="text-[#a3e635] dark:text-lime-700 stroke-[3]" />
                    ) : (
                      <Plus size={12} className="text-slate-400" />
                    )}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          
          <button
            id="apply-tags-btn"
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#a3e635] hover:bg-[#bef264] text-slate-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <CheckCircle2 size={15} />
            <span>Apply Tags ({selectedTags.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
