import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { Phone, AlertCircle, User as UserIcon, Lock, ArrowRight, UserPlus, LogIn, Mail, Eye, EyeOff, ShieldCheck, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AuthMode = 'login' | 'register' | 'forgot';

export default function Login() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (user && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const getSyntheticEmail = (phone: string) => `${phone.trim()}@students.myapp.com`;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Normalize phone number
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    const cleanPhone = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
    
    if (!fullName.trim() || !cleanPhone || !password || !confirmPassword || !email.trim()) {
      setError('All fields are mandatory for registration.');
      return;
    }
    
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }
    
    setLoading(true);

    try {
      // 1. Mobile check
      try {
        const checkRes = await fetch('/api/auth/check-mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: cleanPhone })
        });

        if (checkRes.ok) {
          const { exists } = await checkRes.json();
          if (exists) {
            setError('This mobile number is already registered. Please login.');
            setLoading(false);
            return;
          }
        }
      } catch (checkErr) {
        console.warn('Pre-registration mobile check bypassed:', checkErr);
      }

      // 2. Create Auth User
      const pseudoEmail = getSyntheticEmail(cleanPhone);
      const userCredential = await createUserWithEmailAndPassword(auth, pseudoEmail, password);
      const newUser = userCredential.user;

      // 3. Create Profile
      const profileRef = doc(db, 'profiles', newUser.uid);
      await setDoc(profileRef, {
        name: fullName.trim(),
        phoneNumber: cleanPhone,
        email: pseudoEmail,
        studentEmail: email.trim(),
        role: 'user',
        registrationDate: new Date().toISOString(),
        totalTestsTaken: 0,
        cumulativeScore: 0,
        globalRank: 0,
        createdAt: Date.now()
      });

      setSuccess('Account created successfully! Welcome to Master Aptitude.');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This mobile number is already registered. Please login.');
      } else {
        setError(err.message || 'Registration failed. Please check your internet and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    const cleanPhone = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
    
    // Support login via either mobile number or email for complete flexibility
    const targetEmail = isAdminLogin ? email : (phoneNumber.includes('@') ? phoneNumber : getSyntheticEmail(cleanPhone));
    
    if ((isAdminLogin && !email) || (!isAdminLogin && !phoneNumber) || !password) {
      setError('Please provide all credentials.');
      return;
    }
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, targetEmail, password);
      setSuccess('Welcome back! Logging you in...');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        if (!isAdminLogin) {
          setError('Invalid login details or Password. If you are new here, please click Register at the top.');
        } else {
          setError('Invalid Admin Email/ID or Password.');
        }
      } else {
        setError(err.message || 'Error signing in. Please check your network.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    const cleanPhone = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
    
    if (!cleanPhone || !password) {
      setError('Please provide mobile and new password');
      return;
    }
    if (password.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanPhone, newPassword: password })
      });
      
      if (!res.ok) {
        throw new Error('Failed to reset password. Please contact support.');
      }

      setSuccess('Password updated successfully! Redirecting to login tab.');
      setTimeout(() => {
        setMode('login');
        setPassword('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>

      {/* Floating blur orbs */}
      <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.15)' }} />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(236,72,153,0.08)' }} />
      <div className="absolute top-0 left-1/3 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(124,58,237,0.1)' }} />
      {/* Dot grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/icon-192.png" alt="Master Aptitude" className="w-20 h-20 rounded-2xl shadow-lg shadow-indigo-500/30 object-cover hover:scale-105 transition-transform duration-300" />
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
        
        {/* Main Glassmorphic Form Card */}
        <div className="bg-slate-950/40 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-[32px] border border-slate-800 shadow-2xl shadow-black/50">
          
          {/* Header Switcher (Student vs Admin UI) */}
          {!isAdminLogin ? (
            <div className="flex bg-slate-900/60 p-1.5 rounded-2xl mb-8 border border-slate-800/80">
              <button 
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${mode === 'login' && !isAdminLogin ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <LogIn size={15} className="mr-1.5" />
                Login
              </button>
              <button 
                onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${mode === 'register' ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <UserPlus size={15} className="mr-1.5" />
                Register
              </button>
            </div>
          ) : (
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-3">
                <ShieldCheck size={12} /> SECURE ADMINISTRATOR PORTAL
              </div>
              <h3 className="text-lg font-black text-slate-100">Sign In to Dashboard</h3>
              <p className="text-xs text-slate-500 font-medium">Verify your administrative key privileges below</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={isAdminLogin ? 'admin' : mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {error && (
                <div className="mb-6 bg-rose-950/20 border border-rose-500/20 rounded-xl p-4 flex items-start">
                  <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-xs font-bold text-rose-300 leading-tight">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex items-center">
                  <div className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0">✓</div>
                  <p className="text-xs font-bold text-emerald-300">{success}</p>
                </div>
              )}

              <form className="space-y-5" onSubmit={isAdminLogin ? handleLogin : (mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleResetPassword)}>
                
                {/* 1. STUDENT REGISTRATION TAB */}
                {!isAdminLogin && mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <UserIcon size={16} />
                        </div>
                        <input
                          id="full-name"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-100 font-medium transition-all"
                          placeholder="e.g. John Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Mail size={16} />
                        </div>
                        <input
                          id="reg-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-100 font-medium transition-all"
                          placeholder="johndoe@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mobile Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Phone size={16} />
                        </div>
                        <input
                          id="phone-number"
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-100 font-medium transition-all"
                          placeholder="10-digit mobile number"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Create Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Lock size={16} />
                        </div>
                        <input
                          id="password-reg"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-10 pr-10 py-3 bg-slate-900/80 border border-slate-800 rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-100 font-medium transition-all"
                          placeholder="Min. 6 characters"
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

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Lock size={16} />
                        </div>
                        <input
                          id="password-confirm"
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full pl-10 pr-10 py-3 bg-slate-900/80 border border-slate-800 rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-100 font-medium transition-all"
                          placeholder="Repeat your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* 2. STUDENT LOGIN TAB */}
                {!isAdminLogin && mode === 'login' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mobile / Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Phone size={16} />
                        </div>
                        <input
                          id="phone-number-login"
                          type="text"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-100 font-medium transition-all"
                          placeholder="Enter mobile or email"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Lock size={16} />
                        </div>
                        <input
                          id="password-login"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
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
                  </>
                )}

                {/* 3. DEDICATED ADMIN LOGIN OVERLAY */}
                {isAdminLogin && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Email / ID</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Mail size={16} />
                        </div>
                        <input
                          id="admin-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
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
                          id="admin-password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
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
                  </>
                )}

                {/* 4. FORGOT PASSWORD TAB */}
                {!isAdminLogin && mode === 'forgot' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Mobile</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Phone size={16} />
                        </div>
                        <input
                          id="phone-number-forgot"
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-100 font-medium transition-all"
                          placeholder="10-digit mobile number"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Lock size={16} />
                        </div>
                        <input
                          id="password-forgot"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
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
                  </>
                )}

                {/* Option Items (Remember Me & Forgot Password link) */}
                {mode === 'login' && !isAdminLogin && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setRememberMe(!rememberMe)}
                      className="flex items-center text-slate-400 hover:text-slate-300 select-none font-bold"
                    >
                      {rememberMe ? (
                        <CheckSquare size={16} className="text-indigo-400 mr-1.5 shrink-0" />
                      ) : (
                        <Square size={16} className="text-slate-600 mr-1.5 shrink-0" />
                      )}
                      Remember Me
                    </button>

                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                      className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {/* Action Submit Buttons */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-900/25 text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {loading ? 'Processing Securely...' : (
                    <>
                      {isAdminLogin ? 'Admin Secure Login' : (mode === 'login' ? 'Student Login' : mode === 'register' ? 'Register Now' : 'Reset My Password')}
                      <ArrowRight size={15} className="ml-2" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Back links for forgot password */}
          {mode === 'forgot' && !isAdminLogin && (
            <div className="mt-6 text-center">
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center justify-center mx-auto transition-colors"
              >
                <LogIn size={14} className="mr-1" />
                Back to Login
              </button>
            </div>
          )}

          {/* LOWER SECTION: Dedicated Admin Login Trigger */}
          <div className="mt-6 text-center pt-6 border-t border-slate-800/80">
            <button
              onClick={() => { 
                setIsAdminLogin(!isAdminLogin); 
                setError(''); 
                setSuccess(''); 
                setPassword('');
                setEmail('');
                setPhoneNumber('');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-400 transition-colors"
            >
              <ShieldCheck size={14} />
              {isAdminLogin ? "Return to Student Gateway" : "Administrative Privileged Login"}
            </button>
          </div>
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
