import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { User, Phone, GraduationCap, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface FirstVisitModalProps {
  onComplete?: () => void;
}

export default function FirstVisitModal({ onComplete }: FirstVisitModalProps) {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const digits = mobile.replace(/\D/g, '');
    const cleanMobile = digits.length > 10 ? digits.slice(-10) : digits;

    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }
    if (cleanMobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      // Update only name + phoneNumber in the existing profile (role stays 'user' per Firestore rules)
      await setDoc(
        doc(db, 'profiles', user.uid),
        { name: trimmedName, phoneNumber: cleanMobile },
        { merge: true }
      );

      // Also register on backend for admin visibility
      try {
        const token = await user.getIdToken();
        await fetch('/api/guest/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: trimmedName, mobile: cleanMobile }),
        });
      } catch {
        // Non-critical — profile is already in Firestore
      }

      await refreshProfile();
      onComplete?.();
    } catch (err: any) {
      setError('Something went wrong. Please try again.');
      console.error('FirstVisitModal save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm"
      >
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
              <GraduationCap size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Quick Setup</h2>
            <p className="text-slate-400 text-sm mt-1 font-medium">
              Enter your details once to get started — no password needed!
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 text-xs font-bold text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Your Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Rahul Kumar"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 font-medium placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 font-medium placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-indigo-900/30 mt-2"
            >
              {loading ? 'Saving...' : (
                <>
                  Start Test
                  <ArrowRight size={15} className="ml-2" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-slate-600 mt-5 font-medium">
            Your data is saved securely. No password required.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
