import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Sparkles, Download, RefreshCw, CheckCircle2, AlertCircle, X } from 'lucide-react';

export const UpdateBanner: React.FC = () => {
  const theme = useAppStore(state => state.theme);
  const updateInfo = useAppStore(state => state.updateInfo);
  const isInstallingUpdate = useAppStore(state => state.isInstallingUpdate);
  const updateInstallSuccess = useAppStore(state => state.updateInstallSuccess);
  const updateError = useAppStore(state => state.updateError);
  const dismissUpdateBanner = useAppStore(state => state.dismissUpdateBanner);
  const installAppUpdate = useAppStore(state => state.installAppUpdate);
  const restartApp = useAppStore(state => state.restartApp);
  const setDismissUpdateBanner = useAppStore(state => state.setDismissUpdateBanner);

  // Only show if an update is available and not dismissed
  if (!updateInfo?.has_update || dismissUpdateBanner) {
    return null;
  }

  return (
    <div className={`mb-6 p-4 rounded-2xl border transition-all duration-300 shadow-xl ${
      theme === 'light'
        ? 'bg-gradient-to-r from-purple-100/90 via-white to-purple-50/90 border-purple-300 shadow-purple-900/10 text-slate-900'
        : 'bg-gradient-to-r from-[#170e2b] via-zinc-900 to-zinc-900 border-purple-500/50 shadow-black/60 text-white'
    }`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            updateInstallSuccess
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-purple-600/20 border-purple-500/40 text-purple-400'
          }`}>
            {updateInstallSuccess ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider ${
                updateInstallSuccess ? 'text-emerald-500' : 'text-purple-500'
              }`}>
                {updateInstallSuccess ? '✓ Update Installed' : '✨ New Update Available'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                theme === 'light'
                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                  : 'bg-purple-950 text-purple-300 border-purple-800'
              }`}>
                v{updateInfo.latest_version}
              </span>
              {updateInfo.published_at && (
                <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-zinc-400'}`}>
                  • Released {updateInfo.published_at}
                </span>
              )}
            </div>

            <p className={`text-xs font-medium max-w-2xl leading-relaxed ${
              theme === 'light' ? 'text-slate-700' : 'text-zinc-300'
            }`}>
              {updateInstallSuccess
                ? 'The new version is installed in ~/.local/bin/lyncost. Restart the application to activate the update.'
                : updateInfo.release_notes || 'A new release is ready with latest UI enhancements and security fixes.'}
            </p>

            {updateError && (
              <div className="flex items-center gap-1.5 text-rose-500 text-xs font-bold pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{updateError}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
          {updateInstallSuccess ? (
            <button
              onClick={restartApp}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-all animate-pulse"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart Lyncost</span>
            </button>
          ) : (
            <button
              disabled={isInstallingUpdate}
              onClick={installAppUpdate}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 active:scale-95 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-purple-950/40 cursor-pointer transition-all"
            >
              {isInstallingUpdate ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Downloading & Installing...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Update Now</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setDismissUpdateBanner(true)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              theme === 'light'
                ? 'hover:bg-purple-200/50 text-slate-500 hover:text-slate-900'
                : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
