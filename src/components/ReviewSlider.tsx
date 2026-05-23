import React, { useState, useEffect, useRef } from 'react';
import { Star, Quote, Share2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Review {
  id: string;
  fullName: string;
  reviewText: string;
  rating: number;
  category?: string;
  featured?: boolean;
}

function ShareMenu({ review, onClose }: { review: Review; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const APP_URL = 'https://masteraptitude.vercel.app';
  const stars = '⭐'.repeat(review.rating);
  const shareText = `${stars}\n"${review.reviewText}"\n— ${review.fullName}\n\nStudy with Master Aptitude by Suman Sir\n${APP_URL}`;

  const share = (platform: string) => {
    const encoded = encodeURIComponent(shareText);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encoded}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(APP_URL)}&text=${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}&quote=${encoded}`,
    };
    window.open(urls[platform], '_blank', 'noopener,noreferrer');
    onClose();
  };

  const copy = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(onClose, 1200);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-10 right-0 z-20 rounded-2xl p-3 shadow-2xl min-w-[160px]"
      style={{ background: 'rgba(15,12,41,0.97)', border: '1px solid rgba(99,102,241,0.3)' }}
    >
      {[
        { label: 'WhatsApp', emoji: '💬', key: 'whatsapp', color: '#25d366' },
        { label: 'Telegram', emoji: '✈️', key: 'telegram', color: '#2aabee' },
        { label: 'Facebook', emoji: '📘', key: 'facebook', color: '#1877f2' },
      ].map(s => (
        <button
          key={s.key}
          onClick={() => share(s.key)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left"
        >
          <span className="text-base">{s.emoji}</span>
          <span className="text-white/80 text-xs font-bold">{s.label}</span>
        </button>
      ))}
      <div className="h-px bg-white/10 my-1.5" />
      <button
        onClick={copy}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/40" />}
        <span className="text-white/80 text-xs font-bold">{copied ? 'Copied!' : 'Copy Link'}</span>
      </button>
    </motion.div>
  );
}

export default function ReviewSlider() {
  const [reviews, setReviews]       = useState<Review[]>([]);
  const [current, setCurrent]       = useState(0);
  const [loading, setLoading]       = useState(true);
  const [shareOpen, setShareOpen]   = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/reviews/public')
      .then(r => r.json())
      .then(d => {
        const list: Review[] = d.reviews || [];
        // Featured reviews first
        list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        setReviews(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (reviews.length <= 1 || shareOpen) return;
    intervalRef.current = setInterval(() => {
      setCurrent(p => (p + 1) % reviews.length);
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [reviews.length, shareOpen]);

  if (loading || reviews.length === 0) return null;

  const review = reviews[current];
  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="space-y-3">
      {/* Section heading */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-base">⭐</span>
          <h3 className="text-white font-black text-sm tracking-tight">What Our Students Say</h3>
        </div>
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-3 h-3 ${parseFloat(avgRating) >= s ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'}`} />
          ))}
          <span className="text-yellow-400 text-[10px] font-black ml-1">{avgRating}</span>
          <span className="text-white/25 text-[10px]">({reviews.length})</span>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)',
          border: '1px solid rgba(99,102,241,0.22)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 24px rgba(99,102,241,0.12)',
        }}
      >
        {/* Background glow */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'rgba(139,92,246,0.12)', filter: 'blur(20px)' }} />

        <AnimatePresence mode="wait">
          <motion.div
            key={review.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="relative z-10"
          >
            {/* Stars */}
            <div className="flex justify-center gap-0.5 mb-3">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'}`} />
              ))}
            </div>

            <Quote className="w-4 h-4 text-indigo-400/50 mx-auto mb-2" />

            <p className="text-white/80 text-sm font-medium leading-relaxed px-2 mb-3 text-center line-clamp-3">
              {review.reviewText}
            </p>

            <p className="text-indigo-300 text-xs font-black tracking-wide text-center">— {review.fullName}</p>

            {review.category && review.category !== 'General' && review.category !== 'App Experience' && (
              <div className="flex justify-center mt-2">
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-indigo-300/70"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.22)' }}
                >
                  {review.category}
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Share button */}
        <div className="absolute bottom-3 right-3">
          <div className="relative">
            <button
              onClick={() => setShareOpen(p => !p)}
              className="p-1.5 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/10 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {shareOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShareOpen(false)} />
                  <ShareMenu review={review} onClose={() => setShareOpen(false)} />
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dot navigation */}
        {reviews.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); setShareOpen(false); }}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? 'w-5 h-1.5 bg-indigo-400' : 'w-1.5 h-1.5 bg-white/15 hover:bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
