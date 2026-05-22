import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star } from 'lucide-react';
import { useAuth } from './AuthContext';

const LS_KEY = 'ma_review_last_shown';
const HIDE_DAYS = 30;
const SHOW_DELAY_MS = 10000;

export default function ReviewPopup() {
  const { user, profile } = useAuth();
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !profile || profile.role === 'admin') return;

    const lastShown = localStorage.getItem(LS_KEY);
    if (lastShown) {
      const daysSince = (Date.now() - parseInt(lastShown)) / 86400000;
      if (daysSince < HIDE_DAYS) return;
    }
    if (profile.lastReviewDate) {
      const daysSince = (Date.now() - new Date(profile.lastReviewDate).getTime()) / 86400000;
      if (daysSince < HIDE_DAYS) return;
    }

    const t = setTimeout(() => setShow(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [user, profile]);

  const dismiss = () => {
    localStorage.setItem(LS_KEY, Date.now().toString());
    setShow(false);
  };

  const handleSubmit = async () => {
    if (!reviewText.trim()) { setError('Please write your review first.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          studentId: user!.uid,
          fullName: profile?.name || '',
          reviewText: reviewText.trim(),
          rating,
          category: 'App Experience',
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Submission failed');
      setSubmitted(true);
      localStorage.setItem(LS_KEY, Date.now().toString());
      setTimeout(() => setShow(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 60%, #0d1b2a 100%)',
              border: '1px solid rgba(99,102,241,0.35)',
              boxShadow: '0 0 60px rgba(99,102,241,0.2)',
            }}
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {submitted ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-white font-black text-lg">Thank You!</h3>
                <p className="text-white/50 text-sm mt-1">Your review is submitted for approval.</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-5">
                  <div className="text-3xl mb-2">⭐</div>
                  <h3 className="text-white font-black text-lg leading-tight">How's Your Experience?</h3>
                  <p className="text-white/40 text-xs mt-1">Quick feedback helps other students too</p>
                </div>

                {/* Stars */}
                <div className="flex justify-center gap-1.5 mb-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onMouseEnter={() => setHover(s)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(s)}
                      className="transition-transform active:scale-90 hover:scale-110"
                    >
                      <Star className={`w-8 h-8 transition-colors ${s <= (hover || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
                    </button>
                  ))}
                </div>

                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  rows={3}
                  placeholder="How has Master Aptitude helped your preparation?"
                  className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                />

                {error && <p className="text-rose-400 text-xs mt-2 font-medium">{error}</p>}

                <div className="flex gap-2.5 mt-4">
                  <button
                    onClick={dismiss}
                    className="flex-1 py-3 rounded-2xl text-white/50 text-sm font-bold hover:text-white/80 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-2xl text-white text-sm font-black disabled:opacity-50 transition-all active:scale-[0.97]"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
