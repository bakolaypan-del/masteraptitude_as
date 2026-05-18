import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Trophy, Target, LogOut, FileText, CheckCircle, Clock, BookOpen, Play, ChevronRight, ArrowLeft, ExternalLink, Menu, X, Youtube, MessageCircle, Send, LayoutDashboard, History, ChevronDown, ArrowRight, User, Info, Phone, Download, Printer, AlertCircle, BarChart3, Keyboard, Globe, Layers, CheckSquare, Volume2, VolumeX, Maximize, NotebookPen } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DashboardTab = 'home' | 'profile' | 'mock_topic' | 'mock_sectional' | 'mock_full' | 'notes' | 'video' | 'pyq' | 'pattern' | 'affairs' | 'practice' | 'about' | 'contact' | 'learn_landing' | 'mock_landing';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
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
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const activeTab = (searchParams.get('tab') as DashboardTab) || 'home';
  const selectedCategory = searchParams.get('cat') || '';

  const setActiveTab = (tab: DashboardTab) => {
    setSearchParams({ tab, cat: '' });
    // Reset secondary states
    if (!tab.startsWith('mock')) {
      setMockOpen(false);
    }
    if (!['video', 'notes', 'affairs', 'practice'].includes(tab)) {
      setLearnOpen(false);
    }
  };

  const setSelectedCategory = (cat: string) => {
    setSearchParams({ tab: activeTab, cat });
  };
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Analysis State
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
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
            className={`w-full sidebar-btn sidebar-home ${activeTab === 'home' ? 'active' : ''}`}
          >
            <Target className="w-5 h-5 shrink-0" />
            <span>HOME</span>
          </button>

          {/* PROFILE */}
          <button 
            onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} 
            className={`w-full sidebar-btn sidebar-profile ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <User className="w-5 h-5 shrink-0" />
            <span>PROFILE</span>
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
                <BookOpen className="w-5 h-5 shrink-0" />
                <span>LEARN</span>
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
                <FileText className="w-5 h-5 shrink-0" />
                <span>MOCK TEST</span>
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
            <Keyboard className="w-5 h-5 shrink-0" />
            <span className="text-[10px] sm:text-xs text-left leading-tight font-black">TYPING TEST [NTPC/CLERK/GROUP C/CGL]</span>
          </button>
          
          {/* PREVIOUS YEAR PAPERS */}
          <button 
            onClick={() => { setActiveTab('pyq'); setIsSidebarOpen(false); }} 
            className={`w-full sidebar-btn sidebar-pyq ${activeTab === 'pyq' ? 'active' : ''}`}
          >
            <FileText className="w-5 h-5 shrink-0" />
            <span>PREVIOUS YEAR QUESTION</span>
          </button>

          {/* EXAM PATTERN & SYLLABUS */}
          <button 
            onClick={() => { setActiveTab('pattern'); setIsSidebarOpen(false); }} 
            className={`w-full sidebar-btn sidebar-pattern ${activeTab === 'pattern' ? 'active' : ''}`}
          >
            <Clock className="w-5 h-5 shrink-0" />
            <span>EXAM PATTERN & SYLLABUS</span>
          </button>

          {/* ABOUT US */}
          <button 
            onClick={() => { setActiveTab('about'); setIsSidebarOpen(false); }} 
            className={`w-full sidebar-btn sidebar-about ${activeTab === 'about' ? 'active' : ''}`}
          >
            <Info className="w-5 h-5 shrink-0" />
            <span>ABOUT US</span>
          </button>

          {/* CONTACT US */}
          <button 
            onClick={() => { setActiveTab('contact'); setIsSidebarOpen(false); }} 
            className={`w-full sidebar-btn sidebar-contact ${activeTab === 'contact' ? 'active' : ''}`}
          >
            <Phone className="w-5 h-5 shrink-0" />
            <span>CONTACT US</span>
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

              {/* Quick Access Tiles */}
              <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
                {/* Learn */}
                <button onClick={() => setActiveTab('learn_landing')} className="flex flex-col items-center justify-center p-3 sm:p-5 bg-violet-50/80 border border-violet-200 rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative text-left w-full">
                  <div className="absolute inset-0 bg-gradient-to-b from-violet-100/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-violet-600 text-white rounded-xl flex items-center justify-center mb-2 relative z-10 group-hover:scale-110 transition-transform shadow-lg shadow-violet-200">
                    <BookOpen className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <div className="relative z-10 text-center">
                    <h4 className="font-bold text-slate-800 text-[11px] sm:text-[14px] leading-tight">Learn</h4>
                    <p className="text-[8px] sm:text-[11px] text-slate-500 mt-1 leading-relaxed">Videos, notes & current affairs.</p>
                  </div>
                </button>

                {/* Mock Test */}
                <button onClick={() => setActiveTab('mock_landing')} className="flex flex-col items-center justify-center p-3 sm:p-5 bg-rose-50/80 border border-rose-200 rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative text-left w-full">
                  <div className="absolute inset-0 bg-gradient-to-b from-rose-100/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-rose-600 text-white rounded-xl flex items-center justify-center mb-2 relative z-10 group-hover:scale-110 transition-transform shadow-lg shadow-rose-200">
                    <Target className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <div className="relative z-10 text-center">
                    <h4 className="font-bold text-slate-800 text-[11px] sm:text-[14px] leading-tight">Mock Test</h4>
                    <p className="text-[8px] sm:text-[11px] text-slate-500 mt-1 leading-relaxed">Topic, sectional & full-length tests.</p>
                  </div>
                </button>

                {/* Typing Test */}
                <button onClick={() => navigate('/typing-tests')} className="flex flex-col items-center justify-center p-3 sm:p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative text-left w-full">
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-100/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-emerald-600 text-white rounded-xl flex items-center justify-center mb-2 relative z-10 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-200">
                    <Keyboard className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <div className="relative z-10 text-center">
                    <h4 className="font-bold text-slate-800 text-[11px] sm:text-[14px] leading-tight">Typing Test</h4>
                    <p className="text-[8px] sm:text-[11px] text-slate-500 mt-1 leading-relaxed">Improve your WPM & accuracy.</p>
                  </div>
                </button>

                {/* Previous Year Questions */}
                <button onClick={() => setActiveTab('pyq')} className="flex flex-col items-center justify-center p-3 sm:p-5 bg-amber-50/80 border border-amber-200 rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative text-left w-full">
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-100/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-amber-500 text-white rounded-xl flex items-center justify-center mb-2 relative z-10 group-hover:scale-110 transition-transform shadow-lg shadow-amber-200">
                    <FileText className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <div className="relative z-10 text-center">
                    <h4 className="font-bold text-slate-800 text-[11px] sm:text-[14px] leading-tight">Previous Year Questions</h4>
                    <p className="text-[8px] sm:text-[11px] text-slate-500 mt-1 leading-relaxed">Practise with past exam papers.</p>
                  </div>
                </button>
              </div>

              {/* Home Footer Section */}
              <div className="mt-16 pt-8 border-t border-slate-200">
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">Need Assistance?</h3>
                  <p className="text-slate-500 font-medium mb-6">If you have any questions regarding your studies or the platform, feel free to contact us.</p>
                  <div className="text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-red-600 to-rose-700 shadow-xl shadow-red-500/20 flex items-center gap-3 hover:scale-[1.02] transition-transform">
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
            <div className="space-y-8 animate-in fade-in duration-700">
              
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Your <span className="text-indigo-600">{activeTab === 'mock_topic' ? 'Topic Wise' : activeTab === 'mock_sectional' ? 'Sectional' : 'Full'} Test Series</span>
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
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Category</span>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">{selectedCategory}</h3>
                      </div>
                    </div>
                  </div>

                  {activeTests.filter(t => {
                    const matchesType = (t.testType || 'topic') === activeTab.replace('mock_', '');
                    const matchesCategory = t.category === selectedCategory;
                    return matchesType && matchesCategory;
                  }).length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400 shadow-sm flex flex-col items-center">
                      <FileText className="w-12 h-12 mb-4 text-slate-200" />
                      <p className="font-bold text-sm uppercase tracking-widest text-slate-500 mb-2">No tests found in this category.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activeTests.filter(t => {
                        const matchesType = (t.testType || 'topic') === activeTab.replace('mock_', '');
                        const matchesCategory = t.category === selectedCategory;
                        return matchesType && matchesCategory;
                      }).map(test => {
                        const isTaken = pastResults.some(r => r.testId === test.id);
                        return (
                          <div key={test.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:bg-slate-50/50 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* LEFT SIDE: Mock Test Name */}
                            <div className="flex items-center gap-3 min-w-[200px] flex-1">
                              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                <Target className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug">
                                    {test.title}
                                  </h4>
                                  {test.isActive && (
                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded border border-emerald-100 flex items-center gap-0.5 shrink-0">
                                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                                      Live
                                    </span>
                                  )}
                                </div>
                                {test.subjectName && (
                                  <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block leading-none mt-1">
                                    {test.subjectName}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* MIDDLE: Topic Name */}
                            <div className="flex items-center gap-6 md:min-w-[180px]">
                              <div className="text-left">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Topic</span>
                                <span className="text-xs font-black text-slate-600 uppercase">
                                  {test.topic || 'General Mock'}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Specs</span>
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-indigo-500" />
                                  {test.duration || 30} min | {test.marksPerCorrect || 1}M
                                </span>
                              </div>
                            </div>

                            {/* RIGHT SIDE: [ ATTEMPT MOCK ] */}
                            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                              {isTaken && (
                                <>
                                  <button 
                                    onClick={() => handleDownloadPDF(test.id, test.title, test.category || 'N/A', test.testType || 'N/A')}
                                    disabled={downloadingPDF === test.id}
                                    className="flex items-center justify-center p-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-xl transition-all disabled:opacity-50"
                                    title="Download PDF Question Bank"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const res = pastResults.find(r => r.testId === test.id);
                                      if (res) {
                                        setSelectedResult(res);
                                        setShowAnalysisModal(true);
                                        setShowFullAnalysis(false);
                                        fetchQuestionsForAnalysis(test.id);
                                      }
                                    }}
                                    className="px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all"
                                  >
                                    Analysis
                                  </button>
                                </>
                              )}
                              <Link 
                                to={`/test/${test.id}`}
                                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:from-slate-900 hover:to-slate-900 transition-all shadow-md shadow-indigo-200 hover:shadow-lg flex items-center gap-1 active:scale-95"
                              >
                                {isTaken ? 'Reattempt' : 'Attempt Mock'}
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                onClick={() => { setShowAnalysisModal(false); setShowFullAnalysis(false); }}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#f8f9fa]">
              {!showFullAnalysis ? (
                /* Summary Section */
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
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

                  <div className="text-center pb-4">
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

                          <h4 className="font-bold text-slate-800 text-xl mb-10 leading-relaxed px-2">{q.questionText}</h4>

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

      {/* Floating Social Popup Notifications */}
      {activeTab === 'home' && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full sm:w-[360px] animate-in slide-in-from-bottom-10 fade-in duration-500">
          {currentPopupIndex === 0 && socialLinks.whatsapp && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-5 rounded-2xl text-white shadow-2xl shadow-emerald-500/30 border border-white/15 relative overflow-hidden group animate-in slide-in-from-bottom-5 duration-300">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0 shadow-lg animate-bounce">
                  <MessageCircle className="w-6 h-6 text-white fill-current" />
                </div>
                <div className="flex-1">
                  <h4 className="font-extrabold text-[14px] leading-tight mb-1">WhatsApp Community</h4>
                  <p className="text-white/90 text-[11px] font-semibold leading-snug mb-3">Join for daily practice questions & instant study updates!</p>
                  <a 
                    href={socialLinks.whatsapp} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-emerald-700 font-extrabold text-[9px] uppercase tracking-widest rounded-xl hover:bg-emerald-50 transition-all shadow-md active:scale-95"
                  >
                    Join WhatsApp
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {currentPopupIndex === 1 && socialLinks.telegram && (
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-5 rounded-2xl text-white shadow-2xl shadow-sky-500/30 border border-white/15 relative overflow-hidden group animate-in slide-in-from-bottom-5 duration-300">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0 shadow-lg animate-bounce">
                  <Send className="w-6 h-6 text-white fill-current ml-0.5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-extrabold text-[14px] leading-tight mb-1">Telegram Channel</h4>
                  <p className="text-white/90 text-[11px] font-semibold leading-snug mb-3">Get standard study notes & instant practice sets free!</p>
                  <a 
                    href={socialLinks.telegram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-sky-700 font-extrabold text-[9px] uppercase tracking-widest rounded-xl hover:bg-sky-50 transition-all shadow-md active:scale-95"
                  >
                    Join Telegram
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {currentPopupIndex === 2 && socialLinks.youtube && (
            <div className="bg-gradient-to-r from-rose-500 to-red-600 p-5 rounded-2xl text-white shadow-2xl shadow-rose-500/30 border border-white/15 relative overflow-hidden group animate-in slide-in-from-bottom-5 duration-300">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0 shadow-lg animate-bounce">
                  <Youtube className="w-6 h-6 text-white fill-current" />
                </div>
                <div className="flex-1">
                  <h4 className="font-extrabold text-[14px] leading-tight mb-1">YouTube Classes</h4>
                  <p className="text-white/90 text-[11px] font-semibold leading-snug mb-3">Subscribe for expert live lessons & complete preparation video series!</p>
                  <a 
                    href={socialLinks.youtube} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-rose-700 font-extrabold text-[9px] uppercase tracking-widest rounded-xl hover:bg-rose-50 transition-all shadow-md active:scale-95"
                  >
                    Subscribe YouTube
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

