import React, { useEffect, useState, useCallback } from 'react';
import { X, Download, Smartphone, Zap, Wifi, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STORAGE_KEY = 'pwa_install_dismissed_at';
const RETRY_DAYS = 3;

// ── Detect iOS ───────────────────────────────────────────────────────────────
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(window.navigator as any).standalone;

// ── iOS install instructions modal ───────────────────────────────────────────
function IOSInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="bg-slate-950 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm">Install on iPhone / iPad</p>
            <p className="text-slate-400 text-[11px] mt-0.5">Follow 2 simple steps</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-slate-900 rounded-2xl p-3.5 border border-slate-800">
            <span className="w-6 h-6 bg-indigo-600 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <p className="text-white text-xs font-bold">Tap the Share button</p>
              <p className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-1">
                Look for <Share className="w-3 h-3 inline text-indigo-400 mx-1" /> at the bottom of Safari
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-slate-900 rounded-2xl p-3.5 border border-slate-800">
            <span className="w-6 h-6 bg-indigo-600 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <p className="text-white text-xs font-bold">Tap "Add to Home Screen"</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Scroll down in the share sheet and tap it</p>
            </div>
          </div>
        </div>
        <p className="text-slate-500 text-[10px] text-center mt-4">Works on Safari browser only</p>
      </motion.div>
    </div>
  );
}

// ── Floating auto-popup (shown on first visit) ────────────────────────────────
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const days = (Date.now() - parseInt(dismissed)) / 86400000;
      if (days < RETRY_DAYS) return;
    }

    if (isIOS()) {
      setTimeout(() => setVisible(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setVisible(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS()) { setShowIOS(true); setVisible(false); return; }
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { setVisible(false); setDeferredPrompt(null); }
    else setInstalling(false);
  };

  const handleLater = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setVisible(false);
  };

  return (
    <>
      <AnimatePresence>
        {showIOS && <IOSInstructions onClose={() => setShowIOS(false)} />}
        {visible && !showIOS && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="fixed bottom-4 left-3 right-3 z-[9999] max-w-sm mx-auto"
          >
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl shadow-black/40">
              <button onClick={handleLater} className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-black text-sm">Install Master Aptitude</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">App-like experience on your device</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[{ icon: Zap, label: 'Faster Access' }, { icon: Wifi, label: 'Offline Mode' }, { icon: Smartphone, label: 'Full Screen' }].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 bg-slate-900 rounded-2xl p-2.5 border border-slate-800">
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-bold text-slate-400 text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleInstall} disabled={installing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-xs rounded-2xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 shadow-lg shadow-indigo-900/30">
                  <Download className="w-4 h-4" />
                  {installing ? 'Installing…' : 'Install Now'}
                </button>
                <button onClick={handleLater} className="px-4 py-3 text-slate-400 font-bold text-xs rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 active:scale-95 transition-all">
                  Later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Sidebar install button (always visible) ───────────────────────────────────
export function InstallAppSidebarButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleClick = useCallback(async () => {
    if (installed) return;
    if (isIOS()) { setShowIOS(true); return; }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
    } else {
      // Desktop or no prompt available — show generic hint
      alert('To install: open this site in Chrome on Android, then tap the menu (⋮) → "Add to Home Screen".');
    }
  }, [deferredPrompt, installed]);

  if (installed) return null;

  return (
    <>
      <AnimatePresence>
        {showIOS && <IOSInstructions onClose={() => setShowIOS(false)} />}
      </AnimatePresence>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group"
        style={{ background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', border: '1px solid #c7d2fe' }}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <Download className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-black text-indigo-700 leading-tight">Install App</div>
          <div className="text-[10px] text-indigo-400 font-medium leading-tight mt-0.5">Add to home screen</div>
        </div>
        <Download className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:translate-y-0.5 transition-transform" />
      </button>
    </>
  );
}
