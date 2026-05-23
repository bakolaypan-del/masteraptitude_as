import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Star, Send, Phone, User } from 'lucide-react';

export default function ReviewPage() {
  const { code } = useParams<{ code: string }>();
  const [linkData, setLinkData] = useState<any>(null);
  const [linkError, setLinkError] = useState('');
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetch(`/api/review-link/${code}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          // Only block on explicitly deactivated links; missing links still allow review
          if (d.status === 'inactive' || d.status === 'expired') setLinkError(d.error);
          else setLinkData(null); // show form without link metadata
        } else {
          setLinkData(d);
        }
      })
      .catch(() => setLinkData(null)) // network error → show form anyway
      .finally(() => setLoading(false));
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !reviewText.trim()) {
      setSubmitError('Name and review message are required.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          reviewText: reviewText.trim(),
          rating,
          reviewLinkId: linkData?.id,
          category: linkData?.category || 'General',
          phone: phone.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to submit');
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63)' }}>
        <div className="text-white/40 text-sm font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>

      {/* Background glows */}
      <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(99,102,241,0.15)' }} />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(139,92,246,0.1)' }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 max-w-md mx-auto w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/icon-192.png" alt="Master Aptitude" className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-lg object-cover" />
          <h1 className="text-2xl font-black text-white tracking-tight">Master Aptitude</h1>
          <p className="text-white/35 text-xs mt-1 font-medium">by Suman Sir</p>
        </div>

        {linkError ? (
          <div className="text-center py-10 rounded-3xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-white/70 font-medium px-6">{linkError}</p>
          </div>
        ) : submitted ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-center py-12 rounded-3xl"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-white font-black text-xl">Thank You!</h2>
            <p className="text-white/55 text-sm mt-2 px-8 leading-relaxed">
              Your review has been submitted successfully and will appear after admin approval.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6 space-y-5"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px)',
            }}>

            <div className="text-center">
              {linkData?.category && (
                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-indigo-300 mb-2"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  {linkData.category}
                </span>
              )}
              <h2 className="text-white font-black text-lg">Share Your Experience</h2>
              <p className="text-white/35 text-xs mt-1">Your honest feedback helps others decide</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-black text-white/35 uppercase tracking-widest mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                  <input
                    type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                    placeholder="Enter your full name"
                    className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                  />
                </div>
              </div>

              {/* Phone (optional) */}
              <div>
                <label className="block text-[10px] font-black text-white/35 uppercase tracking-widest mb-1.5">
                  Mobile Number <span className="text-white/20 normal-case font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                  />
                </div>
              </div>

              {/* Star Rating */}
              <div>
                <label className="block text-[10px] font-black text-white/35 uppercase tracking-widest mb-2">
                  Rating *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      type="button" key={s}
                      onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(s)}
                      className="transition-transform hover:scale-110 active:scale-90"
                    >
                      <Star className={`w-9 h-9 transition-colors ${s <= (hover || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
                    </button>
                  ))}
                </div>
                <p className="text-white/25 text-[10px] mt-1">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hover || rating]}
                </p>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-[10px] font-black text-white/35 uppercase tracking-widest mb-1.5">
                  Your Review *
                </label>
                <textarea
                  value={reviewText} onChange={e => setReviewText(e.target.value)} required rows={4}
                  placeholder="Share your experience with Master Aptitude — what helped you most?"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                />
              </div>

              {submitError && (
                <p className="text-rose-400 text-xs font-medium">{submitError}</p>
              )}

              <button
                type="submit" disabled={submitting}
                className="w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </motion.div>
        )}

        <p className="text-center text-white/15 text-[10px] mt-8 font-bold uppercase tracking-widest">
          Master Aptitude · Your Success, Our Mission
        </p>
      </div>
    </div>
  );
}
