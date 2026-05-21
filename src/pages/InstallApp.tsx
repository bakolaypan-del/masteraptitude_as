import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { Download, Share, Smartphone, Chrome, Star, Check, Copy } from 'lucide-react';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [copied, setCopied] = useState(false);
  const appUrl = window.location.origin;

  useEffect(() => {
    if (isStandalone()) setInstalled(true);
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleAndroidInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setInstalling(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #1a1040 50%, #0d1b2a 100%)' }}>

      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '26px 26px' }} />

      {/* Glow */}
      <div className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)' }} />

      <div className="relative z-10 flex-1 flex flex-col items-center px-5 pt-12 pb-16 max-w-lg mx-auto w-full">

        {/* App icon + name */}
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-[32px] flex items-center justify-center mb-4 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 20px 60px rgba(99,102,241,0.5)' }}>
            <span className="text-5xl font-black text-white">M</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Master Aptitude</h1>
          <p className="text-indigo-300/70 text-sm mt-1">by Suman Sir</p>
          <div className="flex items-center gap-1 mt-2">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
            <span className="text-white/40 text-xs ml-1">4.9 · Free</span>
          </div>
        </motion.div>

        {/* Already installed */}
        {installed && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <Check className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-green-300 text-sm font-bold">App is already installed on this device!</p>
          </motion.div>
        )}

        {/* Android install */}
        {isAndroid() && !installed && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="w-full mb-5">
            <button onClick={handleAndroidInstall} disabled={installing || !deferredPrompt}
              className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.45)' }}>
              <Download className="w-5 h-5" />
              {installing ? 'Installing…' : deferredPrompt ? 'Install App — Free' : 'Open in Chrome to Install'}
            </button>
            {!deferredPrompt && (
              <p className="text-white/40 text-xs text-center mt-2 flex items-center justify-center gap-1">
                <Chrome className="w-3.5 h-3.5" /> Open this link in Google Chrome
              </p>
            )}
          </motion.div>
        )}

        {/* iOS install */}
        {isIOS() && !installed && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="w-full mb-5 space-y-3">
            <div className="rounded-2xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-white font-black text-sm mb-3">Install on iPhone / iPad</p>
              {[
                { step: 1, icon: Share, text: 'Tap the Share button', sub: 'At the bottom of Safari browser' },
                { step: 2, icon: Smartphone, text: 'Tap "Add to Home Screen"', sub: 'Scroll down in the share sheet' },
              ].map(({ step, icon: Icon, text, sub }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">{step}</span>
                  <div>
                    <p className="text-white text-sm font-bold">{text}</p>
                    <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1">
                      <Icon className="w-3 h-3" /> {sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Desktop: QR code + share link */}
        {!isAndroid() && !isIOS() && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="w-full mb-5 flex flex-col items-center">
            <p className="text-white/60 text-sm mb-4 text-center">Scan with your phone to install</p>
            <div className="bg-white rounded-3xl p-4 shadow-2xl mb-4">
              <QRCodeSVG value={appUrl} size={180} fgColor="#0f0c29" bgColor="#ffffff"
                level="H"
                imageSettings={{ src: '/icon-192.png', height: 36, width: 36, excavate: true }} />
            </div>
          </motion.div>
        )}

        {/* QR code for sharing (always show for teachers) */}
        {(isAndroid() || isIOS()) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="w-full flex flex-col items-center mb-5">
            <p className="text-white/50 text-xs mb-3 text-center uppercase tracking-widest font-bold">Share with students</p>
            <div className="bg-white rounded-3xl p-4 shadow-2xl">
              <QRCodeSVG value={appUrl} size={160} fgColor="#0f0c29" bgColor="#ffffff"
                level="H"
                imageSettings={{ src: '/icon-192.png', height: 32, width: 32, excavate: true }} />
            </div>
            <p className="text-white/30 text-[10px] mt-2 text-center">Students scan this to open & install</p>
          </motion.div>
        )}

        {/* Copy link */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="w-full mb-6">
          <p className="text-white/50 text-xs mb-2 uppercase tracking-widest font-bold">App Link</p>
          <div className="flex items-center gap-2 rounded-2xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="flex-1 text-white/60 text-xs font-mono truncate">{appUrl}</span>
            <button onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-black active:scale-95 transition-transform"
              style={{ background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.3)', border: copied ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(99,102,241,0.4)' }}>
              {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="w-full">
          <p className="text-white/50 text-xs mb-3 uppercase tracking-widest font-bold text-center">Why Install?</p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { emoji: '⚡', title: 'Faster Load', desc: 'No browser lag, instant open' },
              { emoji: '📶', title: 'Works Offline', desc: 'Study without internet' },
              { emoji: '🔔', title: 'Notifications', desc: 'Get live test alerts' },
              { emoji: '📱', title: 'Full Screen', desc: 'Real app experience' },
              { emoji: '🔄', title: 'Auto Update', desc: 'Always latest content' },
              { emoji: '🔒', title: 'Secure', desc: 'Your data stays safe' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="rounded-2xl p-3 flex items-start gap-2.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-white text-xs font-black">{title}</p>
                  <p className="text-white/40 text-[10px] mt-0.5 leading-tight">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-white/20 text-[10px] text-center mt-8">
          Master Aptitude · Mock Tests & Live Exams by Suman Sir · Free to Install
        </p>
      </div>
    </div>
  );
}
