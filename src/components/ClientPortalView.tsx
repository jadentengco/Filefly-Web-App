import React, { useState } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  UploadCloud, 
  Lock, 
  Settings, 
  ShieldCheck,
  UserCheck,
  Send
} from 'lucide-react';
import { FireflyLogo } from './FireflyLogo';
import { User, FileItem } from '../types';
import { FileUpload } from './FileUpload';

interface ClientPortalViewProps {
  currentUser: User;
  onFilesUploaded: (files: FileItem[]) => void;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  currentUser,
  onFilesUploaded,
}) => {
  const [copied, setCopied] = useState(false);
  const [portalTitle, setPortalTitle] = useState(`${currentUser.name}'s Client Asset Portal`);
  const [welcomeMsg, setWelcomeMsg] = useState(
    'Please upload your high-resolution assets, brand files, or review deliverables. Files are automatically formatted and encrypted.'
  );
  const [isClientPreviewMode, setIsClientPreviewMode] = useState(false);

  const portalUrl = `${window.location.origin}/portal/${currentUser.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-lime-700 dark:text-[#a3e635] bg-lime-100 dark:bg-lime-950/80 px-2.5 py-1 rounded-full inline-flex items-center gap-1 mb-2 border border-transparent dark:border-lime-700/40">
              <Share2 size={12} /> Client Collaboration
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Shareable Client Upload & Conversion Portal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Send this private link to your design clients. They can securely upload large design files and convert them into JPEGs, PNGs, WebP, or PDFs on the fly without creating an account.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="toggle-client-preview-btn"
              onClick={() => setIsClientPreviewMode(!isClientPreviewMode)}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                isClientPreviewMode
                  ? 'bg-slate-950 dark:bg-[#a3e635] text-white dark:text-slate-950 border-slate-950 dark:border-[#a3e635]'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {isClientPreviewMode ? 'Exit Client Preview' : 'Preview Client View'}
            </button>
          </div>
        </div>

        {/* Shareable Link Box */}
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-lime-500/20 dark:bg-[#a3e635]/20 text-lime-700 dark:text-[#a3e635] flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Your Client Portal URL</p>
              <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                {portalUrl}
              </p>
            </div>
          </div>

          <button
            id="copy-portal-link-btn"
            onClick={handleCopyLink}
            className="px-4 py-2 bg-slate-950 dark:bg-[#a3e635] hover:bg-slate-900 dark:hover:bg-[#bef264] text-white dark:text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all shrink-0"
          >
            {copied ? (
              <>
                <Check size={14} className="text-lime-400 dark:text-slate-950" />
                <span>Copied Link!</span>
              </>
            ) : (
              <>
                <Copy size={14} className="text-lime-400 dark:text-slate-950" />
                <span>Copy Share Link</span>
              </>
            )}
          </button>
        </div>

        {/* Portal Customization Form */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Portal Headline / Client Name
            </label>
            <input
              type="text"
              value={portalTitle}
              onChange={(e) => setPortalTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-lime-500 dark:focus:border-[#a3e635] outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Welcome Instructions for Clients
            </label>
            <input
              type="text"
              value={welcomeMsg}
              onChange={(e) => setWelcomeMsg(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-lime-500 dark:focus:border-[#a3e635] outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Live Client Preview Mode */}
      {isClientPreviewMode && (
        <div className="border-2 border-dashed border-[#a3e635] rounded-3xl p-6 bg-slate-100/60 dark:bg-slate-900/60 animate-in fade-in duration-200">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-950 bg-[#a3e635] px-3 py-1 rounded-full">
              LIVE PREVIEW: What Your Client Sees
            </span>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Client portal banner */}
            <div className="bg-[#a3e635] p-6 text-slate-950">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/40 p-2 rounded-2xl border border-white/40">
                  <FireflyLogo size={32} glow={false} />
                </div>
                <div>
                  <h1 className="text-xl font-black">{portalTitle}</h1>
                  <p className="text-xs font-bold text-slate-800">
                    Powered by Filefly Secure Dropzone
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-900 max-w-lg mt-2 bg-white/40 p-2.5 rounded-xl border border-white/30 font-medium">
                {welcomeMsg}
              </p>
            </div>

            {/* Upload Area for Client */}
            <div className="p-6">
              <FileUpload
                userId={currentUser.id}
                onFilesUploaded={onFilesUploaded}
                defaultClientTag="Client Upload"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
