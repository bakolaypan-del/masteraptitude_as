import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { getCachedCollection, getCacheState } from '../lib/cache';
import { RenderMathText } from '../components/MathRenderer';
import PWAInstallPrompt, { InstallAppSidebarButton } from '../components/PWAInstallPrompt';
import AppInstallGate from '../components/AppInstallGate';
import AppBottomNav from '../components/AppBottomNav';
import AppUpdateToast from '../components/AppUpdateToast';
import ReviewPopup from '../components/ReviewPopup';
import ReviewSlider from '../components/ReviewSlider';
import ComingSoonBox from '../components/ComingSoonBox';
import { RenderQuestionHTML } from '../components/RichTextEditor';
import { Trophy, Target, LogOut, FileText, CheckCircle, Clock, BookOpen, Play, ChevronRight, ChevronLeft, ArrowLeft, ExternalLink, Menu, X, Youtube, MessageCircle, Send, LayoutDashboard, History, ChevronDown, ArrowRight, User, Info, Phone, Download, Printer, AlertCircle, BarChart3, Keyboard, Globe, Layers, CheckSquare, Volume2, VolumeX, Maximize, NotebookPen, Award, Calendar, ClipboardList, Crown, Brain, Book, Newspaper, Megaphone, Bookmark, Eye, Sparkles, FileUp, Search, Filter, Image as ImgIcon, Check, Share2, Pencil, Mail, Lock, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DashboardTab = 'home' | 'profile' | 'mock_topic' | 'mock_sectional' | 'mock_full' | 'notes' | 'video' | 'pyq' | 'pattern' | 'affairs' | 'practice' | 'about' | 'contact' | 'learn_landing' | 'mock_landing' | 'live_test' | 'mock_challenge' | 'one_liner';

const WELCOME_QUOTES = [
  "Success doesn't come from luck — it comes from daily practice.",
  "Every mock test brings you one step closer to your dream.",
  "Consistency beats talent when talent doesn't work hard.",
  "The harder you prepare today, the luckier you'll get tomorrow.",
  "Champions train while others sleep.",
  "Your rank tomorrow depends on your practice today.",
  "One more test, one step closer to the top.",
];

function WelcomeHero({ name }: { name?: string }) {
  const startIndex = new Date().getDay() % WELCOME_QUOTES.length;
  const [displayText, setDisplayText] = useState('');
  const [qIdx, setQIdx] = useState(startIndex);
  const [charIdx, setCharIdx] = useState(0);
  const [pausing, setPausing] = useState(false);

  useEffect(() => {
    if (pausing) {
      const t = setTimeout(() => {
        setDisplayText('');
        setCharIdx(0);
        setQIdx(i => (i + 1) % WELCOME_QUOTES.length);
        setPausing(false);
      }, 2200);
      return () => clearTimeout(t);
    }
    const target = WELCOME_QUOTES[qIdx];
    if (charIdx < target.length) {
      const t = setTimeout(() => {
        setDisplayText(target.slice(0, charIdx + 1));
        setCharIdx(c => c + 1);
      }, 40);
      return () => clearTimeout(t);
    }
    setPausing(true);
  }, [charIdx, pausing, qIdx]);

  const firstName = name?.split(' ')[0] || 'Student';
  const quoteDone = displayText.length === WELCOME_QUOTES[qIdx].length;

  return (
    <>
      <style>{`
        @keyframes quoteColorCycle {
          0%, 100% { color: #4f46e5; text-shadow: 0 0 1px rgba(99,102,241,0.1); }
          50% { color: #0891b2; text-shadow: 0 0 1px rgba(8,145,178,0.1); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
      <div className="relative rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(148, 163, 184, 0.05)',
      }}>
        {/* Background study image - faint watermark style */}
        <div className="absolute inset-0 pointer-events-none select-none opacity-10">
          <img
            src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80&auto=format&fit=crop&crop=right"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-right"
            style={{ filter: 'blur(2px) grayscale(1)', transform: 'scale(1.04)' }}
            loading="eager"
            draggable={false}
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 60%, rgba(255,255,255,0.2) 100%)',
          }} />
        </div>

        {/* Right-side image panel — desktop only */}
        <div className="hidden md:block absolute inset-y-0 right-0 pointer-events-none select-none" style={{ width: '42%' }}>
          <img
            src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80&auto=format&fit=crop&crop=right"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-right opacity-[0.12]"
            style={{ filter: 'blur(1px) grayscale(1)' }}
            loading="eager"
            draggable={false}
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0.4) 40%, transparent 80%)',
          }} />
          <span className="absolute top-4 right-8 text-2xl drop-shadow-sm">📚</span>
          <span className="absolute top-1/2 right-5 text-xl drop-shadow-sm" style={{ transform: 'translateY(-50%)' }}>✏️</span>
          <span className="absolute bottom-5 right-10 text-xl drop-shadow-sm">🏆</span>
        </div>

        {/* Dot-grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.035) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />

        <div className="relative z-10 p-4 sm:p-5 md:max-w-[62%]">
          {/* Brand pill */}
          <div className="inline-flex items-center gap-1.5 mb-2 px-2 py-0.5 rounded-full" style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.15)',
            color: '#4f46e5',
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: '0.12em',
          }}>
            🎓 MASTER APTITUDE
          </div>

          {/* Welcome heading */}
          <h2 style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.1, letterSpacing: '-0.01em', color: '#1e293b', margin: '0 0 6px' }}>
            Welcome,{' '}
            <span style={{
              backgroundImage: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #4f46e5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>{firstName}</span>!
          </h2>

          {/* Typewriter quote */}
          <div style={{ minHeight: 34 }}>
            <p style={{
              animation: 'quoteColorCycle 10s linear infinite',
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: 11.5,
              lineHeight: 1.5,
              maxWidth: 440,
              margin: 0,
            }}>
              <span style={{ opacity: 0.45, fontStyle: 'normal', color: '#64748b' }}>"</span>
              {displayText}
              <span style={{
                display: 'inline-block',
                width: 2,
                height: 11,
                background: 'currentColor',
                marginLeft: 1,
                verticalAlign: 'middle',
                animation: 'cursorBlink 0.9s ease-in-out infinite',
                opacity: pausing ? 0 : 1,
                borderRadius: 1,
              }} />
              {quoteDone && <span style={{ opacity: 0.45, fontStyle: 'normal', color: '#64748b' }}>"</span>}
            </p>
          </div>

          <p style={{ color: '#94a3b8', fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', marginTop: 4 }}>
            — Master Aptitude
          </p>
        </div>
      </div>
    </>
  );
}

const calculateStreak = (results: any[]): number => {
  if (!results || results.length === 0) return 0;
  
  const dates = new Set<string>();
  results.forEach(r => {
    if (r.timestamp) {
      try {
        const d = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(typeof r.timestamp === 'number' ? r.timestamp : r.timestamp.seconds ? r.timestamp.seconds * 1000 : r.timestamp);
        const dateStr = d.toISOString().split('T')[0];
        dates.add(dateStr);
      } catch {}
    }
  });

  const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a));
  if (sortedDates.length === 0) return 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let checkDate = new Date(sortedDates[0]);

  for (let i = 0; i < sortedDates.length; i++) {
    const checkStr = checkDate.toISOString().split('T')[0];
    if (dates.has(checkStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

const getCategoryStyle = (title: string, dbColor?: string, dbIcon?: string) => {
  const t = title.toLowerCase();
  const iconStr = (dbIcon || '').toLowerCase();
  
  let textColorClass = 'text-slate-700 font-bold';
  let textColorStyle = {};
  if (t.includes('free mock')) {
    textColorClass = 'text-emerald-600 font-black';
  } else if (t.includes('150 days') || t.includes('150-days')) {
    textColorClass = 'text-rose-600 font-black';
  } else if (t.includes('typing test')) {
    textColorClass = 'text-slate-900 font-black';
  } else if (dbColor === 'green') {
    textColorClass = 'text-emerald-600 font-black';
  } else if (dbColor === 'red') {
    textColorClass = 'text-rose-600 font-black';
  } else if (dbColor === 'black') {
    textColorClass = 'text-slate-900 font-black';
  } else if (dbColor) {
    textColorStyle = { color: dbColor };
  }

  let icon = dbIcon || '📝';
  let LucideIcon: React.ComponentType<any> | null = null;
  let iconBgClass = 'bg-slate-50 text-slate-600 border-slate-200/50';

  if (t.includes('free mock') || iconStr === '🏆') {
    icon = '🏆';
    LucideIcon = Award;
    iconBgClass = 'bg-amber-50 text-amber-600 border-amber-200/50 group-hover:bg-amber-100 group-hover:text-amber-700';
  } else if (t.includes('150 days') || t.includes('150-days') || iconStr === '📅') {
    icon = '📅';
    LucideIcon = Calendar;
    iconBgClass = 'bg-rose-50 text-rose-600 border-rose-200/50 group-hover:bg-rose-100 group-hover:text-rose-700';
  } else if (t.includes('typing test') || iconStr === '⌨️') {
    icon = '⌨️';
    LucideIcon = Keyboard;
    iconBgClass = 'bg-slate-100 text-slate-700 border-slate-200/50 group-hover:bg-slate-200 group-hover:text-slate-900';
  } else if (t.includes('syllabus') || iconStr === '📋') {
    icon = '📋';
    LucideIcon = ClipboardList;
    iconBgClass = 'bg-indigo-50 text-indigo-600 border-indigo-200/50 group-hover:bg-indigo-100 group-hover:text-indigo-700';
  } else if (t.includes('previous year') || t.includes('pyq') || iconStr === '📁') {
    icon = '📁';
    LucideIcon = History;
    iconBgClass = 'bg-blue-50 text-blue-600 border-blue-200/50 group-hover:bg-blue-100 group-hover:text-blue-700';
  } else if (t.includes('paid test') || iconStr === '👑') {
    icon = '👑';
    LucideIcon = Crown;
    iconBgClass = 'bg-violet-50 text-violet-600 border-violet-200/50 group-hover:bg-violet-100 group-hover:text-violet-700';
  } else if (t.includes('one liner') || t.includes('one_liner') || t.includes('quiz') || iconStr === '📌' || iconStr === '🧠') {
    icon = '📌';
    LucideIcon = Bookmark;
    iconBgClass = 'bg-violet-50 text-violet-600 border-violet-200/50 group-hover:bg-violet-100 group-hover:text-violet-700';
  } else if (t.includes('ebook') || iconStr === '📖') {
    icon = '📖';
    LucideIcon = Book;
    iconBgClass = 'bg-cyan-50 text-cyan-600 border-cyan-200/50 group-hover:bg-cyan-100 group-hover:text-cyan-700';
  } else if (t.includes('current affairs') || iconStr === '📰') {
    icon = '📰';
    LucideIcon = Newspaper;
    iconBgClass = 'bg-sky-50 text-sky-600 border-sky-200/50 group-hover:bg-sky-100 group-hover:text-sky-700';
  } else if (t.includes('practice set') || iconStr === '✅') {
    icon = '✅';
    LucideIcon = CheckSquare;
    iconBgClass = 'bg-teal-50 text-teal-600 border-teal-200/50 group-hover:bg-teal-100 group-hover:text-teal-700';
  } else if (t.includes('job') || iconStr === '📢') {
    icon = '📢';
    LucideIcon = Megaphone;
    iconBgClass = 'bg-orange-50 text-orange-600 border-orange-200/50 group-hover:bg-orange-100 group-hover:text-orange-700';
  }

  return { textColorClass, textColorStyle, icon, LucideIcon, iconBgClass };
};

const DEFAULT_DASHBOARD_CATEGORIES = [
  { title: 'Live Mock', textColor: 'red', iconType: '🔴', actionType: 'tab', actionValue: 'live_test', priority: 0, isActive: true },
  { title: 'Free Mock', textColor: 'green', iconType: '🏆', actionType: 'tab', actionValue: 'mock_landing', priority: 1, isActive: true },
  { title: '150 Days Free Practice', textColor: 'red', iconType: '📅', actionType: 'tab', actionValue: 'mock_challenge', priority: 2, isActive: true },
  { title: 'Typing Test', textColor: 'black', iconType: '⌨️', actionType: 'route', actionValue: '/typing-test', priority: 3, isActive: true },
  { title: 'Syllabus', textColor: 'default', iconType: '📋', actionType: 'tab', actionValue: 'pattern', priority: 4, isActive: true },
  { title: 'Previous Year Paper', textColor: 'default', iconType: '📁', actionType: 'tab', actionValue: 'pyq', priority: 5, isActive: true },
  { title: 'Paid Test', textColor: 'default', iconType: '👑', actionType: 'route', actionValue: '/paid-mock', priority: 6, isActive: true },
  { title: 'One Liner', textColor: 'default', iconType: '📌', actionType: 'tab', actionValue: 'one_liner', priority: 7, isActive: true },
  { title: 'Ebook', textColor: 'default', iconType: '📖', actionType: 'tab', actionValue: 'notes', priority: 8, isActive: true },
  { title: 'Current Affairs', textColor: 'default', iconType: '📰', actionType: 'route', actionValue: '/current-affairs', priority: 9, isActive: true },
  { title: 'Practice Set', textColor: 'default', iconType: '✅', actionType: 'tab', actionValue: 'practice', priority: 10, isActive: true },
  { title: 'Latest Job Notification', textColor: 'default', iconType: '📢', actionType: 'route', actionValue: '/news', priority: 11, isActive: true }
];

export default function Dashboard() {
  const { user, profile } = useAuth();
  console.log("DEBUG [Dashboard] Rendering. User:", user?.uid, "Profile Role:", profile?.role);
  const lastUserRef = useRef(user);
  useEffect(() => {
    if (user !== lastUserRef.current) {
      console.log("DEBUG [Dashboard] User object reference changed!", { prev: lastUserRef.current, next: user });
      lastUserRef.current = user;
    }
  });
  const lastProfileRef = useRef(profile);
  useEffect(() => {
    if (profile !== lastProfileRef.current) {
      console.log("DEBUG [Dashboard] Profile object reference changed!", { prev: lastProfileRef.current, next: profile });
      lastProfileRef.current = profile;
    }
  });
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [activeTests, setActiveTests] = useState<any[]>([]);
  const [liveTests, setLiveTests] = useState<any[]>([]);
  const [pastResults, setPastResults] = useState<any[]>([]);
  const [paidBatches, setPaidBatches] = useState<any[]>([]);
  const [myPurchases, setMyPurchases] = useState<string[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<string[]>([]);
  const [razorpayMeUrl, setRazorpayMeUrl] = useState('https://razorpay.me/@masteraptitude');
  const [buyingBatch, setBuyingBatch] = useState<any | null>(null);
  const [txnId, setTxnId] = useState('');
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [pyqs, setPyqs] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [carousels, setCarousels] = useState<any[]>([]);
  const [affairs, setAffairs] = useState<any[]>([]);
  const [practiceSets, setPracticeSets] = useState<any[]>([]);
  const [aboutInfo, setAboutInfo] = useState({ content: '', contact: '' });
  const [socialLinks, setSocialLinks] = useState({ youtube: '', telegram: '', whatsapp: '' });
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallengeDay, setSelectedChallengeDay] = useState<number | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState<boolean>(false);
  const [challengeLeaderboard, setChallengeLeaderboard] = useState<any[]>([]);
  const [challengeLeaderboardLoading, setChallengeLeaderboardLoading] = useState(false);
  const [challengeHeaderTab, setChallengeHeaderTab] = useState<'progress' | 'leaderboard'>('progress');

  // One Liner student state
  const [oneLiners, setOneLiners] = useState<any[]>([]);
  const [oneLinersLoading, setOneLinersLoading] = useState(false);
  const [oneLinerSubjectFilter, setOneLinerSubjectFilter] = useState('ALL');
  const [oneLinerSearch, setOneLinerSearch] = useState('');
  const [practiceSearch, setPracticeSearch] = useState('');
  const [practiceSubjectFilter, setPracticeSubjectFilter] = useState('ALL');
  const [notesSearch, setNotesSearch] = useState('');
  const [notesSubjectFilter, setNotesSubjectFilter] = useState('ALL');
  const [pyqSearch, setPyqSearch] = useState('');
  const [pyqSubjectFilter, setPyqSubjectFilter] = useState('ALL');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [activeOneLinerModal, setActiveOneLinerModal] = useState<any | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [liveSubTab, setLiveSubTab] = useState<'running' | 'past'>('running');
  const [myGlobalRank, setMyGlobalRank] = useState<number | null>(null);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number | null>(null);
  const [challengeTotalStudents, setChallengeTotalStudents] = useState<number | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'available' | 'upcoming'>('all');
  const [scheduleDoc, setScheduleDoc] = useState<any>(null);

  const handleOpenOneLiner = (item: any) => {
    setActiveOneLinerModal(item);
    fetch(`/api/one-liners/${item.id}/read`, { method: 'POST' }).catch(() => {});
    if (typeof item.readCount === 'number') {
      item.readCount += 1;
    } else {
      item.readCount = 1;
    }
  };

  const handleShareOneLiner = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const url = `${window.location.origin}/dashboard?tab=one_liner&id=${item.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedShareId(item.id);
        setTimeout(() => setCopiedShareId(null), 2500);
      }).catch(() => {
        prompt('Copy One-Liner Share Link:', url);
      });
    } else {
      prompt('Copy One-Liner Share Link:', url);
    }
  };

  const fetchOneLiners = async () => {
    setOneLinersLoading(true);
    try {
      const res = await fetch(`/api/one-liners?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setOneLiners(data.posts || []);
      }
    } catch (err) {
      console.error("Failed to fetch one-liners:", err);
    } finally {
      setOneLinersLoading(false);
    }
  };

  const parseDayNumber = (test: any): number | null => {
    if (!test) return null;
    const str = `${test.topic || ''} ${test.title || ''} ${test.category || ''}`;
    const match = str.match(/(?:day|day-|\bd\b)\s*(\d+)/i) || str.match(/\b(\d+)\b/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 150) return num;
    }
    return null;
  };

  const challengeTests = useMemo(() => {
    return activeTests.filter(t => 
      t.isActive !== false && 
      (
        t.category === "150 Days Free Practice" || 
        t.category === "150 Days Mock Challenge" ||
        (t.category && (t.category.toLowerCase().includes("150") || t.category.toLowerCase().includes("challenge"))) ||
        (t.testType && (t.testType.toLowerCase().includes("challenge") || t.testType === "mock_challenge")) ||
        (t.title && (t.title.toLowerCase().includes("150 day") || t.title.toLowerCase().includes("challenge")))
      )
    );
  }, [activeTests]);

  const challengeDaysMap = useMemo(() => {
    const map: Record<number, any[]> = {};
    challengeTests.forEach((test, idx) => {
      let d = parseDayNumber(test);
      if (d === null) {
        d = (idx % 150) + 1;
      }
      if (d !== null) {
        if (!map[d]) map[d] = [];
        map[d].push(test);
      }
    });
    return map;
  }, [challengeTests]);

  const challengeStats = useMemo(() => {
    let completedDaysCount = 0;
    let totalDaysWithMocks = 0;
    
    for (let d = 1; d <= 150; d++) {
      const testsForDay = challengeDaysMap[d] || [];
      if (testsForDay.length > 0) {
        totalDaysWithMocks++;
        const allCompleted = testsForDay.every(test => pastResults.some(r => r.testId === test.id));
        if (allCompleted) {
          completedDaysCount++;
        }
      }
    }
    
    return {
      completedDaysCount,
      totalDaysWithMocks,
      percentage: totalDaysWithMocks > 0 ? Math.round((completedDaysCount / 150) * 100) : 0
    };
  }, [challengeDaysMap, pastResults]);
  const [dashboardCategories, setDashboardCategories] = useState<any[]>([]);
  
  const activeTab = (searchParams.get('tab') as DashboardTab) || 'home';
  const selectedCategory = searchParams.get('cat') || '';

  useEffect(() => {
    if (activeTab === 'one_liner' || oneLiners.length === 0) {
      fetchOneLiners();
    }
  }, [activeTab]);

  useEffect(() => {
    const targetId = searchParams.get('id');
    if (targetId && oneLiners.length > 0 && activeTab === 'one_liner') {
      const found = oneLiners.find(o => o.id === targetId);
      if (found && (!activeOneLinerModal || activeOneLinerModal.id !== targetId)) {
        handleOpenOneLiner(found);
      }
    }
  }, [searchParams, oneLiners, activeTab]);

  const setActiveTab = (tab: DashboardTab) => {
    setSearchParams({ tab, cat: '' });
    setSelectedTopic(null);
    if (!tab.startsWith('mock')) {
      setMockOpen(false);
    }
    if (!['video', 'notes', 'affairs', 'practice', 'one_liner', 'pyq', 'pattern'].includes(tab)) {
      setLearnOpen(false);
    }
    if (tab === 'one_liner') {
      setOneLinerSearch('');
      setOneLinerSubjectFilter('ALL');
      fetchOneLiners();
    }
  };
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const setSelectedCategory = (cat: string) => {
    setSelectedTopic(null);
    setSearchParams({ tab: activeTab, cat });
  };

  const lastStateRef = useRef<any>({});
  useEffect(() => {
    const changes: any = {};
    const states = {
      activeTestsLength: activeTests.length,
      liveTestsLength: liveTests.length,
      pastResultsLength: pastResults.length,
      notesLength: notes.length,
      videosLength: videos.length,
      pyqsLength: pyqs.length,
      patternsLength: patterns.length,
      carouselsLength: carousels.length,
      affairsLength: affairs.length,
      practiceSetsLength: practiceSets.length,
      loading,
      selectedCategory,
      selectedTopic,
      expandedCategory,
      expandedTopic
    };
    for (const [k, v] of Object.entries(states)) {
      if (lastStateRef.current[k] !== v) {
        changes[k] = { prev: lastStateRef.current[k], next: v };
      }
    }
    if (Object.keys(changes).length > 0) {
      console.log("DEBUG [Dashboard] State changes:", changes);
    }
    lastStateRef.current = states;
  });

  // Analysis navigation helper
  const openAnalysis = (result: any) => {
    navigate(`/analysis/${result.id}`, { state: { result } });
  };

  // Format attempt timestamp → "15 Jan 2025, 10:30 AM"
  const formatAttemptDate = (timestamp: any): string => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(typeof timestamp === 'number' ? timestamp : timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
      return date.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch { return 'Unknown date'; }
  };
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const [openAttemptDropdown, setOpenAttemptDropdown] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCarouselAnimating, setIsCarouselAnimating] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0);
  const tabParam = (searchParams.get('tab') as DashboardTab) || 'home';
  const [learnOpen, setLearnOpen] = useState(() => ['video', 'notes', 'affairs', 'practice'].includes(tabParam));
  const [mockOpen, setMockOpen] = useState(() => tabParam.startsWith('mock'));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPopupIndex((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Track mobile vs desktop for carousel visible count
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobileView(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobileView(e.matches);
      setCurrentSlideIndex(0); // reset position on resize
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Auto-advance carousel — infinite loop when images > visibleCount
  useEffect(() => {
    const visibleCount = isMobileView ? 2 : 3;
    if (carousels.length <= visibleCount) return; // show all statically
    const timer = setInterval(() => {
      setIsCarouselAnimating(true);
      setCurrentSlideIndex(prev => prev + 1);
    }, 3500);
    return () => clearInterval(timer);
  }, [carousels.length, isMobileView]);

  useEffect(() => {
    setLearnOpen(['video', 'notes', 'affairs', 'practice'].includes(tabParam));
    setMockOpen(tabParam.startsWith('mock'));
  }, [tabParam]);
  
  // Profile Update State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditPhone(profile.phoneNumber || '');
    }
  }, [profile]);

  const categories = (() => {
    const rawCategories = [...new Set(activeTests.filter(t => 
      (t.testType || 'topic') === activeTab.replace('mock_', '') &&
      t.category !== "150 Days Free Practice"
    ).map(t => t.category).filter(Boolean)) as Set<string>];
    
    let sorted = [];
    if (categoryOrder.length > 0) {
      sorted = rawCategories.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    } else {
      sorted = rawCategories.sort((a, b) => a.localeCompare(b));
    }
    return sorted;
  })();

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [activeTab, categories.length]);

  // Track if we are in "Full Analysis" mode
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [videoNotes, setVideoNotes] = useState<string>('');

  useEffect(() => {
    console.log("DEBUG [Dashboard] useEffect (fetchData) triggered. User:", user?.uid);
    async function fetchData() {
      if (!user) return;

      const safeParse = (str: string | null) => {
        if (!str || str === 'undefined') return null;
        try {
          return JSON.parse(str);
        } catch {
          return null;
        }
      };
      
      // 1. Instantly load cache from localStorage if available to make dashboard load instant
      try {
        const cachedTests = safeParse(localStorage.getItem('ma_cache_tests'));
        const cachedNotes = safeParse(localStorage.getItem('ma_cache_notes'));
        const cachedVideos = safeParse(localStorage.getItem('ma_cache_videos'));
        const cachedPyqs = safeParse(localStorage.getItem('ma_cache_pyqs'));
        const cachedPatterns = safeParse(localStorage.getItem('ma_cache_patterns'));
        const cachedAffairs = safeParse(localStorage.getItem('ma_cache_affairs'));
        const cachedPractice = safeParse(localStorage.getItem('ma_cache_practice_sets'));
        const cachedCarousel = safeParse(localStorage.getItem('ma_cache_carousel'));
        
        const cachedSiteInfo = safeParse(localStorage.getItem('ma_cache_site_info'));
        const cachedSocialLinks = safeParse(localStorage.getItem('ma_cache_social_links'));
        const cachedCategoryOrder = safeParse(localStorage.getItem('ma_cache_category_order'));
        const cachedPaidBatches = safeParse(localStorage.getItem('ma_cache_paid_batches'));
        
        // Remove legacy un-scoped cache keys to prevent cross-student leakage
        localStorage.removeItem('ma_cache_results');
        localStorage.removeItem('ma_cache_results_ts');
        localStorage.removeItem('ma_cache_my_purchases');
        localStorage.removeItem('ma_cache_my_purchases_ts');

        const cachedResults = user?.uid ? safeParse(localStorage.getItem(`ma_cache_results_${user.uid}`)) : null;
        const cachedMyPurchases = user?.uid ? safeParse(localStorage.getItem(`ma_cache_my_purchases_${user.uid}`)) : null;

        let hasCachedData = false;

        const checkIsLiveTest = (t: any) => {
          if (t.isLive) return true;
          const cat = String(t.category || '').toUpperCase();
          if (cat.includes('LIVE')) return true;
          const type = String(t.testType || '').toUpperCase();
          if (type.includes('LIVE')) return true;
          const title = String(t.title || '').toUpperCase();
          if (title.includes('LIVE MOCK') || title.includes('MINI MOCK') || title.includes('LIVE TEST')) return true;
          return false;
        };

        if (cachedTests && Array.isArray(cachedTests)) {
          setActiveTests(cachedTests.filter((t: any) => t.isActive !== false));
          setLiveTests(cachedTests.filter(checkIsLiveTest));
          hasCachedData = true;
        }
        if (cachedNotes && Array.isArray(cachedNotes)) { setNotes(cachedNotes); hasCachedData = true; }
        if (cachedVideos && Array.isArray(cachedVideos)) { setVideos(cachedVideos); hasCachedData = true; }
        if (cachedPyqs && Array.isArray(cachedPyqs)) { setPyqs(cachedPyqs); hasCachedData = true; }
        if (cachedPatterns && Array.isArray(cachedPatterns)) { setPatterns(cachedPatterns); hasCachedData = true; }
        if (cachedAffairs && Array.isArray(cachedAffairs)) { setAffairs(cachedAffairs); hasCachedData = true; }
        if (cachedPractice && Array.isArray(cachedPractice)) { setPracticeSets(cachedPractice); hasCachedData = true; }
        if (cachedCarousel && Array.isArray(cachedCarousel)) {
          const sorted = [...cachedCarousel].sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99));
          setCarousels(sorted);
          hasCachedData = true;
        }
        
        if (cachedSiteInfo) setAboutInfo(cachedSiteInfo);
        if (cachedSocialLinks) setSocialLinks(cachedSocialLinks);
        if (cachedCategoryOrder && Array.isArray(cachedCategoryOrder)) setCategoryOrder(cachedCategoryOrder);
        if (cachedResults && Array.isArray(cachedResults)) setPastResults(cachedResults);
        if (cachedPaidBatches && Array.isArray(cachedPaidBatches)) setPaidBatches(cachedPaidBatches);
        if (cachedMyPurchases && Array.isArray(cachedMyPurchases)) setMyPurchases(cachedMyPurchases);
        
        const cachedDashboardCats = safeParse(localStorage.getItem('ma_cache_dashboard_categories'));
        if (cachedDashboardCats && Array.isArray(cachedDashboardCats)) {
          setDashboardCategories(cachedDashboardCats);
          hasCachedData = true;
        }

        // If we found any primary cached data, hide the loading screen instantly
        if (hasCachedData) {
          console.log("[Cache] Instant load from localStorage successful!");
          setLoading(false);
        }
      } catch (err) {
        console.warn("[Cache] Error reading initial cache:", err);
      }

      // 2. Fetch fresh data in the background
      try {
        console.log("Fetching student data in background...");
        
        // Fetch Tests (both active & live tests)
        const allTests = await getCachedCollection(
          'tests',
          async () => {
            const snap = await getDocs(collection(db, 'tests'));
            const tests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            tests.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
            return tests;
          },
          'tests'
        );
        const checkIsLiveTest = (t: any) => {
          if (t.isLive) return true;
          const cat = String(t.category || '').toUpperCase();
          if (cat.includes('LIVE')) return true;
          const type = String(t.testType || '').toUpperCase();
          if (type.includes('LIVE')) return true;
          const title = String(t.title || '').toUpperCase();
          if (title.includes('LIVE MOCK') || title.includes('MINI MOCK') || title.includes('LIVE TEST')) return true;
          return false;
        };

        setActiveTests(allTests.filter((t: any) => t.isActive !== false));
        setLiveTests(allTests.filter(checkIsLiveTest));
        localStorage.setItem('ma_cache_tests', JSON.stringify(allTests));
        
        // Fetch Notes
        const allNotes = await getCachedCollection(
          'notes',
          async () => {
            const snap = await getDocs(query(collection(db, 'notes'), orderBy('createdAt', 'desc')));
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          },
          'notes'
        );
        setNotes(allNotes);
        localStorage.setItem('ma_cache_notes', JSON.stringify(allNotes));

        // Fetch Videos
        const allVideos = await getCachedCollection(
          'videos',
          async () => {
            const snap = await getDocs(query(collection(db, 'videos'), orderBy('createdAt', 'desc')));
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          },
          'videos'
        );
        setVideos(allVideos);
        localStorage.setItem('ma_cache_videos', JSON.stringify(allVideos));

        // Fetch Pyqs
        const allPyqs = await getCachedCollection(
          'pyqs',
          async () => {
            const snap = await getDocs(query(collection(db, 'pyqs'), orderBy('createdAt', 'desc')));
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          },
          'pyqs'
        );
        setPyqs(allPyqs);
        localStorage.setItem('ma_cache_pyqs', JSON.stringify(allPyqs));

        // Fetch Patterns
        const allPatterns = await getCachedCollection(
          'patterns',
          async () => {
            const snap = await getDocs(query(collection(db, 'patterns'), orderBy('createdAt', 'desc')));
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          },
          'patterns'
        );
        setPatterns(allPatterns);
        localStorage.setItem('ma_cache_patterns', JSON.stringify(allPatterns));

        // Fetch Affairs
        const allAffairs = await getCachedCollection(
          'affairs',
          async () => {
            const snap = await getDocs(query(collection(db, 'affairs'), orderBy('createdAt', 'desc')));
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          },
          'affairs'
        );
        setAffairs(allAffairs);
        localStorage.setItem('ma_cache_affairs', JSON.stringify(allAffairs));

        // Fetch Practice Sets
        const allPractice = await getCachedCollection(
          'practice_sets',
          async () => {
            const snap = await getDocs(query(collection(db, 'practice_sets'), orderBy('createdAt', 'desc')));
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          },
          'practice_sets'
        );
        setPracticeSets(allPractice);
        localStorage.setItem('ma_cache_practice_sets', JSON.stringify(allPractice));

        // Get global cacheState for version checking
        const cacheState = await getCacheState();

        // Fetch About & Contact Info (cached for 24h)
        const cachedSiteInfo = localStorage.getItem('ma_cache_site_info');
        const cachedSiteInfoTs = localStorage.getItem('ma_cache_site_info_ts');
        if (cachedSiteInfo && cachedSiteInfoTs && (Date.now() - Number(cachedSiteInfoTs) < 24 * 60 * 60 * 1000)) {
          setAboutInfo(JSON.parse(cachedSiteInfo));
        } else {
          const infoSnap = await getDoc(doc(db, 'settings', 'site_info'));
          if (infoSnap.exists()) {
            const sInfo = infoSnap.data() as any;
            setAboutInfo(sInfo);
            localStorage.setItem('ma_cache_site_info', JSON.stringify(sInfo));
            localStorage.setItem('ma_cache_site_info_ts', String(Date.now()));
          }
        }

        // Fetch Carousels
        const allCarousels = await getCachedCollection(
          'carousel',
          async () => {
            const snap = await getDocs(query(collection(db, 'carousel'), orderBy('createdAt', 'desc')));
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          },
          'carousel'
        );
        const sortedCarousels = [...allCarousels].sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99));
        setCarousels(sortedCarousels);
        localStorage.setItem('ma_cache_carousel', JSON.stringify(allCarousels));

        // Fetch Dashboard Categories
        try {
          const allDashboardCats = await getCachedCollection(
            'dashboard_categories',
            async () => {
              const snap = await getDocs(query(collection(db, 'student_dashboard_categories'), where('isActive', '==', true)));
              const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              items.sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));
              return items;
            },
            'dashboard_categories'
          );
          setDashboardCategories(allDashboardCats);
          localStorage.setItem('ma_cache_dashboard_categories', JSON.stringify(allDashboardCats));
        } catch (catErr) {
          console.warn("[Cache] Failed to load dashboard categories:", catErr);
        }

        // Fetch Social Links (cached for 24h)
        const cachedSocial = localStorage.getItem('ma_cache_social_links');
        const cachedSocialTs = localStorage.getItem('ma_cache_social_links_ts');
        if (cachedSocial && cachedSocialTs && (Date.now() - Number(cachedSocialTs) < 24 * 60 * 60 * 1000)) {
          setSocialLinks(JSON.parse(cachedSocial));
        } else {
          const socialSnap = await getDoc(doc(db, 'settings', 'social_links'));
          if (socialSnap.exists()) {
            const data = socialSnap.data();
            const sLinks = {
              youtube: data.youtube || '',
              telegram: data.telegram || '',
              whatsapp: data.whatsapp || ''
            };
            setSocialLinks(sLinks);
            localStorage.setItem('ma_cache_social_links', JSON.stringify(sLinks));
            localStorage.setItem('ma_cache_social_links_ts', String(Date.now()));
          }
        }

        // Fetch Category Order (cached with versioning)
        const categoryVersion = cacheState.categories || 0;
        const cachedCatOrder = localStorage.getItem('ma_cache_category_order');
        const cachedCatOrderVer = localStorage.getItem('ma_cache_category_order_ver');
        if (cachedCatOrder && cachedCatOrderVer === String(categoryVersion)) {
          setCategoryOrder(JSON.parse(cachedCatOrder));
        } else {
          const orderRes = await fetch(`/api/category-order?v=${categoryVersion}`);
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            const order = orderData.order || [];
            setCategoryOrder(order);
            localStorage.setItem('ma_cache_category_order', JSON.stringify(order));
            localStorage.setItem('ma_cache_category_order_ver', String(categoryVersion));
          }
        }

        // Fetch Past Results for current logged-in user only
        if (user?.uid) {
          const userResultsKey = `ma_cache_results_${user.uid}`;
          const userResultsTsKey = `ma_cache_results_ts_${user.uid}`;
          const cachedResults = localStorage.getItem(userResultsKey);
          const cachedResultsTs = localStorage.getItem(userResultsTsKey);
          const profileLastTestAt = profile?.lastTestAt || 0;
          
          let shouldRefetchResults = true;
          if (cachedResults && cachedResultsTs) {
            const cacheTime = Number(cachedResultsTs);
            if (profileLastTestAt <= cacheTime) {
              setPastResults(JSON.parse(cachedResults));
              shouldRefetchResults = false;
            }
          }
          
          if (shouldRefetchResults) {
            const resultsQuery = query(collection(db, 'results'), where('userId', '==', user.uid));
            const resultsSnap = await getDocs(resultsQuery);
            const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
            results.sort((a: any, b: any) => b.timestamp - a.timestamp);
            setPastResults(results);
            localStorage.setItem(userResultsKey, JSON.stringify(results));
            localStorage.setItem(userResultsTsKey, String(Date.now()));
          }
        }

        // Fetch Paid Batches + My Purchases + Payment Config (cached with versioning)
        try {
          const tok = await user.getIdToken();
          
          // Paid Batches: Cache check
          const batchesVersion = cacheState.paid_mock_batches || 0;
          const cachedBatches = localStorage.getItem('ma_cache_paid_batches');
          const cachedBatchesVer = localStorage.getItem('ma_cache_paid_batches_ver');
          
          let fetchedBatches = null;
          if (cachedBatches && cachedBatchesVer === String(batchesVersion)) {
            fetchedBatches = JSON.parse(cachedBatches);
            setPaidBatches(fetchedBatches);
          } else {
            const batchRes = await fetch(`/api/paid-batches?v=${batchesVersion}`);
            if (batchRes.ok) {
              fetchedBatches = await batchRes.json();
              setPaidBatches(fetchedBatches);
              localStorage.setItem('ma_cache_paid_batches', JSON.stringify(fetchedBatches));
              localStorage.setItem('ma_cache_paid_batches_ver', String(batchesVersion));
            }
          }

          // My Purchases: 1 hour cache per user
          if (user?.uid) {
            const userPurchasesKey = `ma_cache_my_purchases_${user.uid}`;
            const userPurchasesTsKey = `ma_cache_my_purchases_ts_${user.uid}`;
            const cachedPurchases = localStorage.getItem(userPurchasesKey);
            const cachedPurchasesTs = localStorage.getItem(userPurchasesTsKey);
            if (cachedPurchases && cachedPurchasesTs && (Date.now() - Number(cachedPurchasesTs) < 60 * 60 * 1000)) {
              setMyPurchases(JSON.parse(cachedPurchases));
            } else {
              const purchaseRes = await fetch('/api/my-purchases', { headers: { Authorization: `Bearer ${tok}` } });
              if (purchaseRes.ok) {
                const pd = await purchaseRes.json();
                const pb = pd.purchasedBatches || [];
                setMyPurchases(pb);
                localStorage.setItem(userPurchasesKey, JSON.stringify(pb));
                localStorage.setItem(userPurchasesTsKey, String(Date.now()));
              }
            }
          }

          // Payment Config: standard fetch (no DB overhead on server)
          const payRes = await fetch('/api/payment-config');
          if (payRes.ok) {
            const pc = await payRes.json();
            if (pc.razorpayMeUrl) setRazorpayMeUrl(pc.razorpayMeUrl);
          }
        } catch { /* non-fatal */ }

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'multiple collections');
      } finally {
        // Listen to 150 Days Schedule Document from Admin
        onSnapshot(doc(db, 'settings', 'challenge_schedule'), (snap) => {
          if (snap.exists()) {
            setScheduleDoc(snap.data());
          }
        }, (err) => console.error(err));

        setLoading(false);
      }
    }
    
    fetchData();
  }, [user]);

  useEffect(() => {
    async function fetchChallengeLeaderboard() {
      if (activeTab !== 'mock_challenge' || !user) return;
      setChallengeLeaderboardLoading(true);
      
      let loadedFromApi = false;
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/150-days-leaderboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          const list = (data.topRankers || [])
            .filter((r: any) => {
              const nameLower = (r.name || '').toLowerCase();
              const emailLower = (r.email || '').toLowerCase();
              const isSuman = nameLower.includes('suman') || nameLower.includes('kolay') || emailLower.includes('suman') || emailLower.includes('bakolaypan');
              return r.role !== 'admin' && !isSuman;
            })
            .map((r: any, idx: number) => ({
              ...r,
              rank: idx + 1,
              isCurrentUser: r.userId === user.uid
            }));
          setChallengeLeaderboard(list);
          if (data.totalStudents) {
            setChallengeTotalStudents(data.totalStudents);
          }
          loadedFromApi = true;
        }
      } catch (err) {
        console.warn("Server API /api/150-days-leaderboard unavailable, calculating locally from Firestore...", err);
      }

      if (!loadedFromApi) {
        try {
          const challengeTestIds = new Set(
            activeTests
              .filter(t => 
                t.category === "150 Days Free Practice" || 
                t.category === "150 Days Mock Challenge" ||
                (t.category && (t.category.toLowerCase().includes("150") || t.category.toLowerCase().includes("challenge"))) ||
                (t.testType && (t.testType.toLowerCase().includes("challenge") || t.testType === "mock_challenge")) ||
                (t.title && (t.title.toLowerCase().includes("150 day") || t.title.toLowerCase().includes("challenge")))
              )
              .map(t => t.id)
          );

          const resultsSnap = await getDocs(collection(db, 'results'));
          const userScoresMap: Record<string, { userId: string; name: string; score: number; testsCount: number }> = {};

          resultsSnap.docs.forEach(docSnap => {
            const r = docSnap.data();
            const cat = (r.category || '').toLowerCase();
            const title = (r.testTitle || r.title || '').toLowerCase();
            const type = (r.testType || '').toLowerCase();
            const isChallenge = challengeTestIds.has(r.testId) || cat.includes('150') || title.includes('150') || cat.includes('challenge') || type.includes('challenge');

            if (isChallenge && r.userId) {
              if (!userScoresMap[r.userId]) {
                userScoresMap[r.userId] = {
                  userId: r.userId,
                  name: r.userName || r.name || 'Student',
                  score: 0,
                  testsCount: 0
                };
              }
              userScoresMap[r.userId].score += (r.score || 0);
              userScoresMap[r.userId].testsCount += 1;
            }
          });

          const profilesSnap = await getDocs(collection(db, 'profiles'));
          const rankers = profilesSnap.docs.map(pDoc => {
            const uid = pDoc.id;
            const prof = pDoc.data();
            const scoreData = userScoresMap[uid] || { score: 0, testsCount: 0 };
            return {
              userId: uid,
              name: prof.name || scoreData.name || 'Student',
              email: prof.email || '',
              role: prof.role || 'user',
              score: scoreData.score,
              testsTaken: scoreData.testsCount
            };
          })
          .filter(r => {
            const nameLower = (r.name || '').toLowerCase();
            const emailLower = (r.email || '').toLowerCase();
            const isSuman = nameLower.includes('suman') || nameLower.includes('kolay') || emailLower.includes('suman') || emailLower.includes('bakolaypan');
            return r.role !== 'admin' && !isSuman;
          })
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.testsTaken !== a.testsTaken) return b.testsTaken - a.testsTaken;
            return a.name.localeCompare(b.name);
          });

          const list = rankers.map((r, idx) => ({
            ...r,
            rank: idx + 1,
            isCurrentUser: r.userId === user.uid
          }));

          setChallengeLeaderboard(list);
          setChallengeTotalStudents(list.length);
        } catch (err) {
          console.error("Failed to calculate challenge leaderboard:", err);
        }
      }

      setChallengeLeaderboardLoading(false);
    }

    fetchChallengeLeaderboard();
  }, [activeTab, user, activeTests]);

  useEffect(() => {
    async function fetchUserRank() {
      if (!user?.uid) {
        setMyGlobalRank(null);
        setPastResults([]);
        setMyPurchases([]);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/global-leaderboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.userRank) {
            setMyGlobalRank(data.userRank);
          } else {
            setMyGlobalRank(null);
          }
          if (data.totalStudents) {
            setTotalStudentsCount(data.totalStudents);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch user rank:", err);
      }
    }
    fetchUserRank();
  }, [user?.uid]);

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

  const handleDownloadPDF = async (testId: string, testTitle: string, category: string, testType: string) => {
    if (!user) return;
    setDownloadingPDF(testId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/test-questions/${testId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch questions');
      const { questions } = await res.json();

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (2 * margin);

      // Helper for Page Border
      const addPageBorder = (pdfDoc: jsPDF) => {
        pdfDoc.setDrawColor(0, 77, 0); // Dark Green
        pdfDoc.setLineWidth(1);
        pdfDoc.rect(margin - 2, margin - 2, pageWidth - 2 * (margin - 2), pageHeight - 2 * (margin - 2));
      };

      // Helper for Multiple Watermarks
      const addWatermarks = (pdfDoc: jsPDF) => {
        pdfDoc.saveGraphicsState();
        pdfDoc.setGState(new (pdfDoc as any).GState({ opacity: 0.05 }));
        pdfDoc.setFontSize(30);
        pdfDoc.setTextColor(150, 150, 150);
        pdfDoc.setFont('helvetica', 'bold');
        
        // Grid of watermarks
        for (let x = 30; x < pageWidth; x += 80) {
          for (let y = 50; y < pageHeight; y += 80) {
            pdfDoc.text('Master Aptitude by Suman Sir', x, y, {
              align: 'center',
              angle: 45
            });
          }
        }
        pdfDoc.restoreGraphicsState();
      };

      // Header Design - Stylish Box
      const drawHeader = (pdfDoc: jsPDF) => {
        const headerY = margin + 5;
        const headerHeight = 35;
        
        pdfDoc.setFillColor(0, 77, 0);
        pdfDoc.roundedRect(margin, headerY, contentWidth, headerHeight, 3, 3, 'F');
        
        pdfDoc.setTextColor(255, 255, 255);
        pdfDoc.setFontSize(18);
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.text('Master Aptitude by Suman Sir', pageWidth / 2, headerY + 12, { align: 'center' });
        
        pdfDoc.setFontSize(12);
        pdfDoc.text(`${testTitle}`, pageWidth / 2, headerY + 20, { align: 'center' });
        
        pdfDoc.setFontSize(9);
        pdfDoc.setFont('helvetica', 'normal');
        pdfDoc.text(`Category: ${category} | Type: ${testType} | Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, headerY + 28, { align: 'center' });
      };

      // Footer Design - Stylish Box
      const drawFooter = (pdfDoc: jsPDF, pageNum: number) => {
        const footerHeight = 15;
        const footerY = pageHeight - margin - footerHeight;
        
        // Footer Box
        pdfDoc.setFillColor(245, 245, 245);
        pdfDoc.setDrawColor(200, 200, 200);
        pdfDoc.roundedRect(margin, footerY, contentWidth, footerHeight, 2, 2, 'FD');
        
        pdfDoc.setFontSize(8);
        pdfDoc.setTextColor(80, 80, 80);
        pdfDoc.setFont('helvetica', 'bold');
        
        // Contact Number
        pdfDoc.text('Contact: 8900011708 (Shibnath)', margin + 5, footerY + 9);
        
        // Social Link Placeholder text (since we can't easily embed clickable icons complexly without plugins, we use text)
        pdfDoc.setTextColor(0, 100, 255);
        const tgX = pageWidth / 2 - 15;
        const waX = pageWidth / 2 + 15;
        pdfDoc.text('Telegram: @MasterAptitudeGroup', tgX, footerY + 9, { align: 'center' });
        pdfDoc.text('WhatsApp: +91 8900011708', waX, footerY + 9, { align: 'center' });
        
        // Page Number
        pdfDoc.setTextColor(150, 150, 150);
        pdfDoc.text(`Page ${pageNum}`, pageWidth - margin - 15, footerY + 9);
      };

      addPageBorder(doc);
      addWatermarks(doc);
      drawHeader(doc);
      drawFooter(doc, 1);

      let currentY = margin + 50;
      let currentPageNum = 1;

      questions.forEach((q: any, index: number) => {
        // Optimized spacing - check if enough space for Q + 1 line of options
        if (currentY > pageHeight - 55) {
          doc.addPage();
          addPageBorder(doc);
          addWatermarks(doc);
          currentPageNum++;
          drawFooter(doc, currentPageNum);
          currentY = margin + 15;
        }

        // Question text
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        const qText = `${index + 1}. ${q.questionText}`;
        const splitQ = doc.splitTextToSize(qText, contentWidth - 10);
        doc.text(splitQ, margin + 5, currentY);
        currentY += (splitQ.length * 6);

        // Options - Horizontal arrangement
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const optWidth = (contentWidth - 10) / 2; // 2 columns for better spatial management if long, or 4 if short
        
        // Simple heuristic: if all options are short, put on one line
        const totalOptLength = q.options.reduce((acc: number, o: string) => acc + o.length, 0);
        
        if (totalOptLength < 50) {
          // One line
          let optX = margin + 8;
          q.options.forEach((opt: string, optIndex: number) => {
            const label = String.fromCharCode(65 + optIndex);
            const text = `${label}. ${opt}`;
            doc.text(text, optX, currentY);
            optX += (contentWidth / 4);
          });
          currentY += 8;
        } else {
          // Two per line
          let optX = margin + 8;
          q.options.forEach((opt: string, optIndex: number) => {
            const label = String.fromCharCode(65 + optIndex);
            const text = `${label}. ${opt}`;
            doc.text(text, optX, currentY);
            if (optIndex % 2 === 1) {
              currentY += 7;
              optX = margin + 8;
            } else {
              optX += (contentWidth / 2);
            }
          });
          if (q.options.length % 2 !== 0) currentY += 7;
        }

        // Correct Answer
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 100, 0);
        doc.text(`Correct Answer: ${q.correctAnswer}`, margin + 8, currentY);
        currentY += 8;

        if (q.explanation) {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(80, 80, 80);
          const expText = `Explanation: ${q.explanation}`;
          const splitExp = doc.splitTextToSize(expText, contentWidth - 15);
          doc.text(splitExp, margin + 12, currentY);
          currentY += (splitExp.length * 5) + 6;
        } else {
          currentY += 4;
        }
      });

      doc.save(`${testTitle.replace(/\s+/g, '_')}_Master_Aptitude.pdf`);
    } catch (err: any) {
      console.error(err);
      alert('Error generating PDF: ' + err.message);
    } finally {
      setDownloadingPDF(null);
    }
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
      setIsEditingProfile(false);
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

  const detailedPerformanceStats = useMemo(() => {
    const totalTests = pastResults.length;
    const bestScore = totalTests > 0 ? Math.max(...pastResults.map(r => r.score || 0)) : 0;
    const avgScore = totalTests > 0 ? (pastResults.reduce((acc, r) => acc + (r.score || 0), 0) / totalTests).toFixed(1) : 0;

    let totalCorrect = 0;
    let totalAttemptedQs = 0;

    pastResults.forEach(r => {
      const correct = r.correctAnswers || r.correct || 0;
      const wrong = r.wrongAnswers || r.wrong || 0;
      totalCorrect += correct;
      totalAttemptedQs += (correct + wrong);
    });

    const overallAccuracy = totalAttemptedQs > 0 
      ? ((totalCorrect / totalAttemptedQs) * 100).toFixed(1) 
      : (totalTests > 0 ? (pastResults.reduce((acc, r) => acc + (r.accuracy || 0), 0) / totalTests).toFixed(1) : '0.0');

    const latestScore = totalTests > 0 ? (pastResults[0].score || 0) : 0;

    const GENERIC_SERIES_PATTERNS = [
      '150 days', '150-days', 'mock challenge', 'free practice', 'free mock', 
      'live mock', 'paid mock', 'mini mock', 'practice set', 'general mock', 
      'full mock', 'test series', 'daily test', 'mock test'
    ];

    const isGenericSeriesName = (str?: string): boolean => {
      if (!str) return true;
      const lower = str.toLowerCase().trim();
      if (!lower) return true;
      return GENERIC_SERIES_PATTERNS.some(p => lower.includes(p));
    };

    const getCleanSubjectName = (r: any, matchedTest: any): string => {
      // 1. Explicit subjectName from test or result
      const explicitSubject = matchedTest?.subjectName || r?.subjectName || r?.subject;
      if (explicitSubject && !isGenericSeriesName(explicitSubject)) {
        return explicitSubject.trim();
      }

      // 2. Topic from test or result
      const topic = matchedTest?.topic || r?.topic;
      if (topic && !isGenericSeriesName(topic)) {
        return topic.trim();
      }

      // 3. Category from test or result (only if specific subject category)
      const category = matchedTest?.category || r?.category;
      if (category && !isGenericSeriesName(category)) {
        return category.trim();
      }

      // 4. Infer subject from title/category/topic keywords
      const fullText = `${matchedTest?.title || ''} ${matchedTest?.topic || ''} ${matchedTest?.category || ''} ${r?.testTitle || ''} ${r?.category || ''} ${r?.subject || ''}`.toLowerCase();

      if (fullText.includes('math') || fullText.includes('quant') || fullText.includes('arithmetic') || fullText.includes('algebra') || fullText.includes('geometry')) {
        return 'Mathematics';
      }
      if (fullText.includes('reason') || fullText.includes('intelligence') || fullText.includes('gi') || fullText.includes('aptitude')) {
        return 'Reasoning';
      }
      if (fullText.includes('histor')) {
        return 'History';
      }
      if (fullText.includes('geograph')) {
        return 'Geography';
      }
      if (fullText.includes('english') || fullText.includes('grammar') || fullText.includes('vocab')) {
        return 'English';
      }
      if (fullText.includes('physic')) {
        return 'Physics';
      }
      if (fullText.includes('chemist')) {
        return 'Chemistry';
      }
      if (fullText.includes('biolog')) {
        return 'Biology';
      }
      if (fullText.includes('polity') || fullText.includes('constitution') || fullText.includes('civics')) {
        return 'Polity';
      }
      if (fullText.includes('computer')) {
        return 'Computer Science';
      }
      if (fullText.includes('econ')) {
        return 'Economics';
      }
      if (fullText.includes('gk') || fullText.includes('gs') || fullText.includes('general knowledge') || fullText.includes('general studies') || fullText.includes('static gk') || fullText.includes('current affair')) {
        return 'General Knowledge';
      }

      return 'General Aptitude';
    };

    // Group performance by Subject
    const subjectMap: Record<string, { totalTests: number; totalScore: number; bestScore: number; correct: number; attempted: number }> = {};

    pastResults.forEach(r => {
      const matchedTest = activeTests.find(t => t.id === r.testId) || liveTests.find(t => t.id === r.testId);
      const subjectName = getCleanSubjectName(r, matchedTest);

      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { totalTests: 0, totalScore: 0, bestScore: 0, correct: 0, attempted: 0 };
      }

      const c = r.correctAnswers || r.correct || 0;
      const w = r.wrongAnswers || r.wrong || 0;
      const score = r.score || 0;

      subjectMap[subjectName].totalTests += 1;
      subjectMap[subjectName].totalScore += score;
      if (score > subjectMap[subjectName].bestScore) subjectMap[subjectName].bestScore = score;
      subjectMap[subjectName].correct += c;
      subjectMap[subjectName].attempted += (c + w);
    });

    const subjectStats = Object.entries(subjectMap).map(([subject, data]) => {
      const accuracy = data.attempted > 0 ? ((data.correct / data.attempted) * 100) : 0;
      const avgScore = (data.totalScore / data.totalTests);
      return {
        subject,
        totalTests: data.totalTests,
        bestScore: data.bestScore,
        avgScore: avgScore.toFixed(1),
        correct: data.correct,
        attempted: data.attempted,
        accuracy: parseFloat(accuracy.toFixed(1)),
        status: accuracy >= 75 ? 'Strong 🟢' : accuracy >= 50 ? 'Moderate 🟡' : 'Needs Practice 🔴'
      };
    }).sort((a, b) => b.accuracy - a.accuracy);

    const strongestSubject = subjectStats.length > 0 ? subjectStats[0] : null;
    const weakestSubject = subjectStats.length > 1 ? subjectStats[subjectStats.length - 1] : null;

    return {
      totalTests,
      bestScore,
      avgScore,
      avgAccuracy: overallAccuracy,
      latestScore,
      totalCorrect,
      totalAttemptedQs,
      subjectStats,
      strongestSubject,
      weakestSubject
    };
  }, [pastResults, activeTests, liveTests]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'}}>
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-900/60">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <div className="absolute inset-0 w-20 h-20 border-2 border-indigo-400/60 border-t-transparent rounded-3xl animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="text-white font-black text-lg tracking-tight">Master Aptitude</p>
          <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[9px] mt-1">Loading your dashboard...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen font-sans text-slate-900 overflow-hidden" style={{background: '#f0f4ff'}}>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Dark Left Sidebar */}
      <aside className={`fixed inset-y-0 left-0 bg-white flex flex-col w-64 h-full shrink-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{borderRight: '1px solid #e8ecf3'}}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{borderBottom: '1px solid #f1f5f9'}}>
          <button onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }} className="flex items-center gap-3 hover:opacity-90 transition-opacity text-left flex-1 min-w-0">
            <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-md shrink-0 overflow-hidden p-0.5">
              <img src="/logo.png" alt="Master Aptitude" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-black tracking-tight leading-tight truncate" style={{color: '#1e293b'}}>Master<span style={{color: '#4f46e5'}}>Aptitude</span></div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{color: '#94a3b8'}}>by Suman Sir</div>
            </div>
          </button>
          <button
            className="md:hidden shrink-0 ml-2"
            style={{color: '#94a3b8'}}
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-1 pt-2" style={{fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8'}}>Menu</div>
          {/* HOME */}
          <button
            onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }}
            className={`w-full sidebar-btn sidebar-home ${activeTab === 'home' ? 'active' : ''}`}
          >
            <Target className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* PROFILE */}
          <button
            onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
            className={`w-full sidebar-btn sidebar-profile ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>My Profile</span>
          </button>

          {/* LEARN SECTION */}
          <div className="space-y-1">
            <button
              onClick={() => {
                const newState = !learnOpen;
                setLearnOpen(newState);
                if (newState) setMockOpen(false);
              }}
              className={`w-full sidebar-btn sidebar-learn ${['video', 'notes', 'affairs', 'practice'].includes(activeTab) ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Learn</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${learnOpen ? 'rotate-90' : ''}`} />
            </button>
            
            {learnOpen && (
              <div className="pl-2 pr-1 py-2 space-y-1.5 bg-slate-950/20 rounded-xl border border-white/5 animate-in fade-in duration-100">
                <button 
                  onClick={() => { setActiveTab('video'); setIsSidebarOpen(false); }} 
                  className={`w-full sub-category sub-learn-video ${activeTab === 'video' ? 'active' : ''}`}
                >
                  Recorded Video
                </button>
                <button 
                  onClick={() => { setActiveTab('notes'); setIsSidebarOpen(false); }} 
                  className={`w-full sub-category sub-learn-notes ${activeTab === 'notes' ? 'active' : ''}`}
                >
                  Ebooks & Study Notes
                </button>
                <button 
                  onClick={() => { setActiveTab('one_liner'); setIsSidebarOpen(false); }} 
                  className={`w-full sub-category sub-learn-one-liner ${activeTab === 'one_liner' ? 'active' : ''}`}
                >
                  📌 One Liner Notes
                </button>
                <button 
                  onClick={() => { setActiveTab('pyq'); setIsSidebarOpen(false); }} 
                  className={`w-full sub-category sub-learn-pyq ${activeTab === 'pyq' ? 'active' : ''}`}
                >
                  📄 Previous Year Q. (PYQ)
                </button>
                <button 
                  onClick={() => { setActiveTab('pattern'); setIsSidebarOpen(false); }} 
                  className={`w-full sub-category sub-learn-pattern ${activeTab === 'pattern' ? 'active' : ''}`}
                >
                  📋 Exam Pattern & Syllabus
                </button>
                <button
                  onClick={() => { navigate('/current-affairs'); setIsSidebarOpen(false); }}
                  className="w-full sub-category sub-learn-affairs"
                >
                  Current Affairs
                </button>
                <button 
                  onClick={() => { setActiveTab('practice'); setIsSidebarOpen(false); }} 
                  className={`w-full sub-category sub-learn-practice ${activeTab === 'practice' ? 'active' : ''}`}
                >
                  Practice Set
                </button>
              </div>
            )}
          </div>

          {/* MOCK TEST SECTION */}
          <div className="space-y-1">
            <button
              onClick={() => {
                const newState = !mockOpen;
                setMockOpen(newState);
                if (newState) setLearnOpen(false);
              }}
              className={`w-full sidebar-btn sidebar-mock ${activeTab.startsWith('mock') ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 shrink-0" />
                <span>Mock Tests</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${mockOpen ? 'rotate-90' : ''}`} />
            </button>
            
            {mockOpen && (
              <div className="pl-2 pr-1 py-2 space-y-1.5 bg-slate-950/20 rounded-xl border border-white/5 animate-in fade-in duration-100">
                <button 
                  onClick={() => { setActiveTab('live_test'); setIsSidebarOpen(false); }} 
                  className={`w-full sub-category sub-mock-live ${activeTab === 'live_test' ? 'active' : ''}`}
                >
                  🔴 Live Mock Tests (Past & Running)
                </button>
                <button 
                  onClick={() => { setActiveTab('mock_topic'); setIsSidebarOpen(false); }} 
                  className={`w-full sub-category sub-mock-topic ${activeTab === 'mock_topic' ? 'active' : ''}`}
                >
                  Topic Wise Mock Test
                </button>
                <button 
                  onClick={() => { setActiveTab('mock_sectional'); setIsSidebarOpen(false); }} 
                  className={`w-full sub-category sub-mock-sectional ${activeTab === 'mock_sectional' ? 'active' : ''}`}
                >
                  Sectional Mock Test
                </button>
                <button 
                  onClick={() => { setActiveTab('mock_full'); setIsSidebarOpen(false); }} 
                  className={`w-full sub-category sub-mock-full ${activeTab === 'mock_full' ? 'active' : ''}`}
                >
                  Full Mock Test
                </button>
                <button 
                  onClick={() => { setActiveTab('mock_challenge'); setIsSidebarOpen(false); }} 
                  className={`w-full sub-category sub-mock-challenge ${activeTab === 'mock_challenge' ? 'active' : ''}`}
                >
                  150 Days Challenge
                </button>
              </div>
            )}
          </div>

          {/* TYPING TEST LINK */}
          <button
            onClick={() => { navigate('/typing-test'); setIsSidebarOpen(false); }}
            className="w-full sidebar-btn sidebar-typing"
          >
            <Keyboard className="w-4 h-4 shrink-0" />
            <span>Typing Test</span>
          </button>

          {/* NEWS & UPDATES LINK */}
          <button
            onClick={() => { navigate('/news'); setIsSidebarOpen(false); }}
            className="w-full sidebar-btn"
            style={{color: 'rgba(167,139,250,0.85)'}}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>News &amp; Updates</span>
          </button>

          <div className="px-3 pb-1 pt-3" style={{fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8'}}>Resources</div>

          {/* PREVIOUS YEAR PAPERS */}
          <button
            onClick={() => { setActiveTab('pyq'); setIsSidebarOpen(false); }}
            className={`w-full sidebar-btn sidebar-pyq ${activeTab === 'pyq' ? 'active' : ''}`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Previous Year Q.</span>
          </button>

          {/* EXAM PATTERN & SYLLABUS */}
          <button
            onClick={() => { setActiveTab('pattern'); setIsSidebarOpen(false); }}
            className={`w-full sidebar-btn sidebar-pattern ${activeTab === 'pattern' ? 'active' : ''}`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>Exam Pattern</span>
          </button>

          {/* ABOUT US */}
          <button
            onClick={() => { setActiveTab('about'); setIsSidebarOpen(false); }}
            className={`w-full sidebar-btn sidebar-about ${activeTab === 'about' ? 'active' : ''}`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>About Us</span>
          </button>

          {/* CONTACT US */}
          <button
            onClick={() => { setActiveTab('contact'); setIsSidebarOpen(false); }}
            className={`w-full sidebar-btn sidebar-contact ${activeTab === 'contact' ? 'active' : ''}`}
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span>Contact Us</span>
          </button>
        </div>

        {/* Install App button */}
        {profile?.role !== 'admin' && (
          <div className="px-3 pb-2 shrink-0">
            <InstallAppSidebarButton />
          </div>
        )}

        {/* Sidebar Footer: User card */}
        <div className="p-3 shrink-0" style={{borderTop: '1px solid #f1f5f9'}}>
          <div className="flex items-center gap-3 rounded-xl px-3 py-3" style={{background: '#f8fafc', border: '1px solid #e8ecf3'}}>
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white text-sm font-black shrink-0">
              {(profile?.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate" style={{color: '#1e293b'}}>{profile?.name || 'Student'}</div>
              {profile?.batch ? (
                <div className="text-[9px] font-bold uppercase tracking-wide mt-0.5 px-1.5 py-0.5 rounded inline-block" style={{background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e'}}>{profile.batch}</div>
              ) : (
                <div className="text-[10px] font-medium" style={{color: '#94a3b8'}}>{profile?.phoneNumber || ''}</div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto w-full md:w-auto">
        
        {/* Top Header */}
        <header className="h-14 md:h-16 backdrop-blur-xl flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-10 w-full" style={{background: 'rgba(255,255,255,0.96)', borderBottom: '1px solid #e8ecf3', boxShadow: '0 1px 8px rgba(0,0,0,0.04)'}}>
          {/* Mobile: App logo — Desktop: hamburger hidden, breadcrumb shown */}
          <div className="flex items-center flex-1 gap-3">
            {/* Mobile app logo (replaces hamburger — bottom nav handles navigation) */}
            <button onClick={() => setActiveTab('home')}
              className="md:hidden flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-md overflow-hidden p-0.5">
                <img src="/logo.png" alt="Master Aptitude" className="w-full h-full object-contain" />
              </div>
              <span className="text-sm font-black" style={{color: '#1e293b'}}>Master<span style={{color: '#6366f1'}}>Aptitude</span></span>
            </button>
            {/* Desktop sidebar toggle (keep for desktop) */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="hidden p-2 -ml-1 rounded-xl transition-colors"
              style={{color: '#64748b'}}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{color: '#94a3b8'}}>
                {activeTab === 'home' ? '🏠 Dashboard' : activeTab === 'profile' ? '👤 My Profile' : activeTab === 'mock_challenge' ? '🎯 150 Days Challenge' : activeTab.startsWith('mock') ? '🎯 Mock Tests' : activeTab === 'live_test' ? '🔴 Live Tests' : activeTab === 'notes' ? '📚 Study Notes' : activeTab === 'video' ? '🎬 Video Lectures' : activeTab === 'pyq' ? '📄 Previous Year Q.' : activeTab === 'affairs' ? '📰 Current Affairs' : activeTab === 'practice' ? '✅ Practice Sets' : activeTab === 'pattern' ? '📋 Exam Pattern' : activeTab === 'about' ? 'ℹ️ About Us' : activeTab === 'contact' ? '📞 Contact' : 'Dashboard'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {profile?.role === 'admin' && (
              <Link to="/admin" className="hidden sm:flex items-center gap-1.5 text-[10px] font-black bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-xl hover:opacity-90 transition-all" style={{boxShadow: '0 2px 12px rgba(99,102,241,0.3)'}} >
                <LayoutDashboard className="w-3 h-3" />
                Admin Panel
              </Link>
            )}
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white text-sm font-black shrink-0 select-none" style={{boxShadow: '0 2px 10px rgba(99,102,241,0.3)'}}>
                {(profile?.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-tight" style={{color: '#1e293b'}}>{profile?.name || 'Student'}</span>
                <span className="text-[9px] font-medium" style={{color: '#94a3b8'}}>{profile?.phoneNumber || ''}</span>
              </div>
            </div>
            {/* Mobile: user avatar tap → profile */}
            <button onClick={() => setActiveTab('profile')}
              className="md:hidden w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white text-sm font-black select-none"
              style={{boxShadow: '0 2px 10px rgba(99,102,241,0.3)'}}>
              {(profile?.name || 'S').charAt(0).toUpperCase()}
            </button>
            <button
              onClick={handleLogout}
              className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-xl transition-all"
              style={{background: '#f1f5f9', color: '#64748b'}}
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Content — extra bottom padding on mobile for bottom nav */}
        <main className="p-5 md:p-8 pb-24 md:pb-8 w-full">
          
          {/* Home Tab – Design D */}
          {activeTab === 'home' && (
            <div className="animate-in fade-in duration-150 space-y-5">
              {/* ── Welcome Hero ── */}
              <WelcomeHero name={profile?.name} />

              {/* ── Carousel (dark-themed) ── */}
              {carousels.length > 0 && (() => {
                const sorted = [...carousels].sort((a, b) => (a.priority || 99) - (b.priority || 99));
                const N = sorted.length;
                const visibleCount = isMobileView ? 2 : 3;

                const CarouselBadge = ({ badge }: { badge?: string }) => {
                  if (badge === 'live') return (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg animate-fast-blink tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                        LIVE
                      </span>
                    </div>
                  );
                  if (badge === 'new') return (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg animate-fast-blink tracking-wider">NEW</span>
                    </div>
                  );
                  return null;
                };

                if (N <= visibleCount) {
                  return (
                    <div>
                      <div className="flex gap-2 sm:gap-3">
                        {sorted.map(slide => (
                          <div key={slide.id} className="relative overflow-hidden rounded-xl h-32 sm:h-40 md:h-44" style={{flex: '1 1 0%', border: '1px solid rgba(255,255,255,0.06)'}}>
                            <img src={slide.link} alt="Announcement" className="w-full h-full object-cover" />
                            <CarouselBadge badge={slide.badge} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                const repeated = [...sorted, ...sorted];
                const total = repeated.length;
                return (
                  <div>
                    <div className="overflow-hidden rounded-2xl">
                      <div
                        style={{display: 'flex', width: `${(total / visibleCount) * 100}%`, transform: `translateX(-${(currentSlideIndex / total) * 100}%)`, transition: isCarouselAnimating ? 'transform 700ms ease-in-out' : 'none'}}
                        onTransitionEnd={() => {
                          if (currentSlideIndex >= N) setCurrentSlideIndex(prev => prev - N);
                          setIsCarouselAnimating(false);
                        }}
                      >
                        {repeated.map((slide, idx) => (
                          <div key={idx} style={{width: `${100 / total}%`}} className="px-1 first:pl-0 last:pr-0">
                            <div className="relative overflow-hidden rounded-xl h-32 sm:h-40 md:h-44" style={{border: '1px solid rgba(255,255,255,0.06)'}}>
                              <img src={slide.link} alt="Announcement" className="w-full h-full object-cover" />
                              <CarouselBadge badge={slide.badge} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-center gap-1.5 mt-3">
                      {sorted.map((_, i) => (
                        <button key={i} onClick={() => { setIsCarouselAnimating(true); setCurrentSlideIndex(i); }}
                          className={`h-1.5 rounded-full transition-all duration-300 ${(currentSlideIndex % N) === i ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-700 hover:bg-slate-600'}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}



              {/* ── Category Grid — 4 Columns light cards ── */}
              {(() => {
                const cats = dashboardCategories.length > 0 ? dashboardCategories : DEFAULT_DASHBOARD_CATEGORIES;

                const handleCategoryClick = (cat: any) => {
                  const val = cat.actionValue;
                  if (cat.actionType === 'tab') {
                    if (val && val.includes(':')) {
                      const [tab, category] = val.split(':');
                      setSearchParams({ tab, cat: category });
                      setSelectedTopic(null);
                      if (!tab.startsWith('mock')) {
                        setMockOpen(false);
                      }
                      if (!['video', 'notes', 'affairs', 'practice', 'one_liner', 'pyq', 'pattern'].includes(tab)) {
                        setLearnOpen(false);
                      }
                    } else {
                      setActiveTab(val);
                    }
                  } else if (cat.actionType === 'route') {
                    navigate(val);
                  } else if (cat.actionType === 'url') {
                    window.open(val, '_blank');
                  }
                };

                return (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#64748b' }}>Explore Study Resources</p>
                      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right,#e2e8f0,transparent)' }} />
                    </div>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                      {cats.map((cat, idx) => {
                        const { textColorClass, textColorStyle, icon, LucideIcon, iconBgClass } = getCategoryStyle(cat.title, cat.textColor, cat.iconType);
                        
                        return (
                          <button
                            key={cat.id || idx}
                            onClick={() => handleCategoryClick(cat)}
                            className="group bg-white rounded-2xl p-2.5 sm:p-4 border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-2 sm:gap-3 relative transition-all duration-300 hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5 active:scale-[0.97]"
                          >
                            {/* Icon Container */}
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-300 group-hover:scale-110 border border-slate-100 ${iconBgClass}`}>
                              {LucideIcon ? (
                                <LucideIcon className="w-6 h-6 sm:w-7 h-7" />
                              ) : (
                                <span className="select-none text-2xl sm:text-3xl">{icon}</span>
                              )}
                            </div>

                            {/* Label */}
                            <div className="text-center min-h-[32px] flex items-center justify-center">
                              <span 
                                className={`text-[11px] sm:text-xs md:text-sm leading-tight text-center font-extrabold tracking-tight ${textColorClass}`}
                                style={textColorStyle}
                              >
                                {cat.title}
                              </span>
                            </div>

                            {/* Hover Indicator */}
                            <div className="absolute inset-0 rounded-2xl pointer-events-none border border-transparent transition-all duration-300 group-hover:border-indigo-500/20" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ── Premium Mock Batches ── */}
              {paidBatches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-xs font-black uppercase tracking-widest" style={{color:'#64748b'}}>👑 Premium Batches</p>
                    <div className="flex-1 h-px" style={{background:'linear-gradient(to right,#e2e8f0,transparent)'}}/>
                  </div>
                  <div className="space-y-3">
                    {paidBatches.map(batch => {
                      const owned   = myPurchases.includes(batch.id);
                      const pending = pendingPurchases.includes(batch.id);
                      const paidTestCount = activeTests.filter((t: any) => t.isPaid).length;
                      return (
                        <div key={batch.id} className="rounded-2xl overflow-hidden"
                          style={{ background:'#fff', border: owned ? '2px solid #10b981' : pending ? '2px solid #f59e0b' : '1px solid #e8ecf3', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
                          {/* Thumbnail or gradient header */}
                          {batch.thumbnailUrl ? (
                            <img src={batch.thumbnailUrl} alt={batch.examName} className="w-full h-32 object-cover" />
                          ) : (
                            <div className="w-full h-28 flex items-center justify-center text-4xl"
                              style={{background:'linear-gradient(135deg,#1e1b4b,#312e81)'}}>🎯</div>
                          )}
                          <div className="p-4">
                            {/* Badges */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {batch.isPopular && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{background:'linear-gradient(90deg,#f59e0b,#ef4444)',color:'#fff'}}>🔥 POPULAR</span>}
                              {owned && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{background:'#d1fae5',color:'#065f46'}}>✔ PURCHASED</span>}
                              {pending && !owned && <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1" style={{background:'#fef3c7',color:'#92400e'}}><Clock className="w-2.5 h-2.5"/>PENDING</span>}
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{background:'#eef2ff',color:'#4338ca'}}>{batch.validity}</span>
                            </div>
                            <h3 className="font-black text-sm text-slate-800 mb-1">{batch.examName}</h3>
                            <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{batch.description}</p>
                            {/* Stats */}
                            <div className="flex gap-3 text-[11px] font-black mb-4">
                              <span className="text-indigo-600">📝 {owned ? paidTestCount : batch.totalMocks || 0} Mocks</span>
                              <span className="text-emerald-600">👥 {batch.enrolledCount || 0}+ Enrolled</span>
                              <span className="text-amber-600">₹{batch.price}</span>
                            </div>
                            {/* Features */}
                            {batch.features?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {batch.features.slice(0,3).map((f: string) => (
                                  <span key={f} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{background:'#f0fdf4',color:'#166534',border:'1px solid #bbf7d0'}}>✔ {f}</span>
                                ))}
                              </div>
                            )}
                            {/* CTA */}
                            {owned ? (
                              <button
                                onClick={() => setActiveTab('mock_landing')}
                                className="w-full py-3 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2"
                                style={{background:'linear-gradient(135deg,#10b981,#059669)',boxShadow:'0 4px 14px rgba(16,185,129,0.3)'}}>
                                ✔ Open Mock Tests ({paidTestCount} available)
                              </button>
                            ) : pending ? (
                              <div className="w-full py-3 rounded-xl font-black text-sm text-center" style={{background:'#fef3c7',color:'#92400e'}}>
                                ⏳ Verification Pending (1–2 hrs)
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  window.open(`${razorpayMeUrl}?amount=${batch.price * 100}&description=${encodeURIComponent(batch.examName)}`, '_blank');
                                  setBuyingBatch(batch); setBuyError(''); setTxnId('');
                                }}
                                className="w-full py-3 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
                                style={{background:'linear-gradient(135deg,#10b981,#059669)',boxShadow:'0 4px 14px rgba(16,185,129,0.35)'}}>
                                🛒 Buy Now — ₹{batch.price}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Student Reviews Slider ── */}
              <ReviewSlider />

            </div>
          )}

          {/* ── Inline Buy Modal (TxnID confirmation after Razorpay tab opens) ── */}
          {buyingBatch && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{background:'rgba(0,0,0,0.65)'}} onClick={() => setBuyingBatch(null)}>
              <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden" style={{background:'#fff'}} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 pt-5 pb-4" style={{background:'linear-gradient(135deg,#1e1b4b,#312e81)'}}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{color:'#a5b4fc'}}>Confirm Payment</span>
                    <button onClick={() => setBuyingBatch(null)} className="text-white/50 hover:text-white text-lg leading-none">✕</button>
                  </div>
                  <h3 className="font-black text-white text-base">{buyingBatch.examName}</h3>
                  <p className="text-sm font-black mt-0.5" style={{color:'#fbbf24'}}>₹{buyingBatch.price}</p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Payment opened banner */}
                  <div className="rounded-xl p-3 flex items-center gap-3" style={{background:'#f0fdf4',border:'1px solid #bbf7d0'}}>
                    <span className="text-xl">✅</span>
                    <div>
                      <p className="text-xs font-black text-emerald-800">Razorpay payment page opened!</p>
                      <p className="text-[11px] text-emerald-700">Complete payment there, then come back here and enter your Transaction ID below.</p>
                    </div>
                  </div>

                  {/* Re-open link if tab was blocked */}
                  <a href={`${razorpayMeUrl}?amount=${buyingBatch.price * 100}&description=${encodeURIComponent(buyingBatch.examName)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-sm text-indigo-600 transition-all hover:bg-indigo-50"
                    style={{border:'1px solid #c7d2fe'}}>
                    <ExternalLink className="w-4 h-4"/> Re-open Payment Page
                  </a>

                  {/* TxnID input */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">UPI Reference / Transaction ID *</label>
                    <input value={txnId} onChange={e => { setTxnId(e.target.value); setBuyError(''); }}
                      placeholder="e.g. 425813679201"
                      className="w-full rounded-xl px-4 py-3 text-sm font-mono border border-slate-200 focus:border-indigo-400 outline-none" autoFocus />
                    {buyError && <p className="text-xs text-rose-500 font-bold mt-1.5">{buyError}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">📋 Found in your UPI app → Payment History, or in the SMS you received.</p>
                  </div>

                  <button disabled={buySubmitting} onClick={async () => {
                    if (!txnId.trim()) { setBuyError('Please enter your Transaction ID'); return; }
                    setBuySubmitting(true); setBuyError('');
                    try {
                      const token = await user!.getIdToken();
                      const res = await fetch('/api/payments/submit-manual', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ batchId: buyingBatch.id, transactionId: txnId.trim(), amount: buyingBatch.price, studentName: profile?.name || '' }),
                      });
                      const data = await res.json();
                      if (!res.ok) setBuyError(data.error || 'Submission failed');
                      else { setPendingPurchases(p => [...p, buyingBatch.id]); setBuyingBatch(null); }
                    } catch { setBuyError('Network error. Please try again.'); }
                    setBuySubmitting(false);
                  }}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:brightness-110"
                    style={{background:'linear-gradient(135deg,#10b981,#059669)',boxShadow:'0 4px 16px rgba(16,185,129,0.3)'}}>
                    {buySubmitting ? 'Submitting...' : '✔ Submit Transaction ID'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab Content */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto animate-in fade-in duration-200">
              <div className="bg-white rounded-[36px] p-6 sm:p-10 border border-slate-100 shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  {/* Light & Stylish Halftone Profile Banner Header */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50 border border-blue-100 p-5 sm:p-6 mb-6 shadow-xs">
                    {/* Blue Halftone Dot Matrix Pattern (Matching user uploaded image) */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-48 sm:w-64 pointer-events-none opacity-25"
                      style={{
                        backgroundImage: `radial-gradient(#2563eb 2.5px, transparent 2.5px)`,
                        backgroundSize: `12px 12px`,
                        maskImage: `radial-gradient(ellipse at top right, black 30%, transparent 80%)`,
                        WebkitMaskImage: `radial-gradient(ellipse at top right, black 30%, transparent 80%)`
                      }}
                    />

                    <div className="relative z-10 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-blue-500/20">
                            {profile?.name ? profile.name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Active Student Account" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 truncate">
                              {profile?.name || editName || 'Student Profile'}
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100/80 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-blue-600" /> Student
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className={`px-4 sm:px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all duration-200 cursor-pointer shrink-0 shadow-md ${
                          isEditingProfile 
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300' 
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-110 shadow-blue-500/25 hover:scale-105 active:scale-95'
                        }`}
                      >
                        {isEditingProfile ? (
                          <>
                            <X className="w-4 h-4" /> Cancel
                          </>
                        ) : (
                          <>
                            <Pencil className="w-4 h-4" /> Edit Profile
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Stylish Edit Profile Form */}
                  {isEditingProfile && (
                    <form onSubmit={handleUpdateProfile} className="space-y-5 bg-slate-50/80 p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-inner animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 mb-4">
                        <Pencil className="w-4 h-4 text-rose-500" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Update Personal Details</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-rose-500" /> Full Name
                          </label>
                          <input 
                            type="text" required
                            value={editName} onChange={e => setEditName(e.target.value)}
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-3.5 outline-hidden focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all font-bold text-slate-800 text-sm shadow-xs"
                            placeholder="Enter your name"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-indigo-500" /> Mobile Number
                          </label>
                          <input 
                            type="tel" required
                            value={editPhone} onChange={e => setEditPhone(e.target.value)}
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-3.5 outline-hidden focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all font-bold text-slate-800 text-sm shadow-xs"
                            placeholder="Enter mobile number"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-emerald-500" /> Email Address <span className="text-[9px] text-slate-400 font-medium">(Read-only)</span>
                        </label>
                        <input 
                          type="email" readOnly
                          value={user?.email || ''}
                          className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl px-5 py-3.5 outline-hidden font-bold text-slate-500 text-sm cursor-not-allowed opacity-75"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-amber-500" /> New Password <span className="text-[9px] text-slate-400 font-medium">(Leave blank to keep current)</span>
                        </label>
                        <input 
                          type="password"
                          value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-3.5 outline-hidden focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all font-bold text-slate-800 text-sm shadow-xs"
                          placeholder="••••••••"
                        />
                      </div>

                      <div className="pt-3 flex items-center gap-3">
                        <button 
                          type="submit"
                          disabled={updatingProfile}
                          className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-rose-200 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {updatingProfile ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Saving Changes...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Update Profile
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-200/80 text-slate-700 hover:bg-slate-300 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ── Detailed Performance Analysis ── */}
                  {(() => {
                    const rawRankNum = myGlobalRank || (profile?.globalRank && profile.globalRank > 0 ? profile.globalRank : (detailedPerformanceStats.totalTests > 0 ? 1 : null));
                    
                    const formatRankDisplay = (rank: number | null, total: number | null): string => {
                      if (!rank || rank <= 0) return 'Not Ranked Yet';
                      const rStr = rank < 10 ? `0${rank}` : `${rank}`;
                      if (total && total > 0) {
                        const tStr = total < 10 ? `0${total}` : `${total}`;
                        return `${rStr}/${tStr}`;
                      }
                      return `#${rStr}`;
                    };

                    const studentRankDisplay = formatRankDisplay(rawRankNum, totalStudentsCount);
                    
                    return (
                      <div className="mt-8 pt-8 border-t border-slate-100 space-y-6">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                              <div className="w-1.5 h-4 bg-indigo-600 rounded-full"/>
                              📊 Detailed Performance Analysis
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Comprehensive report of your scores, rank, accuracy, and subject strengths.</p>
                          </div>
                          {studentRankDisplay !== 'Not Ranked Yet' && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs">
                              🏆 Global Rank: {studentRankDisplay}
                            </span>
                          )}
                        </div>

                        {detailedPerformanceStats.totalTests === 0 ? (
                          <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center text-slate-400">
                            <Trophy className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p className="font-bold text-slate-700 text-sm">No Mock Tests Attempted Yet</p>
                            <p className="text-xs text-slate-400 mt-1">Start taking tests to view detailed accuracy, global rank, and subject strength analysis here!</p>
                          </div>
                        ) : (
                          <>
                            {/* 4 Core Performance Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-4 rounded-2xl border border-amber-100 shadow-xs">
                                <span className="block text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1">Global Rank</span>
                                <span className="text-xl sm:text-2xl font-black text-amber-900 block">{studentRankDisplay}</span>
                                <span className="text-[9px] font-bold text-amber-600 mt-1 block">🏆 Overall Standings</span>
                              </div>

                          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4 rounded-2xl border border-emerald-100 shadow-xs">
                            <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">Accuracy Rate</span>
                            <span className="text-xl sm:text-2xl font-black text-emerald-800 block">{detailedPerformanceStats.avgAccuracy}%</span>
                            <span className="text-[9px] font-bold text-emerald-600 mt-1 block">✓ {detailedPerformanceStats.totalCorrect} Correct Qs</span>
                          </div>

                          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/60 p-4 rounded-2xl border border-indigo-100 shadow-xs">
                            <span className="block text-[9px] font-black text-indigo-600 uppercase tracking-wider mb-1">Tests Attempted</span>
                            <span className="text-xl sm:text-2xl font-black text-indigo-900 block">{detailedPerformanceStats.totalTests}</span>
                            <span className="text-[9px] font-bold text-indigo-600 mt-1 block">📝 {detailedPerformanceStats.totalAttemptedQs} Qs Answered</span>
                          </div>

                          <div className="bg-gradient-to-br from-purple-50 to-indigo-50/60 p-4 rounded-2xl border border-purple-100 shadow-xs">
                            <span className="block text-[9px] font-black text-purple-600 uppercase tracking-wider mb-1">Best Score</span>
                            <span className="text-xl sm:text-2xl font-black text-purple-900 block">{detailedPerformanceStats.bestScore}</span>
                            <span className="text-[9px] font-bold text-purple-600 mt-1 block">Avg: {detailedPerformanceStats.avgScore} pts</span>
                          </div>
                        </div>

                        {/* Strongest vs Weakest Subject Spotlight */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {detailedPerformanceStats.strongestSubject && (
                            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1">
                                  💪 Strongest Subject
                                </span>
                                <p className="font-black text-slate-900 text-sm">{detailedPerformanceStats.strongestSubject.subject}</p>
                                <p className="text-[10px] text-slate-500 font-bold">
                                  {detailedPerformanceStats.strongestSubject.correct}/{detailedPerformanceStats.strongestSubject.attempted} Correct ({detailedPerformanceStats.strongestSubject.accuracy}%)
                                </p>
                              </div>
                              <div className="px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-xs shrink-0">
                                {detailedPerformanceStats.strongestSubject.accuracy}%
                              </div>
                            </div>
                          )}

                          {detailedPerformanceStats.weakestSubject ? (
                            <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-rose-700 flex items-center gap-1">
                                  🎯 Subject Needing Practice
                                </span>
                                <p className="font-black text-slate-900 text-sm">{detailedPerformanceStats.weakestSubject.subject}</p>
                                <p className="text-[10px] text-slate-500 font-bold">
                                  {detailedPerformanceStats.weakestSubject.correct}/{detailedPerformanceStats.weakestSubject.attempted} Correct ({detailedPerformanceStats.weakestSubject.accuracy}%)
                                </p>
                              </div>
                              <div className="px-3 py-1 bg-rose-600 text-white font-black text-xs rounded-xl shadow-xs shrink-0">
                                {detailedPerformanceStats.weakestSubject.accuracy}%
                              </div>
                            </div>
                          ) : (
                            <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700">
                                  📈 Performance Status
                                </span>
                                <p className="font-black text-slate-900 text-sm">Keep Attempting Mocks!</p>
                                <p className="text-[10px] text-slate-500 font-bold">Take tests across different subjects for deeper subject analysis.</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Subject-Wise Detailed Progress Bars */}
                        {detailedPerformanceStats.subjectStats.length > 0 && (
                          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center justify-between">
                              <span>📚 Subject-Wise Accuracy Breakdown</span>
                              <span className="text-[10px] text-slate-400 font-bold">({detailedPerformanceStats.subjectStats.length} Subjects Analyzed)</span>
                            </h4>

                            <div className="space-y-3.5 divide-y divide-slate-200/60">
                              {detailedPerformanceStats.subjectStats.map((st) => (
                                <div key={st.subject} className="pt-3 first:pt-0 space-y-1.5">
                                  <div className="flex items-center justify-between text-xs gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-black text-slate-800 truncate">{st.subject}</span>
                                      <span className="text-[9px] font-extrabold px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-600 shrink-0">
                                        {st.totalTests} {st.totalTests === 1 ? 'Test' : 'Tests'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-black text-slate-900">{st.accuracy}%</span>
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                        st.accuracy >= 75 ? 'bg-emerald-100 text-emerald-800' : st.accuracy >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        {st.status}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        st.accuracy >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : st.accuracy >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-rose-500 to-red-500'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(5, st.accuracy))}%` }}
                                    />
                                  </div>

                                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                    <span>Correct: {st.correct}/{st.attempted} Qs</span>
                                    <span>Best Score: {st.bestScore} pts</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                    );
                  })()}

                  {/* ── Purchased Batches ── */}
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-rose-500 rounded-full"/>
                      Purchased Batch / Mock Details
                    </h3>
                    {profile?.batch ? (
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 shrink-0">
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <span className="block text-[9px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Active Batch</span>
                          <span className="text-sm font-black text-amber-900">{profile.batch}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-400 text-xs font-bold">No active batch purchased yet.</div>
                    )}
                    <button
                      onClick={() => navigate('/paid-mock')}
                      className="mt-4 w-full flex items-center justify-center gap-2 bg-rose-600 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-rose-200"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View My Purchases
                    </button>
                  </div>
                </div>
                <div className="absolute left-0 bottom-0 -translate-x-1/4 translate-y-1/4 w-96 h-96 bg-rose-50 rounded-full blur-3xl pointer-events-none opacity-40"></div>
              </div>
            </div>
          )}

          {/* Affairs tab — navigates to /current-affairs full page */}

          {/* Practice Set Tab Content */}
          {activeTab === 'practice' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Unified Learn Sub-Section Toggle Bar */}
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('notes')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Ebooks & Notes
                </button>
                <button
                  onClick={() => setActiveTab('one_liner')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <Bookmark className="w-3.5 h-3.5 text-indigo-600" /> 📌 One Liner Notes
                </button>
                <button
                  onClick={() => setActiveTab('pyq')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" /> 📄 Previous Year Q. (PYQ)
                </button>
                <button
                  onClick={() => setActiveTab('pattern')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <Trophy className="w-3.5 h-3.5 text-blue-600" /> 📋 Exam Pattern & Syllabus
                </button>
                <button
                  onClick={() => setActiveTab('practice')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-white text-teal-700 shadow-xs border border-slate-200"
                >
                  <Target className="w-3.5 h-3.5 text-teal-600" /> 🎯 Practice Sets
                </button>
              </div>
              {/* Banner Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
                <div className="space-y-1 relative z-10">
                  <span className="bg-white/20 text-white font-black uppercase text-[10px] px-3 py-1 rounded-full tracking-widest border border-white/20 inline-block">
                    Topic Practice & Model Papers
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <Target className="w-6 h-6 text-amber-300 shrink-0" /> Practice Sets & Worksheets
                  </h2>
                  <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed max-w-xl">
                    High-yield practice worksheets, topic-wise question banks, model papers, and detailed solution keys.
                  </p>
                </div>
              </div>

              {/* Search & Subject Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Practice Sets..."
                    value={practiceSearch}
                    onChange={e => setPracticeSearch(e.target.value)}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:border-teal-600 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {['ALL', 'Mathematics', 'Reasoning', 'General Knowledge', 'English Language', 'Computer Knowledge', 'Full Model Practice Set', 'SSC Special', 'Railway Special'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setPracticeSubjectFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                        practiceSubjectFilter === cat
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Practice Sets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {practiceSets
                  .filter(p => p.status !== 'draft')
                  .filter(p => {
                    const matchesSearch = 
                      (p.title || '').toLowerCase().includes(practiceSearch.toLowerCase()) ||
                      (p.content || p.description || '').toLowerCase().includes(practiceSearch.toLowerCase()) ||
                      (p.subject || '').toLowerCase().includes(practiceSearch.toLowerCase());
                    const matchesSub = practiceSubjectFilter === 'ALL' || (p.subject || '').includes(practiceSubjectFilter);
                    return matchesSearch && matchesSub;
                  })
                  .map(item => {
                    const titleText = item.title || 'Practice Set';
                    const subjectText = item.subject || 'General';
                    const pdfLink = item.pdfUrl || item.fileUrl || item.link;
                    const coverImage = item.imageUrl || item.thumbnailUrl;
                    const contentText = item.content || item.description;

                    return (
                      <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs relative group hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-black uppercase rounded-lg">
                              {subjectText}
                            </span>
                            {(item.pinned || item.pinToHomepage) && (
                              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                                📌 Pinned
                              </span>
                            )}
                          </div>

                          <h4 className="font-black text-slate-900 text-base leading-snug tracking-tight">{titleText}</h4>

                          {contentText && (
                            <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                              {contentText}
                            </p>
                          )}

                          {coverImage && (
                            <div 
                              onClick={() => setSelectedPreviewImage(coverImage)}
                              className="relative rounded-xl border border-slate-200 overflow-hidden cursor-pointer group max-h-48 bg-slate-100"
                            >
                              <img src={coverImage} alt={titleText} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                <Eye className="w-4 h-4" /> View full image
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          {pdfLink ? (
                            <a 
                              href={pdfLink} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-between w-full text-rose-700 font-bold text-xs uppercase tracking-wider bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl hover:bg-rose-100 transition-all"
                            >
                              <span className="truncate flex items-center gap-2">
                                📄 {item.pdfTitle || 'Download Practice Set PDF'}
                              </span>
                              <Download className="w-4 h-4 shrink-0" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                {practiceSets.filter(p => p.status !== 'draft').filter(p => practiceSubjectFilter === 'ALL' || (p.subject || '').includes(practiceSubjectFilter)).length === 0 && (
                  <ComingSoonBox categoryName={practiceSubjectFilter !== 'ALL' ? practiceSubjectFilter : 'Practice Sets & Worksheets'} />
                )}
              </div>
            </div>
          )}

          {/* About Us Tab Content */}
          {activeTab === 'about' && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-150">
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
            <div className="max-w-4xl mx-auto animate-in fade-in duration-150">
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

          {/* ── Mock Test Landing (category chooser) ───────────────────── */}
          {activeTab === 'mock_landing' && (
            <div className="animate-in fade-in duration-150">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setActiveTab('home')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">🎯 Free Mock Tests</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Choose your test format and start practising</p>
                </div>
              </div>

              {/* Glassmorphic Mock Test Sub-category Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Card 1: Topic Wise Mock */}
                <button
                  onClick={() => setActiveTab('mock_topic')}
                  className="group relative overflow-hidden rounded-3xl p-5 text-left backdrop-blur-md bg-white/60 border border-slate-200/50 hover:border-cyan-300 hover:bg-white/80 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[170px]"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 to-sky-400" />
                  
                  <div className="absolute top-4 right-4">
                    <span className="bg-cyan-50 text-cyan-600 font-black uppercase text-[8px] px-2.5 py-1 rounded-full tracking-widest border border-cyan-100">
                      Focused
                    </span>
                  </div>

                  <div>
                    <div className="w-11 h-11 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-500 mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Target className="w-5.5 h-5.5" />
                    </div>
                    <h3 className="font-black text-slate-800 text-sm leading-tight">Topic Wise Mock</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1.5 leading-relaxed">Practice mock tests curated specifically for each chapter & topic.</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-cyan-600 text-[10px] font-black uppercase tracking-wider w-full">
                    <span>120+ Tests Available</span>
                    <div className="w-6 h-6 rounded-full bg-cyan-50 flex items-center justify-center border border-cyan-100 group-hover:bg-cyan-500 group-hover:text-white transition-colors duration-300">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>

                {/* Card 2: Sectional Mock */}
                <button
                  onClick={() => setActiveTab('mock_sectional')}
                  className="group relative overflow-hidden rounded-3xl p-5 text-left backdrop-blur-md bg-white/60 border border-slate-200/50 hover:border-rose-300 hover:bg-white/80 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[170px]"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-400 to-pink-400" />
                  
                  <div className="absolute top-4 right-4">
                    <span className="bg-rose-50 text-rose-600 font-black uppercase text-[8px] px-2.5 py-1 rounded-full tracking-widest border border-rose-100">
                      Timed
                    </span>
                  </div>

                  <div>
                    <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-4 group-hover:scale-110 transition-transform duration-300">
                      <BarChart3 className="w-5.5 h-5.5" />
                    </div>
                    <h3 className="font-black text-slate-800 text-sm leading-tight">Sectional Mock</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1.5 leading-relaxed">Test your speed and accuracy in subject-wise timed mock sections.</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-rose-600 text-[10px] font-black uppercase tracking-wider w-full">
                    <span>45+ Sectional Papers</span>
                    <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>

                {/* Card 3: Full Mock */}
                <button
                  onClick={() => setActiveTab('mock_full')}
                  className="group relative overflow-hidden rounded-3xl p-5 text-left backdrop-blur-md bg-white/60 border border-slate-200/50 hover:border-amber-300 hover:bg-white/80 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[170px]"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
                  
                  <div className="absolute top-4 right-4">
                    <span className="bg-amber-50 text-amber-600 font-black uppercase text-[8px] px-2.5 py-1 rounded-full tracking-widest border border-amber-100">
                      Real Exam
                    </span>
                  </div>

                  <div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Trophy className="w-5.5 h-5.5" />
                    </div>
                    <h3 className="font-black text-slate-800 text-sm leading-tight">Full Mock</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1.5 leading-relaxed">Complete full-length mock exams designed to simulate real exam environments.</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-amber-600 text-[10px] font-black uppercase tracking-wider w-full">
                    <span>15+ Full Length</span>
                    <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>



              </div>

              {/* Pro tip */}
              <div className="mt-5 flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background:'#0f172a', border:'1px solid rgba(99,102,241,0.25)' }}>
                <span className="text-lg shrink-0">💡</span>
                <p className="text-xs font-semibold leading-relaxed" style={{ color:'rgba(165,180,252,0.8)' }}>
                  <span className="font-black text-white">Pro Tip: </span>
                  Start with Topic Wise → Sectional → Full Mock for complete exam readiness.
                </p>
              </div>
            </div>
          )}

          {/* ── Learn Landing (category chooser) ────────────────────────── */}
          {activeTab === 'learn_landing' && (
            <div className="animate-in fade-in duration-150">
              {/* Header */}
              <div className="flex items-center gap-3 mb-8">
                <button onClick={() => setActiveTab('home')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">📚 Learn</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Choose what you want to study today</p>
                </div>
              </div>

              {/* 2-col grid of category cards */}
              <div className="grid grid-cols-2 gap-4">

                {/* Video Lectures */}
                <button
                  onClick={() => setActiveTab('video')}
                  className="group relative overflow-hidden rounded-3xl p-5 text-left bg-white border border-violet-100 shadow-sm hover:shadow-xl hover:shadow-violet-100 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                  <div className="absolute top-0 right-0 w-24 h-24 bg-violet-400/10 rounded-full translate-x-1/3 -translate-y-1/3 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200 group-hover:scale-110 transition-transform duration-300 mb-4">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-black text-slate-800 text-sm leading-tight">Video Lectures</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">Recorded classes by experts</p>
                    <div className="mt-3 flex items-center gap-1 text-violet-600 text-[10px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      Watch <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </button>

                {/* Study Notes */}
                <button
                  onClick={() => setActiveTab('notes')}
                  className="group relative overflow-hidden rounded-3xl p-5 text-left bg-white border border-emerald-100 shadow-sm hover:shadow-xl hover:shadow-emerald-100 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full translate-x-1/3 -translate-y-1/3 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform duration-300 mb-4">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-black text-slate-800 text-sm leading-tight">Study Notes</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">PDFs, notes & materials</p>
                    <div className="mt-3 flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      Read <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </button>

                {/* Current Affairs */}
                <button
                  onClick={() => navigate('/current-affairs')}
                  className="group relative overflow-hidden rounded-3xl p-5 text-left bg-white border border-sky-100 shadow-sm hover:shadow-xl hover:shadow-sky-100 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-400/10 rounded-full translate-x-1/3 -translate-y-1/3 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-200 group-hover:scale-110 transition-transform duration-300 mb-4">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-black text-slate-800 text-sm leading-tight">Current Affairs</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">Daily news & updates</p>
                    <div className="mt-3 flex items-center gap-1 text-sky-600 text-[10px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      Explore <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </button>

                {/* Practice Sets */}
                <button
                  onClick={() => setActiveTab('practice')}
                  className="group relative overflow-hidden rounded-3xl p-5 text-left bg-white border border-orange-100 shadow-sm hover:shadow-xl hover:shadow-orange-100 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-400/10 rounded-full translate-x-1/3 -translate-y-1/3 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform duration-300 mb-4">
                      <NotebookPen className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-black text-slate-800 text-sm leading-tight">Practice Sets</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">Worksheets & drill exercises</p>
                    <div className="mt-3 flex items-center gap-1 text-orange-600 text-[10px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      Practice <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Live Test Tab */}
          {activeTab === 'live_test' && (() => {
            const now = new Date();
            const activeLive = liveTests.filter(t => t.liveStartDate && new Date(t.liveStartDate) <= now && (!t.liveEndDate || new Date(t.liveEndDate) >= now) && (t.isActive ?? true));
            const upcomingLive = liveTests.filter(t => t.liveStartDate && new Date(t.liveStartDate) > now && (t.isActive ?? true));
            const pastLive = liveTests.filter(t => !activeLive.includes(t) && !upcomingLive.includes(t));

            const openLiveAnalysis = (_testId: string, result: any) => openAnalysis(result);

            const LiveCard = ({ t, badge }: { key?: any; t: any; badge: 'live' | 'upcoming' | 'past' }) => {
              const attemptsForLive = pastResults
                .filter((r: any) => r.testId === t.id)
                .sort((a: any, b: any) => a.timestamp - b.timestamp);
              const prevResult = attemptsForLive[0];
              const hasAttempted = attemptsForLive.length > 0;

              // Sleek, compact professional list item for Past Live Mocks
              if (badge === 'past') {
                return (
                  <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 p-4 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">
                        📜
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {t.subjectName && (
                            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-black uppercase rounded-lg">
                              {t.subjectName}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-extrabold rounded-md">
                            📜 Past Live Paper
                          </span>
                          {hasAttempted && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Attempted ({attemptsForLive.length})
                            </span>
                          )}
                        </div>

                        <h4 className="font-black text-slate-900 text-sm leading-snug truncate sm:whitespace-normal">
                          {t.title}
                        </h4>

                        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 flex-wrap">
                          <span>⏱ {t.duration || 30} Mins</span>
                          <span>📝 {t.totalQuestions || 0} Qs</span>
                          {t.marksPerCorrect && <span>🎯 {t.marksPerCorrect * (t.totalQuestions || 0)} Marks</span>}
                          {hasAttempted && <span className="text-emerald-600 font-black">Best Score: {prevResult.score}</span>}
                          {t.liveEndDate && <span className="text-slate-400">Ended: {new Date(t.liveEndDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Compact Action Buttons */}
                    <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {hasAttempted ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="relative">
                            <button
                              onClick={() => setOpenAttemptDropdown(openAttemptDropdown === t.id ? null : t.id)}
                              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              Solutions ({attemptsForLive.length})
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openAttemptDropdown === t.id ? 'rotate-180' : ''}`} />
                            </button>

                            {openAttemptDropdown === t.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenAttemptDropdown(null)} />
                                <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl min-w-[280px] overflow-hidden">
                                  <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-100 flex items-center gap-2">
                                    <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Select Attempt</p>
                                  </div>
                                  <div className="py-1">
                                    {attemptsForLive.map((r: any, i: number) => (
                                      <button
                                        key={r.id}
                                        onClick={() => { openAnalysis(r); setOpenAttemptDropdown(null); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left cursor-pointer"
                                      >
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black ${
                                          i === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                          {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-black text-slate-800">
                                            {i === 0 ? '1st' : i === 1 ? '2nd' : `${i + 1}th`} Attempt
                                          </p>
                                          <p className="text-[9px] font-medium text-slate-400 tabular-nums">{formatAttemptDate(r.timestamp)}</p>
                                        </div>
                                        <span className="text-xs font-black shrink-0 text-indigo-600 tabular-nums">
                                          {r.score} pts
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => navigate(`/test/${t.id}`)}
                            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" /> Reattempt
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => navigate(`/test/${t.id}`)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 text-amber-400" /> Attempt Past Test →
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              // Running Live Mock Card
              return (
                <div className="bg-gradient-to-br from-white via-rose-50/20 to-white rounded-3xl border border-rose-300 shadow-rose-100/50 shadow-md p-5 flex flex-col gap-3.5 hover:shadow-xl transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-rose-500 text-white px-3 py-1 rounded-full shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          Live Right Now
                        </span>
                        {t.subjectName && (
                          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-lg border border-rose-200">
                            {t.subjectName}
                          </span>
                        )}
                      </div>
                      <h4 className="font-black text-slate-900 text-base sm:text-lg leading-snug tracking-tight">{t.title}</h4>
                      {t.description && <p className="text-xs text-slate-600 font-medium leading-relaxed">{t.description}</p>}
                      <div className="flex gap-3 pt-1 text-[11px] font-bold text-slate-500 flex-wrap">
                        {t.duration && <span className="bg-white px-2.5 py-1 rounded-lg border border-rose-100">⏱ {t.duration} Mins</span>}
                        {t.totalQuestions && <span className="bg-white px-2.5 py-1 rounded-lg border border-rose-100">📝 {t.totalQuestions} Questions</span>}
                        {t.marksPerCorrect && <span className="bg-white px-2.5 py-1 rounded-lg border border-rose-100">🎯 {t.marksPerCorrect * (t.totalQuestions || 0)} Total Marks</span>}
                      </div>
                    </div>

                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-200">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-black text-slate-600 uppercase tracking-wider bg-rose-50/80 p-3 rounded-2xl border border-rose-100">
                    <span>Starts: {t.liveStartDate ? new Date(t.liveStartDate).toLocaleString() : 'N/A'}</span>
                    <span>Ends: {t.liveEndDate ? new Date(t.liveEndDate).toLocaleString() : 'N/A'}</span>
                  </div>

                  <button
                    onClick={() => navigate(`/test/${t.id}`)}
                    className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white cursor-pointer"
                  >
                    <Play className="w-4 h-4" /> Attempt Live Test Now →
                  </button>
                </div>
              );
            };

            const displayedTests = 
              liveSubTab === 'running' ? activeLive :
              liveSubTab === 'past' ? pastLive :
              liveSubTab === 'upcoming' ? upcomingLive :
              liveTests;

            return (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Header Banner */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                  <div className="space-y-1.5 relative z-10 max-w-xl">
                    <span className="bg-white/20 text-white font-black uppercase text-[10px] px-3 py-1 rounded-full tracking-widest border border-white/20 inline-block">
                      🔴 Live Mock Category
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                      🔴 Live Mock Tests
                    </h2>
                    <p className="text-xs sm:text-sm text-rose-100 font-medium leading-relaxed">
                      Attempt currently running live mock tests in real-time or practice all past live mock papers anytime.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 relative z-10 flex-wrap">
                    <div 
                      onClick={() => setLiveSubTab('running')}
                      className={`px-4 py-2.5 rounded-2xl border transition-all cursor-pointer text-center ${
                        liveSubTab === 'running' ? 'bg-white/25 border-white text-white font-black shadow-md' : 'bg-white/10 border-white/20 text-rose-100'
                      }`}
                    >
                      <span className="block text-[9px] font-black uppercase tracking-widest">Running Live</span>
                      <span className="text-xl font-black">{activeLive.length}</span>
                    </div>
                    <div 
                      onClick={() => setLiveSubTab('past')}
                      className={`px-4 py-2.5 rounded-2xl border transition-all cursor-pointer text-center ${
                        liveSubTab === 'past' ? 'bg-white/25 border-white text-white font-black shadow-md' : 'bg-white/10 border-white/20 text-rose-100'
                      }`}
                    >
                      <span className="block text-[9px] font-black uppercase tracking-widest">Past Live</span>
                      <span className="text-xl font-black">{pastLive.length}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-Tab Filtering Bar: ONLY Running & Past */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setLiveSubTab('running')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                      liveSubTab === 'running'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    🔥 Running Live Mocks ({activeLive.length})
                  </button>
                  <button
                    onClick={() => setLiveSubTab('past')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                      liveSubTab === 'past'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    📜 Past Live Mocks ({pastLive.length})
                  </button>
                </div>

                {displayedTests.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400 shadow-sm flex flex-col items-center">
                    <BarChart3 className="w-12 h-12 mb-3 text-slate-300" />
                    <h3 className="font-black text-slate-700 text-base mb-1">
                      {liveSubTab === 'running' ? 'No Live Mocks Running Right Now' : 'No Past Live Mocks Found'}
                    </h3>
                    <p className="text-xs font-medium max-w-md">
                      {liveSubTab === 'running' 
                        ? 'There are currently no active live mocks running. Click below to view and practice all past live mock test papers!' 
                        : 'Past live mock test papers will appear here as live tests complete.'}
                    </p>
                    {liveSubTab === 'running' && pastLive.length > 0 && (
                      <button
                        onClick={() => setLiveSubTab('past')}
                        className="mt-4 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition-all cursor-pointer shadow-sm"
                      >
                        View Past Live Mocks ({pastLive.length}) →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={liveSubTab === 'past' ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
                    {displayedTests.map(t => {
                      const isNowRunning = t.liveStartDate && new Date(t.liveStartDate) <= now && (!t.liveEndDate || new Date(t.liveEndDate) >= now) && (t.isActive ?? true);
                      const badgeType = isNowRunning ? 'live' : 'past';
                      return <LiveCard key={t.id} t={t} badge={badgeType} />;
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Dashboard Tab Content */}
          {activeTab.startsWith('mock') && activeTab !== 'mock_landing' && activeTab !== 'mock_challenge' && (
            <div className="space-y-8 animate-in fade-in duration-150">

              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-violet-600 rounded-full"></div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    🎯 <span className="text-indigo-600">{activeTab === 'mock_topic' ? 'Topic Wise' : activeTab === 'mock_sectional' ? 'Sectional' : 'Full'}</span> Test Series
                  </h2>
                </div>
              </div>

              {categories.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 py-20 border border-slate-200 text-center text-slate-400 shadow-sm flex flex-col items-center max-w-2xl mx-auto w-full">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <FileText className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-widest mb-2">No Mock Available</h3>
                    <p className="text-slate-400 text-sm font-medium">We are working on bringing new tests to this section. Please check back later!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categories.map((subject, subjectIdx) => {
                      // All tests belonging to this subject
                      const testsInSubject = activeTests.filter(t => 
                        (t.testType || 'topic') === activeTab.replace('mock_', '') &&
                        t.category === subject
                      );

                      // Group tests in this subject by topic
                      const topicsMap: Record<string, typeof testsInSubject> = {};
                      testsInSubject.forEach(t => {
                        const key = t.topic || 'General';
                        if (!topicsMap[key]) topicsMap[key] = [];
                        topicsMap[key].push(t);
                      });
                      const topicEntries = Object.entries(topicsMap);

                      const totalTests = testsInSubject.length;
                      const takenCount = testsInSubject.filter(t => pastResults.some(r => r.testId === t.id)).length;

                      // Color variants for subjects to give premium feel
                      const subjectColors = [
                        { bg: 'border-l-indigo-500 text-indigo-600 bg-indigo-50/20 hover:bg-indigo-50/40', iconBg: 'bg-indigo-50 text-indigo-600', pill: 'bg-indigo-50 text-indigo-700' },
                        { bg: 'border-l-emerald-500 text-emerald-600 bg-emerald-50/20 hover:bg-emerald-50/40', iconBg: 'bg-emerald-50 text-emerald-600', pill: 'bg-emerald-50 text-emerald-700' },
                        { bg: 'border-l-rose-500 text-rose-600 bg-rose-50/20 hover:bg-rose-50/40', iconBg: 'bg-rose-50 text-rose-600', pill: 'bg-rose-50 text-rose-700' },
                        { bg: 'border-l-amber-500 text-amber-600 bg-amber-50/20 hover:bg-amber-50/40', iconBg: 'bg-amber-50 text-amber-600', pill: 'bg-amber-50 text-amber-700' },
                        { bg: 'border-l-sky-500 text-sky-600 bg-sky-50/20 hover:bg-sky-50/40', iconBg: 'bg-sky-50 text-sky-600', pill: 'bg-sky-50 text-sky-700' },
                        { bg: 'border-l-violet-500 text-violet-600 bg-violet-50/20 hover:bg-violet-50/40', iconBg: 'bg-violet-50 text-violet-600', pill: 'bg-violet-50 text-violet-700' },
                      ];
                      const color = subjectColors[subjectIdx % subjectColors.length];
                      const isSubjectExpanded = expandedCategory === subject;

                      if (totalTests === 0) return null;

                      return (
                        <div key={subject} className="bg-white border border-slate-200/60 rounded-2xl shadow-xs overflow-hidden transition-all duration-300">
                          
                          {/* Subject Accordion Header */}
                          <button
                            onClick={() => {
                              setExpandedCategory(isSubjectExpanded ? null : subject);
                              setExpandedTopic(null); // Reset sub-topic
                            }}
                            className={`w-full flex items-center justify-between p-4 md:p-5 border-l-4 ${color.bg} text-left transition-colors duration-200`}
                          >
                            <div className="flex items-center gap-3.5">
                              <div className={`w-10 h-10 rounded-xl ${color.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
                                <Layers className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Subject</span>
                                <h3 className="font-extrabold text-slate-800 text-sm md:text-base leading-tight">{subject}</h3>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${color.pill}`}>
                                {totalTests} {totalTests === 1 ? 'Mock' : 'Mocks'} ({takenCount} Done)
                              </span>
                              <div className="text-slate-400">
                                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isSubjectExpanded ? 'rotate-180 text-indigo-500' : ''}`} />
                              </div>
                            </div>
                          </button>

                          {/* Subject Accordion Body (Render Topics list) */}
                          {isSubjectExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50/20 divide-y divide-slate-100 animate-in slide-in-from-top-3 duration-200">
                              {topicEntries.map(([topicName, topicTests]) => {
                                const totalTopicTests = topicTests.length;
                                const takenTopicCount = topicTests.filter(t => pastResults.some(r => r.testId === t.id)).length;
                                const isTopicExpanded = expandedTopic === topicName;

                                return (
                                  <div key={topicName} className="overflow-hidden">
                                    {/* Topic Accordion Header */}
                                    <button
                                      onClick={() => setExpandedTopic(isTopicExpanded ? null : topicName)}
                                      className="w-full pl-12 md:pl-16 pr-5 py-3.5 flex items-center justify-between hover:bg-slate-50 text-left transition-colors duration-200"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-lg ${isTopicExpanded ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'} flex items-center justify-center shrink-0`}>
                                          <Target className="w-4 h-4" />
                                        </div>
                                        <h4 className="font-bold text-slate-700 text-xs md:text-sm">{topicName}</h4>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-md">
                                          {totalTopicTests} {totalTopicTests === 1 ? 'Test' : 'Tests'}
                                          {takenTopicCount > 0 && ` (${takenTopicCount}/${totalTopicTests} Attempted)`}
                                        </span>
                                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isTopicExpanded ? 'rotate-90 text-indigo-500' : ''}`} />
                                      </div>
                                    </button>

                                    {/* Topic Accordion Body (Render Mock Tests List) */}
                                    {isTopicExpanded && (
                                      <div className="pl-12 md:pl-16 pr-5 pb-5 pt-2 bg-white flex flex-col gap-3 border-t border-slate-100 animate-in slide-in-from-top-2 duration-150">
                                        {topicTests.map((test, testIdx) => {
                                          const attemptsForTest = pastResults
                                            .filter((r: any) => r.testId === test.id)
                                            .sort((a: any, b: any) => a.timestamp - b.timestamp);
                                          const isTaken = attemptsForTest.length > 0;
                                          const attemptCount = attemptsForTest.length;
                                          const latestAttempt = attemptsForTest[attemptCount - 1];

                                          return (
                                            <div key={test.id} className="bg-slate-50/50 rounded-2xl border border-slate-200/60 hover:border-indigo-100 hover:bg-white hover:shadow-xs transition-all duration-200 p-4">
                                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                
                                                {/* LEFT: Test details */}
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                  <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center shrink-0 font-black text-xs">
                                                    {testIdx + 1}
                                                  </div>
                                                  <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                      <h4 className="font-extrabold text-slate-800 text-xs md:text-sm leading-snug">{test.title}</h4>
                                                      {test.isPaid && myPurchases.length === 0
                                                        ? <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-rose-200 shrink-0">👑 Premium</span>
                                                        : test.isPaid
                                                          ? <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-200 shrink-0">✔ Unlocked</span>
                                                          : <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-100 shrink-0">Free</span>
                                                      }
                                                      {isTaken && (
                                                        <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shrink-0">
                                                          ✓ Attempted {attemptCount > 1 ? `×${attemptCount}` : ''}
                                                        </span>
                                                      )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                                        ⏱️ {test.duration || 30} mins
                                                      </span>
                                                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                                        🎯 {test.marksPerCorrect || 1} Marks/Question
                                                      </span>
                                                      {isTaken && latestAttempt && (
                                                        <span className="text-[9px] font-bold text-indigo-500 flex items-center gap-1">
                                                          📈 Latest Score: {latestAttempt.score} marks
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* RIGHT: Actions */}
                                                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap justify-end">
                                                  {!test.isPaid && isTaken && (
                                                    <button
                                                      onClick={() => handleDownloadPDF(test.id, test.title, test.category || 'N/A', test.testType || 'N/A')}
                                                      disabled={downloadingPDF === test.id}
                                                      className="flex items-center justify-center p-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-lg transition-all disabled:opacity-50"
                                                      title="Download PDF"
                                                    >
                                                      <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                  )}

                                                  {/* Previous attempts */}
                                                  {!test.isPaid && isTaken && (
                                                    <div className="relative">
                                                      <button
                                                        onClick={() => setOpenAttemptDropdown(openAttemptDropdown === test.id ? null : test.id)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all active:scale-95"
                                                      >
                                                        <BarChart3 className="w-3 h-3" />
                                                        Attempts
                                                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openAttemptDropdown === test.id ? 'rotate-180' : ''}`} />
                                                      </button>

                                                      {openAttemptDropdown === test.id && (
                                                        <>
                                                          <div className="fixed inset-0 z-40" onClick={() => setOpenAttemptDropdown(null)} />
                                                          <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[260px] overflow-hidden">
                                                            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
                                                              <BarChart3 className="w-3 h-3 text-indigo-500" />
                                                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Select to view analysis</p>
                                                            </div>
                                                            <div className="py-0.5 max-h-[180px] overflow-y-auto">
                                                              {attemptsForTest.map((r: any, i: number) => (
                                                                <button
                                                                  key={r.id}
                                                                  onClick={() => { openAnalysis(r); setOpenAttemptDropdown(null); }}
                                                                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left text-[10px]"
                                                                >
                                                                  <span className="font-extrabold text-slate-700">Attempt {i + 1}</span>
                                                                  <span className="font-black text-indigo-600">{r.score} marks</span>
                                                                </button>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        </>
                                                      )}
                                                    </div>
                                                  )}

                                                  {test.isPaid && myPurchases.length === 0 ? (
                                                    <button
                                                      onClick={() => {
                                                        const b = paidBatches[0];
                                                        if (b) {
                                                          window.open(`${razorpayMeUrl}?amount=${b.price * 100}&description=${encodeURIComponent(b.examName)}`, '_blank');
                                                          setBuyingBatch(b); setBuyError(''); setTxnId('');
                                                        } else navigate('/paid-mock');
                                                      }}
                                                      className="px-3.5 py-2 font-black text-[9px] uppercase tracking-widest rounded-xl flex items-center gap-1.5 transition-all hover:brightness-110 active:scale-95 text-white shadow-xs"
                                                      style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                                                      🛒 Buy Now
                                                    </button>
                                                  ) : (
                                                    <Link
                                                      to={`/test/${test.id}`}
                                                      className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:from-slate-900 hover:to-slate-900 transition-all shadow-xs flex items-center gap-1 active:scale-95"
                                                    >
                                                      {isTaken ? 'Reattempt' : 'Attempt'}
                                                      <ChevronRight className="w-3 h-3" />
                                                    </Link>
                                                  )}
                                                </div>

                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}

          {activeTab === 'mock_challenge' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Header Bar with Schedule Option */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-black text-xs shadow-md shadow-indigo-200">
                    150
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">150 Days Free Practice Challenge</h3>
                    <p className="text-[10px] font-bold text-slate-500">Day-by-day mock test roadmap</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-200 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ml-auto"
                >
                  <Calendar className="w-4 h-4" />
                  <span>📅 View Schedule</span>
                </button>
              </div>

              {/* Ultra-Compact 30/70 Horizontal Banner: Progress (Left 30%) & Top 5 Leaderboard (Right 70%) */}
              <div className="bg-white rounded-2xl p-3 sm:p-4 text-slate-900 shadow-sm border border-slate-200/90 relative overflow-hidden">
                <div className="grid grid-cols-10 gap-3 sm:gap-4 relative z-10 items-stretch">
                  
                  {/* Left 30% Portion: Progress Card (Light Indigo Tint) */}
                  <div className="col-span-3 bg-indigo-50/70 border border-indigo-100/90 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-[10px] sm:text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Progress
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200/80">
                        {challengeStats.percentage}%
                      </span>
                    </div>

                    <div className="my-auto space-y-1">
                      <p className="text-[8px] sm:text-[9px] font-black text-indigo-600/80 uppercase tracking-widest">Completed</p>
                      <h4 className="text-base sm:text-2xl font-black text-indigo-950 tracking-tight flex items-baseline gap-1">
                        {challengeStats.completedDaysCount} <span className="text-[10px] sm:text-xs text-indigo-500 font-bold">/ 150</span>
                      </h4>
                      {/* Compact progress bar */}
                      <div className="w-full bg-indigo-200/70 rounded-full h-1.5 sm:h-2 overflow-hidden border border-indigo-200/50 mt-1">
                        <div 
                          className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 h-full rounded-full transition-all duration-700 ease-out shadow-xs"
                          style={{ width: `${Math.min(100, Math.max(0, (challengeStats.completedDaysCount / 150) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right 70% Portion: Top 5 Leaderboard Card (Light Slate/Amber Tint) */}
                  <div className="col-span-7 bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between space-y-1.5 min-w-0 shadow-2xs">
                    {(() => {
                      const currentUserRankItem = challengeLeaderboard.find((r: any) => r.isCurrentUser);
                      const myRankNum = currentUserRankItem?.rank || null;
                      const myScoreVal = currentUserRankItem ? currentUserRankItem.score : 0;
                      const totalCount = challengeTotalStudents || totalStudentsCount || challengeLeaderboard.length;

                      const rankPadded = myRankNum ? (myRankNum < 10 ? `0${myRankNum}` : `${myRankNum}`) : null;
                      const totalPadded = totalCount ? (totalCount < 10 ? `0${totalCount}` : `${totalCount}`) : null;
                      const formattedYourRank = rankPadded && totalPadded ? `${rankPadded}/${totalPadded}` : (rankPadded ? `#${rankPadded}` : 'Not Ranked');

                      return (
                        <>
                          <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 flex-wrap gap-1">
                            <span className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
                              🏆 Top 5 Leaders
                            </span>
                            {!challengeLeaderboardLoading && (
                              <span className="text-[9px] sm:text-[10px] font-black text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300/80 shrink-0 flex items-center gap-1 shadow-2xs">
                                <span>Your Rank:</span>
                                <span className="text-amber-700 font-black">
                                  {formattedYourRank} ({typeof myScoreVal === 'number' ? myScoreVal.toFixed(1) : myScoreVal} pts)
                                </span>
                              </span>
                            )}
                          </div>

                          {challengeLeaderboardLoading ? (
                            <div className="flex flex-col items-center justify-center py-4 space-y-1">
                              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                              <span className="text-[10px] text-slate-500 font-medium">Loading Leaders...</span>
                            </div>
                          ) : challengeLeaderboard.length === 0 ? (
                            <div className="text-center py-4 text-[10px] text-slate-500 font-medium">
                              No scores recorded yet.
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {challengeLeaderboard.slice(0, 5).map((r: any) => (
                                <div 
                                  key={r.userId} 
                                  className={`flex items-center justify-between px-2 py-1 rounded-lg transition-all text-[10px] sm:text-xs border ${
                                    r.isCurrentUser 
                                      ? 'bg-indigo-100/80 border-indigo-300 shadow-2xs' 
                                      : r.rank === 1
                                      ? 'bg-amber-50/90 border-amber-200/90'
                                      : 'bg-white border-slate-200/70 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                                    <span className="text-[9px] sm:text-[10px] font-extrabold shrink-0 text-center flex items-center gap-1">
                                      {r.rank === 1 ? '🥇 01' : r.rank === 2 ? '🥈 02' : r.rank === 3 ? '🥉 03' : (r.rank < 10 ? `0${r.rank}` : `${r.rank}`)}
                                    </span>
                                    <span className={`font-extrabold truncate ${r.isCurrentUser ? 'text-indigo-950' : 'text-slate-900'}`}>
                                      {r.name} {r.isCurrentUser && <span className="text-[8px] text-indigo-600 font-black ml-0.5">(You)</span>}
                                    </span>
                                  </div>
                                  <span className="font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md shrink-0 tabular-nums">
                                    {r.score.toFixed(1)} pts
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                </div>
              </div>

              {/* Day Selection Grid */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-indigo-600 rounded-full"></div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      Daily Mock Schedule
                    </h3>
                  </div>
                  <div className="flex items-center gap-2.5 text-[9px] sm:text-[10px] font-bold text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs"></span> Completed</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs"></span> In Progress</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600 shadow-xs"></span> Available</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Locked</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 sm:gap-2">
                  {Array.from({ length: 150 }, (_, i) => {
                    const dayNum = i + 1;
                    const tests = challengeDaysMap[dayNum] || [];
                    const totalMocks = tests.length;
                    const attemptedMocks = tests.filter(t => pastResults.some(r => r.testId === t.id)).length;
                    
                    const hasMocks = totalMocks > 0;
                    const isFullyCompleted = hasMocks && attemptedMocks === totalMocks;
                    const isInProgress = hasMocks && attemptedMocks > 0 && attemptedMocks < totalMocks;
                    const isAvailable = hasMocks && attemptedMocks === 0;
                    const isLocked = !hasMocks;

                    let cardClass = "";
                    let innerContent = null;

                    if (isFullyCompleted) {
                      cardClass = "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs border border-emerald-400/30 hover:shadow-emerald-200/50 hover:-translate-y-0.5 active:scale-95";
                      innerContent = (
                        <div className="flex flex-col items-center justify-center h-full py-1">
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-100 leading-none">Day</span>
                          <span className="text-xs sm:text-sm font-black tracking-tight my-0.5">{String(dayNum).padStart(2, '0')}</span>
                          <CheckCircle className="w-3 h-3 text-emerald-100 shrink-0" />
                        </div>
                      );
                    } else if (isInProgress) {
                      cardClass = "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs border border-amber-400/30 hover:shadow-amber-200/50 hover:-translate-y-0.5 active:scale-95";
                      innerContent = (
                        <div className="flex flex-col items-center justify-center h-full py-1">
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-amber-100 leading-none">Day</span>
                          <span className="text-xs sm:text-sm font-black tracking-tight my-0.5">{String(dayNum).padStart(2, '0')}</span>
                          <span className="text-[8px] font-extrabold bg-white/20 px-1 py-0.2 rounded leading-none">{attemptedMocks}/{totalMocks}</span>
                        </div>
                      );
                    } else if (isAvailable) {
                      cardClass = "bg-white text-slate-800 border border-slate-200/80 hover:border-indigo-500 hover:text-indigo-600 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-95";
                      innerContent = (
                        <div className="flex flex-col items-center justify-center h-full py-1">
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 leading-none">Day</span>
                          <span className="text-xs sm:text-sm font-black tracking-tight my-0.5">{String(dayNum).padStart(2, '0')}</span>
                          <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded leading-none">{totalMocks} {totalMocks === 1 ? 'Mock' : 'Mocks'}</span>
                        </div>
                      );
                    } else {
                      // Locked (no mocks)
                      cardClass = "bg-slate-100/60 text-slate-400 border border-slate-200/50 cursor-not-allowed opacity-70";
                      innerContent = (
                        <div className="flex flex-col items-center justify-center h-full py-1">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 leading-none">Day</span>
                          <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-400 my-0.5">{String(dayNum).padStart(2, '0')}</span>
                          <Clock className="w-2.5 h-2.5 text-slate-300 shrink-0" />
                        </div>
                      );
                    }

                    return (
                      <button
                        key={dayNum}
                        disabled={isLocked}
                        onClick={() => {
                          setSelectedChallengeDay(dayNum);
                          setShowChallengeModal(true);
                        }}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 text-center transition-all duration-150 cursor-pointer ${cardClass}`}
                      >
                        {innerContent}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day Modal Overlay */}
              {showChallengeModal && selectedChallengeDay !== null && (() => {
                const dayNum = selectedChallengeDay;
                const tests = challengeDaysMap[dayNum] || [];
                return (
                  <>
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => setShowChallengeModal(false)}></div>
                    <div className="fixed inset-x-3 bottom-3 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:w-full z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
                      
                      {/* Modal Header */}
                      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                            <Calendar className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest block leading-none">Daily Challenge</span>
                            <h3 className="text-sm sm:text-base font-black mt-0.5">Day {String(dayNum).padStart(2, '0')} Practice Sets</h3>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowChallengeModal(false)}
                          className="w-7 h-7 rounded-full bg-white/10 border border-white/5 flex items-center justify-center hover:bg-white/20 transition-all text-white active:scale-95 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Modal Body */}
                      <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1">
                        {tests.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 font-medium text-xs">
                            No mocks uploaded for this day yet.
                          </div>
                        ) : (
                          tests.map((test, index) => {
                            const attempts = pastResults.filter(r => r.testId === test.id);
                            const attempted = attempts.length > 0;
                            const latestAttempt = attempted ? attempts[attempts.length - 1] : null;
                            const subjectColorPills: Record<string, string> = {
                              Math: 'bg-blue-50 text-blue-700 border-blue-100',
                              GK: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                              English: 'bg-purple-50 text-purple-700 border-purple-100',
                              Reasoning: 'bg-amber-50 text-amber-700 border-amber-100',
                              Science: 'bg-rose-50 text-rose-700 border-rose-100',
                              Computer: 'bg-cyan-50 text-cyan-700 border-cyan-100'
                            };
                            const pillStyle = subjectColorPills[test.subjectName] || 'bg-slate-50 text-slate-700 border-slate-100';

                            return (
                              <div key={test.id} className="bg-slate-50/70 border border-slate-200/70 rounded-xl hover:border-indigo-200 hover:bg-white hover:shadow-2xs transition-all duration-150 p-2.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  
                                  {/* Left Content */}
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <div className="w-6 h-6 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md flex items-center justify-center shrink-0 font-black text-[10px]">
                                      {index + 1}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-[180px] sm:max-w-[240px]">{test.title}</h4>
                                        {test.subjectName && (
                                          <span className={`px-1.5 py-0.2 text-[8px] font-extrabold uppercase border rounded ${pillStyle}`}>
                                            {test.subjectName}
                                          </span>
                                        )}
                                        {attempted && (
                                          <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-full shrink-0 flex items-center gap-0.5">
                                            ✓ Done {attempts.length > 1 ? `×${attempts.length}` : ''}
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[9px] font-bold text-slate-400">
                                        <span>⏱️ {test.duration || 30}m</span>
                                        <span>•</span>
                                        <span>🎯 {test.marksPerCorrect || 1} M/Q</span>
                                        {attempted && latestAttempt && (
                                          <>
                                            <span>•</span>
                                            <span className="text-indigo-600 font-extrabold">
                                              Best: {Math.max(...attempts.map(r => r.score || 0))} pts
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right Actions */}
                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap justify-end">
                                    {attempted && (
                                      <>
                                        {/* Download PDF button */}
                                        <button
                                          onClick={() => handleDownloadPDF(test.id, test.title, test.category || 'N/A', test.testType || 'N/A')}
                                          disabled={downloadingPDF === test.id}
                                          className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-lg transition-all disabled:opacity-50"
                                          title="Download PDF"
                                        >
                                          <Download className="w-3 h-3" />
                                        </button>

                                        {/* Attempts list */}
                                        <div className="relative">
                                          <button
                                            onClick={() => setOpenAttemptDropdown(openAttemptDropdown === test.id ? null : test.id)}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg font-extrabold text-[8px] uppercase tracking-wider border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all active:scale-95"
                                          >
                                            <BarChart3 className="w-2.5 h-2.5" />
                                            Attempts
                                            <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${openAttemptDropdown === test.id ? 'rotate-180' : ''}`} />
                                          </button>

                                          {openAttemptDropdown === test.id && (
                                            <>
                                              <div className="fixed inset-0 z-40" onClick={() => setOpenAttemptDropdown(null)} />
                                              <div className="absolute right-0 bottom-full mb-1 sm:top-full sm:bottom-auto sm:mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[220px] overflow-hidden">
                                                <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1">
                                                  <BarChart3 className="w-2.5 h-2.5 text-indigo-500" />
                                                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Select attempt</p>
                                                </div>
                                                <div className="py-0.5 max-h-[160px] overflow-y-auto">
                                                  {attempts.map((r: any, i: number) => (
                                                    <button
                                                      key={r.id}
                                                      onClick={() => { openAnalysis(r); setOpenAttemptDropdown(null); setShowChallengeModal(false); }}
                                                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left text-[9px]"
                                                    >
                                                      <span className="font-extrabold text-slate-700">Attempt {i + 1}</span>
                                                      <span className="font-black text-indigo-600">{r.score} marks</span>
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </>
                                    )}

                                    <Link
                                      to={`/test/${test.id}`}
                                      className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black text-[8px] uppercase tracking-wider rounded-lg hover:from-slate-900 hover:to-slate-900 transition-all shadow-2xs flex items-center gap-0.5 active:scale-95 shrink-0"
                                    >
                                      {attempted ? 'Reattempt' : 'Attempt'}
                                      <ChevronRight className="w-2.5 h-2.5" />
                                    </Link>
                                  </div>

                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {activeTab === 'one_liner' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Unified Learn Sub-Section Toggle Bar */}
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('notes')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Ebooks & Notes
                </button>
                <button
                  onClick={() => setActiveTab('one_liner')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-white text-indigo-700 shadow-xs border border-slate-200"
                >
                  <Bookmark className="w-3.5 h-3.5 text-indigo-600" /> 📌 One Liner Notes
                </button>
                <button
                  onClick={() => setActiveTab('pyq')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" /> 📄 Previous Year Q. (PYQ)
                </button>
                <button
                  onClick={() => setActiveTab('pattern')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <Trophy className="w-3.5 h-3.5 text-blue-600" /> 📋 Exam Pattern & Syllabus
                </button>
                <button
                  onClick={() => setActiveTab('practice')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <Target className="w-3.5 h-3.5 text-teal-600" /> 🎯 Practice Sets
                </button>
              </div>

              {/* Banner Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-1 relative z-10">
                  <span className="bg-white/20 text-white font-black uppercase text-[10px] px-3 py-1 rounded-full tracking-widest border border-white/20 inline-block">
                    Quick Revision
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <Bookmark className="w-6 h-6 text-amber-300 shrink-0" /> One Liner Study Notes
                  </h2>
                  <p className="text-xs sm:text-sm text-violet-100 font-medium leading-relaxed max-w-xl">
                    High-yield One Liners in Text, Image, and PDF formats posted directly by teachers for fast exam preparation.
                  </p>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search One Liners by topic..."
                    value={oneLinerSearch}
                    onChange={e => setOneLinerSearch(e.target.value)}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {(() => {
                    const defaultSubs = ['ALL', 'General Knowledge', 'History', 'Geography', 'Science', 'English', 'Mathematics', 'Reasoning', 'Computer', 'Polity', 'Current Affairs'];
                    const fetchedSubs = Array.from(new Set(oneLiners.map(item => item.subject).filter(Boolean)));
                    const allSubjectOptions = Array.from(new Set([...defaultSubs, ...fetchedSubs]));

                    return allSubjectOptions.map(sub => (
                      <button
                        key={sub}
                        onClick={() => setOneLinerSubjectFilter(sub)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                          oneLinerSubjectFilter === sub
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {sub}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* List of One Liners */}
              {oneLinersLoading ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Loading One Liners...</span>
                </div>
              ) : (() => {
                const filtered = oneLiners.filter(item => {
                  const matchesSearch = 
                    (item.title || '').toLowerCase().includes(oneLinerSearch.toLowerCase()) ||
                    (item.content || '').toLowerCase().includes(oneLinerSearch.toLowerCase());
                  const itemSub = (item.subject || '').trim().toLowerCase();
                  const filterSub = oneLinerSubjectFilter.trim().toLowerCase();
                  const matchesSub = filterSub === 'all' || 
                    itemSub === filterSub ||
                    itemSub.includes(filterSub) ||
                    filterSub.includes(itemSub);
                  return matchesSearch && matchesSub;
                });

                if (filtered.length === 0) {
                  return (
                    <ComingSoonBox categoryName={oneLinerSubjectFilter !== 'ALL' ? oneLinerSubjectFilter : 'One Liners'} />
                  );
                }

                return (
                  <div className="space-y-3">
                    {filtered.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => handleOpenOneLiner(item)}
                        className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 p-4 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
                            {item.pdfUrl ? (
                              <FileText className="w-5 h-5 text-rose-600" />
                            ) : item.imageUrl ? (
                              <ImgIcon className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Bookmark className="w-5 h-5 text-indigo-600" />
                            )}
                          </div>
                          
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-black uppercase rounded-lg">
                                {item.subject}
                              </span>
                              {item.pinned && (
                                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                                  📌 Pinned
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-extrabold rounded-md flex items-center gap-1">
                                <Eye className="w-3 h-3 text-indigo-600" /> {item.readCount || 0} Reads
                              </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug truncate sm:whitespace-normal">
                              {item.title}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <button 
                            onClick={(e) => handleShareOneLiner(e, item)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200/80"
                            title="Share One-Liner Link"
                          >
                            {copiedShareId === item.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5 text-indigo-600" /> Share
                              </>
                            )}
                          </button>

                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenOneLiner(item); }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" /> Read One-Liner →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Full One-Liner Reader Modal */}
              {activeOneLinerModal && (
                <div 
                  className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                  onClick={() => setActiveOneLinerModal(null)}
                >
                  <div 
                    className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 p-5 text-white flex items-center justify-between gap-3 shrink-0">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-white/20">
                            {activeOneLinerModal.subject}
                          </span>
                          {activeOneLinerModal.pinned && (
                            <span className="bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                              📌 Pinned
                            </span>
                          )}
                          <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Eye className="w-3 h-3 text-amber-300" /> {activeOneLinerModal.readCount || 1} Reads
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-black tracking-tight leading-snug line-clamp-2">
                          {activeOneLinerModal.title}
                        </h2>
                      </div>
                      <button
                        onClick={() => setActiveOneLinerModal(null)}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer shrink-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Scrollable Content Body */}
                    <div className="p-6 space-y-5 overflow-y-auto flex-1">
                      {activeOneLinerModal.content && (
                        <div className="space-y-1.5">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">One-Liner Notes</h4>
                          <div className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                            <RenderQuestionHTML html={activeOneLinerModal.content} />
                          </div>
                        </div>
                      )}

                      {activeOneLinerModal.imageUrl && (
                        <div className="space-y-1.5">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Image Attachment</h4>
                          <div 
                            onClick={() => setSelectedPreviewImage(activeOneLinerModal.imageUrl)}
                            className="relative rounded-2xl border border-slate-200 overflow-hidden cursor-pointer group max-h-80 bg-slate-100"
                          >
                            <img 
                              src={activeOneLinerModal.imageUrl} 
                              alt={activeOneLinerModal.title} 
                              className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300" 
                            />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                              <Eye className="w-4 h-4" /> Click to enlarge image
                            </div>
                          </div>
                          {activeOneLinerModal.imageCaption && (
                            <p className="text-xs text-slate-500 font-medium italic">{activeOneLinerModal.imageCaption}</p>
                          )}
                        </div>
                      )}

                      {activeOneLinerModal.pdfUrl && (
                        <div className="space-y-1.5">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">PDF Document Attachment</h4>
                          <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                PDF
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate">
                                  {activeOneLinerModal.pdfTitle || 'PDF Document'}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium">Click download to view complete document</p>
                              </div>
                            </div>
                            <a
                              href={activeOneLinerModal.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" /> Download PDF
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer with Share Options */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Share:</span>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`📌 *${activeOneLinerModal.title}*\n\nRead high-yield One-Liner Notes on Master Aptitude:\n${window.location.origin}/dashboard?tab=one_liner&id=${activeOneLinerModal.id}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                        >
                          💬 WhatsApp
                        </a>
                        <a
                          href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/dashboard?tab=one_liner&id=${activeOneLinerModal.id}`)}&text=${encodeURIComponent(`📌 ${activeOneLinerModal.title}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                        >
                          ✈️ Telegram
                        </a>
                        <button
                          onClick={(e) => handleShareOneLiner(e, activeOneLinerModal)}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-indigo-600" /> {copiedShareId === activeOneLinerModal.id ? 'Link Copied!' : 'Copy Link'}
                        </button>
                      </div>

                      <button
                        onClick={() => setActiveOneLinerModal(null)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Preview Lightbox Modal */}
              {selectedPreviewImage && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPreviewImage(null)}>
                  <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedPreviewImage(null)}
                      className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition-all cursor-pointer z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <img src={selectedPreviewImage} alt="Preview" className="w-full h-full max-h-[85vh] object-contain rounded-xl" />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Unified Learn Sub-Section Toggle Bar */}
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('notes')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-white text-emerald-700 shadow-xs border border-slate-200"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Ebooks & Notes
                </button>
                <button
                  onClick={() => setActiveTab('one_liner')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <Bookmark className="w-3.5 h-3.5 text-indigo-600" /> 📌 One Liner Notes
                </button>
                <button
                  onClick={() => setActiveTab('pyq')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" /> 📄 Previous Year Q. (PYQ)
                </button>
                <button
                  onClick={() => setActiveTab('pattern')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <Trophy className="w-3.5 h-3.5 text-blue-600" /> 📋 Exam Pattern & Syllabus
                </button>
                <button
                  onClick={() => setActiveTab('practice')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <Target className="w-3.5 h-3.5 text-teal-600" /> 🎯 Practice Sets
                </button>
              </div>

              {/* Banner Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
                <div className="space-y-1 relative z-10">
                  <span className="bg-white/20 text-white font-black uppercase text-[10px] px-3 py-1 rounded-full tracking-widest border border-white/20 inline-block">
                    Ebooks & Study Notes
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-amber-200 shrink-0" /> Ebooks & Comprehensive Study Materials
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed max-w-xl">
                    High-yield Ebooks, formula handbooks, and topic-wise study notes prepared for competitive exams.
                  </p>
                </div>
              </div>

              {/* Search & Subject Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Ebooks or Study Notes..."
                    value={notesSearch}
                    onChange={e => setNotesSearch(e.target.value)}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {['ALL', 'Mathematics', 'General Knowledge', 'History', 'Geography', 'Science', 'English Language', 'Reasoning', 'Computer Knowledge', 'Polity'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNotesSubjectFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                        notesSubjectFilter === cat
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ebooks Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {notes
                  .filter(p => p.status !== 'draft')
                  .filter(p => {
                    const matchesSearch = 
                      (p.title || '').toLowerCase().includes(notesSearch.toLowerCase()) ||
                      (p.content || p.description || '').toLowerCase().includes(notesSearch.toLowerCase()) ||
                      (p.subject || '').toLowerCase().includes(notesSearch.toLowerCase());
                    const matchesSub = notesSubjectFilter === 'ALL' || (p.subject || '').includes(notesSubjectFilter);
                    return matchesSearch && matchesSub;
                  })
                  .map(note => {
                    const titleText = note.title || 'Ebook Study Note';
                    const subjectText = note.subject || 'General';
                    const pdfLink = note.pdfUrl || note.link;
                    const coverImage = note.imageUrl || note.thumbnailUrl;
                    const contentText = note.content || note.description;

                    return (
                      <div key={note.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs relative group hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase rounded-lg">
                              {subjectText}
                            </span>
                            {(note.pinned || note.pinToHomepage) && (
                              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                                📌 Pinned
                              </span>
                            )}
                          </div>

                          <h4 className="font-black text-slate-900 text-base leading-snug tracking-tight">{titleText}</h4>

                          {contentText && (
                            <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                              {contentText}
                            </p>
                          )}

                          {coverImage && (
                            <div 
                              onClick={() => setSelectedPreviewImage(coverImage)}
                              className="relative rounded-xl border border-slate-200 overflow-hidden cursor-pointer group max-h-48 bg-slate-100"
                            >
                              <img src={coverImage} alt={titleText} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                <Eye className="w-4 h-4" /> View full image
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          {pdfLink ? (
                            <a 
                              href={pdfLink} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-between w-full text-rose-700 font-bold text-xs uppercase tracking-wider bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl hover:bg-rose-100 transition-all"
                            >
                              <span className="truncate flex items-center gap-2">
                                📄 {note.pdfTitle || 'Download Ebook PDF'}
                              </span>
                              <Download className="w-4 h-4 shrink-0" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                {notes.filter(p => p.status !== 'draft').filter(p => notesSubjectFilter === 'ALL' || (p.subject || '').includes(notesSubjectFilter)).length === 0 && (
                  <ComingSoonBox categoryName={notesSubjectFilter !== 'ALL' ? notesSubjectFilter : 'Ebooks & Study Notes'} />
                )}
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-8 animate-in fade-in duration-150">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Video Lectures
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map(video => (
                   <div key={video.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs relative group hover:shadow-lg transition-all overflow-hidden flex flex-col">
                      <div className="aspect-video bg-slate-900 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-700 bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center">
                         <div className="absolute inset-0 bg-slate-900/60 transition-opacity group-hover:bg-slate-900/40"></div>
                         <button onClick={() => setSelectedVideo(video)} className="w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center relative z-10 hover:bg-rose-600 transition-all group-hover:scale-110 border border-white/30 cursor-pointer">
                            <Play className="w-5 h-5 fill-current ml-1" />
                         </button>
                      </div>
                      <div className="p-6">
                         <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            {video.subject}
                         </p>
                         <h4 className="font-bold text-slate-800 text-lg mb-4 line-clamp-2">{video.title}</h4>
                         <button 
                          onClick={() => setSelectedVideo(video)}
                          className="flex items-center justify-center gap-3 w-full border border-rose-200 text-rose-600 font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                        >
                          Watch Lecture
                        </button>
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
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Unified Learn Sub-Section Toggle Bar */}
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('notes')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Ebooks & Notes
                </button>
                <button
                  onClick={() => setActiveTab('one_liner')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <Bookmark className="w-3.5 h-3.5 text-indigo-600" /> 📌 One Liner Notes
                </button>
                <button
                  onClick={() => setActiveTab('pyq')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-white text-rose-700 shadow-xs border border-slate-200"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" /> 📄 Previous Year Q. (PYQ)
                </button>
                <button
                  onClick={() => setActiveTab('pattern')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <Trophy className="w-3.5 h-3.5 text-blue-600" /> 📋 Exam Pattern & Syllabus
                </button>
                <button
                  onClick={() => setActiveTab('practice')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <Target className="w-3.5 h-3.5 text-teal-600" /> 🎯 Practice Sets
                </button>
              </div>
              {/* Banner Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
                <div className="space-y-1 relative z-10">
                  <span className="bg-white/20 text-white font-black uppercase text-[10px] px-3 py-1 rounded-full tracking-widest border border-white/20 inline-block">
                    Archive & Practice
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <History className="w-6 h-6 text-amber-200 shrink-0" /> Previous Year Question Papers (PYQs)
                  </h2>
                  <p className="text-xs sm:text-sm text-amber-100 font-medium leading-relaxed max-w-xl">
                    Download authentic Previous Year Question Papers, memory-based questions, and key solutions.
                  </p>
                </div>
              </div>

              {/* Search & Subject Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Previous Year Papers..."
                    value={pyqSearch}
                    onChange={e => setPyqSearch(e.target.value)}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-600 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {['ALL', 'Full Question Paper', 'Mathematics', 'Reasoning', 'General Knowledge', 'English Language', 'Computer Knowledge', 'SSC Exams', 'Railway Exams', 'Banking Exams'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setPyqSubjectFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                        pyqSubjectFilter === cat
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* PYQs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {pyqs
                  .filter(p => p.status !== 'draft')
                  .filter(p => {
                    const matchesSearch = 
                      (p.title || p.pyqTitle || '').toLowerCase().includes(pyqSearch.toLowerCase()) ||
                      (p.content || '').toLowerCase().includes(pyqSearch.toLowerCase()) ||
                      (p.subject || p.pyqSubject || '').toLowerCase().includes(pyqSearch.toLowerCase());
                    const matchesSub = pyqSubjectFilter === 'ALL' || (p.subject || p.pyqSubject || '').includes(pyqSubjectFilter);
                    return matchesSearch && matchesSub;
                  })
                  .map(pyq => {
                    const titleText = pyq.title || pyq.pyqTitle || 'Previous Year Paper';
                    const subjectText = pyq.subject || pyq.pyqSubject || 'General';
                    const pdfLink = pyq.pdfUrl || pyq.fileUrl || pyq.link;

                    return (
                      <div key={pyq.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs relative group hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black uppercase rounded-lg">
                              {subjectText}
                            </span>
                            {pyq.pinned && (
                              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                                📌 Pinned
                              </span>
                            )}
                          </div>

                          <h4 className="font-black text-slate-900 text-base leading-snug tracking-tight">{titleText}</h4>

                          {pyq.content && (
                            <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                              {pyq.content}
                            </p>
                          )}

                          {pyq.imageUrl && (
                            <div 
                              onClick={() => setSelectedPreviewImage(pyq.imageUrl)}
                              className="relative rounded-xl border border-slate-200 overflow-hidden cursor-pointer group max-h-48 bg-slate-100"
                            >
                              <img src={pyq.imageUrl} alt={titleText} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                <Eye className="w-4 h-4" /> View full image
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          {pdfLink ? (
                            <a 
                              href={pdfLink} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-between w-full text-rose-700 font-bold text-xs uppercase tracking-wider bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl hover:bg-rose-100 transition-all"
                            >
                              <span className="truncate flex items-center gap-2">
                                📄 {pyq.pdfTitle || 'Download Question Paper PDF'}
                              </span>
                              <Download className="w-4 h-4 shrink-0" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                {pyqs.filter(p => p.status !== 'draft').filter(p => pyqSubjectFilter === 'ALL' || (p.subject || p.pyqSubject || '').includes(pyqSubjectFilter)).length === 0 && (
                  <ComingSoonBox categoryName={pyqSubjectFilter !== 'ALL' ? pyqSubjectFilter : 'Previous Year Question Papers'} />
                )}
              </div>
            </div>
          )}

          {activeTab === 'pattern' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Unified Learn Sub-Section Toggle Bar */}
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('notes')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Ebooks & Notes
                </button>
                <button
                  onClick={() => setActiveTab('one_liner')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <Bookmark className="w-3.5 h-3.5 text-indigo-600" /> 📌 One Liner Notes
                </button>
                <button
                  onClick={() => setActiveTab('pyq')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" /> 📄 Previous Year Q. (PYQ)
                </button>
                <button
                  onClick={() => setActiveTab('pattern')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-white text-blue-700 shadow-xs border border-slate-200"
                >
                  <Trophy className="w-3.5 h-3.5 text-blue-600" /> 📋 Exam Pattern & Syllabus
                </button>
                <button
                  onClick={() => setActiveTab('practice')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <Target className="w-3.5 h-3.5 text-teal-600" /> 🎯 Practice Sets
                </button>
              </div>
              {/* Banner Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
                <div className="space-y-1 relative z-10">
                  <span className="bg-white/20 text-white font-black uppercase text-[10px] px-3 py-1 rounded-full tracking-widest border border-white/20 inline-block">
                    Official Guidelines
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-amber-300 shrink-0" /> Exam Pattern & Syllabus
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed max-w-xl">
                    Official Exam Patterns, Marking Schemes, Sectional Cut-offs, and detailed Syllabus PDFs.
                  </p>
                </div>
              </div>

              {/* Search & Category Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Exam Pattern or Syllabus..."
                    value={oneLinerSearch}
                    onChange={e => setOneLinerSearch(e.target.value)}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-600 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {['ALL', 'SSC', 'Railway', 'Banking', 'Defence', 'Police & State Exams', 'Teaching', 'General'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setOneLinerSubjectFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                        oneLinerSubjectFilter === cat
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Patterns Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {patterns
                  .filter(p => p.status !== 'draft')
                  .filter(p => {
                    const matchesSearch = 
                      (p.title || '').toLowerCase().includes(oneLinerSearch.toLowerCase()) ||
                      (p.content || '').toLowerCase().includes(oneLinerSearch.toLowerCase()) ||
                      (p.examCategory || '').toLowerCase().includes(oneLinerSearch.toLowerCase());
                    const matchesCat = oneLinerSubjectFilter === 'ALL' || (p.examCategory || '').includes(oneLinerSubjectFilter);
                    return matchesSearch && matchesCat;
                  })
                  .map(pattern => (
                    <div key={pattern.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs relative group hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black uppercase rounded-lg">
                            {pattern.examCategory || 'Exam Pattern'}
                          </span>
                          {pattern.pinned && (
                            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                              📌 Pinned
                            </span>
                          )}
                        </div>

                        <h4 className="font-black text-slate-900 text-base leading-snug tracking-tight">{pattern.title}</h4>

                        {pattern.content && (
                          <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                            {pattern.content}
                          </p>
                        )}

                        {pattern.imageUrl && (
                          <div 
                            onClick={() => setSelectedPreviewImage(pattern.imageUrl)}
                            className="relative rounded-xl border border-slate-200 overflow-hidden cursor-pointer group max-h-48 bg-slate-100"
                          >
                            <img src={pattern.imageUrl} alt={pattern.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <Eye className="w-4 h-4" /> View full image
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-3 border-t border-slate-100">
                        {pattern.pdfUrl ? (
                          <a 
                            href={pattern.pdfUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-between w-full text-rose-700 font-bold text-xs uppercase tracking-wider bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl hover:bg-rose-100 transition-all"
                          >
                            <span className="truncate flex items-center gap-2">
                              📄 {pattern.pdfTitle || 'Download Syllabus PDF'}
                            </span>
                            <Download className="w-4 h-4 shrink-0" />
                          </a>
                        ) : pattern.files ? pattern.files.map((file: any, idx: number) => (
                          <a 
                            key={idx}
                            href={file.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-between w-full text-blue-600 font-bold text-[10px] uppercase tracking-wider bg-blue-50 px-4 py-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                          >
                            {file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )) : pattern.link ? (
                          <a 
                            href={pattern.link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-between w-full text-blue-600 font-bold text-xs uppercase tracking-wider bg-blue-50 px-4 py-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                          >
                            Open Syllabus
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}

                {patterns.filter(p => p.status !== 'draft').filter(p => oneLinerSubjectFilter === 'ALL' || (p.examCategory || '').includes(oneLinerSubjectFilter)).length === 0 && (
                  <ComingSoonBox categoryName={oneLinerSubjectFilter !== 'ALL' ? oneLinerSubjectFilter : 'Exam Pattern & Syllabus'} />
                )}
              </div>
            </div>
          )}

          {activeTab === 'affairs' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Banner Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
                <div className="space-y-1 relative z-10">
                  <span className="bg-white/20 text-white font-black uppercase text-[10px] px-3 py-1 rounded-full tracking-widest border border-white/20 inline-block">
                    Daily & Monthly Updates
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <Newspaper className="w-6 h-6 text-amber-200 shrink-0" /> Current Affairs & General Awareness
                  </h2>
                  <p className="text-xs sm:text-sm text-orange-100 font-medium leading-relaxed max-w-xl">
                    Stay updated with daily national & international news highlights, sports events, awards, and monthly PDF capsules.
                  </p>
                </div>
              </div>

              {/* Search & Topic Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Current Affairs by news headline or topic..."
                    value={oneLinerSearch}
                    onChange={e => setOneLinerSearch(e.target.value)}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:border-orange-600 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {['ALL', 'National News', 'International News', 'Important Days', 'Sports News', 'Science & Technology', 'Economy & Banking', 'Awards & Honours'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setOneLinerSubjectFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                        oneLinerSubjectFilter === cat
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Affairs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {affairs
                  .filter(p => p.status !== 'draft')
                  .filter(p => {
                    const matchesSearch = 
                      (p.title || '').toLowerCase().includes(oneLinerSearch.toLowerCase()) ||
                      (p.content || p.description || '').toLowerCase().includes(oneLinerSearch.toLowerCase()) ||
                      (p.subject || p.category || '').toLowerCase().includes(oneLinerSearch.toLowerCase());
                    const matchesSub = oneLinerSubjectFilter === 'ALL' || (p.subject || p.category || '').includes(oneLinerSubjectFilter);
                    return matchesSearch && matchesSub;
                  })
                  .map(affair => {
                    const titleText = affair.title || 'Current Affair Update';
                    const subjectText = affair.subject || affair.category || 'General';
                    const pdfLink = affair.pdfUrl || affair.link;
                    const coverImage = affair.imageUrl || affair.thumbnailUrl;
                    const contentText = affair.content || affair.description;

                    return (
                      <div key={affair.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs relative group hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-100 text-[10px] font-black uppercase rounded-lg">
                              {subjectText}
                            </span>
                            {(affair.pinned || affair.pinToHomepage) && (
                              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                                📌 Pinned
                              </span>
                            )}
                          </div>

                          <h4 className="font-black text-slate-900 text-base leading-snug tracking-tight">{titleText}</h4>

                          {contentText && (
                            <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                              {contentText}
                            </p>
                          )}

                          {coverImage && (
                            <div 
                              onClick={() => setSelectedPreviewImage(coverImage)}
                              className="relative rounded-xl border border-slate-200 overflow-hidden cursor-pointer group max-h-48 bg-slate-100"
                            >
                              <img src={coverImage} alt={titleText} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                <Eye className="w-4 h-4" /> View full image
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          {pdfLink ? (
                            <a 
                              href={pdfLink} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-between w-full text-rose-700 font-bold text-xs uppercase tracking-wider bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl hover:bg-rose-100 transition-all"
                            >
                              <span className="truncate flex items-center gap-2">
                                📄 {affair.pdfTitle || 'Download Monthly Capsule PDF'}
                              </span>
                              <Download className="w-4 h-4 shrink-0" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                {affairs.filter(p => p.status !== 'draft').filter(p => oneLinerSubjectFilter === 'ALL' || (p.subject || p.category || '').includes(oneLinerSubjectFilter)).length === 0 && (
                  <ComingSoonBox categoryName={oneLinerSubjectFilter !== 'ALL' ? oneLinerSubjectFilter : 'Current Affairs'} />
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Premium Internal Video Player Modal */}
      {selectedVideo && (() => {
        const getYouTubeId = (url: string) => {
          const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
          const match = url.match(regExp);
          return (match && match[2].length === 11) ? match[2] : null;
        };

        const ytId = getYouTubeId(selectedVideo.link);
        const isYouTube = !!ytId;

        // Custom HTML5 Video Player hook and states
        const videoRef = React.useRef<HTMLVideoElement | null>(null);
        const [isPlaying, setIsPlaying] = React.useState(false);
        const [currentTime, setCurrentTime] = React.useState(0);
        const [duration, setDuration] = React.useState(0);
        const [volume, setVolume] = React.useState(1);
        const [isMuted, setIsMuted] = React.useState(false);
        const [playbackSpeed, setPlaybackSpeed] = React.useState(1);

        // Load progress & Notes
        React.useEffect(() => {
          const savedNotes = localStorage.getItem(`video_notes_${user?.uid}_${selectedVideo.id}`) || '';
          setVideoNotes(savedNotes);

          if (!isYouTube) {
            const savedTime = localStorage.getItem(`video_time_${user?.uid}_${selectedVideo.id}`);
            if (savedTime && videoRef.current) {
              const parsedTime = parseFloat(savedTime);
              videoRef.current.currentTime = parsedTime;
              setCurrentTime(parsedTime);
            }
          }
        }, [selectedVideo.id, isYouTube]);

        // Auto Save Notes
        const handleNotesChange = (txt: string) => {
          setVideoNotes(txt);
          localStorage.setItem(`video_notes_${user?.uid}_${selectedVideo.id}`, txt);
        };

        // Time Updates
        const handleTimeUpdate = () => {
          if (videoRef.current) {
            const cur = videoRef.current.currentTime;
            setCurrentTime(cur);
            localStorage.setItem(`video_time_${user?.uid}_${selectedVideo.id}`, cur.toString());
          }
        };

        const handleLoadedMetadata = () => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        };

        const togglePlay = () => {
          if (videoRef.current) {
            if (isPlaying) {
              videoRef.current.pause();
              setIsPlaying(false);
            } else {
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          }
        };

        const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (videoRef.current) {
            const val = parseFloat(e.target.value);
            videoRef.current.currentTime = val;
            setCurrentTime(val);
          }
        };

        const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (videoRef.current) {
            const val = parseFloat(e.target.value);
            videoRef.current.volume = val;
            setVolume(val);
            setIsMuted(val === 0);
          }
        };

        const toggleMute = () => {
          if (videoRef.current) {
            const nextMute = !isMuted;
            videoRef.current.muted = nextMute;
            setIsMuted(nextMute);
          }
        };

        const handleSpeedChange = (speed: number) => {
          if (videoRef.current) {
            videoRef.current.playbackRate = speed;
            setPlaybackSpeed(speed);
          }
        };

        const formatTime = (secs: number) => {
          const m = Math.floor(secs / 60);
          const s = Math.floor(secs % 60);
          return `${m}:${s.toString().padStart(2, '0')}`;
        };

        return (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-w-6xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-800 flex flex-col md:flex-row max-h-[90vh]">
              
              {/* Left Side: Video Player Container */}
              <div className="flex-1 flex flex-col bg-black relative">
                <div className="p-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-white shrink-0">
                  <div className="truncate pr-4">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1">
                      {selectedVideo.subject || 'Lecture'}
                    </span>
                    <h3 className="text-lg font-black truncate">{selectedVideo.title}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedVideo(null)} 
                    className="w-10 h-10 bg-slate-800 hover:bg-rose-600 rounded-full flex items-center justify-center transition-all text-slate-300 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 flex items-center justify-center bg-black relative min-h-[300px] md:min-h-[450px]">
                  {isYouTube ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1&rel=0`}
                      title={selectedVideo.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    ></iframe>
                  ) : (
                    <div className="absolute inset-0 w-full h-full flex flex-col justify-between group">
                      <video
                        ref={videoRef}
                        src={selectedVideo.link}
                        className="w-full h-full object-contain"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onClick={togglePlay}
                      />

                      {/* Custom Controls Overlay */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-transparent p-6 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-4 text-white">
                        
                        {/* Timeline */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold font-mono">{formatTime(currentTime)}</span>
                          <input 
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeekChange}
                            className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                          <span className="text-xs font-bold font-mono">{formatTime(duration)}</span>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <button onClick={togglePlay} className="p-2 bg-rose-600 hover:bg-rose-500 rounded-full transition-all text-white shadow-lg">
                              {isPlaying ? (
                                <span className="block w-4 h-4 font-bold text-center leading-none">||</span>
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </button>

                            {/* Volume */}
                            <div className="flex items-center gap-2">
                              <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors">
                                {isMuted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5" />}
                              </button>
                              <input 
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white"
                              />
                            </div>
                          </div>

                          {/* Playback speed */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Speed</span>
                            <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
                              {[0.5, 1, 1.5, 2].map(speed => (
                                <button 
                                  key={speed}
                                  onClick={() => handleSpeedChange(speed)}
                                  className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all ${playbackSpeed === speed ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                >
                                  {speed}x
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Notes and Watch Tips Panel */}
              <div className="w-full md:w-[320px] bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-8 flex flex-col justify-between shrink-0 font-sans">
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-6">
                    <NotebookPen className="w-5 h-5 text-rose-500" />
                    <h4 className="text-md font-black text-white uppercase tracking-tight">Study Notes Pad</h4>
                  </div>
                  
                  <p className="text-xs font-medium text-slate-400 mb-4">
                    Jot down key equations, formulas, or concepts as you watch the lecture. Your notes are saved automatically!
                  </p>

                  <textarea
                    value={videoNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Type your lecture notes here... e.g. Important formula: E = mc²..."
                    className="w-full flex-1 min-h-[160px] md:min-h-0 bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 text-white text-sm outline-hidden focus:border-rose-500 transition-all resize-none font-medium"
                  />
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Notes Auto-Saved</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <button 
                    onClick={() => {
                      const blob = new Blob([videoNotes], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${selectedVideo.title.replace(/\s+/g, '_')}_Notes.txt`;
                      a.click();
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all"
                  >
                    Download Notes TXT
                  </button>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* HIDDEN_SOCIAL_PILLS — uncomment to restore floating WhatsApp/Telegram/YouTube pills
            {activeTab === 'home' && (
              <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-1.5 pointer-events-none">
                {currentPopupIndex === 0 && socialLinks.whatsapp && (
                  <a
                    href={socialLinks.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white pl-2.5 pr-3.5 py-1.5 rounded-full shadow-lg shadow-emerald-500/30 text-[11px] font-bold transition-all duration-200 active:scale-95 animate-in fade-in duration-150"
                  >
                    <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                      <MessageCircle className="w-3 h-3 fill-current" />
                    </span>
                    Join WhatsApp
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}
                {currentPopupIndex === 1 && socialLinks.telegram && (
                  <a
                    href={socialLinks.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white pl-2.5 pr-3.5 py-1.5 rounded-full shadow-lg shadow-sky-500/30 text-[11px] font-bold transition-all duration-200 active:scale-95 animate-in fade-in duration-150"
                  >
                    <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                      <Send className="w-3 h-3 fill-current ml-px" />
                    </span>
                    Join Telegram
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}
                {currentPopupIndex === 2 && socialLinks.youtube && (
                  <a
                    href={socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white pl-2.5 pr-3.5 py-1.5 rounded-full shadow-lg shadow-red-500/30 text-[11px] font-bold transition-all duration-200 active:scale-95 animate-in fade-in duration-150"
                  >
                    <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                      <Youtube className="w-3 h-3 fill-current" />
                    </span>
                    Subscribe YouTube
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}
              </div>
            )}
      END_HIDDEN_SOCIAL_PILLS */}

      {/* Review popup — auto-shows to students every 30 days */}
      {profile?.role !== 'admin' && <ReviewPopup />}

      {/* PWA install prompt — shows for non-admin users on mobile/Android */}
      {profile?.role !== 'admin' && <PWAInstallPrompt />}

      {/* Bottom navigation bar — mobile only, non-admin */}
      {profile?.role !== 'admin' && <AppBottomNav />}

      {/* App install gate — prompts mobile browser users to install */}
      {profile?.role !== 'admin' && <AppInstallGate />}

      {/* ── 150 Days Mock Challenge Schedule Document Modal ── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-100 rounded-3xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Document Action Bar Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">
                  📄
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                    {scheduleDoc?.title || '150 Days Challenge Official Document Schedule'}
                    <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white px-2 py-0.5 rounded-full">PDF Document</span>
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-300 font-medium">
                    {scheduleDoc?.description || 'Official Day-by-day structured topic schedule'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {scheduleDoc?.pdfUrl ? (
                  <a
                    href={scheduleDoc.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF File
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Print / Save PDF
                  </button>
                )}
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {scheduleDoc?.pdfUrl ? (
              <div className="flex-1 bg-slate-900 overflow-hidden relative flex flex-col min-h-[500px]">
                <iframe
                  src={scheduleDoc.pdfUrl}
                  className="w-full h-full min-h-[550px] border-none"
                  title="150 Days Challenge Schedule Document"
                />
              </div>
            ) : (
              <>

            {/* Document Controls & Filter Bar */}
            <div className="p-3.5 bg-white border-b border-slate-200/90 flex flex-wrap gap-3 items-center justify-between shrink-0">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search Day (e.g. Day 01), Math, Reasoning, GK topic..."
                  value={scheduleSearch}
                  onChange={e => setScheduleSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 pl-8 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {scheduleSearch && (
                  <button onClick={() => setScheduleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600">✕</button>
                )}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setScheduleFilter('all')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${scheduleFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  All Days (150)
                </button>
                <button
                  onClick={() => setScheduleFilter('available')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${scheduleFilter === 'available' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  🟢 Published ({Object.keys(challengeDaysMap).length})
                </button>
                <button
                  onClick={() => setScheduleFilter('upcoming')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${scheduleFilter === 'upcoming' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  ⏳ Upcoming ({Math.max(0, 150 - Object.keys(challengeDaysMap).length)})
                </button>
              </div>
            </div>

            {/* PDF Paper Sheet Document Container */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-200/60">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-300 p-6 sm:p-8 max-w-4xl mx-auto min-h-full">
                
                {/* Official Letterhead Header */}
                <div className="border-b-2 border-slate-900 pb-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                      MA
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">MASTER APTITUDE BY SUMAN SIR</h1>
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">150 Days Free Practice Challenge • Master Syllabus Schedule</p>
                    </div>
                  </div>

                  <div className="text-right text-[10px] font-bold text-slate-500 space-y-0.5">
                    <p className="text-slate-900 font-black uppercase tracking-wider">Document Ref: MA-150D-2026</p>
                    <p>Published Days: <span className="font-black text-emerald-600">{Object.keys(challengeDaysMap).length} / 150</span></p>
                    <p>Status: <span className="font-black text-indigo-600">Auto-Synchronized</span></p>
                  </div>
                </div>

                {/* Structured Document Table */}
                <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-xs">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider divide-x divide-slate-800">
                        <th className="py-3 px-3 w-16 text-center">Day</th>
                        <th className="py-3 px-3">Mathematics Topic</th>
                        <th className="py-3 px-3">Reasoning / GI Topic</th>
                        <th className="py-3 px-3">English / GK Topic</th>
                        <th className="py-3 px-3 w-28 text-center">Status / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
                      {(() => {
                        const daysList = Array.from({ length: 150 }, (_, i) => i + 1);

                        const filteredDays = daysList.filter(dayNum => {
                          const tests = challengeDaysMap[dayNum] || [];
                          const isAvailable = tests.length > 0;
                          
                          if (scheduleFilter === 'available' && !isAvailable) return false;
                          if (scheduleFilter === 'upcoming' && isAvailable) return false;

                          if (scheduleSearch.trim()) {
                            const q = scheduleSearch.toLowerCase().trim();
                            const dayStr = `day ${dayNum}`.toLowerCase();
                            const dayPadded = `day 0${dayNum}`.toLowerCase();
                            const matchesDay = dayStr.includes(q) || dayPadded.includes(q) || dayNum.toString() === q;
                            const matchesTests = tests.some((t: any) => 
                              (t.title || '').toLowerCase().includes(q) ||
                              (t.topic || '').toLowerCase().includes(q) ||
                              (t.subjectName || '').toLowerCase().includes(q)
                            );
                            return matchesDay || matchesTests;
                          }
                          return true;
                        });

                        if (filteredDays.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                                No schedule rows match your search/filter.
                              </td>
                            </tr>
                          );
                        }

                        return filteredDays.map(dayNum => {
                          const tests = challengeDaysMap[dayNum] || [];
                          const isAvailable = tests.length > 0;
                          const firstTest = tests[0];

                          let mathTopic = '—';
                          let reasoningTopic = '—';
                          let englishGkTopic = '—';

                          // Read admin scheduleTable entries if set by admin
                          const adminRow = Array.isArray(scheduleDoc?.scheduleTable)
                            ? scheduleDoc.scheduleTable.find((r: any) => Number(r.day) === dayNum)
                            : null;

                          if (adminRow) {
                            if (adminRow.math) mathTopic = adminRow.math;
                            if (adminRow.reasoning) reasoningTopic = adminRow.reasoning;
                            if (adminRow.englishGk) englishGkTopic = adminRow.englishGk;
                          }

                          if (isAvailable) {
                            tests.forEach((t: any) => {
                              const sub = (t.subjectName || '').toLowerCase();
                              const cat = (t.category || '').toLowerCase();
                              const top = t.topic || t.title || `Day ${dayNum} Topic`;

                              if (sub.includes('math') || sub.includes('quant') || cat.includes('math')) {
                                if (mathTopic === '—') mathTopic = top;
                              } else if (sub.includes('reason') || sub.includes('gi') || cat.includes('reason')) {
                                if (reasoningTopic === '—') reasoningTopic = top;
                              } else if (sub.includes('english') || sub.includes('gk') || sub.includes('awareness') || sub.includes('general')) {
                                if (englishGkTopic === '—') englishGkTopic = top;
                              } else {
                                if (mathTopic === '—') mathTopic = top;
                                else if (reasoningTopic === '—') reasoningTopic = top;
                                else if (englishGkTopic === '—') englishGkTopic = top;
                              }
                            });
                          } else if (!adminRow) {
                            mathTopic = `Day ${dayNum} Mathematics`;
                            reasoningTopic = `Day ${dayNum} General Intelligence`;
                            englishGkTopic = `Day ${dayNum} General Knowledge`;
                          }

                          const attemptsForDay = tests.flatMap((t: any) => pastResults.filter((r: any) => r.testId === t.id));
                          const isAttempted = attemptsForDay.length > 0;
                          const topScore = isAttempted ? Math.max(...attemptsForDay.map((r: any) => r.score || 0)) : null;

                          return (
                            <tr
                              key={dayNum}
                              className={`divide-x divide-slate-200 transition-colors ${
                                isAvailable
                                  ? isAttempted
                                    ? 'bg-emerald-50/50 hover:bg-emerald-50'
                                    : 'bg-white hover:bg-indigo-50/40'
                                  : 'bg-slate-50/60 hover:bg-slate-100/60'
                              }`}
                            >
                              {/* Day Column */}
                              <td className="py-2.5 px-3 text-center font-black text-slate-900 bg-slate-100/50">
                                Day {dayNum < 10 ? `0${dayNum}` : dayNum}
                              </td>

                              {/* Math Topic */}
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                <span className={isAvailable ? 'text-indigo-700 font-extrabold' : 'text-slate-400'}>
                                  {mathTopic}
                                </span>
                              </td>

                              {/* Reasoning Topic */}
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                <span className={isAvailable ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}>
                                  {reasoningTopic}
                                </span>
                              </td>

                              {/* English/GK Topic */}
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                <span className={isAvailable ? 'text-violet-700 font-extrabold' : 'text-slate-400'}>
                                  {englishGkTopic}
                                </span>
                              </td>

                              {/* Status / Action */}
                              <td className="py-2.5 px-3 text-center">
                                {isAvailable ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <Link
                                      to={`/test/${firstTest.id}`}
                                      onClick={() => setShowScheduleModal(false)}
                                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-all shadow-2xs block w-full text-center"
                                    >
                                      {isAttempted ? 'Reattempt' : 'Attempt'}
                                    </Link>
                                    {isAttempted && (
                                      <span className="text-[8px] font-black text-emerald-600">✓ {topScore} pts</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-md border border-slate-200 block text-center">
                                    Upcoming
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Document Footer Note */}
                <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] font-bold text-slate-400 gap-2">
                  <p>© Master Aptitude by Suman Sir — Official 150 Days Practice Schedule</p>
                  <p className="text-slate-500">Auto-updated from live mock test engine</p>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                150 Days Practice Roadmap Table View
              </span>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Close Document
              </button>
            </div>
          </>
        )}

          </div>
        </div>
      )}

      {/* SW update toast — notifies when a new version is deployed */}
      <AppUpdateToast />
    </div>
  );
}




