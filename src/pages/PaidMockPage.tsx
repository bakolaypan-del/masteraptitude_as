import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { ArrowLeft, CheckCircle, Clock, ExternalLink, Send } from 'lucide-react';

declare global {
  interface Window { Razorpay: any; }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

// ── Manual payment submission modal ──────────────────────────────────────────
function ManualPayModal({
  batch, onClose, onSuccess, razorpayMeUrl,
}: {
  batch: any; onClose: () => void; onSuccess: () => void; razorpayMeUrl: string;
}) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<'pay' | 'submit'>('pay');
  const [txnId, setTxnId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const payUrl = `${razorpayMeUrl}?amount=${batch.price * 100}&description=${encodeURIComponent(batch.examName)}`;

  const handleSubmit = async () => {
    if (!txnId.trim()) { setError('Please enter your UPI Reference / Transaction ID'); return; }
    if (!user) return;
    setSubmitting(true); setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/payments/submit-manual', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: batch.id, transactionId: txnId.trim(),
          amount: batch.price, studentName: profile?.name || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Submission failed'); }
      else { onSuccess(); }
    } catch { setError('Network error. Please try again.'); }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden" style={{ background: '#fff' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#a5b4fc' }}>
              {step === 'pay' ? 'Step 1 — Pay' : 'Step 2 — Confirm'}
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-lg leading-none">✕</button>
          </div>
          <h3 className="font-black text-white text-base">{batch.examName}</h3>
          <p className="text-sm font-black mt-0.5" style={{ color: '#fbbf24' }}>₹{batch.price}</p>
        </div>

        <div className="p-5 space-y-4">
          {step === 'pay' ? (
            <>
              {/* Steps indicator */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                Pay via UPI / Card
                <div className="flex-1 h-px bg-slate-200" />
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-black">2</span>
                Submit Transaction ID
              </div>

              {/* Pay button */}
              <a
                href={payUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-white text-base transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 6px 24px rgba(99,102,241,0.4)' }}
              >
                <ExternalLink className="w-4 h-4" />
                Pay ₹{batch.price} on Razorpay
              </a>

              {/* UPI logos */}
              <div className="flex items-center justify-center gap-3 text-xs font-semibold text-slate-400">
                <span>📱 Google Pay</span>
                <span>·</span>
                <span>📱 PhonePe</span>
                <span>·</span>
                <span>🔵 Paytm</span>
                <span>·</span>
                <span>💳 Card</span>
              </div>

              <div className="rounded-xl p-3 text-xs text-slate-600 leading-relaxed" style={{ background: '#fefce8', border: '1px solid #fde68a' }}>
                <strong>After payment:</strong> Click the button below and enter your UPI Reference Number (12-digit number you receive after payment).
              </div>

              <button
                onClick={() => setStep('submit')}
                className="w-full py-3 rounded-xl font-black text-sm transition-all hover:bg-slate-100 active:scale-[0.98]"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}
              >
                ✔ I have paid — Submit Reference →
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-black">1</span>
                Pay via UPI / Card
                <div className="flex-1 h-px bg-slate-200" />
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                Submit Transaction ID
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">
                  UPI Reference / Transaction ID *
                </label>
                <input
                  value={txnId}
                  onChange={e => { setTxnId(e.target.value); setError(''); }}
                  placeholder="e.g. 425813679201"
                  className="w-full rounded-xl px-4 py-3 text-sm font-mono border border-slate-200 focus:border-indigo-400 outline-none"
                  autoFocus
                />
                {error && <p className="text-xs text-rose-500 font-bold mt-1.5">{error}</p>}
              </div>

              <div className="rounded-xl p-3 text-xs text-slate-600 leading-relaxed" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                📋 Your transaction ID is in your UPI app under "Payment History" or in the SMS/notification you received.
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep('pay')} className="px-4 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl font-black text-sm text-white transition-all hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PaidMockPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [payConfig, setPayConfig] = useState({ razorpayMeUrl: 'https://razorpay.me/@masteraptitude', apiReady: false });
  const [paying, setPaying] = useState<string | null>(null);
  const [activeBatch, setActiveBatch] = useState<any>(null); // for manual modal
  const [pendingBatches, setPendingBatches] = useState<string[]>([]); // submitted, awaiting verify
  const [successBatch, setSuccessBatch] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/paid-batches').then(r => r.json()),
      fetch('/api/payment-config').then(r => r.json()),
    ]).then(([b, c]) => { setBatches(Array.isArray(b) ? b : []); setPayConfig(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(token =>
      fetch('/api/my-purchases', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setPurchases(d.purchasedBatches || []))
        .catch(() => {})
    );
  }, [user]);

  const handleApiPay = async (batch: any) => {
    if (!user) return navigate('/login');
    setPaying(batch.id);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { alert('Payment service unavailable'); setPaying(null); return; }
      const token = await user.getIdToken();
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batch.id, amount: batch.price }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) { alert(order.error || 'Failed to create order'); setPaying(null); return; }
      const options = {
        key: (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || '',
        amount: order.amount, currency: order.currency,
        name: 'Master Aptitude', description: batch.examName,
        order_id: order.orderId,
        prefill: { name: profile?.name || '', contact: profile?.phoneNumber || '' },
        theme: { color: '#6366f1' },
        handler: async (response: any) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, batchId: batch.id, amount: batch.price, studentName: profile?.name || '' }),
          });
          if (verifyRes.ok) { setPurchases(p => [...p, batch.id]); setSuccessBatch(batch.id); setTimeout(() => setSuccessBatch(null), 5000); }
          else { alert('Verification failed. Contact support.'); }
          setPaying(null);
        },
        modal: { ondismiss: () => setPaying(null) },
      };
      new window.Razorpay(options).open();
    } catch { alert('Something went wrong.'); setPaying(null); }
  };

  const handleBuy = (batch: any) => {
    if (!user) return navigate('/login');
    if (payConfig.apiReady) { handleApiPay(batch); }
    else { setActiveBatch(batch); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
      <p className="text-slate-400 text-sm animate-pulse">Loading premium courses...</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.93)', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="font-black text-sm text-slate-800">Premium Mock Batches</h1>
            <p className="text-[10px] text-slate-400 font-medium">{batches.length} batches · Master Aptitude</p>
          </div>
          <span className="ml-auto text-[9px] font-black px-2 py-1 rounded-full" style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff' }}>
            👑 PREMIUM
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-28">
        {/* Hero banner */}
        <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#4c1d95 100%)' }}>
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize: '18px 18px' }} />
          <div className="relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-1" style={{ color: '#c4b5fd' }}>Master Aptitude Premium</p>
            <h2 className="text-xl font-black leading-tight mb-2">Crack Any Govt Exam<br />with Expert Mock Tests</h2>
            <div className="flex gap-3 flex-wrap" style={{ color: 'rgba(196,181,253,0.85)', fontSize: 11, fontWeight: 600 }}>
              <span>✔ Latest Pattern</span>
              <span>✔ Full Analysis</span>
              <span>✔ Smart Ranking</span>
              <span>✔ PYQs Included</span>
            </div>
          </div>
        </div>

        {/* UPI note when no API keys */}
        {!payConfig.apiReady && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <span className="text-lg">📱</span>
            <p className="text-xs font-semibold text-amber-800">Pay instantly via <strong>Google Pay, PhonePe, Paytm or any UPI</strong> — access unlocked within a few hours after verification.</p>
          </div>
        )}

        {/* Batch cards */}
        {batches.length === 0 && (
          <div className="rounded-2xl p-10 text-center" style={{ background: '#fff', border: '1px solid #e8ecf3' }}>
            <p className="text-4xl">🔒</p>
            <p className="font-black text-slate-700 mt-3">No Batches Yet</p>
            <p className="text-xs text-slate-400 mt-1">New premium courses coming soon!</p>
          </div>
        )}

        {batches.map(batch => {
          const owned = purchases.includes(batch.id);
          const pending = pendingBatches.includes(batch.id);
          const isSuccess = successBatch === batch.id;
          return (
            <div key={batch.id} className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: owned ? '2px solid #10b981' : pending ? '2px solid #f59e0b' : '1px solid #e8ecf3', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              {/* Thumbnail */}
              {batch.thumbnailUrl ? (
                <img src={batch.thumbnailUrl} alt={batch.examName} className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-44 flex items-center justify-center text-6xl" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>🎯</div>
              )}

              <div className="p-5">
                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {batch.isPopular && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(90deg,#f59e0b,#ef4444)', color: '#fff' }}>🔥 MOST POPULAR</span>}
                  {owned && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: '#d1fae5', color: '#065f46' }}>✔ PURCHASED</span>}
                  {pending && !owned && <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#fef3c7', color: '#92400e' }}><Clock className="w-2.5 h-2.5" /> VERIFICATION PENDING</span>}
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: '#eef2ff', color: '#4338ca' }}>{batch.validity}</span>
                </div>

                <h3 className="font-black text-base text-slate-800 mb-1">{batch.examName}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{batch.description}</p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { val: batch.totalMocks, label: 'Mocks', color: '#6366f1' },
                    { val: `${batch.enrolledCount || 0}+`, label: 'Enrolled', color: '#10b981' },
                    { val: `₹${batch.price}`, label: 'Price', color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-2 text-center" style={{ background: '#f8fafc' }}>
                      <p className="text-sm font-black" style={{ color: s.color }}>{s.val}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Features */}
                {batch.features?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {batch.features.map((f: string) => (
                      <span key={f} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                        <CheckCircle className="w-2.5 h-2.5" />{f}
                      </span>
                    ))}
                  </div>
                )}

                {/* Success banner */}
                {isSuccess && (
                  <div className="mb-3 rounded-xl p-3 text-center" style={{ background: '#d1fae5', border: '1px solid #6ee7b7' }}>
                    <p className="font-black text-emerald-800 text-sm">🎉 Payment Successful! Access Unlocked</p>
                  </div>
                )}

                {/* CTA */}
                {owned ? (
                  <button className="w-full py-3 rounded-xl font-black text-sm text-white" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                    ✔ Access Your Tests
                  </button>
                ) : pending ? (
                  <div className="w-full py-3 rounded-xl font-black text-sm text-center" style={{ background: '#fef3c7', color: '#92400e' }}>
                    ⏳ Payment Under Verification (1-2 hrs)
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuy(batch)}
                    disabled={paying === batch.id}
                    className="w-full py-3 rounded-xl font-black text-sm text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
                  >
                    {paying === batch.id ? '⏳ Processing...' : `👑 Purchase Now — ₹${batch.price}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual payment modal */}
      {activeBatch && (
        <ManualPayModal
          batch={activeBatch}
          razorpayMeUrl={payConfig.razorpayMeUrl}
          onClose={() => setActiveBatch(null)}
          onSuccess={() => {
            setPendingBatches(p => [...p, activeBatch.id]);
            setActiveBatch(null);
          }}
        />
      )}
    </div>
  );
}
