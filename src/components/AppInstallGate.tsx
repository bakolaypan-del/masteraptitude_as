import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Share, Smartphone, Zap, Wifi, ShieldCheck, Star } from 'lucide-react';

const SESSION_KEY = 'ma_gate_dismissed';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;
const isMobileDevice = () => /android|iphone|ipad|ipod/i.test(navigator.userAgent);

export default function AppInstallGate() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canSkip, setCanSkip] = useState(false);
  const [iosSteps, setIosSteps] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!isMobileDevice() || isStandalone()) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setShow(true);
    const t = setTimeout(() => setCanSkip(true), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS()) { setIosSteps(true); return; }
    if (deferredPrompt) {
      setInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { setShow(false); return; }
      setInstalling(false);
    } else {
      setIosSteps(true);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  if (iosSteps) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col overflow-y-auto"
        style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0d1b2a 100%)' }}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[28px] flex items-center justify-center shadow-2xl mb-6"
            style={{ boxShadow: '0 16px 48px rgba(99,102,241,0.5)' }}>
            <span className="text-4xl font-black text-white">M</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Install on iPhone</h1>
          <p className="text-white/50 text-sm mb-8">Follow 2 quick steps to add to your home screen</p>

          <div className="w-full max-w-sm space-y-3 mb-8">
            <div className="flex items-start gap-4 bg-white/[0.07] rounded-2xl p-4 border border-white/10 text-left">
              <span className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-white font-bold text-sm">Tap the Share button</p>
                <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
                  Look for <Share className="w-3.5 h-3.5 text-indigo-400 mx-1" /> at the bottom of Safari
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-white/[0.07] rounded-2xl p-4 border border-white/10 text-left">
              <span className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-white font-bold text-sm">Tap "Add to Home Screen"</p>
                <p className="text-white/50 text-xs mt-1">Scroll down in the share sheet and tap it</p>
              </div>
            </div>
          </div>

          <button onClick={handleSkip}
            className="text-white/40 text-sm font-bold underline underline-offset-2">
            Continue in browser
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex flex-col overflow-y-auto"
          style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0d1b2a 100%)' }}
        >
          {/* Top pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center relative z-10">

            {/* App icon */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 280, damping: 22 }}
              className="relative mb-6"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[32px] flex items-center justify-center shadow-2xl"
                style={{ boxShadow: '0 20px 60px rgba(99,102,241,0.55)' }}>
                <span className="text-5xl font-black text-white">M</span>
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-green-400 rounded-full flex items-center justify-center border-2 border-[#0f0c29]">
                <Star className="w-3.5 h-3.5 text-white fill-white" />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <h1 className="text-3xl font-black text-white tracking-tight mb-1">Master Aptitude</h1>
              <p className="text-indigo-300/80 text-sm font-semibold mb-1">by Suman Sir</p>
              <div className="flex items-center justify-center gap-1 mb-6">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
                <span className="text-white/40 text-xs ml-1">4.9</span>
              </div>
            </motion.div>

            {/* Feature pills */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="grid grid-cols-3 gap-2.5 w-full max-w-xs mb-8">
              {[
                { icon: Zap, label: 'Faster', sub: 'No browser lag' },
                { icon: Wifi, label: 'Offline', sub: 'Study anywhere' },
                { icon: ShieldCheck, label: 'Secure', sub: 'Safe & private' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 bg-white/[0.07] rounded-2xl p-3 border border-white/10">
                  <Icon className="w-5 h-5 text-indigo-400" />
                  <span className="text-white text-[11px] font-black">{label}</span>
                  <span className="text-white/40 text-[9px] leading-tight text-center">{sub}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="w-full max-w-xs space-y-3">
              <button onClick={handleInstall} disabled={installing}
                className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.45)' }}>
                <Download className="w-5 h-5" />
                {installing ? 'Installing…' : isIOS() ? 'Add to Home Screen' : 'Install App — Free'}
              </button>

              <button onClick={handleSkip} disabled={!canSkip}
                className="w-full py-3 rounded-2xl text-white/40 font-bold text-sm transition-all disabled:opacity-0"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {canSkip ? 'Continue in browser' : 'Please wait…'}
              </button>
            </motion.div>

            <p className="text-white/20 text-[10px] mt-5 max-w-xs">
              For the best experience — faster load, offline access, and full-screen — use the app.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
