import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { RenderMathText } from '../components/MathRenderer';
import { Trophy, Target, LogOut, FileText, CheckCircle, Clock, BookOpen, Play, ChevronRight, ChevronLeft, ArrowLeft, ExternalLink, Menu, X, Youtube, MessageCircle, Send, LayoutDashboard, History, ChevronDown, ArrowRight, User, Info, Phone, Download, Printer, AlertCircle, BarChart3, Keyboard, Globe, Layers, CheckSquare, Volume2, VolumeX, Maximize, NotebookPen } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DashboardTab = 'home' | 'profile' | 'mock_topic' | 'mock_sectional' | 'mock_full' | 'notes' | 'video' | 'pyq' | 'pattern' | 'affairs' | 'practice' | 'about' | 'contact' | 'learn_landing' | 'mock_landing' | 'live_test';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [activeTests, setActiveTests] = useState<any[]>([]);
  const [liveTests, setLiveTests] = useState<any[]>([]);
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

  // Analysis State
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [analysisLiveRank, setAnalysisLiveRank] = useState<{ myRank: number; totalParticipants: number; uniqueStudents?: number; percentile?: number } | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
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
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [testQuestions, setTestQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [videoNotes, setVideoNotes] = useState<string>('');

  const fetchQuestionsForAnalysis = async (testId: string) => {
    if (!user) return;
    setLoadingQuestions(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/test-questions/${testId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTestQuestions(data.questions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        console.log("Fetching student data...");
        
        // Fetch Active Tests (ordered by creation — first added = first shown)
        const testsQuery = query(collection(db, 'tests'), where('isActive', '==', true), orderBy('createdAt', 'asc'));
        const testsSnap = await getDocs(testsQuery);
        const allTests = testsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActiveTests(allTests);
        setLiveTests(allTests.filter((t: any) => t.isLive));
        
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

        // Fetch Category Order
        const orderRes = await fetch('/api/category-order');
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setCategoryOrder(orderData.order || []);
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
      <aside className={`fixed inset-y-0 left-0 bg-white text-slate-700 flex flex-col w-64 h-full shrink-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{borderRight: '1px solid #e8ecf3'}}>
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
              <div className="pl-2 pr-1 py-2 space-y-1.5 bg-slate-950/20 rounded-xl border border-white/5 animate-in slide-in-from-top-2 duration-200">
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
                  onClick={() => { setActiveTab('affairs'); setIsSidebarOpen(false); }} 
                  className={`w-full sub-category sub-learn-affairs ${activeTab === 'affairs' ? 'active' : ''}`}
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
              <div className="pl-2 pr-1 py-2 space-y-1.5 bg-slate-950/20 rounded-xl border border-white/5 animate-in slide-in-from-top-2 duration-200">
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

          <div className="px-3 pb-1 pt-3" style={{fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#374151'}}>Resources</div>

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
        <header className="h-16 backdrop-blur-xl flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-10 w-full" style={{background: 'rgba(255,255,255,0.9)', borderBottom: '1px solid #e8ecf3', boxShadow: '0 1px 8px rgba(0,0,0,0.04)'}}>
          <div className="flex items-center flex-1">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 mr-3 -ml-1 rounded-xl transition-colors"
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
          <div className="flex items-center gap-3">
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
            <button
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
              style={{background: '#f1f5f9', color: '#64748b'}}
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="p-5 md:p-8 w-full animate-in fade-in duration-500">
          
          {/* Home Tab – Design D */}
          {activeTab === 'home' && (
            <div className="animate-in fade-in duration-500 space-y-5">
              {/* ── Design D: Greeting + Stats chips ── */}
              <div className="flex items-start md:items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl md:text-2xl font-black tracking-tight" style={{color: '#1e293b'}}>
                    Good morning, <span style={{color: '#4f46e5'}}>{profile?.name?.split(' ')[0] || 'Student'}!</span> 👋
                  </h1>
                  <p className="text-sm font-medium mt-1" style={{color: '#64748b'}}>
                    {new Date().toLocaleDateString('en-IN', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{background: '#fff', border: '1px solid #e8ecf3', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'}}>
                    <span className="text-lg">📝</span>
                    <div>
                      <div className="text-sm font-black" style={{color: '#1e293b'}}>{performanceStats.totalTests}</div>
                      <div className="text-[10px] font-medium" style={{color: '#94a3b8'}}>Tests Done</div>
                    </div>
                  </div>
                  {performanceStats.totalTests > 0 && (
                    <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{background: '#fff', border: '1px solid #e8ecf3', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'}}>
                      <span className="text-lg">📈</span>
                      <div>
                        <div className="text-sm font-black" style={{color: '#059669'}}>{performanceStats.avgScore}%</div>
                        <div className="text-[10px] font-medium" style={{color: '#94a3b8'}}>Avg Score</div>
                      </div>
                    </div>
                  )}
                  {profile?.batch && (
                    <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{background: '#fffbeb', border: '1px solid #fde68a', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'}}>
                      <span className="text-lg">🏆</span>
                      <div>
                        <div className="text-sm font-black" style={{color: '#92400e'}}>{profile.batch}</div>
                        <div className="text-[10px] font-medium" style={{color: '#94a3b8'}}>Batch</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Hero Banner ── */}
              <div className="rounded-[20px] p-6 md:p-8 relative overflow-hidden" style={{background: 'linear-gradient(125deg, #1e1f2e 0%, #16213e 50%, #0f3460 100%)', border: '1px solid rgba(99,102,241,0.15)'}}>
                <div className="absolute top-0 right-0 pointer-events-none" style={{width: 280, height: 280, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', transform: 'translate(40px, -40px)'}} />
                <div className="absolute pointer-events-none" style={{bottom: 0, left: '40%', width: 200, height: 200, background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', transform: 'translate(0, 40px)'}} />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc'}}>
                      🎯 Master every topic — one test at a time
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black leading-tight tracking-tight mb-2" style={{color: '#f1f5f9'}}>
                      Ready to climb<br className="hidden md:block"/>the leaderboard?
                    </h2>
                    <p className="text-sm font-medium leading-relaxed mb-6 max-w-md" style={{color: '#94a3b8'}}>
                      Attempt live tests, review your performance, and stay ahead of the competition.
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      <button onClick={() => setActiveTab('live_test')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90" style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)'}}>
                        ⚡ Attempt Live Test
                      </button>
                      <button onClick={() => setActiveTab('mock_landing')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:bg-white/10" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1'}}>
                        View Mock Tests
                      </button>
                    </div>
                  </div>
                  <div className="hidden md:flex gap-3 flex-shrink-0">
                    <div className="text-center p-4 rounded-2xl" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)'}}>
                      <div className="text-2xl font-black" style={{color: '#818cf8'}}>{performanceStats.totalTests}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mt-1.5" style={{color: '#6b7280'}}>Tests<br/>Done</div>
                    </div>
                    <div className="text-center p-4 rounded-2xl" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)'}}>
                      <div className="text-2xl font-black" style={{color: '#34d399'}}>{performanceStats.totalTests > 0 ? performanceStats.avgScore + '%' : '–'}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mt-1.5" style={{color: '#6b7280'}}>Avg<br/>Score</div>
                    </div>
                    <div className="text-center p-4 rounded-2xl" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)'}}>
                      <div className="text-2xl font-black" style={{color: '#fbbf24'}}>{performanceStats.bestScore > 0 ? performanceStats.bestScore + '%' : '–'}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mt-1.5" style={{color: '#6b7280'}}>Best<br/>Score</div>
                    </div>
                  </div>
                </div>
              </div>

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

              {/* ── Quick Access Grid ── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{color: '#94a3b8'}}>Quick Access</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                  <button onClick={() => setActiveTab('live_test')} className="rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 relative overflow-hidden" style={{background: '#fff', border: '1px solid #e8ecf3', boxShadow: '0 1px 6px rgba(0,0,0,0.04)'}}>
                    <div className="absolute top-0 right-0 rounded-full pointer-events-none" style={{width: 80, height: 80, background: 'rgba(239,68,68,0.06)', transform: 'translate(20px,-20px)'}} />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4" style={{background: 'rgba(239,68,68,0.12)'}}>🔴</div>
                    <p className="font-black text-sm" style={{color: '#1e293b'}}>Live Tests</p>
                    <p className="text-xs font-medium mt-1 mb-3" style={{color: '#94a3b8'}}>{liveTests.length} tests</p>
                    <div className="h-1 rounded-full overflow-hidden" style={{background: 'rgba(255,255,255,0.06)'}}><div className="h-full rounded-full animate-pulse" style={{width: '100%', background: 'linear-gradient(90deg,#ef4444,#f87171)'}} /></div>
                    <p className="text-xs font-bold mt-2" style={{color: '#f87171'}}>Active</p>
                  </button>

                  <button onClick={() => setActiveTab('mock_landing')} className="rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 relative overflow-hidden" style={{background: '#fff', border: '1px solid #e8ecf3', boxShadow: '0 1px 6px rgba(0,0,0,0.04)'}}>
                    <div className="absolute top-0 right-0 rounded-full pointer-events-none" style={{width: 80, height: 80, background: 'rgba(99,102,241,0.06)', transform: 'translate(20px,-20px)'}} />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4" style={{background: 'rgba(99,102,241,0.12)'}}>🎯</div>
                    <p className="font-black text-sm" style={{color: '#1e293b'}}>Mock Tests</p>
                    <p className="text-xs font-medium mt-1 mb-3" style={{color: '#94a3b8'}}>{activeTests.length} tests</p>
                    <div className="h-1 rounded-full overflow-hidden" style={{background: 'rgba(255,255,255,0.06)'}}><div className="h-full rounded-full" style={{width: `${Math.min(100, performanceStats.totalTests > 0 ? Math.round((performanceStats.totalTests / Math.max(activeTests.length, 1)) * 100) : 0)}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)'}} /></div>
                    <p className="text-xs font-bold mt-2" style={{color: '#818cf8'}}>{performanceStats.totalTests > 0 ? Math.round((performanceStats.totalTests / Math.max(activeTests.length, 1)) * 100) + '% done' : 'Not started'}</p>
                  </button>

                  <button onClick={() => setActiveTab('learn_landing')} className="rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 relative overflow-hidden" style={{background: '#fff', border: '1px solid #e8ecf3', boxShadow: '0 1px 6px rgba(0,0,0,0.04)'}}>
                    <div className="absolute top-0 right-0 rounded-full pointer-events-none" style={{width: 80, height: 80, background: 'rgba(16,185,129,0.06)', transform: 'translate(20px,-20px)'}} />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4" style={{background: 'rgba(16,185,129,0.12)'}}>📚</div>
                    <p className="font-black text-sm" style={{color: '#1e293b'}}>Learn</p>
                    <p className="text-xs font-medium mt-1 mb-3" style={{color: '#94a3b8'}}>{notes.length + videos.length} resources</p>
                    <div className="h-1 rounded-full overflow-hidden" style={{background: 'rgba(255,255,255,0.06)'}}><div className="h-full rounded-full" style={{width: '60%', background: 'linear-gradient(90deg,#10b981,#34d399)'}} /></div>
                    <p className="text-xs font-bold mt-2" style={{color: '#34d399'}}>Explore</p>
                  </button>

                  <button onClick={() => navigate('/typing-test')} className="rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 relative overflow-hidden" style={{background: '#fff', border: '1px solid #e8ecf3', boxShadow: '0 1px 6px rgba(0,0,0,0.04)'}}>
                    <div className="absolute top-0 right-0 rounded-full pointer-events-none" style={{width: 80, height: 80, background: 'rgba(245,158,11,0.06)', transform: 'translate(20px,-20px)'}} />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4" style={{background: 'rgba(245,158,11,0.12)'}}>⌨️</div>
                    <p className="font-black text-sm" style={{color: '#1e293b'}}>Typing Test</p>
                    <p className="text-xs font-medium mt-1 mb-3" style={{color: '#94a3b8'}}>NTPC / CLERK / CGL</p>
                    <div className="h-1 rounded-full overflow-hidden" style={{background: 'rgba(255,255,255,0.06)'}}><div className="h-full rounded-full" style={{width: '45%', background: 'linear-gradient(90deg,#f59e0b,#fbbf24)'}} /></div>
                    <p className="text-xs font-bold mt-2" style={{color: '#fbbf24'}}>Practice</p>
                  </button>

                </div>
              </div>

              {/* ── Study Resources ── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{color: '#94a3b8'}}>Study Resources</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  <button onClick={() => setActiveTab('notes')} className="rounded-2xl p-4 md:p-5 flex items-center gap-4 text-left transition-all hover:-translate-y-0.5" style={{background: '#fff', border: '1px solid #e8ecf3', boxShadow: '0 1px 4px rgba(0,0,0,0.03)'}}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{background: '#eef2ff'}}>📚</div>
                    <div className="flex-1">
                      <p className="font-black text-sm" style={{color: '#1e293b'}}>Study Notes</p>
                      <p className="text-xs font-medium mt-0.5" style={{color: '#94a3b8'}}>{notes.length} PDFs available</p>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{color: '#cbd5e1'}} />
                  </button>

                  <button onClick={() => setActiveTab('video')} className="rounded-2xl p-4 md:p-5 flex items-center gap-4 text-left transition-all hover:-translate-y-0.5" style={{background: '#fff', border: '1px solid #e8ecf3', boxShadow: '0 1px 4px rgba(0,0,0,0.03)'}}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{background: '#f5f3ff'}}>🎬</div>
                    <div className="flex-1">
                      <p className="font-black text-sm" style={{color: '#1e293b'}}>Video Lectures</p>
                      <p className="text-xs font-medium mt-0.5" style={{color: '#94a3b8'}}>{videos.length} videos</p>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{color: '#cbd5e1'}} />
                  </button>

                  <button onClick={() => setActiveTab('affairs')} className="rounded-2xl p-4 md:p-5 flex items-center gap-4 text-left transition-all hover:-translate-y-0.5" style={{background: '#fff', border: '1px solid #e8ecf3', boxShadow: '0 1px 4px rgba(0,0,0,0.03)'}}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{background: '#fffbeb'}}>📰</div>
                    <div className="flex-1">
                      <p className="font-black text-sm" style={{color: '#1e293b'}}>Current Affairs</p>
                      <p className="text-xs font-medium mt-0.5" style={{color: '#94a3b8'}}>Updated daily</p>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{color: '#cbd5e1'}} />
                  </button>

                </div>
              </div>

              {/* ── Assistant Bar ── */}
              <a href="tel:8900011708" className="flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-white hover:brightness-110 active:scale-[0.99] transition-all" style={{background: 'linear-gradient(90deg,#1e1b4b 0%,#1e3a5f 100%)', border: '1px solid rgba(99,102,241,0.15)'}}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-base" style={{background: 'rgba(99,102,241,0.3)'}}>🤖</span>
                <span className="flex-1 text-[11px] sm:text-xs font-semibold truncate" style={{color: 'rgba(165,180,252,0.9)'}}>
                  Need help? Our assistant is ready — <span className="font-black text-white">Call 8900011708</span>
                </span>
                <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{background: 'rgba(255,255,255,0.1)'}}>
                  <ChevronRight className="w-3.5 h-3.5" style={{color: 'rgba(165,180,252,0.7)'}} />
                </span>
              </a>

              {/* ── old hero removed ── */}
              <div style={{display:'none'}}>
                {/* Rotating light sweep — uses Tailwind's built-in @keyframes spin */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    inset: '-60%',
                    background: 'conic-gradient(from 0deg, transparent 0%, transparent 35%, #818cf8 48%, #a78bfa 52%, #e879f9 58%, #f472b6 62%, transparent 75%, transparent 100%)',
                    animation: 'spin 5s linear infinite',
                  }}
                />

                {/* Actual banner card — sits on top of the rotating gradient */}
                <div
                  className="relative rounded-[22px] overflow-hidden text-white"
                  style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}
                >
                  {/* ── Right panel image: online mock test, phone, books & pen ── */}
                  <div className="absolute inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[55%] pointer-events-none select-none">
                    <img
                      src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&q=85&auto=format&fit=crop&crop=right"
                      alt="Student studying with phone, books and pen"
                      className="w-full h-full object-cover object-right"
                      loading="eager"
                      draggable={false}
                    />

                    {/* Floating icons — visible on all sizes, anchored right side */}
                    <span className="absolute top-3 right-5 text-xl drop-shadow-lg animate-bounce" style={{ animationDuration: '2.8s' }}>📱</span>
                    <span className="absolute top-12 right-14 text-base drop-shadow-md animate-bounce" style={{ animationDuration: '3.4s', animationDelay: '0.5s' }}>📚</span>
                    <span className="absolute bottom-10 right-6 text-lg drop-shadow-md animate-bounce" style={{ animationDuration: '3.1s', animationDelay: '1s' }}>✏️</span>
                    <span className="absolute bottom-4 right-16 text-base drop-shadow-md animate-bounce" style={{ animationDuration: '2.6s', animationDelay: '0.3s' }}>📝</span>
                    <span className="absolute top-[40%] right-3 text-sm drop-shadow-md animate-bounce" style={{ animationDuration: '3.7s', animationDelay: '1.4s' }}>🎯</span>

                    {/* Mobile overlay — heavy left gradient, no blur (GPU-safe) */}
                    <div
                      className="absolute inset-0 sm:hidden"
                      style={{ background: 'linear-gradient(to right, rgba(15,12,41,0.97) 0%, rgba(48,43,99,0.92) 42%, rgba(36,36,62,0.65) 70%, rgba(15,12,41,0.30) 100%)' }}
                    />

                    {/* Desktop Layer A — colour anchor gradient */}
                    <div
                      className="absolute inset-y-0 left-0 w-[62%] hidden sm:block"
                      style={{ background: 'linear-gradient(to right, #302b63 0%, rgba(48,43,99,0.97) 20%, rgba(48,43,99,0.72) 50%, rgba(36,36,62,0.22) 80%, transparent 100%)' }}
                    />

                    {/* Desktop Layer B — frosted blur with CSS mask fade */}
                    <div
                      className="absolute inset-y-0 left-0 w-[50%] hidden sm:block"
                      style={{
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        maskImage: 'linear-gradient(to right, black 0%, black 28%, rgba(0,0,0,0.5) 58%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, black 0%, black 28%, rgba(0,0,0,0.5) 58%, transparent 100%)',
                      }}
                    />

                    {/* Desktop Layer C — top/bottom vignette */}
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to bottom, rgba(15,12,41,0.38) 0%, transparent 28%, transparent 68%, rgba(15,12,41,0.48) 100%)' }}
                    />
                  </div>

                  {/* Dot-grid texture overlay */}
                  <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                  />

                  {/* ── Welcome text ── */}
                  <div className="relative z-10 p-5 sm:p-6 md:p-8 flex flex-col justify-center min-h-[150px] sm:min-h-[180px] sm:max-w-[50%]">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-2 tracking-tight leading-tight">
                      Hello,{' '}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300">
                        {profile?.name?.split(' ')[0] || 'Student'}
                      </span>
                      ! 👋
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-white/60 leading-relaxed">
                      🎯 Every test you attempt brings you one step closer to your dream!
                    </p>
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
            <div className="space-y-6 animate-in fade-in duration-700">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">📰 Current Affairs</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {affairs.map(item => (
                  <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-xl hover:shadow-blue-50 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-slate-800 text-base mb-1 tracking-tight line-clamp-2">{item.title}</h4>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-5 bg-blue-50 inline-block px-2 py-0.5 rounded-md">{item.date || 'Latest'}</p>
                    <a
                      href={item.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between w-full text-blue-700 font-bold text-xs uppercase tracking-wider bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-xl hover:bg-blue-600 hover:text-white hover:border-transparent transition-all"
                    >
                      Read Now
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
                {affairs.length === 0 && (
                  <div className="col-span-full bg-white rounded-3xl p-16 border border-slate-100 text-center shadow-sm">
                    <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-blue-200" />
                    </div>
                    <p className="font-black text-sm uppercase tracking-widest text-slate-400">No Current Affairs uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Practice Set Tab Content */}
          {activeTab === 'practice' && (
            <div className="space-y-6 animate-in fade-in duration-700">
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

          {/* ── Mock Test Landing (category chooser) ───────────────────── */}
          {activeTab === 'mock_landing' && (
            <div className="animate-in fade-in duration-500">
              {/* Header */}
              <div className="flex items-center gap-3 mb-8">
                <button onClick={() => setActiveTab('home')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">🎯 Mock Tests</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Choose your test format and start practising</p>
                </div>
              </div>

              {/* Category Cards */}
              <div className="grid grid-cols-1 gap-4">

                {/* Topic Wise */}
                <button
                  onClick={() => setActiveTab('mock_topic')}
                  className="group relative overflow-hidden rounded-3xl p-6 text-left bg-white border border-indigo-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-violet-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                  <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-400/8 rounded-full translate-x-1/4 -translate-y-1/4 group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                  <div className="relative flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-300 shrink-0">
                      <Layers className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Topic Wise Mock</h3>
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">Focused</span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">Practice chapter-by-chapter. Perfect for targeted revision on specific subjects or topics.</p>
                      <div className="mt-3 flex items-center gap-1 text-indigo-600 text-[11px] font-black uppercase tracking-wider">
                        Start Now <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </button>

                {/* Sectional Mock */}
                <button
                  onClick={() => setActiveTab('mock_sectional')}
                  className="group relative overflow-hidden rounded-3xl p-6 text-left bg-white border border-rose-100 shadow-sm hover:shadow-xl hover:shadow-rose-100 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                  <div className="absolute top-0 right-0 w-40 h-40 bg-rose-400/8 rounded-full translate-x-1/4 -translate-y-1/4 group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                  <div className="relative flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform duration-300 shrink-0">
                      <CheckSquare className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Sectional Mock</h3>
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">Section</span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">Test your knowledge section-by-section. Ideal for identifying weak areas before the full exam.</p>
                      <div className="mt-3 flex items-center gap-1 text-rose-600 text-[11px] font-black uppercase tracking-wider">
                        Start Now <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </button>

                {/* Full Mock */}
                <button
                  onClick={() => setActiveTab('mock_full')}
                  className="group relative overflow-hidden rounded-3xl p-6 text-left bg-white border border-amber-100 shadow-sm hover:shadow-xl hover:shadow-amber-100 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                  <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/8 rounded-full translate-x-1/4 -translate-y-1/4 group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                  <div className="relative flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform duration-300 shrink-0">
                      <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Full Mock Test</h3>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Complete</span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">Full-length exam simulation with real exam timing & pressure. The ultimate test of your preparation.</p>
                      <div className="mt-3 flex items-center gap-1 text-amber-600 text-[11px] font-black uppercase tracking-wider">
                        Start Now <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Bottom tip */}
              <div className="mt-6 flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-0.5">Pro Tip</p>
                  <p className="text-xs text-indigo-600 font-medium leading-relaxed">Start with Topic Wise tests to build a strong base, then move to Sectional and finally Full Mock for complete exam readiness.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Learn Landing (category chooser) ────────────────────────── */}
          {activeTab === 'learn_landing' && (
            <div className="animate-in fade-in duration-500">
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
                  onClick={() => setActiveTab('affairs')}
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

            const openLiveAnalysis = async (testId: string, result: any) => {
              setAnalysisLiveRank(null);
              setSelectedResult(result);
              setShowFullAnalysis(false);
              setShowAnalysisModal(true);
              try {
                const token = await user!.getIdToken();
                const res = await fetch(
                  `/api/test-leaderboard/${testId}?myScore=${encodeURIComponent(result.score)}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                if (res.ok) {
                  const lb = await res.json();
                  setAnalysisLiveRank({ myRank: lb.myRank, totalParticipants: lb.totalParticipants, uniqueStudents: lb.uniqueStudents, percentile: lb.percentile });
                }
              } catch {}
            };

            const LiveCard = ({ t, badge }: { key?: any; t: any; badge: 'live' | 'upcoming' | 'past' }) => {
              const prevResult = pastResults.find((r: any) => r.testId === t.id);
              const hasAttempted = !!prevResult;

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
                  /* Already attempted — show two options */
                  <div className="flex gap-2">
                    <button
                      onClick={() => openLiveAnalysis(t.id, prevResult)}
                      className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      <BarChart3 className="w-3.5 h-3.5" /> Previous Analysis
                    </button>
                    <button
                      onClick={() => navigate(`/test/${t.id}`)}
                      className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5" /> Re-attempt
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
              <div className="space-y-8 animate-in fade-in duration-700">
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
            <div className="space-y-8 animate-in fade-in duration-700">

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
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
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
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
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
                        const isTaken = pastResults.some(r => r.testId === test.id);
                        return (
                          <div key={test.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-px hover:border-indigo-100 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
                            {/* LEFT: Test name */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shrink-0 font-black text-sm">
                                {testIdx + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug">{test.title}</h4>
                                  {test.isPaid
                                    ? <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-rose-200 shrink-0">Paid</span>
                                    : <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-100 shrink-0">Free</span>
                                  }
                                  {test.isActive && (
                                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest rounded border border-indigo-100 flex items-center gap-0.5 shrink-0">
                                      <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                      Live
                                    </span>
                                  )}
                                </div>
                                {test.subjectName && (
                                  <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block leading-none mt-1">{test.subjectName}</span>
                                )}
                                {(test.uniqueStudentCount ?? 0) > 0 && (
                                  <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                    👥 {(test.uniqueStudentCount as number).toLocaleString()} Students
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* MIDDLE: Specs */}
                            <div className="shrink-0 text-left md:min-w-[130px]">
                              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Specs</span>
                              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-indigo-500" />
                                {test.duration || 30} min | {test.marksPerCorrect || 1}M
                              </span>
                            </div>

                            {/* RIGHT: Actions */}
                            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                              {!test.isPaid && isTaken && (
                                <>
                                  <button
                                    onClick={() => handleDownloadPDF(test.id, test.title, test.category || 'N/A', test.testType || 'N/A')}
                                    disabled={downloadingPDF === test.id}
                                    className="flex items-center justify-center p-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-xl transition-all disabled:opacity-50"
                                    title="Download PDF"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const res = pastResults.find(r => r.testId === test.id);
                                      if (res) {
                                        setAnalysisLiveRank(null);
                                        setSelectedResult(res);
                                        setShowAnalysisModal(true);
                                        setShowFullAnalysis(false);
                                        fetchQuestionsForAnalysis(test.id);
                                        try {
                                          const token = await user!.getIdToken();
                                          const lbRes = await fetch(`/api/test-leaderboard/${test.id}?myScore=${encodeURIComponent(res.score)}`, { headers: { Authorization: `Bearer ${token}` } });
                                          if (lbRes.ok) {
                                            const lb = await lbRes.json();
                                            setAnalysisLiveRank({ myRank: lb.myRank, totalParticipants: lb.totalParticipants, uniqueStudents: lb.uniqueStudents, percentile: lb.percentile });
                                          }
                                        } catch {}
                                      }
                                    }}
                                    className="px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all"
                                  >
                                    Analysis
                                  </button>
                                </>
                              )}
                              {test.isPaid ? (
                                <span className="px-5 py-2.5 bg-rose-100 text-rose-600 font-black text-[9px] uppercase tracking-widest rounded-xl border border-rose-200 flex items-center gap-1.5 cursor-not-allowed">
                                  🔒 Purchase Required
                                </span>
                              ) : (
                                <Link
                                  to={`/test/${test.id}`}
                                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:from-slate-900 hover:to-slate-900 transition-all shadow-md shadow-indigo-200 hover:shadow-lg flex items-center gap-1 active:scale-95"
                                >
                                  {isTaken ? 'Reattempt' : 'Attempt Mock'}
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              )}
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
            <div className="space-y-6 animate-in fade-in duration-700">
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
            <div className="space-y-8 animate-in fade-in duration-700">
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
            <div className="space-y-6 animate-in fade-in duration-700">
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

      {/* Detailed Analysis Modal */}
      {showAnalysisModal && selectedResult && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-8 text-white relative flex justify-between items-center shrink-0">
               <div className="flex-1">
                 <h2 className="text-2xl font-black mb-1 tracking-tighter uppercase">
                   {showFullAnalysis ? 'Detailed Question Review' : 'Attempt Analysis'}
                 </h2>
                 <p className="text-slate-400 font-bold text-xs">{selectedResult.testTitle || 'Mock Test'}</p>
               </div>
              <button
                onClick={() => { setShowAnalysisModal(false); setShowFullAnalysis(false); setAnalysisLiveRank(null); }}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#f8f9fa]">
              {!showFullAnalysis ? (
                /* Summary Section */
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                  {/* Rank & percentile banner */}
                  {analysisLiveRank && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-amber-100">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Your Rank (1st Attempt)</p>
                          <p className="text-3xl font-black">#{analysisLiveRank.myRank}/{analysisLiveRank.totalParticipants}</p>
                        </div>
                        <Trophy className="w-10 h-10 opacity-60" />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {analysisLiveRank.percentile !== undefined && (
                          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">Percentile: {analysisLiveRank.percentile}%ile</span>
                        )}
                        {analysisLiveRank.uniqueStudents !== undefined && (
                          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">👥 {analysisLiveRank.uniqueStudents.toLocaleString()} Total Students</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                      <span className="block text-[10px] font-black text-slate-400 uppercase mb-2">Marks Obtained</span>
                      <span className="text-3xl font-black text-indigo-600">{selectedResult.score}</span>
                      <span className="block text-[10px] font-bold text-slate-400 mt-1">out of {selectedResult.totalQuestions * (selectedResult.marksPerCorrect || 1)}</span>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                      <span className="block text-[10px] font-black text-slate-400 uppercase mb-2">Accuracy %</span>
                      <span className={`text-3xl font-black ${selectedResult.accuracy >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {selectedResult.accuracy || 0}%
                      </span>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                      <span className="block text-[10px] font-black text-slate-400 uppercase mb-2">Correct Hits</span>
                      <span className="text-3xl font-black text-emerald-500">{selectedResult.correctAnswers}</span>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                      <span className="block text-[10px] font-black text-slate-400 uppercase mb-2">Time Taken</span>
                      <span className="text-3xl font-black text-slate-700">{selectedResult.timeTaken || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                       <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                         <AlertCircle className="w-6 h-6" />
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase">Wrong Answers</p>
                         <p className="text-xl font-black text-rose-600">{selectedResult.wrongAnswers}</p>
                       </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                       <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
                         <BarChart3 className="w-6 h-6" />
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase">Unattempted</p>
                         <p className="text-xl font-black text-slate-600">{selectedResult.unattempted || 0}</p>
                       </div>
                    </div>
                  </div>

                  <div className="bg-indigo-600 rounded-3xl p-8 text-white flex items-center justify-between shadow-xl shadow-indigo-100">
                    <div>
                      <h4 className="text-xl font-black mb-1">Deep Dive into Mistakes?</h4>
                      <p className="text-indigo-100 text-xs font-medium">See which questions you missed and review explanations.</p>
                    </div>
                    <button 
                      onClick={() => setShowFullAnalysis(true)}
                      className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-lg"
                    >
                      Full Analysis
                    </button>
                  </div>

                  <div className="text-center pb-4 space-y-1">
                    {selectedResult.attemptNumber && (
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${selectedResult.isFirstAttempt ? 'text-indigo-400' : 'text-amber-400'}`}>
                        Attempt #{selectedResult.attemptNumber} — {selectedResult.isFirstAttempt ? 'Counts for Leaderboard' : 'Reattempt: Not in Leaderboard'}
                      </p>
                    )}
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Attempted on {new Date(selectedResult.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                /* Full Analysis View */
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                  <button 
                    onClick={() => setShowFullAnalysis(false)}
                    className="flex items-center gap-2 text-indigo-600 font-bold text-xs bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all mb-4"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Summary
                  </button>

                  <div className="space-y-6">
                    {loadingQuestions ? (
                      <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Question Bank...</p>
                      </div>
                    ) : testQuestions.map((q, idx) => {
                      const userAns = selectedResult.userAnswers?.[q.id];
                      // Normalize answers for comparison - handling potential label vs text issues
                      const correctAnswerRaw = q.correctAnswer;
                      const userAnsRaw = userAns;
                      
                      const isCorrect = userAnsRaw === correctAnswerRaw;
                      const isSkipped = !userAnsRaw;

                      return (
                        <div key={q.id} className={`bg-white rounded-[32px] p-8 border shadow-sm transition-all overflow-hidden ${isCorrect ? 'border-emerald-100' : isSkipped ? 'border-slate-100' : 'border-rose-100'}`}>
                          <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                              <span className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-sm font-black text-white shadow-lg">
                                {idx + 1}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question</span>
                                <span className="text-xs font-bold text-slate-600">{q.topic || 'General Mock'}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isSkipped ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-200">
                                  <Info className="w-4 h-4 text-slate-400" />
                                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Not Attempted</span>
                                </div>
                              ) : isCorrect ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-200">
                                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Correct</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-full border border-rose-200">
                                  <X className="w-4 h-4 text-rose-600" />
                                  <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Incorrect</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <h4 className="font-bold text-slate-800 text-xl mb-4 leading-relaxed px-2"><RenderMathText text={q.questionText} /></h4>
                          {q.equationLatex && (
                            <div className="mb-6 px-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-center text-xl overflow-x-auto">
                              <RenderMathText text={`$$${q.equationLatex}$$`} />
                            </div>
                          )}
                          {q.imageUrl && (
                            <div className="mb-8 px-2 flex justify-center">
                              <img src={q.imageUrl} alt="Question figure" className="max-h-52 rounded-xl object-contain border border-slate-100 bg-slate-50" />
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            {q.options.map((opt: string, i: number) => {
                              const label = String.fromCharCode(65 + i);
                              const isThisCorrect = opt === correctAnswerRaw;
                              const isThisUserAns = opt === userAnsRaw;
                              
                              let state: 'default' | 'correct' | 'incorrect' = 'default';
                              if (isThisCorrect) state = 'correct';
                              else if (isThisUserAns && !isCorrect) state = 'incorrect';

                              return (
                                <div 
                                  key={i} 
                                  className={`p-5 rounded-2xl border-2 flex items-center gap-4 transition-all relative
                                    ${state === 'correct' 
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-md shadow-emerald-100 ring-2 ring-emerald-500/10' 
                                      : state === 'incorrect'
                                      ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-md shadow-rose-100 ring-2 ring-rose-500/10'
                                      : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                  <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-black text-sm
                                    ${state === 'correct' ? 'bg-emerald-500 text-white shadow-md' : state === 'incorrect' ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                                    {label}
                                  </span>
                                  <span className="font-bold text-sm md:text-base leading-tight pr-6">{opt}</span>
                                  
                                  {state === 'correct' && (
                                    <div className="absolute right-4 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  )}
                                  {state === 'incorrect' && (
                                    <div className="absolute right-4 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center shadow-sm">
                                      <X className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Timing, Success Rate and Difficulty Stats Dashboard Panel */}
                          <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-slate-100 items-center justify-between text-xs text-slate-500 mb-6">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-400">Time Spent:</span>
                              <span className="font-extrabold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg">
                                {selectedResult.questionTimes?.[q.id] !== undefined ? `${selectedResult.questionTimes[q.id]} sec` : 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-400">Success Rate:</span>
                              <span className={`font-extrabold px-3 py-1.5 rounded-lg ${
                                (q.successPercentage || 100) >= 75 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                (q.successPercentage || 100) >= 40 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>{q.successPercentage !== undefined ? `${q.successPercentage}% students correct` : '100% correct'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-400">Difficulty:</span>
                              <span className={`font-extrabold px-3 py-1.5 rounded-lg ${
                                q.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' :
                                q.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>{q.difficulty || 'Easy'}</span>
                            </div>
                          </div>

                          {q.explanation && (
                            <div className="mt-4 bg-[#f8fafc] p-6 md:p-8 rounded-[24px] border border-slate-100 relative group overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 text-indigo-500/5 transition-transform group-hover:scale-110">
                                <Info className="w-16 h-16 rotate-12" />
                              </div>
                              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 relative z-10">
                                <div className="w-1.5 h-3 bg-indigo-500 rounded-full"></div>
                                Solution Deep Dive
                              </p>
                              <div className="text-slate-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium relative z-10">
                                {q.explanation}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-white border-t border-slate-100 flex gap-4 shrink-0">
               <button 
                onClick={() => {
                  const testData = activeTests.find(t => t.id === selectedResult.testId);
                  handleDownloadPDF(
                    selectedResult.testId, 
                    selectedResult.testTitle || 'Mock Test',
                    testData?.category || 'N/A',
                    testData?.testType || 'N/A'
                  );
                }}
                disabled={downloadingPDF === selectedResult.testId}
                className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-indigo-600 transition shadow-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {downloadingPDF === selectedResult.testId ? 'Preparing...' : 'Download Analysis PDF'}
              </button>
              <button 
                onClick={() => { setShowAnalysisModal(false); setShowFullAnalysis(false); }}
                className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition uppercase tracking-widest text-[10px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Floating Social Pills (slim, single-line) ─────────────────── */}
      {activeTab === 'home' && (
        <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-1.5 pointer-events-none">
          {currentPopupIndex === 0 && socialLinks.whatsapp && (
            <a
              href={socialLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white pl-2.5 pr-3.5 py-1.5 rounded-full shadow-lg shadow-emerald-500/30 text-[11px] font-bold transition-all duration-200 active:scale-95 animate-in slide-in-from-right-4 duration-300"
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
              className="pointer-events-auto flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white pl-2.5 pr-3.5 py-1.5 rounded-full shadow-lg shadow-sky-500/30 text-[11px] font-bold transition-all duration-200 active:scale-95 animate-in slide-in-from-right-4 duration-300"
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
              className="pointer-events-auto flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white pl-2.5 pr-3.5 py-1.5 rounded-full shadow-lg shadow-red-500/30 text-[11px] font-bold transition-all duration-200 active:scale-95 animate-in slide-in-from-right-4 duration-300"
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
    </div>
  );
}

