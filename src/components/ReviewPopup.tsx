import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, ChevronDown } from 'lucide-react';
import { useAuth } from './AuthContext';

const LS_KEY        = 'ma_review_last_shown';
const LS_MODE_KEY   = 'ma_review_remind_mode';   // 'remind' | 'skip'
const LS_SESSIONS   = 'ma_app_sessions';
const SHOW_DELAY_MS = 12000;
const SKIP_DAYS     = 30;
const REMIND_DAYS   = 4;
const MIN_SESSIONS  = 3;

const EXAM_CATEGORIES = [
  'WBP (West Bengal Police)',
  'KP (Kolkata Police)',
  'PSC (WBPSC)',
  'Railway (RRB)',
  'WBCS',
  'SSC',
  'Bank / IBPS',
  'Others',
];

export default function ReviewPopup() {
  const { user, profile } = useAuth();
  const [show, setShow]           = useState(false);
  const [rating, setRating]       = useState(5);
  const [hover, setHover]         = useState(0);
  const [fullName, setFullName]   = useState('');
  const [reviewText, setReviewText] = useState('');
  const [examCategory, setExamCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!user || !profile || profile.role === 'admin') return;

    // Never show again if student already submitted
    if (profile.reviewSubmitted) return;

    // Eligibility: need MIN_SESSIONS app sessions
    const sessions = parseInt(localStorage.getItem(LS_SESSIONS) || '0') + 1;
    localStorage.setItem(LS_SESSIONS, sessions.toString());
    if (sessions < MIN_SESSIONS) return;

    // Check how long since last shown
    const lastShown = localStorage.getItem(LS_KEY);
    const remindMode = localStorage.getItem(LS_MODE_KEY);
    if (lastShown) {
      const daysSince = (Date.now() - parseInt(lastShown)) / 86400000;
      const threshold = remindMode === 'remind' ? REMIND_DAYS : SKIP_DAYS;
      if (daysSince < threshold) return;
    }

    const t = setTimeout(() => {
      setFullName(profile?.name || '');
      setShow(true);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [user, profile]);

  const remindLater = () => {
    localStorage.setItem(LS_KEY, Date.now().toString());
    localStorage.setItem(LS_MODE_KEY, 'remind');
    setShow(false);
  };

  const skip = () => {
    localStorage.setItem(LS_KEY, Date.now().toString());
    localStorage.removeItem(LS_MODE_KEY);
    setShow(false);
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) { setError('Please enter your name.'); return; }
    if (!reviewText.trim()) { setError('Please write your review.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          studentId:    user!.uid,
          fullName:     fullName.trim(),
          reviewText:   reviewText.trim(),
          rating,
          category:     examCategory || 'App Experience',
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Submission failed');
      setSubmitted(true);
      localStorage.setItem(LS_KEY, Date.now().toString());
      setTimeout(() => setShow(false), 2800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabel = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hover || rating];

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(145deg, #0f0c29 0%, #1c1452 55%, #0d1b2a 100%)',
              border: '1px solid rgba(99,102,241,0.35)',
              boxShadow: '0 0 70px rgba(99,102,241,0.22), 0 24px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Top glow bar */}
            <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #6366f1, #a78bfa, #6366f1)' }} />

            <div className="p-6">
              <button
                onClick={skip}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {submitted ? (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="text-5xl mb-3">🎉</div>
                  <h3 className="text-white font-black text-xl">Thank You!</h3>
                  <p className="text-white/50 text-sm mt-2 leading-relaxed">
                    Your review has been submitted<br />and will appear after approval.
                  </p>
                  <div className="mt-4 flex justify-center gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-5 h-5 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'}`} />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* Header */}
                  <div className="text-center mb-5">
                    <div className="text-3xl mb-2">⭐</div>
                    <h3 className="text-white font-black text-xl leading-tight">Share Your Experience</h3>
                    <p className="text-white/40 text-xs mt-1.5 leading-relaxed">
                      Your honest feedback motivates our team<br />and helps other aspirants decide.
                    </p>
                  </div>

                  {/* Star rating */}
                  <div className="flex justify-center gap-1.5 mb-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        onMouseEnter={() => setHover(s)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(s)}
                        className="transition-transform active:scale-90 hover:scale-110"
                      >
                        <Star className={`w-9 h-9 transition-colors ${s <= (hover || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-yellow-400/70 text-[11px] font-bold mb-4 h-4">{ratingLabel}</p>

                  {/* Full Name */}
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your Full Name *"
                    className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:ring-2 focus:ring-indigo-500 transition-all mb-3"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                  />

                  {/* Review text */}
                  <textarea
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    rows={3}
                    placeholder="How has Master Aptitude helped your preparation? *"
                    className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all mb-3"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                  />

                  {/* Exam Category */}
                  <div className="relative mb-4">
                    <select
                      value={examCategory}
                      onChange={e => setExamCategory(e.target.value)}
                      className="w-full rounded-2xl px-4 py-3 text-sm text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-10"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: examCategory ? 'white' : 'rgba(255,255,255,0.25)' }}
                    >
                      <option value="" disabled>Exam Category (optional)</option>
                      {EXAM_CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1c1452' }}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  </div>

                  {error && <p className="text-rose-400 text-xs mb-3 font-medium">{error}</p>}

                  {/* Buttons */}
                  <div className="flex gap-2.5">
                    <button
                      onClick={remindLater}
                      className="flex-1 py-3 rounded-2xl text-white/50 text-xs font-bold hover:text-white/80 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      Remind Me Later
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 py-3 rounded-2xl text-white text-sm font-black disabled:opacity-50 transition-all active:scale-[0.97]"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}
                    >
                      {submitting ? 'Submitting…' : 'Submit Review'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
