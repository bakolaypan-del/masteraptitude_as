import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { Phone, AlertCircle, User as UserIcon, GraduationCap } from 'lucide-react';

export default function Login() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phoneNumber) {
      setError('Please provide both your name and phone number');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const cleanedPhone = phoneNumber.replace(/\s+/g, '');
      const pseudoEmail = `${cleanedPhone}@quantmaster.app`;
      const fixedPassword = `quantmaster-${cleanedPhone}`;

      let loggedUser;
      try {
        const result = await signInWithEmailAndPassword(auth, pseudoEmail, fixedPassword);
        loggedUser = result.user;
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials' || err.code === 'auth/wrong-password') {
          try {
            const result = await createUserWithEmailAndPassword(auth, pseudoEmail, fixedPassword);
            loggedUser = result.user;
          } catch (createErr: any) {
             throw createErr;
          }
        } else {
          throw err;
        }
      }

      if (!loggedUser) throw new Error("Authentication failed");
      
      // Update profile with name if it's new or empty
      const profileRef = doc(db, 'profiles', loggedUser.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          name: fullName,
          phoneNumber: cleanedPhone, // Store just the cleaned phone number
          email: loggedUser.email || '',
          role: 'user',
          totalTestsTaken: 0,
          cumulativeScore: 0,
          globalRank: 0
        });
      } else {
        // Update name if profile exists
        await updateDoc(profileRef, { name: fullName });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
         setError('Please enable "Email/Password" sign-in provider in your Firebase Console (Authentication > Sign-in method) to use this passwordless login method.');
      } else if (err.message?.includes('offline') || err.message?.includes('network')) {
        setError('Connection lost. Please check your internet and try again.');
      } else {
        setError(err.message || 'Error logging in. Please check your details.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex bg-linear-to-br from-green-50 via-emerald-100 to-teal-100 items-center justify-center min-h-screen p-4 font-sans overflow-hidden relative">
      {/* Dynamic background shapes for a vibrant look */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-200/50 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-green-300/40 rounded-full blur-[100px] animate-pulse duration-700"></div>
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-teal-200/30 rounded-full blur-[80px]"></div>
      
      <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl overflow-hidden p-12 border border-white/50 relative z-10 transition-all hover:shadow-emerald-200/50">
        
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200 mb-8 transform -rotate-6 transition-transform hover:rotate-0 duration-500">
            <GraduationCap size={40} strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-0">Master Aptitude</h2>
          <p className="text-sm font-bold text-emerald-600 mb-8 italic">By Suman Sir</p>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] text-center bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
            Student Authentication
          </p>
        </div>

        {error && (
          <div className="mb-8 bg-rose-50 border border-rose-100 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-xs font-bold text-rose-700 leading-tight">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Full Name
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600">
                <UserIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                id="fullName"
                required
                className="pl-12 block w-full rounded-lg border border-slate-200 bg-slate-50 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:ring-2 focus:ring-indigo-600 focus:border-transparent focus:bg-white transition-all outline-none"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Phone Number
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600">
                <Phone className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="tel"
                id="phoneNumber"
                required
                className="pl-12 block w-full rounded-lg border border-slate-200 bg-slate-50 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:ring-2 focus:ring-indigo-600 focus:border-transparent focus:bg-white transition-all outline-none"
                placeholder="+91 00000 00000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading || !phoneNumber || !fullName}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold uppercase tracking-widest text-white bg-indigo-600 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-300 transition-all active:scale-95"
          >
            {loading ? 'Signing in...' : 'Enter Quick Test'}
          </button>
        </form>
      </div>

      <footer className="absolute bottom-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
        QuantMaster Pro &copy; 2026 | Fast Response Environment
      </footer>
    </div>
  );
}
