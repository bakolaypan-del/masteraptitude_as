import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { Phone, AlertCircle, User as UserIcon, GraduationCap, Lock, ArrowRight, UserPlus, LogIn, KeyRound, Chrome } from 'lucide-react';
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (user && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const getSyntheticEmail = (phone: string) => `${phone.trim()}@students.myapp.com`;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Ensure profile exists
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          name: user.displayName || 'Admin',
          phoneNumber: user.phoneNumber || '',
          email: user.email,
          role: user.email?.toLowerCase() === 'bakolaypan@gmail.com' ? 'admin' : 'user',
          registrationDate: new Date().toISOString(),
          totalTestsTaken: 0,
          cumulativeScore: 0,
          globalRank: 0,
          createdAt: Date.now()
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phoneNumber || !password) {
      setError('Please fill all fields');
      return;
    }
    if (phoneNumber.length < 10) {
      setError('Invalid mobile number');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Check if mobile already exists in DB
      let checkRes;
      try {
        checkRes = await fetch('/api/auth/check-mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phoneNumber.trim() })
        });
      } catch (fetchErr) {
        throw new Error('Connection failed. Please check your internet.');
      }

      if (!checkRes.ok) {
        const errorText = await checkRes.text();
        let errorMsg = 'Failed to verify mobile number';
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorMsg;
        } catch (e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const data = await checkRes.json().catch(() => {
        throw new Error('Server returned invalid response. Please try again.');
      });
      
      if (data.exists) {
        setError('This mobile number is already registered. Please go to Login.');
        setLoading(false);
        return;
      }

      // 2. Create Firebase Auth user
      const pseudoEmail = getSyntheticEmail(phoneNumber);
      const userCredential = await createUserWithEmailAndPassword(auth, pseudoEmail, password);
      const newUser = userCredential.user;

      // 3. Create Profile in Firestore
      const profileRef = doc(db, 'profiles', newUser.uid);
      await setDoc(profileRef, {
        name: fullName,
        phoneNumber: phoneNumber,
        email: pseudoEmail,
        role: 'user',
        registrationDate: new Date().toISOString(),
        totalTestsTaken: 0,
        cumulativeScore: 0,
        globalRank: 0,
        createdAt: Date.now()
      });

      setSuccess('Registration successful! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This mobile number is already in use. Try Logging in.');
      } else {
        setError(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = isAdminLogin ? email : getSyntheticEmail(phoneNumber);
    
    if ((isAdminLogin && !email) || (!isAdminLogin && !phoneNumber) || !password) {
      setError('Please provide all credentials');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await signInWithEmailAndPassword(auth, targetEmail, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        if (!isAdminLogin) {
          setError('Invalid Mobile Number or Password. If you haven\'t registered yet, please use the Register tab.');
        } else {
          setError('Invalid Email or Password.');
        }
      } else {
        setError(err.message || 'Error logging in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !password) {
      setError('Please provide mobile and new password');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phoneNumber.trim(), newPassword: password })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMsg = 'Failed to reset password';
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorMsg;
        } catch (e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json().catch(() => {
        throw new Error('Server returned invalid response');
      });

      setSuccess('Password updated successfully! You can now login.');
      setTimeout(() => setMode('login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 mb-6 transform -rotate-12">
            <GraduationCap size={40} />
          </div>
        </div>
        <h2 className="text-center text-3xl font-black text-slate-900 tracking-tight">
          {mode === 'login' ? 'Welcome Back!' : mode === 'register' ? 'Create Account' : 'Reset Password'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          {mode === 'login' ? 'Login to access your mock tests' : mode === 'register' ? 'Join our platform and start learning' : 'Recover your account access'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-10 px-4 shadow-sm rounded-3xl border border-slate-100 sm:px-10">
          
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button 
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LogIn size={18} className="mr-2" />
              Login
            </button>
            <button 
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-lg transition-all ${mode === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <UserPlus size={18} className="mr-2" />
              Register
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {error && (
                <div className="mb-6 bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start">
                  <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-xs font-bold text-rose-700 leading-tight">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center">
                  <div className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0">✓</div>
                  <p className="text-xs font-bold text-emerald-700">{success}</p>
                </div>
              )}

              {/* Google Sign-In for Admin/Owner */}
              {(isAdminLogin || mode === 'login') && (
                <div className="mb-8">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                  >
                    <Chrome className="text-indigo-600 w-5 h-5" />
                    <span>Sign in with Google</span>
                  </button>
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-4 bg-white text-slate-400 font-bold uppercase tracking-widest">Or login with details</span>
                    </div>
                  </div>
                </div>
              )}

              <form className="space-y-6" onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleResetPassword}>
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                    <div className="mt-1 relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserIcon size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="appearance-none block w-full pl-10 px-3 py-3 border border-slate-200 rounded-xl shadow-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm font-medium"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                {isAdminLogin && (mode === 'login') ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admin Email</label>
                    <div className="mt-1 relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserIcon size={18} />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="appearance-none block w-full pl-10 px-3 py-3 border border-slate-200 rounded-xl shadow-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm font-medium"
                        placeholder="admin@example.com"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile Number</label>
                    <div className="mt-1 relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone size={18} />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="appearance-none block w-full pl-10 px-3 py-3 border border-slate-200 rounded-xl shadow-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm font-medium"
                        placeholder="Enter mobile number"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {mode === 'forgot' ? 'New Password' : 'Password'}
                  </label>
                  <div className="mt-1 relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full pl-10 px-3 py-3 border border-slate-200 rounded-xl shadow-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {mode === 'login' && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-500"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-300 transition-all active:scale-[0.98]"
                >
                  {loading ? 'Processing...' : (
                    <>
                      {mode === 'login' ? 'Login' : mode === 'register' ? 'Click Here to Register' : 'Reset Password'}
                      <ArrowRight size={18} className="ml-2" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          {mode === 'forgot' && (
            <div className="mt-6 text-center">
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center mx-auto"
              >
                <LogIn size={14} className="mr-1" />
                Back to Login
              </button>
            </div>
          )}

          {mode === 'login' && (
            <div className="mt-6 text-center pt-6 border-t border-slate-100">
              <button
                onClick={() => { setIsAdminLogin(!isAdminLogin); setError(''); setSuccess(''); }}
                className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {isAdminLogin ? "Back to Student Login?" : "Owner / Admin Login?"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
            QuantMaster Pro &copy; 2026 | Educational Platform
          </p>
        </div>
      </div>
    </div>
  );
}
