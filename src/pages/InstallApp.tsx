import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Share2, Smartphone, Star, Check, Copy, MoreVertical, Plus, ArrowDown } from 'lucide-react';

const APP_URL = 'https://masteraptitude.vercel.app';

const isIOS      = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid  = () => /android/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

// ─── Step card ────────────────────────────────────────────────────────────────
function Step({ n, icon, title, sub, highlight }: {
  n: number; icon: React.ReactNode; title: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all ${
      highlight
        ? 'border-indigo-400/40 bg-indigo-500/10'
        : 'border-white/10 bg-white/5'
    }`}>
      <div className="shrink-0 flex flex-col items-center gap-1.5">
        <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-lg shadow-indigo-900/40">
          {n}
        </span>
        <div className="w-px flex-1 bg-white/10" style={{ minHeight: 8 }} />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-white text-sm font-black leading-snug">{title}</p>
        <p className="text-white/50 text-[11px] mt-1 leading-snug flex items-center gap-1 flex-wrap">
          {icon}
          <span>{sub}</span>
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed,  setInstalled]  = useState(false);
  const [installing, setInstalling] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [showQR,     setShowQR]     = useState(false);

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return; }
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleOneClick = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstalling(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(APP_URL + '/install').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const on = isAndroid() ? 'android' : isIOS() ? 'ios' : 'desktop';

  return (
    <div className="min-h-screen flex flex-col select-none"
      style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #1a1040 50%, #0d1b2a 100%)' }}>

      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      {/* Glow */}
      <div className="fixed top-[-15%] left-1/2 -translate-x-1/2 w-[500px] h-[340px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.22) 0%, transparent 70%)' }} />

      <div className="relative z-10 flex-1 flex flex-col items-center px-5 pt-10 pb-16 max-w-md mx-auto w-full gap-5">

        {/* ── App icon ── */}
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="flex flex-col items-center">
          <img src="/icon-192.png" alt="Master Aptitude"
            className="w-24 h-24 rounded-[28px] mb-3 object-cover"
            style={{ boxShadow: '0 16px 48px rgba(99,102,241,0.55)' }} />
          <h1 className="text-2xl font-black text-white tracking-tight">Master Aptitude</h1>
          <p className="text-indigo-300/70 text-xs mt-0.5 font-medium">by Suman Sir</p>
          <div className="flex items-center gap-0.5 mt-2">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
            <span className="text-white/30 text-[10px] ml-1.5 font-bold">Free · Education</span>
          </div>
        </motion.div>

        {/* ── Already installed banner ── */}
        <AnimatePresence>
          {installed && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="w-full rounded-2xl p-4 flex items-center gap-3"
              style={{ background: 'rgba(34,197,94,0.13)', border: '1px solid rgba(34,197,94,0.35)' }}>
              <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-green-300 text-sm font-black">App installed!</p>
                <p className="text-green-400/60 text-[11px] mt-0.5">Open it from your home screen.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════
            ANDROID
        ══════════════════════════════════════════════ */}
        {on === 'android' && !installed && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="w-full space-y-3">

            {/* One-click button — shown only when browser offers the prompt */}
            {deferredPrompt && (
              <button onClick={handleOneClick} disabled={installing}
                className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform disabled:opacity-60 shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 28px rgba(99,102,241,0.50)' }}>
                <Download className="w-5 h-5" />
                {installing ? 'Installing…' : '⚡ Install Now — One Tap'}
              </button>
            )}

            {/* ── ALWAYS-WORKS: Chrome menu method ── */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="px-4 py-3 flex items-center gap-2"
                style={{ background: 'rgba(99,102,241,0.15)' }}>
                <div className="w-6 h-6 rounded-lg bg-indigo-500/30 flex items-center justify-center shrink-0">
                  <Download className="w-3.5 h-3.5 text-indigo-300" />
                </div>
                <p className="text-white font-black text-sm">Install on Android</p>
                <span className="ml-auto text-[9px] font-black text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Always Works
                </span>
              </div>
              <div className="p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Step n={1}
                  icon={<MoreVertical className="w-3 h-3 text-indigo-400 shrink-0" />}
                  title='Tap the 3-dot menu ⋮'
                  sub='Top-right corner of Chrome browser'
                  highlight
                />
                <Step n={2}
                  icon={<Plus className="w-3 h-3 text-indigo-400 shrink-0" />}
                  title='"Add to Home Screen" → tap Add'
                  sub='Scroll down in the menu if needed'
                />
                <Step n={3}
                  icon={<Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                  title='App icon appears on home screen!'
                  sub='Open it — works like a real app'
                />
              </div>
            </div>

            {/* Must use Chrome reminder */}
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <span className="text-amber-400 text-base shrink-0 mt-0.5">⚠️</span>
              <p className="text-amber-300/80 text-[11px] font-medium leading-snug">
                <strong className="text-amber-300 font-black">Must open in Chrome browser.</strong>
                {' '}If you opened this in WhatsApp or another app, tap the 3-dot menu → "Open in Chrome" first.
              </p>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            iOS (iPhone / iPad)
        ══════════════════════════════════════════════ */}
        {on === 'ios' && !installed && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="w-full space-y-3">

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="px-4 py-3 flex items-center gap-2"
                style={{ background: 'rgba(99,102,241,0.15)' }}>
                <Smartphone className="w-4 h-4 text-indigo-300 shrink-0" />
                <p className="text-white font-black text-sm">Install on iPhone / iPad</p>
                <span className="ml-auto text-[9px] font-black text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Always Works
                </span>
              </div>
              <div className="p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Step n={1}
                  icon={<Share2 className="w-3 h-3 text-indigo-400 shrink-0" />}
                  title='Open in Safari browser'
                  sub='This will NOT work in Chrome on iPhone'
                  highlight
                />
                <Step n={2}
                  icon={<ArrowDown className="w-3 h-3 text-indigo-400 shrink-0" />}
                  title='Tap the Share button'
                  sub='The box with an arrow at the bottom of Safari'
                />
                <Step n={3}
                  icon={<Plus className="w-3 h-3 text-indigo-400 shrink-0" />}
                  title='"Add to Home Screen" → tap Add'
                  sub='Scroll down in the share sheet to find it'
                />
                <Step n={4}
                  icon={<Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                  title='App icon on home screen!'
                  sub='Tap it — opens full screen like a real app'
                />
              </div>
            </div>

            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <span className="text-amber-400 text-base shrink-0">⚠️</span>
              <p className="text-amber-300/80 text-[11px] font-medium leading-snug">
                <strong className="text-amber-300 font-black">Safari only on iPhone.</strong>
                {' '}If this link was opened in WhatsApp/Instagram, tap "Open in Safari" (bottom-right).
              </p>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            DESKTOP — show QR code
        ══════════════════════════════════════════════ */}
        {on === 'desktop' && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="w-full flex flex-col items-center gap-4">
            <p className="text-white/60 text-sm text-center">
              Scan with your phone to install
            </p>
            <div className="bg-white rounded-3xl p-5 shadow-2xl">
              <QRCodeSVG value={`${APP_URL}/install`} size={200} fgColor="#0f0c29" bgColor="#ffffff"
                level="H"
                imageSettings={{ src: '/icon-192.png', height: 40, width: 40, excavate: true }} />
            </div>
            <p className="text-white/30 text-xs text-center">
              Open camera → point at QR code → tap the link
            </p>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            SHARE SECTION — copy link + QR
        ══════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="w-full space-y-3">

          {/* Copy install link */}
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-black mb-2">
              📤 Share with friends / students
            </p>
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="flex-1 text-white/50 text-xs font-mono truncate">
                masteraptitude.vercel.app/install
              </span>
              <button onClick={copyLink}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-black active:scale-95 transition-all"
                style={{
                  background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.3)',
                  border: copied ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(99,102,241,0.4)',
                }}>
                {copied
                  ? <><Check className="w-3 h-3 text-green-400" /> Copied!</>
                  : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
          </div>

          {/* QR code toggle (for mobile users who want to share) */}
          {on !== 'desktop' && (
            <div>
              <button onClick={() => setShowQR(v => !v)}
                className="w-full py-2.5 rounded-2xl text-white/60 text-xs font-bold flex items-center justify-center gap-2 transition-all hover:text-white/80"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                📷 {showQR ? 'Hide' : 'Show'} QR Code for sharing
              </button>
              <AnimatePresence>
                {showQR && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="flex flex-col items-center pt-4 gap-2">
                      <div className="bg-white rounded-3xl p-4 shadow-2xl">
                        <QRCodeSVG value={`${APP_URL}/install`} size={160} fgColor="#0f0c29" bgColor="#ffffff"
                          level="H"
                          imageSettings={{ src: '/icon-192.png', height: 32, width: 32, excavate: true }} />
                      </div>
                      <p className="text-white/30 text-[10px] text-center">Students scan to install</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* ── Why Install cards ── */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="w-full">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-black mb-3 text-center">
            Why install?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { e: '⚡', t: 'Instant Open',   d: 'No browser loading' },
              { e: '📶', t: 'Works Offline',  d: 'Study without internet' },
              { e: '📱', t: 'Full Screen',    d: 'Real app experience' },
              { e: '🔄', t: 'Auto Updates',   d: 'Always latest content' },
            ].map(({ e, t, d }) => (
              <div key={t} className="rounded-2xl p-3 flex items-start gap-2.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-lg">{e}</span>
                <div>
                  <p className="text-white text-xs font-black">{t}</p>
                  <p className="text-white/35 text-[10px] mt-0.5 leading-tight">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-white/15 text-[10px] text-center">
          Master Aptitude · Free · by Suman Sir
        </p>
      </div>
    </div>
  );
}
