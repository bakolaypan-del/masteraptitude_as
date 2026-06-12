import React, { useState, useEffect, useRef } from 'react';
import { Star, Share2, Copy, Check, Quote } from 'lucide-react';
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
  const shareText = `${'⭐'.repeat(review.rating)}\n"${review.reviewText}"\n— ${review.fullName}\n\nStudy with Master Aptitude by Suman Sir\n${APP_URL}`;

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
      initial={{ opacity: 0, scale: 0.9, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 6 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-8 right-0 z-20 rounded-2xl p-2 shadow-xl min-w-[145px] bg-white"
      style={{ border: '1px solid #e8ecf3' }}
    >
      {[
        { label: 'WhatsApp', emoji: '💬', key: 'whatsapp' },
        { label: 'Telegram', emoji: '✈️', key: 'telegram' },
        { label: 'Facebook', emoji: '📘', key: 'facebook' },
      ].map(s => (
        <button key={s.key} onClick={() => share(s.key)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors text-left">
          <span className="text-sm">{s.emoji}</span>
          <span className="text-slate-700 text-[11px] font-semibold">{s.label}</span>
        </button>
      ))}
      <div className="h-px bg-slate-100 my-1" />
      <button onClick={copy}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
        <span className="text-slate-700 text-[11px] font-semibold">{copied ? 'Copied!' : 'Copy'}</span>
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
    <div className="space-y-2">
      {/* Heading */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">⭐</span>
          <h3 className="text-slate-700 font-black text-xs tracking-tight">What Our Students Say</h3>
        </div>
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-2.5 h-2.5 ${parseFloat(avgRating) >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
          ))}
          <span className="text-amber-500 text-[10px] font-black ml-1">{avgRating}</span>
          <span className="text-slate-400 text-[9px] ml-0.5">({reviews.length})</span>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={review.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="px-4 pt-3.5 pb-3"
          >
            {/* Stars + share */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                ))}
              </div>
              <div className="relative">
                <button onClick={() => setShareOpen(p => !p)}
                  className="p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all">
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

            {/* Quote icon */}
            <Quote className="w-4 h-4 text-indigo-200 mb-1" />

            {/* Review text */}
            <p className="text-slate-700 text-xs leading-relaxed line-clamp-3 mb-3">
              {review.reviewText}
            </p>

            {/* Author */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {review.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-slate-800 text-[10px] font-black leading-tight">{review.fullName}</div>
                <div className="text-slate-400 text-[8px]">
                  {review.category && review.category !== 'General' && review.category !== 'App Experience'
                    ? review.category : 'Verified Student'}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dot nav */}
        {reviews.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-2.5">
            {reviews.map((_, i) => (
              <button key={i} onClick={() => { setCurrent(i); setShareOpen(false); }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === current ? 18 : 5,
                  height: 4,
                  background: i === current ? '#6366f1' : '#e2e8f0',
                }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
