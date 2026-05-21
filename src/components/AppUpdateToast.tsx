import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';

export default function AppUpdateToast() {
  const [show, setShow] = useState(false);
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      // Listen for a new SW waiting to activate
      const checkWaiting = () => {
        if (registration.waiting) {
          setReg(registration);
          setShow(true);
        }
      };
      checkWaiting();
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setReg(registration);
            setShow(true);
          }
        });
      });
    });

    // Auto-reload when the new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) { refreshing = true; window.location.reload(); }
    });
  }, []);

  const handleUpdate = () => {
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -64 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -64 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[99998] w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl"
            style={{ background: 'linear-gradient(135deg, #1e1b4b, #2e1065)', border: '1px solid rgba(99,102,241,0.4)' }}>
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-black leading-tight">New update available!</p>
              <p className="text-indigo-300/70 text-[10px] leading-tight mt-0.5">Tap to get the latest version</p>
            </div>
            <button onClick={handleUpdate}
              className="shrink-0 px-3 py-1.5 rounded-xl text-white text-[11px] font-black active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              Update
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
