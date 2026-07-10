import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { getCachedCollection } from '../lib/cache';
import { RenderMathText } from '../components/MathRenderer';
import PWAInstallPrompt, { InstallAppSidebarButton } from '../components/PWAInstallPrompt';
import AppInstallGate from '../components/AppInstallGate';
import AppBottomNav from '../components/AppBottomNav';
import AppUpdateToast from '../components/AppUpdateToast';
import ReviewPopup from '../components/ReviewPopup';
import ReviewSlider from '../components/ReviewSlider';
import { Trophy, Target, LogOut, FileText, CheckCircle, Clock, BookOpen, Play, ChevronRight, ChevronLeft, ArrowLeft, ExternalLink, Menu, X, Youtube, MessageCircle, Send, LayoutDashboard, History, ChevronDown, ArrowRight, User, Info, Phone, Download, Printer, AlertCircle, BarChart3, Keyboard, Globe, Layers, CheckSquare, Volume2, VolumeX, Maximize, NotebookPen } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DashboardTab = 'home' | 'profile' | 'mock_topic' | 'mock_sectional' | 'mock_full' | 'notes' | 'video' | 'pyq' | 'pattern' | 'affairs' | 'practice' | 'about' | 'contact' | 'learn_landing' | 'mock_landing' | 'live_test';

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
          0%   { color: #60a5fa; text-shadow: 0 0 10px rgba(96,165,250,0.35); }
          25%  { color: #22d3ee; text-shadow: 0 0 10px rgba(34,211,238,0.35); }
          50%  { color: #a78bfa; text-shadow: 0 0 10px rgba(167,139,250,0.35); }
          75%  { color: #fbbf24; text-shadow: 0 0 12px rgba(251,191,36,0.35); }
          100% { color: #60a5fa; text-shadow: 0 0 10px rgba(96,165,250,0.35); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
      <div className="relative rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 50%, #16213e 100%)',
        border: '1px solid rgba(99,102,241,0.22)',
        boxShadow: '0 8px 28px rgba(99,102,241,0.18)',
      }}>
        {/* Background study image */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <img
            src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80&auto=format&fit=crop&crop=right"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-right"
            style={{ filter: 'blur(2px) brightness(0.28) saturate(0.7)', transform: 'scale(1.04)' }}
            loading="eager"
            draggable={false}
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, rgba(15,12,41,0.98) 0%, rgba(15,12,41,0.88) 35%, rgba(15,12,41,0.60) 60%, rgba(15,12,41,0.10) 100%)',
          }} />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, rgba(15,12,41,0.4) 0%, transparent 25%, transparent 75%, rgba(15,12,41,0.5) 100%)',
          }} />
        </div>

        {/* Right-side image panel — desktop only */}
        <div className="hidden md:block absolute inset-y-0 right-0 pointer-events-none select-none" style={{ width: '42%' }}>
          <img
            src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80&auto=format&fit=crop&crop=right"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-right"
            style={{ filter: 'blur(0px) brightness(0.45) saturate(0.8)' }}
            loading="eager"
            draggable={false}
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, rgba(15,12,41,1) 0%, rgba(15,12,41,0.55) 30%, transparent 65%)',
          }} />
          <span className="absolute top-4 right-8 text-2xl drop-shadow-lg">📚</span>
          <span className="absolute top-1/2 right-5 text-xl drop-shadow-lg" style={{ transform: 'translateY(-50%)' }}>✏️</span>
          <span className="absolute bottom-5 right-10 text-xl drop-shadow-lg">🏆</span>
        </div>

        {/* Dot-grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />

        <div className="relative z-10 p-5 sm:p-6 md:max-w-[58%]">
          {/* Brand pill */}
          <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full" style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.28)',
            color: '#a5b4fc',
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: '0.14em',
          }}>
            🎓 MASTER APTITUDE
          </div>

          {/* Welcome heading */}
          <h2 style={{ fontWeight: 900, fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.01em', color: '#fff', margin: '0 0 16px' }}>
            Welcome,{' '}
            <span style={{
              backgroundImage: 'linear-gradient(90deg, #fbbf24 0%, #fde68a 50%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>{firstName}</span>!
          </h2>

          {/* Typewriter quote */}
          <div style={{ minHeight: 44 }}>
            <p style={{
              animation: 'quoteColorCycle 10s linear infinite',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 13,
              lineHeight: 1.65,
              maxWidth: 440,
              margin: 0,
            }}>
              <span style={{ opacity: 0.45, fontStyle: 'normal' }}>"</span>
              {displayText}
              <span style={{
                display: 'inline-block',
                width: 2,
                height: 13,
                background: 'currentColor',
                marginLeft: 1,
                verticalAlign: 'middle',
                animation: 'cursorBlink 0.9s ease-in-out infinite',
                opacity: pausing ? 0 : 1,
                borderRadius: 1,
              }} />
              {quoteDone && <span style={{ opacity: 0.45, fontStyle: 'normal' }}>"</span>}
            </p>
          </div>

          <p style={{ color: 'rgba(165,180,252,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', marginTop: 8 }}>
            — Master Aptitude
          </p>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
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
  
  const activeTab = (searchParams.get('tab') as DashboardTab) || 'home';
  const selectedCategory = searchParams.get('cat') || '';

  const setActiveTab = (tab: DashboardTab) => {
    setSearchParams({ tab, cat: '' });
    setSelectedTopic(null);
    if (!tab.startsWith('mock')) {
      setMockOpen(false);
    }
    if (!['video', 'notes', 'affairs', 'practice'].includes(tab)) {
      setLearnOpen(false);
    }
  };

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const setSelectedCategory = (cat: string) => {
    setSelectedTopic(null);
    setSearchParams({ tab: activeTab, cat });
  };

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

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditPhone(profile.phoneNumber || '');
    }
  }, [profile]);

  const categories = (() => {
    const rawCategories = [...new Set(activeTests.filter(t => (t.testType || 'topic') === activeTab.replace('mock_', '')).map(t => t.category).filter(Boolean)) as Set<string>];
    
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
        const cachedResults = safeParse(localStorage.getItem('ma_cache_results'));
        const cachedPaidBatches = safeParse(localStorage.getItem('ma_cache_paid_batches'));
        const cachedMyPurchases = safeParse(localStorage.getItem('ma_cache_my_purchases'));

        let hasCachedData = false;

        if (cachedTests && Array.isArray(cachedTests)) {
          setActiveTests(cachedTests);
          setLiveTests(cachedTests.filter((t: any) => t.isLive));
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
        
        // Fetch Active Tests (ordered by creation — first added = first shown)
        const allTests = await getCachedCollection(
          'tests',
          async () => {
            const testsQuery = query(collection(db, 'tests'), where('isActive', '==', true), orderBy('createdAt', 'asc'));
            const snap = await getDocs(testsQuery);
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          },
          'tests'
        );
        setActiveTests(allTests);
        setLiveTests(allTests.filter((t: any) => t.isLive));
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

        // Fetch About & Contact Info
        const infoSnap = await getDoc(doc(db, 'settings', 'site_info'));
        if (infoSnap.exists()) {
          const sInfo = infoSnap.data() as any;
          setAboutInfo(sInfo);
          localStorage.setItem('ma_cache_site_info', JSON.stringify(sInfo));
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

        // Fetch Social Links
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
        }

        // Fetch Category Order
        const orderRes = await fetch('/api/category-order');
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          const order = orderData.order || [];
          setCategoryOrder(order);
          localStorage.setItem('ma_cache_category_order', JSON.stringify(order));
        }

        // Fetch Past Results
        const resultsQuery = query(collection(db, 'results'), where('userId', '==', user.uid));
        const resultsSnap = await getDocs(resultsQuery);
        const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
        results.sort((a, b) => b.timestamp - a.timestamp);
        setPastResults(results);
        localStorage.setItem('ma_cache_results', JSON.stringify(results));

        // Fetch Paid Batches + My Purchases + Payment Config (parallel)
        try {
          const tok = await user.getIdToken();
          const [batchRes, purchaseRes, payRes] = await Promise.all([
            fetch('/api/paid-batches'),
            fetch('/api/my-purchases', { headers: { Authorization: `Bearer ${tok}` } }),
            fetch('/api/payment-config'),
          ]);
          if (batchRes.ok) {
            const bd = await batchRes.json();
            setPaidBatches(bd);
            localStorage.setItem('ma_cache_paid_batches', JSON.stringify(bd));
          }
          if (purchaseRes.ok) {
            const pd = await purchaseRes.json();
            const pb = pd.purchasedBatches || [];
            setMyPurchases(pb);
            localStorage.setItem('ma_cache_my_purchases', JSON.stringify(pb));
          }
          if (payRes.ok) {
            const pc = await payRes.json();
            if (pc.razorpayMeUrl) setRazorpayMeUrl(pc.razorpayMeUrl);
          }
        } catch { /* non-fatal */ }

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'multiple collections');
      } finally {
        setLoading(false);
      }
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
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shrink-0" style={{boxShadow: '0 4px 16px rgba(99,102,241,0.4)'}}>
              <Trophy className="w-5 h-5 text-white" />
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
                  Study Notes
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
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white text-sm font-black">M</span>
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
                {activeTab === 'home' ? '🏠 Dashboard' : activeTab === 'profile' ? '👤 My Profile' : activeTab.startsWith('mock') ? '🎯 Mock Tests' : activeTab === 'live_test' ? '🔴 Live Tests' : activeTab === 'notes' ? '📚 Study Notes' : activeTab === 'video' ? '🎬 Video Lectures' : activeTab === 'pyq' ? '📄 Previous Year Q.' : activeTab === 'affairs' ? '📰 Current Affairs' : activeTab === 'practice' ? '✅ Practice Sets' : activeTab === 'pattern' ? '📋 Exam Pattern' : activeTab === 'about' ? 'ℹ️ About Us' : activeTab === 'contact' ? '📞 Contact' : 'Dashboard'}
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

              {/* ── Live Test Banner (only when a test is actually live) ── */}
              {(() => {
                const now = new Date();
                const activeLive = liveTests.find(t => new Date(t.liveStartDate) <= now && new Date(t.liveEndDate) >= now && t.isActive);
                if (!activeLive) return null;
                return (
                  <div className="rounded-2xl p-4 md:p-5 flex items-center justify-between gap-4 flex-wrap" style={{background: '#fff', border: '1px solid #fecaca', boxShadow: '0 2px 12px rgba(239,68,68,0.08)'}}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)'}}>🔴</div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{color: '#f87171'}}>Live Right Now</span>
                        </div>
                        <p className="font-black text-sm leading-tight" style={{color: '#1e293b'}}>{activeLive.title}</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('live_test')} className="flex-shrink-0 px-5 py-2.5 rounded-xl font-black text-sm text-white uppercase tracking-wide transition-all hover:opacity-90" style={{background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 4px 16px rgba(239,68,68,0.3)'}}>
                      Join Now →
                    </button>
                  </div>
                );
              })()}

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

              {/* ── Category Grid — 3×2 neon cards ── */}
              {(() => {
                const NeonCard = ({
                  w1, w2, icon, neon, bg, badge, action,
                  pad, circle, iconRem, titlePx, arrowPx, bktPx, dotPx, rayH,
                }: {
                  w1:string; w2:string; icon:string; neon:string; bg:string; badge:string|null;
                  action:()=>void; pad:string; circle:number; iconRem:number; titlePx:string;
                  arrowPx:number; bktPx:number; dotPx:number; rayH:number;
                }) => (
                  <button
                    onClick={action}
                    className="group relative flex flex-col items-center rounded-2xl text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.04] active:scale-[0.96]"
                    style={{ background:bg, boxShadow:`0 0 0 1.5px ${neon}60, 0 0 22px ${neon}40, 0 6px 28px rgba(0,0,0,0.7)`, padding:pad, overflow:'visible', justifyContent:'center', gap:5 }}
                  >
                    {/* Top colour wash */}
                    <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background:`radial-gradient(ellipse 100% 70% at 50% 0%,${neon}25 0%,transparent 65%)` }}/>
                    {/* Dot grid */}
                    <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ backgroundImage:`radial-gradient(circle,${neon}28 1px,transparent 1px)`, backgroundSize:`${dotPx}px ${dotPx}px` }}/>
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 pointer-events-none" style={{ width:bktPx, height:bktPx, borderTop:`2px solid ${neon}88`, borderLeft:`2px solid ${neon}88`, borderRadius:'8px 0 0 0' }}/>
                    <div className="absolute top-0 right-0 pointer-events-none" style={{ width:bktPx, height:bktPx, borderTop:`2px solid ${neon}88`, borderRight:`2px solid ${neon}88`, borderRadius:'0 8px 0 0' }}/>
                    {/* Glowing icon circle */}
                    <div className="relative z-10 flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                      style={{ width:circle, height:circle, flexShrink:0, border:`2px solid ${neon}`, boxShadow:`0 0 16px ${neon}85,0 0 34px ${neon}45,inset 0 0 18px ${neon}30`, background:`radial-gradient(circle,${neon}35 0%,${neon}12 55%,transparent 100%)` }}>
                      {badge && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-black rounded-full z-20"
                          style={{ fontSize:7, padding:'2px 8px', background:`linear-gradient(90deg,${neon},${neon}bb)`, color:'#000', boxShadow:`0 0 10px ${neon}`, letterSpacing:'0.1em' }}>
                          {badge}
                        </span>
                      )}
                      <span className="select-none" style={{ fontSize:`${iconRem}rem`, lineHeight:1, filter:`drop-shadow(0 0 10px ${neon}bb)` }}>{icon}</span>
                    </div>
                    {/* Stacked two-line title */}
                    <div className="relative z-10 text-center" style={{ lineHeight:1.08 }}>
                      <div className="font-black" style={{ fontSize:titlePx, color:'#ffffff', textShadow:`0 0 20px ${neon}80, 0 1px 0 rgba(0,0,0,0.6)`, letterSpacing:'-0.01em' }}>{w1}</div>
                      {w2 && <div className="font-black" style={{ fontSize:titlePx, color:neon, textShadow:`0 0 18px ${neon}, 0 0 36px ${neon}88`, letterSpacing:'-0.01em' }}>{w2}</div>}
                    </div>
                    {/* Bottom ray */}
                    <div className="absolute bottom-0 left-0 right-0 rounded-b-2xl pointer-events-none" style={{ height:rayH, background:`radial-gradient(ellipse 90% 75% at 50% 115%,${neon}55 0%,transparent 70%)` }}/>
                    {/* Arrow */}
                    <div className="relative z-10 flex items-center justify-center rounded-full transition-all duration-200 group-hover:scale-110"
                      style={{ width:arrowPx, height:arrowPx, background:`${neon}30`, border:`1.5px solid ${neon}`, boxShadow:`0 0 12px ${neon}60` }}>
                      <svg viewBox="0 0 10 10" width={arrowPx*0.45} height={arrowPx*0.45} fill="none">
                        <path d="M3.5 2L6.5 5L3.5 8" stroke={neon} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {/* Hover ring */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style={{ boxShadow:`inset 0 0 0 2px ${neon}, 0 0 32px ${neon}55` }}/>
                  </button>
                );

                const L1 = { pad:'18px 6px 16px', circle:58, iconRem:1.7, titlePx:'clamp(16px,5vw,22px)', arrowPx:22, bktPx:16, dotPx:14, rayH:32 };

                const cats = [
                  { w1:'FREE',    w2:'MOCK',    icon:String.fromCodePoint(0x1F4CB), neon:'#00d4ff', bg:'linear-gradient(155deg,#062240,#0a3566)',  badge:null,      action:()=>setActiveTab('mock_landing') },
                  { w1:'PAID',    w2:'MOCK',    icon:String.fromCodePoint(0x1F6E1), neon:'#c084fc', bg:'linear-gradient(155deg,#1c0a42,#30126e)', badge:'PREMIUM', action:()=>navigate('/paid-mock') },
                  { w1:'TYPING',  w2:'TEST',    icon:String.fromCodePoint(0x2328),  neon:'#00ff88', bg:'linear-gradient(155deg,#042618,#083f28)',  badge:null,      action:()=>navigate('/typing-test') },
                  { w1:'EBOOK',   w2:'',        icon:String.fromCodePoint(0x1F4D6), neon:'#ffa820', bg:'linear-gradient(155deg,#251400,#3f2200)',  badge:null,      action:()=>setActiveTab('notes') },
                  { w1:'CURRENT', w2:'AFFAIRS', icon:String.fromCodePoint(0x1F4F0), neon:'#00ffe0', bg:'linear-gradient(155deg,#002828,#004040)',  badge:null,      action:()=>navigate('/current-affairs') },
                  { w1:'PYQs',    w2:'',        icon:String.fromCodePoint(0x1F4DD), neon:'#ff3fa4', bg:'linear-gradient(155deg,#280018,#420030)',  badge:null,      action:()=>setActiveTab('pyq') },
                ];
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs font-black uppercase tracking-widest" style={{color:'#64748b'}}>Explore</p>
                      <div className="flex-1 h-px" style={{background:'linear-gradient(to right,#e2e8f0,transparent)'}}/>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {cats.map(c => <NeonCard key={c.w1+c.w2} {...c} {...L1} />)}
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

          {/* Affairs Tab Content */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto animate-in fade-in duration-150">
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

                  {/* ── Overall Mock Performance ── */}
                  <div className="mt-8 pt-8 border-t border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-indigo-500 rounded-full"/>
                      Overall Mock Performance
                    </h3>
                    {performanceStats.totalTests === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs font-bold">
                        No tests taken yet. Start a mock test to see your stats!
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-center">
                          <span className="block text-[9px] font-black text-indigo-400 uppercase tracking-tight mb-1">Tests Taken</span>
                          <span className="text-2xl font-black text-indigo-700">{performanceStats.totalTests}</span>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                          <span className="block text-[9px] font-black text-emerald-400 uppercase tracking-tight mb-1">Best Score</span>
                          <span className="text-2xl font-black text-emerald-700">{performanceStats.bestScore}</span>
                        </div>
                        <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 text-center">
                          <span className="block text-[9px] font-black text-sky-400 uppercase tracking-tight mb-1">Avg Score</span>
                          <span className="text-2xl font-black text-sky-700">{performanceStats.avgScore}</span>
                        </div>
                        <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100 text-center">
                          <span className="block text-[9px] font-black text-violet-400 uppercase tracking-tight mb-1">Avg Accuracy</span>
                          <span className="text-2xl font-black text-violet-700">{performanceStats.avgAccuracy}%</span>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                          <span className="block text-[9px] font-black text-amber-400 uppercase tracking-tight mb-1">Latest Score</span>
                          <span className="text-2xl font-black text-amber-700">{performanceStats.latestScore}</span>
                        </div>
                      </div>
                    )}
                  </div>

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
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-gradient-to-b from-teal-500 to-emerald-600 rounded-full"></div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">✅ Practice Sets</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {practiceSets.map(item => (
                  <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-xl hover:shadow-teal-50 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-teal-200 group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-slate-800 text-base mb-1 tracking-tight line-clamp-2">{item.title}</h4>
                    <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-5 bg-teal-50 inline-block px-2 py-0.5 rounded-md">{item.subject || 'Practice'}</p>
                    <a
                      href={item.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between w-full text-teal-700 font-bold text-xs uppercase tracking-wider bg-teal-50 border border-teal-100 px-4 py-2.5 rounded-xl hover:bg-teal-600 hover:text-white hover:border-transparent transition-all"
                    >
                      Download PDF
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
                {practiceSets.length === 0 && (
                  <div className="col-span-full bg-white rounded-3xl p-16 border border-slate-100 text-center shadow-sm">
                    <div className="w-16 h-16 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-teal-200" />
                    </div>
                    <p className="font-black text-sm uppercase tracking-widest text-slate-400">No Practice Sets uploaded yet.</p>
                  </div>
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

              {/* Neon sub-category cards — Level 2 (size 15) */}
              {(() => {
                // ─ NeonCard renderer (same design as L1, smaller tokens) ───────
                const NeonCard = ({
                  w1, w2, icon, neon, bg, badge, action,
                  pad, circle, iconRem, titlePx, arrowPx, bktPx, dotPx, rayH, mb,
                }: {
                  w1:string; w2:string; icon:string; neon:string; bg:string; badge:string|null;
                  action:()=>void; pad:string; circle:number; iconRem:number; titlePx:string;
                  arrowPx:number; bktPx:number; dotPx:number; rayH:number; mb:number;
                }) => (
                  <button
                    onClick={action}
                    className="group relative flex flex-col items-center rounded-2xl text-white transition-all duration-200 hover:-translate-y-1 hover:scale-[1.03] active:scale-[0.95]"
                    style={{ background:bg, boxShadow:`0 0 0 1.5px ${neon}55, 0 0 16px ${neon}28, 0 5px 22px rgba(0,0,0,0.55)`, padding:pad, overflow:'visible', justifyContent:'center', gap:5 }}
                  >
                    {/* Dot grid */}
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:`radial-gradient(circle,${neon}16 1px,transparent 1px)`, backgroundSize:`${dotPx}px ${dotPx}px` }}/>
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 pointer-events-none" style={{ width:bktPx, height:bktPx, borderTop:`1.5px solid ${neon}65`, borderLeft:`1.5px solid ${neon}65`, borderRadius:'8px 0 0 0' }}/>
                    <div className="absolute top-0 right-0 pointer-events-none" style={{ width:bktPx, height:bktPx, borderTop:`1.5px solid ${neon}65`, borderRight:`1.5px solid ${neon}65`, borderRadius:'0 8px 0 0' }}/>
                    {/* Glowing circle */}
                    <div className="relative z-10 flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                      style={{ width:circle, height:circle, flexShrink:0, border:`1.5px solid ${neon}`, boxShadow:`0 0 12px ${neon}65,0 0 24px ${neon}28,inset 0 0 12px ${neon}15`, background:`radial-gradient(circle,${neon}15 0%,transparent 70%)` }}>
                      {badge && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-black rounded-full"
                          style={{ fontSize:6, padding:'2px 6px', background:`linear-gradient(90deg,${neon},${neon}bb)`, color:bg, boxShadow:`0 0 7px ${neon}`, letterSpacing:'0.07em' }}>
                          {badge}
                        </span>
                      )}
                      <span className="select-none" style={{ fontSize:`${iconRem}rem`, lineHeight:1, filter:`drop-shadow(0 0 7px ${neon}88)` }}>{icon}</span>
                    </div>
                    {/* Two-tone title */}
                    <p className="relative z-10 font-black text-center leading-tight" style={{ fontSize:titlePx, lineHeight:1.1 }}>
                      {w2
                        ? <><span style={{color:'#fff'}}>{w1} </span><span style={{color:neon,textShadow:`0 0 9px ${neon}`}}>{w2}</span></>
                        : <span style={{color:neon,textShadow:`0 0 9px ${neon}`}}>{w1}</span>
                      }
                    </p>
                    {/* Bottom ray */}
                    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height:rayH, background:`radial-gradient(ellipse 80% 65% at 50% 110%,${neon}38 0%,transparent 70%)` }}/>
                    {/* Arrow */}
                    <div className="relative z-10 flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                      style={{ width:arrowPx, height:arrowPx, background:`${neon}1a`, border:`1px solid ${neon}85`, boxShadow:`0 0 8px ${neon}40` }}>
                      <svg viewBox="0 0 10 10" width={arrowPx*0.45} height={arrowPx*0.45} fill="none">
                        <path d="M3.5 2L6.5 5L3.5 8" stroke={neon} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {/* Hover ring */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style={{ boxShadow:`inset 0 0 0 1.5px ${neon}85,0 0 24px ${neon}38` }}/>
                  </button>
                );

                // ─ Level-2 tokens (size 15 — 75% of L1, square) ─────────────
                const L2 = { pad:'4px 2px 4px', circle:32, iconRem:1.0, titlePx:'clamp(12px,3.7vw,16px)', arrowPx:14, bktPx:11, dotPx:10, rayH:22, mb:0 };

                const subs = [
                  { w1:'TOPIC',     w2:'WISE', icon:'🎯', neon:'#00cfff', bg:'#050d1a', badge:'FOCUSED',  action:()=>setActiveTab('mock_topic') },
                  { w1:'SECTIONAL', w2:'MOCK', icon:'📊', neon:'#ff3fa4', bg:'#150008', badge:'SECTION',  action:()=>setActiveTab('mock_sectional') },
                  { w1:'FULL',      w2:'MOCK', icon:'🏆', neon:'#ffaa00', bg:'#130c00', badge:'COMPLETE', action:()=>setActiveTab('mock_full') },
                ];
                return (
                  <div className="grid gap-2" style={{ gridTemplateColumns:'repeat(3, 110px)', justifyContent:'center' }}>
                    {subs.map(s => <NeonCard key={s.w1+s.w2} {...s} {...L2} />)}
                  </div>
                );
              })()}

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
            const activeLive = liveTests.filter(t => t.isActive && new Date(t.liveStartDate) <= now && new Date(t.liveEndDate) >= now);
            const upcomingLive = liveTests.filter(t => t.isActive && new Date(t.liveStartDate) > now);
            const pastLive = liveTests.filter(t => new Date(t.liveEndDate) < now || !t.isActive);

            const openLiveAnalysis = (_testId: string, result: any) => openAnalysis(result);

            const LiveCard = ({ t, badge }: { key?: any; t: any; badge: 'live' | 'upcoming' | 'past' }) => {
              const attemptsForLive = pastResults
                .filter((r: any) => r.testId === t.id)
                .sort((a: any, b: any) => a.timestamp - b.timestamp);
              const prevResult = attemptsForLive[0]; // first attempt for rank display
              const hasAttempted = attemptsForLive.length > 0;

              return (
              <div className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 transition-all hover:shadow-md ${badge === 'live' ? 'border-rose-200 shadow-rose-50' : 'border-slate-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {badge === 'live' && (
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          Live Now
                        </span>
                      )}
                      {badge === 'upcoming' && <span className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-600 px-2.5 py-1 rounded-full">Upcoming</span>}
                      {badge === 'past' && (
                        <>
                          <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">Live Ended</span>
                          <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-200">Attempt Anytime</span>
                        </>
                      )}
                      {hasAttempted && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" /> Attempted
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-slate-800 text-base leading-snug">{t.title}</h4>
                    {t.description && <p className="text-xs text-slate-500 font-medium mt-1">{t.description}</p>}
                    <div className="flex gap-3 mt-1.5 text-[10px] font-bold text-slate-400 flex-wrap">
                      {t.duration && <span>⏱ {t.duration} min</span>}
                      {t.totalQuestions && <span>📝 {t.totalQuestions} Qs</span>}
                      {hasAttempted && <span className="text-emerald-600">Score: {prevResult.score}</span>}
                      {(t.uniqueStudentCount ?? 0) > 0 && <span>👥 {(t.uniqueStudentCount as number).toLocaleString()} Students</span>}
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${badge === 'live' ? 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-200' : badge === 'upcoming' ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-200' : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-200'}`}>
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="flex gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-3">
                  <span>Start: {new Date(t.liveStartDate).toLocaleString()}</span>
                  <span>End: {new Date(t.liveEndDate).toLocaleString()}</span>
                </div>

                {badge === 'upcoming' ? (
                  <div className="w-full py-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 font-black text-xs uppercase tracking-widest text-center">
                    Opens on {new Date(t.liveStartDate).toLocaleString()}
                  </div>
                ) : hasAttempted ? (
                  /* Already attempted — Previous Attempt Analysis dropdown + Re-attempt */
                  <div className="flex gap-2">
                    {/* Previous Attempt Analysis dropdown */}
                    <div className="relative flex-1">
                      <button
                        onClick={() => setOpenAttemptDropdown(openAttemptDropdown === t.id ? null : t.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all active:scale-95"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        Previous Attempt Analysis
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openAttemptDropdown === t.id ? 'rotate-180' : ''}`} />
                      </button>

                      {openAttemptDropdown === t.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenAttemptDropdown(null)} />
                          <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-300/40 min-w-[300px] overflow-hidden">
                            <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-100 flex items-center gap-2">
                              <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">All Attempts — Select to View</p>
                            </div>
                            <div className="py-1">
                              {attemptsForLive.map((r: any, i: number) => (
                                <button
                                  key={r.id}
                                  onClick={() => { openAnalysis(r); setOpenAttemptDropdown(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group/item"
                                >
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black shadow-sm ${
                                    i === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {i + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                                      {i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`} Attempt
                                      {i === 0 && (
                                        <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">Rank</span>
                                      )}
                                    </p>
                                    <p className="text-[9px] font-medium text-slate-400 mt-0.5 tabular-nums">{formatAttemptDate(r.timestamp)}</p>
                                  </div>
                                  <span className={`text-[12px] font-black shrink-0 tabular-nums ${i === 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                                    {r.score}
                                  </span>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 group-hover/item:text-indigo-400 transition-colors" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Reattempt button */}
                    <button
                      onClick={() => navigate(`/test/${t.id}`)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-95 shrink-0"
                    >
                      <Play className="w-3.5 h-3.5" /> Reattempt
                    </button>
                  </div>
                ) : (
                  /* Not yet attempted */
                  <button
                    onClick={() => navigate(`/test/${t.id}`)}
                    className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm ${
                      badge === 'live'
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700 shadow-rose-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Play className="w-4 h-4" /> {badge === 'live' ? 'Attempt Now' : 'Attempt Test'}
                  </button>
                )}
              </div>
              );
            };

            return (
              <div className="space-y-8 animate-in fade-in duration-150">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-gradient-to-b from-rose-500 to-pink-600 rounded-full" />
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">🔴 Live Tests</h2>
                </div>

                {liveTests.length === 0 && (
                  <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center text-slate-400 shadow-sm flex flex-col items-center">
                    <BarChart3 className="w-12 h-12 mb-4 text-slate-200" />
                    <h3 className="font-black text-slate-700 text-lg mb-1">No Live Tests Yet</h3>
                    <p className="text-sm font-medium">Live tests will appear here when scheduled. Check back soon!</p>
                  </div>
                )}

                {activeLive.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                      Happening Now
                    </h3>
                    {activeLive.map(t => <LiveCard key={t.id} t={t} badge="live" />)}
                  </div>
                )}

                {upcomingLive.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest">Upcoming</h3>
                    {upcomingLive.map(t => <LiveCard key={t.id} t={t} badge="upcoming" />)}
                  </div>
                )}

                {pastLive.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Past Live Tests</h3>
                    {pastLive.map(t => <LiveCard key={t.id} t={t} badge="past" />)}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Dashboard Tab Content */}
          {activeTab.startsWith('mock') && activeTab !== 'mock_landing' && (
            <div className="space-y-8 animate-in fade-in duration-150">

              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-violet-600 rounded-full"></div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    🎯 <span className="text-indigo-600">{activeTab === 'mock_topic' ? 'Topic Wise' : activeTab === 'mock_sectional' ? 'Sectional' : 'Full'}</span> Test Series
                  </h2>
                </div>

                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat, idx) => (
                      <button
                        key={cat}
                        onClick={() => { setSelectedCategory(cat); setSelectedTopic(null); }}
                        className={`sub-category-btn sub-color-${idx % 9} ${selectedCategory === cat ? 'active' : ''}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {categories.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 py-20 border border-slate-200 text-center text-slate-400 shadow-sm flex flex-col items-center max-w-2xl mx-auto w-full">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-slate-200" />
                  </div>
                  <h3 className="font-black text-slate-800 text-lg uppercase tracking-widest mb-2">No Mock Available</h3>
                  <p className="text-slate-400 text-sm font-medium">We are working on bringing new tests to this section. Please check back later!</p>
                </div>
              ) : !selectedCategory ? (
                <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400 shadow-sm flex flex-col items-center">
                  <FileText className="w-12 h-12 mb-4 text-slate-200" />
                  <p className="font-bold text-sm uppercase tracking-widest text-slate-500">Select a category above to view Available Mocks.</p>
                </div>
              ) : (() => {
                // All tests for this category+type
                const filteredTests = activeTests.filter(t =>
                  (t.testType || 'topic') === activeTab.replace('mock_', '') &&
                  t.category === selectedCategory
                );

                // Build topic map
                const topicMap: Record<string, typeof filteredTests> = {};
                filteredTests.forEach(t => {
                  const key = t.topic || 'General';
                  if (!topicMap[key]) topicMap[key] = [];
                  topicMap[key].push(t);
                });
                const topicEntries = Object.entries(topicMap);

                if (filteredTests.length === 0) {
                  return (
                    <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400 shadow-sm flex flex-col items-center animate-in fade-in duration-300">
                      <FileText className="w-12 h-12 mb-4 text-slate-200" />
                      <p className="font-bold text-sm uppercase tracking-widest text-slate-500">No tests found in <span className="text-indigo-500">{selectedCategory}</span> category.</p>
                    </div>
                  );
                }

                // STEP 2 — No topic selected yet: show topic cards
                if (!selectedTopic) {
                  return (
                    <div className="animate-in fade-in duration-150">
                      {/* Breadcrumb */}
                      <div className="flex items-center gap-2 mb-5 text-xs font-black text-slate-400 uppercase tracking-widest">
                        <span className="text-indigo-600">{selectedCategory}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <span>Choose Topic</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {topicEntries.map(([topicName, topicTests], idx) => {
                          const takenCount = topicTests.filter(t => pastResults.some(r => r.testId === t.id)).length;
                          const colors = [
                            { bg: 'from-indigo-500 to-violet-600', light: 'bg-indigo-50 border-indigo-100', badge: 'bg-indigo-100 text-indigo-700', icon: 'text-indigo-600' },
                            { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50 border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-600' },
                            { bg: 'from-amber-500 to-orange-500', light: 'bg-amber-50 border-amber-100', badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-600' },
                            { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-50 border-rose-100', badge: 'bg-rose-100 text-rose-700', icon: 'text-rose-600' },
                            { bg: 'from-sky-500 to-blue-600', light: 'bg-sky-50 border-sky-100', badge: 'bg-sky-100 text-sky-700', icon: 'text-sky-600' },
                            { bg: 'from-violet-500 to-purple-600', light: 'bg-violet-50 border-violet-100', badge: 'bg-violet-100 text-violet-700', icon: 'text-violet-600' },
                          ];
                          const c = colors[idx % colors.length];
                          return (
                            <button
                              key={topicName}
                              onClick={() => setSelectedTopic(topicName)}
                              className={`group relative text-left w-full rounded-2xl border ${c.light} p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:scale-95`}
                            >
                              {/* Top accent bar */}
                              <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${c.bg}`} />

                              <div className="flex items-start justify-between gap-3 mt-1">
                                <div className="flex-1 min-w-0">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Topic</span>
                                  <h4 className="font-black text-slate-800 text-base leading-tight truncate">{topicName}</h4>
                                </div>
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.bg} flex items-center justify-center shrink-0 shadow-md`}>
                                  <Target className="w-4 h-4 text-white" />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mt-4 flex-wrap">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${c.badge}`}>
                                  {topicTests.length} {topicTests.length === 1 ? 'Mock Test' : 'Mock Tests'}
                                </span>
                                {takenCount > 0 && (
                                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                                    {takenCount} Attempted
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                                View Tests <ChevronRight className="w-3 h-3" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // STEP 3 — Topic selected: show tests in that topic
                const testsInTopic = topicMap[selectedTopic] || [];
                return (
                  <div className="animate-in fade-in duration-150">
                    {/* Breadcrumb + Back */}
                    <div className="flex items-center gap-2 mb-5">
                      <button
                        onClick={() => setSelectedTopic(null)}
                        className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Back
                      </button>
                      <span className="text-slate-200 font-black">|</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedCategory}</span>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedTopic}</span>
                    </div>

                    {/* Topic header card */}
                    <div className="flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl px-5 py-4 mb-5 shadow-lg shadow-indigo-200">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest block">Topic / Sub-Category</span>
                        <h3 className="font-black text-white text-lg leading-tight truncate">{selectedTopic}</h3>
                      </div>
                      <span className="text-[10px] font-black text-white/80 bg-white/15 px-3 py-1.5 rounded-full shrink-0">
                        {testsInTopic.length} {testsInTopic.length === 1 ? 'Test' : 'Tests'}
                      </span>
                    </div>

                    {/* Test list */}
                    <div className="flex flex-col gap-3">
                      {testsInTopic.map((test, testIdx) => {
                        // All attempts for this test, sorted oldest → newest
                        const attemptsForTest = pastResults
                          .filter((r: any) => r.testId === test.id)
                          .sort((a: any, b: any) => a.timestamp - b.timestamp);
                        const isTaken = attemptsForTest.length > 0;
                        const attemptCount = attemptsForTest.length;
                        const latestAttempt = attemptsForTest[attemptCount - 1];
                        return (
                          <div key={test.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-px hover:border-indigo-100 transition-all duration-200 p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              {/* LEFT: Test name */}
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shrink-0 font-black text-sm">
                                  {testIdx + 1}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug">{test.title}</h4>
                                    {test.isPaid && myPurchases.length === 0
                                      ? <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-rose-200 shrink-0">👑 Premium</span>
                                      : test.isPaid
                                        ? <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-200 shrink-0">✔ Unlocked</span>
                                        : <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-100 shrink-0">Free</span>
                                    }
                                    {test.isActive && (
                                      <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest rounded border border-indigo-100 flex items-center gap-0.5 shrink-0">
                                        <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                        Live
                                      </span>
                                    )}
                                    {isTaken && (
                                      <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shrink-0">
                                        ✓ Attempted {attemptCount > 1 ? `×${attemptCount}` : ''}
                                      </span>
                                    )}
                                  </div>
                                  {test.subjectName && (
                                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block leading-none mt-1">{test.subjectName}</span>
                                  )}
                                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                    {(test.uniqueStudentCount ?? 0) > 0 && (
                                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                        👥 {(test.uniqueStudentCount as number).toLocaleString()} Students
                                      </span>
                                    )}
                                    {isTaken && latestAttempt && (
                                      <span className="text-[9px] font-bold text-indigo-500 flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" />
                                        Latest: {latestAttempt.score} marks
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* MIDDLE: Specs */}
                              <div className="shrink-0 text-left md:min-w-[130px] hidden md:block">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Specs</span>
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-indigo-500" />
                                  {test.duration || 30} min | {test.marksPerCorrect || 1}M
                                </span>
                              </div>

                              {/* RIGHT: Actions */}
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap justify-end">
                                {!test.isPaid && isTaken && (
                                  <button
                                    onClick={() => handleDownloadPDF(test.id, test.title, test.category || 'N/A', test.testType || 'N/A')}
                                    disabled={downloadingPDF === test.id}
                                    className="flex items-center justify-center p-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-xl transition-all disabled:opacity-50"
                                    title="Download PDF"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Previous Attempt Analysis dropdown button */}
                                {!test.isPaid && isTaken && (
                                  <div className="relative">
                                    <button
                                      onClick={() => setOpenAttemptDropdown(openAttemptDropdown === test.id ? null : test.id)}
                                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all active:scale-95"
                                    >
                                      <BarChart3 className="w-3.5 h-3.5" />
                                      Previous Attempt Analysis
                                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openAttemptDropdown === test.id ? 'rotate-180' : ''}`} />
                                    </button>

                                    {openAttemptDropdown === test.id && (
                                      <>
                                        {/* Backdrop to close on outside click */}
                                        <div className="fixed inset-0 z-40" onClick={() => setOpenAttemptDropdown(null)} />
                                        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-300/40 min-w-[300px] overflow-hidden">
                                          <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-100 flex items-center gap-2">
                                            <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">All Attempts — Select to View</p>
                                          </div>
                                          <div className="py-1">
                                            {attemptsForTest.map((r: any, i: number) => (
                                              <button
                                                key={r.id}
                                                onClick={() => { openAnalysis(r); setOpenAttemptDropdown(null); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group/item"
                                              >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black shadow-sm ${
                                                  i === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                  {i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                                                    {i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`} Attempt
                                                    {i === 0 && (
                                                      <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">Rank</span>
                                                    )}
                                                  </p>
                                                  <p className="text-[9px] font-medium text-slate-400 mt-0.5 tabular-nums">{formatAttemptDate(r.timestamp)}</p>
                                                </div>
                                                <span className={`text-[12px] font-black shrink-0 tabular-nums ${i === 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                                                  {r.score}
                                                </span>
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 group-hover/item:text-indigo-400 transition-colors" />
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
                                    className="px-4 py-2.5 font-black text-[9px] uppercase tracking-widest rounded-xl flex items-center gap-1.5 transition-all hover:brightness-110 active:scale-95 text-white"
                                    style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                                    🛒 Buy Now
                                  </button>
                                ) : (
                                  <Link
                                    to={`/test/${test.id}`}
                                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:from-slate-900 hover:to-slate-900 transition-all shadow-md shadow-indigo-200 hover:shadow-lg flex items-center gap-1 active:scale-95"
                                  >
                                    {isTaken ? 'Reattempt' : 'Attempt Mock'}
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full"></div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">📚 Study Materials</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {notes.map(note => (
                  <div key={note.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-xl hover:shadow-emerald-50 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-slate-800 text-base mb-1 tracking-tight line-clamp-2">{note.title}</h4>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-5 bg-emerald-50 inline-block px-2 py-0.5 rounded-md">{note.subject || 'Notes'}</p>
                    <a
                      href={note.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between w-full text-emerald-700 font-bold text-xs uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl hover:bg-emerald-600 hover:text-white hover:border-transparent transition-all"
                    >
                      Open Resource
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="col-span-full bg-white rounded-3xl p-16 border border-slate-100 text-center shadow-sm">
                    <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-emerald-200" />
                    </div>
                    <p className="font-black text-sm uppercase tracking-widest text-slate-400">Knowledge Base is Empty</p>
                  </div>
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
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">📄 Previous Year Questions</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {pyqs.map(pyq => (
                  <div key={pyq.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-xl hover:shadow-amber-50 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform duration-300">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-slate-800 text-base mb-1 tracking-tight line-clamp-2">{pyq.title}</h4>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-5 bg-amber-50 inline-block px-2 py-0.5 rounded-md">{pyq.subject || 'PYQ'}</p>
                    <a
                      href={pyq.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between w-full text-amber-700 font-bold text-xs uppercase tracking-wider bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-xl hover:bg-amber-500 hover:text-white hover:border-transparent transition-all"
                    >
                      Open Document
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
                {pyqs.length === 0 && (
                  <div className="col-span-full bg-white rounded-3xl p-16 border border-slate-100 text-center shadow-sm">
                    <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-amber-200" />
                    </div>
                    <p className="font-black text-sm uppercase tracking-widest text-slate-400">No PYQs uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pattern' && (
            <div className="space-y-8 animate-in fade-in duration-150">
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

      {/* SW update toast — notifies when a new version is deployed */}
      <AppUpdateToast />
    </div>
  );
}




