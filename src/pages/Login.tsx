import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { Mail, Lock, GraduationCap, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin already logged in → go to admin panel
  if (user && profile?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  // Non-admin (student/guest) who somehow hits /login → go to dashboard
  if (user && profile && profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter your admin email and password.'); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid admin credentials. Please check your email and password.');
      } else {
        setError(err.message || 'Sign-in failed. Please check your network.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>

      <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.15)' }} />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(236,72,153,0.08)' }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 rounded-2xl text-white shadow-lg shadow-indigo-500/30 mb-4 transform -rotate-12 hover:rotate-0 transition-transform duration-300">
            <GraduationCap size={36} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-fuchsia-400 bg-clip-text text-transparent tracking-tighter uppercase leading-tight drop-shadow-sm">
            Master Aptitude
          </h1>
          <p className="text-sm font-bold text-slate-400 tracking-wider uppercase mt-1">
            Empowering Minds By Suman Sir
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-2 z-10">
        <div className="bg-slate-950/40 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-[32px] border border-slate-800 shadow-2xl shadow-black/50">

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-3">
              <ShieldCheck size={12} /> SECURE ADMINISTRATOR PORTAL
            </div>
            <h3 className="text-lg font-black text-slate-100">Admin Sign In</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Students don't need to login —{' '}
              <button onClick={() => navigate('/dashboard')} className="text-indigo-400 hover:text-indigo-300 font-bold underline-offset-2 hover:underline">
                go to dashboard
              </button>
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error && (
              <div className="mb-6 bg-rose-950/20 border border-rose-500/20 rounded-xl p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 mr-3 shrink-0" />
                <p className="text-xs font-bold text-rose-300 leading-tight">{error}</p>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-100 font-medium transition-all"
                    placeholder="admin@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 bg-slate-900/80 border border-slate-800 rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-100 font-medium transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-900/25 text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 focus:outline-none disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {loading ? 'Signing In...' : (
                  <>Admin Secure Login<ArrowRight size={15} className="ml-2" /></>
                )}
              </button>
            </form>
          </motion.div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            Master Aptitude Pro &copy; 2026 | Educational Suite
          </p>
        </div>
      </div>
    </div>
  );
}
