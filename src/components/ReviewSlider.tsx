import React, { useState, useEffect, useRef } from 'react';
import { Star, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Review {
  id: string;
  fullName: string;
  reviewText: string;
  rating: number;
  category?: string;
}

export default function ReviewSlider() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/reviews/public')
      .then(r => r.json())
      .then(d => { setReviews(d.reviews || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (reviews.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent(p => (p + 1) % reviews.length);
    }, 4500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [reviews.length]);

  if (loading || reviews.length === 0) return null;

  const review = reviews[current];

  return (
    <div
      className="w-full rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.07) 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Student Reviews</p>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-yellow-400 text-[10px] font-black">
            {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
          </span>
          <span className="text-white/25 text-[10px]">({reviews.length})</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={review.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35 }}
          className="text-center"
        >
          {/* Stars */}
          <div className="flex justify-center gap-0.5 mb-3">
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                className={`w-4 h-4 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'}`}
              />
            ))}
          </div>

          {/* Quote icon */}
          <Quote className="w-4 h-4 text-indigo-400/60 mx-auto mb-2" />

          {/* Review text */}
          <p className="text-white/75 text-sm font-medium leading-relaxed px-2 mb-3 line-clamp-3">
            {review.reviewText}
          </p>

          {/* Name */}
          <p className="text-indigo-300 text-xs font-black tracking-wide">— {review.fullName}</p>
          {review.category && review.category !== 'General' && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-indigo-300/60"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              {review.category}
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dot navigation */}
      {reviews.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-5 h-1.5 bg-indigo-400' : 'w-1.5 h-1.5 bg-white/15 hover:bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
