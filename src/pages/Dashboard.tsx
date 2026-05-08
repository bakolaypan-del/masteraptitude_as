import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { Trophy, Target, LogOut, FileText, CheckCircle, Clock, BookOpen, Play, ChevronRight, ExternalLink, Menu, X, Youtube, MessageCircle, Send } from 'lucide-react';

type DashboardTab = 'home' | 'mock_topic' | 'mock_sectional' | 'mock_full' | 'notes' | 'video' | 'pyq' | 'pattern';

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
  const [socialLinks, setSocialLinks] = useState({ youtube: '', telegram: '', whatsapp: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

        // Fetch Carousels
        const carouselsSnap = await getDocs(query(collection(db, 'carousel'), orderBy('createdAt', 'desc')));
        setCarousels(carouselsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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
        console.error("Error fetching data", error);
        // Fallback for missing index or other issues during development
        try {
           const allTestsSnap = await getDocs(collection(db, 'tests'));
           const active = allTestsSnap.docs
             .map(doc => ({ id: doc.id, ...doc.data() } as any))
             .filter(t => t.isActive === true);
           setActiveTests(active);
        } catch (innerError) {
           console.error("Critical error fetching data", innerError);
        }
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
          {/* LEARN */}
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl py-4 pb-3">
            <div className="px-4 mb-3 text-[10px] font-black text-indigo-400/80 tracking-widest uppercase flex items-center gap-2">
              <BookOpen className="w-3 h-3" /> Learn
            </div>
            <div className="flex flex-col gap-1 px-2">
              <button 
                onClick={() => { setActiveTab('video'); setIsSidebarOpen(false); }} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-bold text-sm ${activeTab === 'video' ? 'bg-indigo-500/30 text-indigo-50 border-l-4 border-indigo-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-4 border-transparent'}`}
              >
                <Play className="w-4 h-4 shrink-0" />
                Recorded Video
              </button>
              <button 
                onClick={() => { setActiveTab('notes'); setIsSidebarOpen(false); }} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-bold text-sm ${activeTab === 'notes' ? 'bg-indigo-500/30 text-indigo-50 border-l-4 border-indigo-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-4 border-transparent'}`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                Study Notes
              </button>
            </div>
          </div>

          {/* TESTS */}
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl py-4 pb-3">
            <div className="px-4 mb-3 text-[10px] font-black text-rose-400/80 tracking-widest uppercase flex items-center gap-2">
              <FileText className="w-3 h-3" /> Tests
            </div>
            <div className="flex flex-col gap-1 px-2">
              <button 
                onClick={() => { setActiveTab('mock_topic'); setSelectedCategory('All'); setIsSidebarOpen(false); }} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-bold text-sm ${activeTab === 'mock_topic' ? 'bg-rose-500/30 text-rose-50 border-l-4 border-rose-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-4 border-transparent'}`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                Topic Wise Mock Test
              </button>
              <button 
                onClick={() => { setActiveTab('mock_sectional'); setSelectedCategory('All'); setIsSidebarOpen(false); }} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-bold text-sm ${activeTab === 'mock_sectional' ? 'bg-rose-500/30 text-rose-50 border-l-4 border-rose-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-4 border-transparent'}`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                Sectional Mock Test
              </button>
              <button 
                onClick={() => { setActiveTab('mock_full'); setSelectedCategory('All'); setIsSidebarOpen(false); }} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-bold text-sm ${activeTab === 'mock_full' ? 'bg-rose-500/30 text-rose-50 border-l-4 border-rose-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-4 border-transparent'}`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                Full Mock Test
              </button>
              <button 
                onClick={() => { setActiveTab('pyq'); setIsSidebarOpen(false); }} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-bold text-sm ${activeTab === 'pyq' ? 'bg-rose-500/30 text-rose-50 border-l-4 border-rose-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-4 border-transparent'}`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                Previous Year Papers
              </button>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl py-4 pb-3">
            <div className="px-4 mb-3 text-[10px] font-black text-emerald-400/80 tracking-widest uppercase flex items-center gap-2">
              <Trophy className="w-3 h-3" /> Exam Pattern & Syllabus
            </div>
            <div className="flex flex-col gap-1 px-2">
              <button 
                onClick={() => { setActiveTab('pattern'); setIsSidebarOpen(false); }} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-bold text-sm ${activeTab === 'pattern' ? 'bg-emerald-500/30 text-emerald-50 border-l-4 border-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-4 border-transparent'}`}
              >
                <Trophy className="w-4 h-4 shrink-0" />
                Exam Pattern & Syllabus
              </button>
            </div>
          </div>
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
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged in as</span>
              <span className="text-xs font-bold text-slate-800">{profile?.name || user?.email}</span>
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
              <div className="mb-8 bg-emerald-800 rounded-2xl px-6 py-4 text-white shadow-md relative overflow-hidden flex items-center">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
                  <h2 className="text-lg sm:text-xl font-bold leading-none text-emerald-50 whitespace-nowrap">
                    Great to see you, <span className="text-emerald-300">{profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Student'}!</span> 🚀
                  </h2>
                  <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-emerald-400/50"></div>
                  <p className="text-sm font-medium text-emerald-100/90 truncate">
                    You're doing amazing! Keep learning and growing today.
                  </p>
                </div>
                {/* Background design elements */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-32 h-32 bg-emerald-500/20 rounded-full blur-xl pointer-events-none"></div>
              </div>

              {/* Image Carousel */}
              {carousels.length > 0 && (
                <div className="mb-10 w-full h-48 sm:h-64 md:h-80 lg:h-96 relative rounded-3xl overflow-hidden shadow-lg border-2 border-slate-200">
                   <div 
                     className="w-full h-full flex transition-transform duration-1000 ease-in-out"
                     style={{ transform: `translateX(-${currentSlideIndex * 100}%)` }}
                   >
                     {carousels.map((slide) => (
                       <div key={slide.id} className="w-full h-full shrink-0 relative">
                          <img src={slide.link} alt="Slide Informational" className="w-full h-full object-cover" />
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
                      <h4 className="font-bold text-slate-800 text-[9px] sm:text-[13px] leading-tight">YouTube Channel</h4>
                      <p className="text-[7px] sm:text-[10px] text-slate-500 mt-1 leading-relaxed">Click here to Subscribe YouTube channel for free classes.</p>
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
                      <h4 className="font-bold text-slate-800 text-[9px] sm:text-[13px] leading-tight">WhatsApp Group</h4>
                      <p className="text-[7px] sm:text-[10px] text-slate-500 mt-1 leading-relaxed">Click here to join WhatsApp Group for updates content.</p>
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
                      <h4 className="font-bold text-slate-800 text-[9px] sm:text-[13px] leading-tight">Telegram Channel</h4>
                      <p className="text-[7px] sm:text-[10px] text-slate-500 mt-1 leading-relaxed">Click here to join Telegram Channel for update Notes, Practice Set, quizzes</p>
                    </div>
                  </a>
                )}
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
                      onClick={() => setSelectedCategory(cat)}
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

              {activeTests.filter(t => {
                const matchesType = (t.testType || 'topic') === activeTab.replace('mock_', '');
                const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
                return matchesType && matchesCategory;
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
                    return matchesType && matchesCategory;
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

