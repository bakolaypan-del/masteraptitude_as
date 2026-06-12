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
      className="absolute bottom-8 right-0 z-20 rounded-2xl p-2.5 shadow-2xl min-w-[150px]"
      style={{ background: 'rgba(15,12,41,0.97)', border: '1px solid rgba(99,102,241,0.3)' }}
    >
      {[
        { label: 'WhatsApp', emoji: '💬', key: 'whatsapp' },
        { label: 'Telegram', emoji: '✈️', key: 'telegram' },
        { label: 'Facebook', emoji: '📘', key: 'facebook' },
      ].map(s => (
        <button
          key={s.key}
          onClick={() => share(s.key)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-left"
        >
          <span className="text-sm">{s.emoji}</span>
          <span className="text-white/80 text-[11px] font-bold">{s.label}</span>
        </button>
      ))}
      <div className="h-px bg-white/10 my-1" />
      <button
        onClick={copy}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-left"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
        <span className="text-white/80 text-[11px] font-bold">{copied ? 'Copied!' : 'Copy Link'}</span>
      </button>
    </motion.div>
  );
}

export default function ReviewSlider() {
  const [reviews, setReviews]     = useState<Review[]>([]);
  const [current, setCurrent]     = useState(0);
  const [loading, setLoading]     = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/reviews/public')
      .then(r => r.json())
      .then(d => {
        const list: Review[] = d.reviews || [];
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
    <div className="space-y-2">
      {/* Section heading */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3.5 rounded-full" style={{ background: 'linear-gradient(180deg,#818cf8,#6366f1)' }} />
          <h3 className="text-white/90 font-black text-[11px] tracking-widest uppercase">Student Reviews</h3>
        </div>
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-2.5 h-2.5 ${parseFloat(avgRating) >= s ? 'text-amber-400 fill-amber-400' : 'text-white/10'}`} />
          ))}
          <span className="text-amber-400 text-[10px] font-black ml-1">{avgRating}</span>
          <span className="text-white/30 text-[9px] ml-0.5">({reviews.length})</span>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full rounded-2xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(49,46,129,0.55) 0%, rgba(30,27,75,0.8) 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 2px 16px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.6), transparent)' }} />

        {/* Ambient glow */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'rgba(139,92,246,0.18)', filter: 'blur(18px)' }} />

        <AnimatePresence mode="wait">
          <motion.div
            key={review.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 px-4 pt-3.5 pb-3"
          >
            {/* Quote + stars row */}
            <div className="flex items-start justify-between mb-2">
              <Quote className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'rgba(129,140,248,0.5)' }} />
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-white/10'}`} />
                ))}
              </div>
            </div>

            <p className="text-white/75 text-[11px] leading-relaxed mb-2.5 line-clamp-3 pr-4">
              {review.reviewText}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  {review.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="text-indigo-300 text-[10px] font-black">{review.fullName}</span>
                {review.category && review.category !== 'General' && review.category !== 'App Experience' && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider text-indigo-300/60"
                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    {review.category}
                  </span>
                )}
              </div>

              {/* Share button */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShareOpen(p => !p)}
                  className="p-1 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/8 transition-all"
                >
                  <Share2 className="w-3 h-3" />
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
          </motion.div>
        </AnimatePresence>

        {/* Dot navigation */}
        {reviews.length > 1 && (
          <div className="flex justify-center gap-1 pb-2.5">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); setShareOpen(false); }}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? 'w-4 h-1 bg-indigo-400' : 'w-1 h-1 bg-white/15 hover:bg-white/35'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
