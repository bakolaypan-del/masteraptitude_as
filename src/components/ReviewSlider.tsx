import React, { useState, useEffect, useRef } from 'react';
import { Star, Share2, Copy, Check } from 'lucide-react';
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
      className="absolute bottom-9 right-0 z-20 rounded-2xl p-2.5 shadow-2xl min-w-[150px]"
      style={{ background: '#0f0c29', border: '1px solid rgba(99,102,241,0.35)' }}
    >
      {[
        { label: 'WhatsApp', emoji: '💬', key: 'whatsapp' },
        { label: 'Telegram', emoji: '✈️', key: 'telegram' },
        { label: 'Facebook', emoji: '📘', key: 'facebook' },
      ].map(s => (
        <button key={s.key} onClick={() => share(s.key)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-left">
          <span className="text-sm">{s.emoji}</span>
          <span className="text-white text-[11px] font-semibold">{s.label}</span>
        </button>
      ))}
      <div className="h-px bg-white/10 my-1" />
      <button onClick={copy}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-left">
        {copied
          ? <Check className="w-3.5 h-3.5 text-emerald-400" />
          : <Copy className="w-3.5 h-3.5 text-white/50" />}
        <span className="text-white text-[11px] font-semibold">{copied ? 'Copied!' : 'Copy'}</span>
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
    intervalRef.current = setInterval(() => setCurrent(p => (p + 1) % reviews.length), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [reviews.length, shareOpen]);

  if (loading || reviews.length === 0) return null;

  const review = reviews[current];
  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0c29 60%, #13111f 100%)',
        boxShadow: '0 8px 32px rgba(99,102,241,0.25), 0 2px 8px rgba(0,0,0,0.4)',
        border: '1px solid rgba(99,102,241,0.3)',
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <span className="text-base">💬</span>
          <span className="text-white font-black text-xs tracking-wide">Student Reviews</span>
        </div>
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-3 h-3 ${parseFloat(avgRating) >= s ? 'text-amber-400 fill-amber-400' : 'text-white/15'}`} />
          ))}
          <span className="text-amber-400 text-[11px] font-black ml-1">{avgRating}</span>
          <span className="text-white/40 text-[10px] ml-0.5">/ 5</span>
        </div>
      </div>

      {/* Review body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.28 }}
          className="px-4 pt-4 pb-3"
        >
          {/* Stars for this review */}
          <div className="flex gap-0.5 mb-3">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-white/10'}`} />
            ))}
          </div>

          {/* Quote mark */}
          <div className="text-3xl leading-none font-black mb-1" style={{ color: 'rgba(129,140,248,0.4)', fontFamily: 'Georgia, serif' }}>"</div>

          {/* Review text — full white, high contrast */}
          <p className="text-white text-sm font-medium leading-relaxed mb-4 line-clamp-4">
            {review.reviewText}
          </p>

          {/* Footer: avatar + name + share */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 2px 8px rgba(99,102,241,0.5)' }}
              >
                {review.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-white text-xs font-black leading-tight">{review.fullName}</div>
                {review.category && review.category !== 'General' && review.category !== 'App Experience' ? (
                  <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#a5b4fc' }}>
                    {review.category}
                  </div>
                ) : (
                  <div className="text-[9px] font-semibold mt-0.5" style={{ color: 'rgba(165,180,252,0.5)' }}>Verified Student</div>
                )}
              </div>
            </div>

            {/* Share */}
            <div className="relative">
              <button
                onClick={() => setShareOpen(p => !p)}
                className="p-1.5 rounded-xl transition-all hover:bg-white/10"
                style={{ color: 'rgba(165,180,252,0.5)' }}
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
        </motion.div>
      </AnimatePresence>

      {/* Dot nav */}
      {reviews.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-3">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setShareOpen(false); }}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 20 : 6,
                height: 4,
                background: i === current ? '#818cf8' : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
