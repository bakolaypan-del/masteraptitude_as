import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Trophy, Target, LogOut, FileText, CheckCircle, Clock, BookOpen, Play, ChevronRight, ArrowLeft, ExternalLink, Menu, X, Youtube, MessageCircle, Send, LayoutDashboard, History, ChevronDown, ArrowRight, User, Info, Phone, Download } from 'lucide-react';

type DashboardTab = 'home' | 'profile' | 'mock_topic' | 'mock_sectional' | 'mock_full' | 'notes' | 'video' | 'pyq' | 'pattern' | 'affairs' | 'practice' | 'about' | 'contact';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [activeTests, setActiveTests] = useState<any[]>([]);
  const [pastResults, setPastResults] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [pyqs, setPyqs] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [carousels, setCarousels] = useState<any[]>([]);
  const [affairs, setAffairs] = useState<any[]>([]);
  const [practiceSets, setPracticeSets] = useState<any[]>([]);
  const [aboutInfo, setAboutInfo] = useState({ content: '', contact: '' });
  const [socialLinks, setSocialLinks] = useState({ youtube: '', telegram: '', whatsapp: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [mockOpen, setMockOpen] = useState(false);
  
  // Profile Update State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditPhone(profile.phoneNumber || '');
    }
  }, [profile]);

  const categories = ['All', 'GK', 'English', 'Math', 'Reasoning', 'Computer'];

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        console.log("Fetching student data...");
        
        // Fetch Active Tests
        const testsQuery = query(collection(db, 'tests'), where('isActive', '==', true));
        const testsSnap = await getDocs(testsQuery);
        setActiveTests(testsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Fetch Notes
        const notesSnap = await getDocs(query(collection(db, 'notes'), orderBy('createdAt', 'desc')));
        setNotes(notesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Videos
        const videosSnap = await getDocs(query(collection(db, 'videos'), orderBy('createdAt', 'desc')));
        setVideos(videosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Pyqs
        const pyqsSnap = await getDocs(query(collection(db, 'pyqs'), orderBy('createdAt', 'desc')));
        setPyqs(pyqsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Patterns
        const patternsSnap = await getDocs(query(collection(db, 'patterns'), orderBy('createdAt', 'desc')));
        setPatterns(patternsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Affairs
        const affairsSnap = await getDocs(query(collection(db, 'affairs'), orderBy('createdAt', 'desc')));
        setAffairs(affairsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Practice Sets
        const practiceSnap = await getDocs(query(collection(db, 'practice_sets'), orderBy('createdAt', 'desc')));
        setPracticeSets(practiceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch About & Contact Info
        const infoSnap = await getDoc(doc(db, 'settings', 'site_info'));
        if (infoSnap.exists()) {
          setAboutInfo(infoSnap.data() as any);
        }

        // Fetch Carousels
        const carouselsSnap = await getDocs(query(collection(db, 'carousel'), orderBy('createdAt', 'desc')));
        const sortedCarousels = carouselsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99));
        setCarousels(sortedCarousels);

        // Fetch Social Links
        const socialSnap = await getDoc(doc(db, 'settings', 'social_links'));
        if (socialSnap.exists()) {
          const data = socialSnap.data();
          setSocialLinks({
            youtube: data.youtube || '',
            telegram: data.telegram || '',
            whatsapp: data.whatsapp || ''
          });
        }

        // Fetch Past Results
        const resultsQuery = query(collection(db, 'results'), where('userId', '==', user.uid));
        const resultsSnap = await getDocs(resultsQuery);
        const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
        results.sort((a, b) => b.timestamp - a.timestamp);
        setPastResults(results);

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'multiple collections');
      }
      setLoading(false);
    }
    
    fetchData();
  }, [user]);

  // Slideshow Logic
  useEffect(() => {
    if (carousels.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % carousels.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carousels]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdatingProfile(true);
    try {
      // 1. Update Firestore Profile
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        name: editName,
        phoneNumber: editPhone,
        updatedAt: new Date().toISOString()
      });

      // 2. Update Password if provided
      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          alert('Password must be at least 6 characters long');
          setUpdatingProfile(false);
          return;
        }
        await updatePassword(user, newPassword);
        setNewPassword('');
      }

      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        alert('Please log out and log back in to change your password for security reasons.');
      } else {
        alert('Error updating profile: ' + error.message);
      }
    } finally {
      setUpdatingProfile(false);
    }
  };

  const performanceStats = {
    totalTests: pastResults.length,
    bestScore: pastResults.length > 0 ? Math.max(...pastResults.map(r => r.score || 0)) : 0,
    avgScore: pastResults.length > 0 ? (pastResults.reduce((acc, r) => acc + (r.score || 0), 0) / pastResults.length).toFixed(1) : 0,
    avgAccuracy: pastResults.length > 0 ? (pastResults.reduce((acc, r) => acc + (r.accuracy || 0), 0) / pastResults.length).toFixed(1) : 0,
    latestScore: pastResults.length > 0 ? pastResults[0].score : 0,
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing Dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-slate-900 overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Dark Left Sidebar */}
      <aside className={`fixed inset-y-0 left-0 bg-[#1c2128] text-slate-300 flex flex-col w-64 h-full shrink-0 shadow-xl z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 shrink-0 bg-[#15191e]">
          <button onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }} className="flex items-center hover:bg-[#1a1f26] transition-colors w-full text-left">
            <Target className="w-6 h-6 text-cyan-400 mr-2 shrink-0" />
            <span className="text-xl font-bold text-white tracking-tight uppercase truncate">Master Aptitude</span>
          </button>
          <button 
            className="md:hidden text-slate-400 hover:text-white shrink-0 ml-2"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 space-y-4 px-3">
          {/* HOME */}
          <button 
            onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm 
              ${activeTab === 'home' 
                ? 'bg-indigo-50 text-indigo-600 shadow-lg shadow-indigo-200/20' 
                : 'text-slate-400 bg-indigo-500/5 hover:bg-indigo-500/10 hover:text-indigo-300'}`}
          >
            <Target className={`w-5 h-5 shrink-0 ${activeTab === 'home' ? 'text-indigo-600' : 'text-indigo-400'}`} />
            Home
          </button>

          {/* PROFILE */}
          <button 
            onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm 
              ${activeTab === 'profile' 
                ? 'bg-rose-50 text-rose-600 shadow-lg shadow-rose-200/20' 
                : 'text-slate-400 bg-rose-500/5 hover:bg-rose-500/10 hover:text-rose-300'}`}
          >
            <User className={`w-5 h-5 shrink-0 ${activeTab === 'profile' ? 'text-rose-600' : 'text-rose-400'}`} />
            Profile
          </button>

          {/* LEARN SECTION */}
          <div className="space-y-1">
            <button 
              onClick={() => setLearnOpen(!learnOpen)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm 
                ${['video', 'notes', 'affairs', 'practice'].includes(activeTab) 
                  ? 'bg-violet-50 text-violet-600 shadow-lg shadow-violet-200/20' 
                  : 'text-slate-400 bg-violet-500/5 hover:bg-violet-500/10 hover:text-violet-300'}`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className={`w-5 h-5 shrink-0 ${['video', 'notes', 'affairs', 'practice'].includes(activeTab) ? 'text-violet-600' : 'text-violet-400'}`} />
                Learn
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${learnOpen ? 'rotate-90' : ''}`} />
            </button>
            
            {learnOpen && (
              <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-200">
                <button 
                  onClick={() => { setActiveTab('video'); setIsSidebarOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-xs ${activeTab === 'video' ? 'text-rose-600 bg-rose-50' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  Recorded Video
                </button>
                <button 
                  onClick={() => { setActiveTab('notes'); setIsSidebarOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-xs ${activeTab === 'notes' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  Study Notes
                </button>
                <button 
                  onClick={() => { setActiveTab('affairs'); setIsSidebarOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-xs ${activeTab === 'affairs' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  Current Affairs
                </button>
                <button 
                  onClick={() => { setActiveTab('practice'); setIsSidebarOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-xs ${activeTab === 'practice' ? 'text-amber-600 bg-amber-50' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  Practice Set
                </button>
              </div>
            )}
          </div>

          {/* MOCK TEST SECTION */}
          <div className="space-y-1">
            <button 
              onClick={() => setMockOpen(!mockOpen)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm 
                ${activeTab.startsWith('mock') 
                  ? 'bg-emerald-50 text-emerald-600 shadow-lg shadow-emerald-200/20' 
                  : 'text-slate-400 bg-emerald-500/5 hover:bg-emerald-500/10 hover:text-emerald-300'}`}
            >
              <div className="flex items-center gap-3">
                <FileText className={`w-5 h-5 shrink-0 ${activeTab.startsWith('mock') ? 'text-emerald-600' : 'text-emerald-400'}`} />
                Mock Test
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${mockOpen ? 'rotate-90' : ''}`} />
            </button>
            
            {mockOpen && (
              <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-200">
                <button 
                  onClick={() => { setActiveTab('mock_topic'); setSelectedCategory('All'); setIsSidebarOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-xs ${activeTab === 'mock_topic' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  Topic Wise Mock Test
                </button>
                <button 
                  onClick={() => { setActiveTab('mock_sectional'); setSelectedCategory('All'); setIsSidebarOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-xs ${activeTab === 'mock_sectional' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  Sectional Mock Test
                </button>
                <button 
                  onClick={() => { setActiveTab('mock_full'); setSelectedCategory('All'); setIsSidebarOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-xs ${activeTab === 'mock_full' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  Full Mock Test
                </button>
              </div>
            )}
          </div>

          {/* OTHER LINKS */}
          <button 
            onClick={() => { setActiveTab('pyq'); setIsSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm 
              ${activeTab === 'pyq' 
                ? 'bg-amber-50 text-amber-600 shadow-lg shadow-amber-200/20' 
                : 'text-slate-400 bg-amber-500/5 hover:bg-amber-500/10 hover:text-amber-300'}`}
          >
            <Clock className={`w-5 h-5 shrink-0 ${activeTab === 'pyq' ? 'text-amber-600' : 'text-amber-400'}`} />
            Previous Year Papers
          </button>

          <button 
            onClick={() => { setActiveTab('pattern'); setIsSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm 
              ${activeTab === 'pattern' 
                ? 'bg-blue-50 text-blue-600 shadow-lg shadow-blue-200/20' 
                : 'text-slate-400 bg-blue-500/5 hover:bg-blue-500/10 hover:text-blue-300'}`}
          >
            <Trophy className={`w-5 h-5 shrink-0 ${activeTab === 'pattern' ? 'text-blue-600' : 'text-blue-400'}`} />
            Exam Pattern & Syllabus
          </button>

          <button 
            onClick={() => { setActiveTab('about'); setIsSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm 
              ${activeTab === 'about' 
                ? 'bg-cyan-50 text-cyan-600 shadow-lg shadow-cyan-200/20' 
                : 'text-slate-400 bg-cyan-500/5 hover:bg-cyan-500/10 hover:text-cyan-300'}`}
          >
            <BookOpen className={`w-5 h-5 shrink-0 ${activeTab === 'about' ? 'text-cyan-600' : 'text-cyan-400'}`} />
            About Us
          </button>

          <button 
            onClick={() => { setActiveTab('contact'); setIsSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm 
              ${activeTab === 'contact' 
                ? 'bg-sky-50 text-sky-600 shadow-lg shadow-sky-200/20' 
                : 'text-slate-400 bg-sky-500/5 hover:bg-sky-500/10 hover:text-sky-300'}`}
          >
            <MessageCircle className={`w-5 h-5 shrink-0 ${activeTab === 'contact' ? 'text-sky-600' : 'text-sky-400'}`} />
            Contact Us
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto w-full md:w-auto">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-10 w-full">
          <div className="flex items-center flex-1 max-w-xl">
             <button
               onClick={() => setIsSidebarOpen(true)}
               className="md:hidden p-2 mr-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl"
             >
               <Menu className="w-6 h-6" />
             </button>
             {/* Left side empty for now as search is removed */}
          </div>
          <div className="flex items-center gap-6 ml-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Profile</span>
              <span className="text-xs font-bold text-slate-800">{profile?.name || 'Loading...'}</span>
              <span className="text-[10px] font-medium text-slate-500">{profile?.phoneNumber || ''}</span>
            </div>
            {profile?.role === 'admin' && (
              <Link to="/admin" className="text-[10px] font-black bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-slate-900 transition-all shadow-md shadow-indigo-100 uppercase tracking-widest">
                Admin Panel
              </Link>
            )}
            <button 
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="p-6 md:p-10 w-full animate-in fade-in duration-500">
          
          {/* Welcome & Carousel - Only Show on Home */}
          {activeTab === 'home' && (
            <div className="animate-in fade-in duration-500">
              {/* Welcome & Motivation Section */}
              <div className="mb-6 bg-[#004d00] rounded-2xl p-4 md:p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Background images - more visible now */}
                <div className="absolute inset-0 opacity-60 mix-blend-overlay pointer-events-none">
                  <div className="absolute inset-0 flex gap-2 p-1">
                    <img src="https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&q=80&w=400" className="w-1/2 h-full object-cover" alt="Studying Boy" referrerPolicy="no-referrer" />
                    <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=400" className="w-1/2 h-full object-cover" alt="Studying Girl" referrerPolicy="no-referrer" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#004d00]/80 via-[#004d00]/60 to-transparent pointer-events-none"></div>

                <div className="relative z-10 w-full text-center md:text-left">
                  <h2 className="text-lg md:text-2xl font-black mb-1 tracking-tight">
                    Welcome, <span className="text-yellow-400">{profile?.name || 'Student'}</span>
                  </h2>
                  <p className="text-xs md:text-sm font-bold text-white/95 drop-shadow-sm">
                    Master Aptitude: Your Journey to Success Begins Today!
                  </p>
                </div>
              </div>

              {/* Image Carousel */}
              {carousels.length > 0 && (
                <div className="mb-8 w-full h-44 sm:h-56 md:h-72 lg:h-96 relative rounded-3xl overflow-hidden shadow-lg border-2 border-slate-200">
                   <div 
                     className="w-full h-full flex transition-transform duration-1000 ease-in-out"
                     style={{ transform: `translateX(-${currentSlideIndex * 100}%)` }}
                   >
                     {carousels.map((slide) => (
                       <div key={slide.id} className="w-full h-full shrink-0 relative">
                          <img src={slide.link} alt="Slide Informational" className="w-full h-full object-cover" />
                          <div className="absolute top-4 right-4 z-30">
                            <div className="bg-red-600 text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-full shadow-lg border border-white/20 animate-fast-blink">
                              NEW
                            </div>
                          </div>
                       </div>
                     ))}
                   </div>
                   
                   {/* Controls */}
                   {carousels.length > 1 && (
                     <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
                       {carousels.map((_, idx) => (
                         <button 
                           key={idx}
                           onClick={() => setCurrentSlideIndex(idx)}
                           className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentSlideIndex ? 'bg-white scale-125 shadow-sm' : 'bg-white/50 hover:bg-white/80'}`}
                         />
                       ))}
                     </div>
                   )}
                </div>
              )}

              {/* Social Links Box - Single Line */}
              <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-4">
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-2 sm:p-4 bg-rose-50/80 border border-red-200 rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-b from-red-100/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center mb-2 relative z-10 group-hover:scale-110 transition-transform shadow-lg shadow-red-200">
                      <Youtube className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>
                    <div className="relative z-10 text-center">
                      <h4 className="font-bold text-slate-800 text-[9px] sm:text-[13px] leading-tight">YouTube Link</h4>
                      <p className="text-[7px] sm:text-[10px] text-slate-500 mt-1 leading-relaxed">Subscribe to our channel for free classes.</p>
                    </div>
                  </a>
                )}
                
                {socialLinks.whatsapp && (
                  <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-2 sm:p-4 bg-emerald-50/80 border border-green-200 rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-b from-green-100/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-emerald-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center mb-2 relative z-10 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-200">
                      <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>
                    <div className="relative z-10 text-center">
                      <h4 className="font-bold text-slate-800 text-[9px] sm:text-[13px] leading-tight">WhatsApp Link</h4>
                      <p className="text-[7px] sm:text-[10px] text-slate-500 mt-1 leading-relaxed">Join our group for daily updates.</p>
                    </div>
                  </a>
                )}

                {socialLinks.telegram && (
                  <a href={socialLinks.telegram} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-2 sm:p-4 bg-sky-50/80 border border-blue-200 rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-100/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-sky-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center mb-2 relative z-10 group-hover:scale-110 transition-transform shadow-lg shadow-sky-200">
                      <Send className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>
                    <div className="relative z-10 text-center">
                      <h4 className="font-bold text-slate-800 text-[9px] sm:text-[13px] leading-tight">Telegram Link</h4>
                      <p className="text-[7px] sm:text-[10px] text-slate-500 mt-1 leading-relaxed">Get notes and practice sets instantly.</p>
                    </div>
                  </a>
                )}
              </div>

              {/* Home Footer Section */}
              <div className="mt-16 pt-8 border-t border-slate-200">
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">Need Assistance?</h3>
                  <p className="text-slate-500 font-medium mb-6">If you have any questions regarding your studies or the platform, feel free to contact us.</p>
                  <div className="text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center gap-3 animate-blink-red">
                    Any Query Call - <a href="tel:8900011708" className="hover:underline">8900011708</a> (Shibnath)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Affairs Tab Content */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-white rounded-[40px] p-8 sm:p-12 border border-slate-100 shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Your Profile</h2>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Personal Account Settings</p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input 
                          type="text" required
                          value={editName} onChange={e => setEditName(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-hidden focus:border-rose-400 focus:bg-white transition-all font-bold text-slate-700 shadow-sm"
                          placeholder="Your Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                        <input 
                          type="tel" required
                          value={editPhone} onChange={e => setEditPhone(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-hidden focus:border-rose-400 focus:bg-white transition-all font-bold text-slate-700 shadow-sm"
                          placeholder="Mobile Number"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address (Read-only)</label>
                      <input 
                        type="email" readOnly
                        value={user?.email || ''}
                        className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl px-6 py-4 outline-hidden opacity-60 font-bold text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password (Leave blank to keep current)</label>
                      <input 
                        type="password"
                        value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-hidden focus:border-rose-400 focus:bg-white transition-all font-bold text-slate-700 shadow-sm"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="pt-6">
                      <button 
                        type="submit"
                        disabled={updatingProfile}
                        className="w-full bg-rose-600 text-white rounded-2xl py-5 font-black text-sm uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-rose-200 disabled:bg-slate-400 disabled:shadow-none flex items-center justify-center gap-3"
                      >
                        {updatingProfile ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving Changes...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Update Profile
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  <div className="mt-12 pt-8 border-t border-slate-50">
                    <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Registration Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1">Account Role</span>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest bg-white px-2 py-1 rounded-md shadow-xs border border-slate-200">
                          {profile?.role || 'User'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1">Status</span>
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute left-0 bottom-0 -translate-x-1/4 translate-y-1/4 w-96 h-96 bg-rose-50 rounded-full blur-3xl pointer-events-none opacity-40"></div>
              </div>
            </div>
          )}

          {/* Affairs Tab Content */}
          {activeTab === 'affairs' && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Current Affairs
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {affairs.map(item => (
                  <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative group hover:shadow-lg transition-all">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-2 tracking-tight">{item.title}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{item.date || 'Latest'}</p>
                    <a 
                      href={item.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between w-full text-blue-600 font-bold text-xs uppercase tracking-wider bg-blue-50 px-4 py-2.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                    >
                      Read Now
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
                {affairs.length === 0 && (
                  <div className="col-span-full bg-white rounded-3xl p-16 border border-slate-200 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                    <p className="font-bold text-sm uppercase tracking-widest text-slate-500 mb-2">No Current Affairs uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Practice Set Tab Content */}
          {activeTab === 'practice' && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Practice Sets
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {practiceSets.map(item => (
                  <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative group hover:shadow-lg transition-all">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-2 tracking-tight">{item.title}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{item.subject || 'Practice'}</p>
                    <a 
                      href={item.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between w-full text-emerald-600 font-bold text-xs uppercase tracking-wider bg-emerald-50 px-4 py-2.5 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                    >
                      Download PDF
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
                {practiceSets.length === 0 && (
                  <div className="col-span-full bg-white rounded-3xl p-16 border border-slate-200 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                    <p className="font-bold text-sm uppercase tracking-widest text-slate-500 mb-2">No Practice Sets uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* About Us Tab Content */}
          {activeTab === 'about' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tight flex items-center gap-4">
                    <div className="w-1.5 h-10 bg-indigo-600 rounded-full"></div>
                    About Master Aptitude
                  </h2>
                  <div className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:text-lg prose-p:leading-relaxed prose-strong:text-indigo-600 whitespace-pre-wrap">
                    {aboutInfo.content || 'Master Aptitude is dedicated to providing quality education and resources for all types of competitive exams. Our goal is to empower students with the tools and knowledge necessary to succeed.'}
                  </div>
                </div>
                <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-indigo-50 rounded-full blur-3xl pointer-events-none opacity-50"></div>
              </div>
            </div>
          )}

          {/* Contact Us Tab Content */}
          {activeTab === 'contact' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tight flex items-center gap-4">
                    <div className="w-1.5 h-10 bg-cyan-500 rounded-full"></div>
                    Contact Us
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="bg-cyan-50 p-6 rounded-2xl border border-cyan-100">
                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px] mb-4">Official Contact</h4>
                        <div className="flex items-center gap-4 text-xl font-bold text-slate-800">
                           <MessageCircle className="w-6 h-6 text-cyan-600" />
                           <a href="tel:8900011708" className="hover:text-cyan-600 transition-colors">8900011708</a>
                        </div>
                        <p className="mt-2 text-slate-500 font-medium">Available for all queries (Shibnath)</p>
                      </div>
                      
                      <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px] mb-4">Join Community</h4>
                        <div className="flex gap-4">
                          {socialLinks.youtube && <a href={socialLinks.youtube} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm hover:scale-110 transition-transform"><Youtube className="w-6 h-6" /></a>}
                          {socialLinks.whatsapp && <a href={socialLinks.whatsapp} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm hover:scale-110 transition-transform"><MessageCircle className="w-6 h-6" /></a>}
                          {socialLinks.telegram && <a href={socialLinks.telegram} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-sky-600 shadow-sm hover:scale-110 transition-transform"><Send className="w-6 h-6" /></a>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:text-lg whitespace-pre-wrap">
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px] mb-4">Additional Information</h4>
                      {aboutInfo.contact || 'For any other queries or partnership requests, please reach out to us through our social channels or contact number provided.'}
                    </div>
                  </div>
                </div>
                <div className="absolute left-0 bottom-0 -translate-x-1/4 translate-y-1/4 w-96 h-96 bg-cyan-50 rounded-full blur-3xl pointer-events-none opacity-50"></div>
              </div>
            </div>
          )}

          {/* Dashboard Tab Content */}
          {activeTab.startsWith('mock') && (
            <div className="space-y-10">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Your <span className="text-indigo-600">{activeTab === 'mock_topic' ? 'Topic Wise' : activeTab === 'mock_sectional' ? 'Sectional' : 'Full'} Test Series</span>
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setSelectedTopic(null); }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {selectedCategory === 'Computer' && !selectedTopic ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    "Basics of Computers",
                    "Computer Hardware",
                    "Computer Software",
                    "Operating Systems",
                    "MS Office",
                    "Internet and Networking",
                    "Computer Abbreviations and Terminology",
                    "Computer Security",
                    "Computer History and Generations"
                  ].map((topicName) => (
                    <button 
                      key={topicName}
                      onClick={() => setSelectedTopic(topicName)}
                      className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all flex flex-col items-center text-center group"
                    >
                      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                        <BookOpen className="w-8 h-8" />
                      </div>
                      <h3 className="font-black text-slate-800 text-lg mb-2 leading-tight uppercase tracking-tight">{topicName}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        20 Mock Tests <ChevronRight className="w-3 h-3 text-indigo-400" />
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {selectedTopic && (
                    <div className="flex items-center gap-4 mb-4">
                      <button 
                        onClick={() => setSelectedTopic(null)}
                        className="flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Topics
                      </button>
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">{selectedTopic}</h3>
                    </div>
                  )}

                  {activeTests.filter(t => {
                    const matchesType = (t.testType || 'topic') === activeTab.replace('mock_', '');
                    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
                    const matchesTopic = !selectedTopic || t.topic === selectedTopic;
                    return matchesType && matchesCategory && matchesTopic;
                  }).length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400 shadow-sm flex flex-col items-center">
                  <FileText className="w-12 h-12 mb-4 text-slate-200" />
                  <p className="font-bold text-sm uppercase tracking-widest text-slate-500 mb-2">No {activeTab.replace('mock_', '')} Mock Tests yet.</p>
                  <p className="text-slate-400 text-xs font-medium">Informing Suman Sir to upload new Mock!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeTests.filter(t => {
                    const matchesType = (t.testType || 'topic') === activeTab.replace('mock_', '');
                    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
                    const matchesTopic = !selectedTopic || t.topic === selectedTopic;
                    return matchesType && matchesCategory && matchesTopic;
                  }).map(test => {
                    const isTaken = pastResults.some(r => r.testId === test.id);
                    return (
                      <div key={test.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs transition-all hover:shadow-lg group flex flex-col">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                              <Target className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {test.category && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded border border-emerald-100">
                                  {test.category}
                                </span>
                              )}
                              <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded border border-amber-100 flex items-center gap-1">
                                  Students <FileText className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-slate-800 text-base leading-snug mb-1 min-h-[24px] group-hover:text-indigo-600 transition-colors">
                            {test.title}
                          </h3>
                          {test.subjectName && (
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3">
                              {test.subjectName}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between mt-auto">
                            <p className="text-xs font-bold text-slate-500 flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                              {test.duration || 60} Mins
                            </p>
                            <p className="text-xs font-bold text-slate-500 truncate max-w-[120px]">
                              {test.topic}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100">
                          <Link 
                            to={`/test/${test.id}`}
                            className={`flex items-center justify-center w-full py-2.5 rounded-lg transition-all font-bold text-xs uppercase tracking-wider
                              ${isTaken ? 'bg-[#00c9db] text-white hover:bg-[#00b5c5]' : 'bg-[#00c9db] text-white hover:bg-[#00b5c5]'}
                            `}
                          >
                            {isTaken ? 'Reattempt Test' : 'Go To Test Series'}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

              {/* Performance Analytics Section - Moved here and made compact */}
              <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-xl shadow-indigo-500/5 relative overflow-hidden group mt-12 mb-8">
                  <div className="absolute top-0 right-0 p-4 text-indigo-50/20 pointer-events-none transition-transform group-hover:scale-105 duration-700">
                    <Trophy className="w-32 h-32 -mr-6 -mt-6 rotate-12" />
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 relative z-10">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                    Performance Insights
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 relative z-10">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-xs text-center flex flex-col items-center justify-center hover:border-indigo-300 transition-colors">
                      <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-2">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Best Score</p>
                      <p className="text-lg font-black text-indigo-600 tracking-tighter">{performanceStats.bestScore}</p>
                    </div>
                    
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-xs text-center flex flex-col items-center justify-center hover:border-emerald-300 transition-colors">
                      <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-2">
                        <Target className="w-4 h-4" />
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Score</p>
                      <p className="text-lg font-black text-emerald-600 tracking-tighter">{performanceStats.avgScore}</p>
                    </div>

                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-xs text-center flex flex-col items-center justify-center hover:border-amber-300 transition-colors">
                      <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-2">
                        <User className="w-4 h-4" />
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Rank</p>
                      <p className="text-lg font-black text-amber-600 tracking-tighter">#{profile?.globalRank || '-'}</p>
                    </div>

                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-xs text-center flex flex-col items-center justify-center hover:border-rose-300 transition-colors">
                      <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 mb-2">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Accuracy</p>
                      <p className="text-lg font-black text-rose-600 tracking-tighter">{performanceStats.avgAccuracy}%</p>
                    </div>

                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-xs text-center flex flex-col items-center justify-center hover:border-violet-300 transition-colors">
                      <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 mb-2">
                        <History className="w-4 h-4" />
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Latest</p>
                      <p className="text-lg font-black text-violet-600 tracking-tighter">{performanceStats.latestScore}</p>
                    </div>
                  </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Study Materials
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {notes.map(note => (
                  <div key={note.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative group hover:shadow-lg transition-all">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-2 tracking-tight">{note.title}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{note.subject}</p>
                    <a 
                      href={note.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between w-full text-emerald-600 font-bold text-xs uppercase tracking-wider bg-emerald-50 px-4 py-2.5 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                    >
                      Open Resource
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="col-span-full bg-white rounded-3xl p-16 border border-slate-200 text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                    <p className="font-bold text-sm uppercase tracking-widest text-slate-500 mb-2">Knowledge Base is Empty</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Video Lectures
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map(video => (
                   <div key={video.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs relative group hover:shadow-lg transition-all overflow-hidden flex flex-col">
                      <div className="aspect-video bg-slate-900 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-700 bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center">
                         <div className="absolute inset-0 bg-slate-900/60 transition-opacity group-hover:bg-slate-900/40"></div>
                         <a href={video.link} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center relative z-10 hover:bg-rose-600 transition-all group-hover:scale-110 border border-white/30">
                            <Play className="w-5 h-5 fill-current ml-1" />
                         </a>
                      </div>
                      <div className="p-6">
                         <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            {video.subject}
                         </p>
                         <h4 className="font-bold text-slate-800 text-lg mb-4 line-clamp-2">{video.title}</h4>
                         <a 
                          href={video.link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-3 w-full border border-rose-200 text-rose-600 font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                        >
                          Watch Lecture
                        </a>
                      </div>
                   </div>
                ))}
                {videos.length === 0 && (
                  <div className="col-span-full bg-white rounded-3xl p-16 border border-slate-200 text-center">
                    <Play className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                    <p className="font-bold text-sm uppercase tracking-widest text-slate-500 mb-2">Video Vault is Empty</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pyq' && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Previous Year Questions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {pyqs.map(pyq => (
                  <div key={pyq.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative group hover:shadow-lg transition-all">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-2 tracking-tight">{pyq.title}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{pyq.subject}</p>
                    <a 
                      href={pyq.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between w-full text-amber-600 font-bold text-xs uppercase tracking-wider bg-amber-50 px-4 py-2.5 rounded-lg hover:bg-amber-600 hover:text-white transition-all"
                    >
                      Open Document
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
                {pyqs.length === 0 && (
                  <div className="col-span-full bg-white rounded-3xl p-16 border border-slate-200 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                    <p className="font-bold text-sm uppercase tracking-widest text-slate-500 mb-2">No PYQs uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pattern' && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Exam Pattern & Syllabus
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {patterns.map(pattern => (
                  <div key={pattern.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative group hover:shadow-lg transition-all">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-4 tracking-tight">{pattern.title}</h4>
                    <div className="space-y-2">
                      {pattern.files ? pattern.files.map((file: any, idx: number) => (
                        <a 
                          key={idx}
                          href={file.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between w-full text-blue-600 font-bold text-[10px] uppercase tracking-wider bg-blue-50 px-4 py-2.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                        >
                          {file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )) : (
                        <a 
                          href={pattern.link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between w-full text-blue-600 font-bold text-xs uppercase tracking-wider bg-blue-50 px-4 py-2.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                        >
                          Open Syllabus
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {patterns.length === 0 && (
                  <div className="col-span-full bg-white rounded-3xl p-16 border border-slate-200 text-center">
                    <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                    <p className="font-bold text-sm uppercase tracking-widest text-slate-500 mb-2">No Pattern / Syllabus uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
        </main>
      </div>

    </div>
  );
}

