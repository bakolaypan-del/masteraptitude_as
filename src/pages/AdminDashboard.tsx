import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { collection, query, getDocs, orderBy, doc, deleteDoc, where, addDoc, serverTimestamp, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { LogOut, ArrowLeft, Plus, Pencil, Trash2, FileText, BookOpen, Play, CheckCircle, Clock, X, User as UserIcon, Download, ShieldAlert, ShieldCheck, Key, Edit2, Search, LayoutDashboard, Layers, TrendingUp, Link2, Check } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

import AdminTypingTests from '../components/AdminTypingTests';
import { Keyboard } from 'lucide-react';

type AdminTab = 'students' | 'mock' | 'typing' | 'notes' | 'video' | 'pyq' | 'pattern' | 'carousel' | 'social' | 'affairs' | 'practice' | 'site_info' | 'student_analysis';

// ─── Image Cropper Modal ─────────────────────────────────────────────────────
function ImageCropper({
  src,
  onCrop,
  onCancel,
}: {
  src: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [imgNat, setImgNat] = useState({ w: 0, h: 0 });
  const [imgDisp, setImgDisp] = useState({ w: 0, h: 0 });
  const [aspect, setAspect] = useState(16 / 9);
  const [sizePercent, setSizePercent] = useState(82);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const origin = useRef({ px: 0, py: 0, ox: 0, oy: 0 });

  // Derived crop dimensions in display px
  const cropW = (imgDisp.w * sizePercent) / 100;
  const cropH = cropW / aspect;

  const clamp = (x: number, y: number, w: number, h: number) => ({
    x: Math.max(0, Math.min(imgDisp.w - w, x)),
    y: Math.max(0, Math.min(imgDisp.h - h, y)),
  });

  const onImgLoad = () => {
    const img = imgRef.current!;
    setImgNat({ w: img.naturalWidth, h: img.naturalHeight });
    requestAnimationFrame(() => {
      const disp = { w: img.offsetWidth, h: img.offsetHeight };
      setImgDisp(disp);
      const cw = disp.w * 0.82;
      const ch = cw / (16 / 9);
      setPos({ x: (disp.w - cw) / 2, y: Math.max(0, (disp.h - ch) / 2) });
      setReady(true);
    });
  };

  // Re-centre when aspect/size changes
  useEffect(() => {
    if (!ready) return;
    const cw = (imgDisp.w * sizePercent) / 100;
    const ch = cw / aspect;
    setPos(prev => clamp(prev.x + (cropW - cw) / 2, prev.y + (cropH - ch) / 2, cw, ch));
  }, [aspect, sizePercent, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pointer drag (works on mouse & touch)
  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    origin.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - origin.current.px;
    const dy = e.clientY - origin.current.py;
    setPos(clamp(origin.current.ox + dx, origin.current.oy + dy, cropW, cropH));
  };
  const onPointerUp = () => { dragging.current = false; };

  const applyCrop = () => {
    const img = imgRef.current!;
    const scaleX = imgNat.w / imgDisp.w;
    const scaleY = imgNat.h / imgDisp.h;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cropW * scaleX);
    canvas.height = Math.round(cropH * scaleY);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      img,
      pos.x * scaleX, pos.y * scaleY, cropW * scaleX, cropH * scaleY,
      0, 0, canvas.width, canvas.height,
    );
    canvas.toBlob(blob => { if (blob) onCrop(blob); }, 'image/jpeg', 0.92);
  };

  const RATIOS: [string, number, string][] = [
    ['16 : 9', 16 / 9, 'Best for wide carousel banners'],
    ['4 : 3',  4 / 3,  'Classic landscape'],
    ['1 : 1',  1,      'Square'],
  ];

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl overflow-hidden w-full max-w-xl shadow-2xl flex flex-col"
        style={{ maxHeight: '95vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-base">✂️ Crop Before Upload</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Drag the box to reposition · Slider to resize · Pick ratio</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Aspect ratio pills */}
        <div className="px-5 pt-4 flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Ratio</span>
          {RATIOS.map(([lbl, r, tip]) => (
            <button
              key={lbl}
              title={tip}
              onClick={() => setAspect(r)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
                Math.abs(aspect - r) < 0.01
                  ? 'bg-fuchsia-600 border-fuchsia-600 text-white shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:border-fuchsia-300 hover:text-fuchsia-600'
              }`}
            >
              {lbl}
              {lbl === '16 : 9' && <span className="ml-1 text-[9px] opacity-70">(rec.)</span>}
            </button>
          ))}
        </div>

        {/* Crop canvas */}
        <div
          ref={containerRef}
          className="relative mx-5 my-4 bg-slate-900 rounded-2xl overflow-hidden select-none shrink-0"
          style={{ maxHeight: 320 }}
        >
          <img
            ref={imgRef}
            src={src}
            onLoad={onImgLoad}
            draggable={false}
            crossOrigin="anonymous"
            alt="Crop preview"
            className="block w-full object-contain"
            style={{ maxHeight: 320 }}
          />

          {ready && (
            <>
              {/* Dark mask — 4 rectangles around the bright crop window */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 bg-black/55" style={{ height: pos.y }} />
                <div className="absolute left-0 right-0 bg-black/55" style={{ top: pos.y + cropH, bottom: 0 }} />
                <div className="absolute bg-black/55" style={{ top: pos.y, left: 0, width: pos.x, height: cropH }} />
                <div className="absolute bg-black/55" style={{ top: pos.y, left: pos.x + cropW, right: 0, height: cropH }} />
              </div>

              {/* Draggable crop box */}
              <div
                className="absolute border-2 border-white cursor-move touch-none"
                style={{ left: pos.x, top: pos.y, width: cropW, height: cropH }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              >
                {/* Rule-of-thirds guides */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/3 left-0 right-0 border-t border-white/25" />
                  <div className="absolute top-2/3 left-0 right-0 border-t border-white/25" />
                  <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/25" />
                  <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/25" />
                </div>
                {/* Corner handles */}
                {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map(cls => (
                  <div key={cls} className={`absolute w-3 h-3 bg-white rounded-sm shadow-md ${cls}`} />
                ))}
                {/* Centre label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-white/50 text-[10px] font-bold tracking-wider uppercase select-none">drag to move</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Size slider */}
        <div className="px-5 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-10 shrink-0">Size</span>
            <input
              type="range" min={30} max={100} value={sizePercent}
              onChange={e => setSizePercent(parseInt(e.target.value))}
              className="flex-1 accent-fuchsia-600 h-2 cursor-pointer"
            />
            <span className="text-xs font-bold text-fuchsia-600 w-10 text-right shrink-0">{sizePercent}%</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-5 flex gap-3 shrink-0 border-t border-slate-100 pt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border-2 border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={applyCrop}
            className="flex-[2] py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-fuchsia-100 flex items-center justify-center gap-2 text-sm"
          >
            <Check className="w-4 h-4" /> Apply Crop & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function AdminHome() {
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState('all'); // all, active, blocked
  const [stats, setStats] = useState({ total: 0, active: 0, blocked: 0, today: 0 });
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [tests, setTests] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [pyqs, setPyqs] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [affairs, setAffairs] = useState<any[]>([]);
  const [practiceSets, setPracticeSets] = useState<any[]>([]);
  const [siteInfo, setSiteInfo] = useState({ content: '', contact: '' });
  const [carousels, setCarousels] = useState<any[]>([]);
  const [customMockCategories, setCustomMockCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('mock');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Admin Attempts Analyzer state
  const [selectedStudentForAnalysis, setSelectedStudentForAnalysis] = useState<any | null>(null);
  const [showStudentAttemptsModal, setShowStudentAttemptsModal] = useState(false);
  const [studentAttemptsList, setStudentAttemptsList] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [selectedAttemptForDeepAnalysis, setSelectedAttemptForDeepAnalysis] = useState<any | null>(null);
  const [deepAnalysisQuestions, setDeepAnalysisQuestions] = useState<any[]>([]);
  const [loadingDeepAnalysis, setLoadingDeepAnalysis] = useState(false);
  
  // Test Form
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [category, setCategory] = useState('GK');
  const [duration, setDuration] = useState('30');
  const [testType, setTestType] = useState('topic');
  
  // Note Form
  const [noteTitle, setNoteTitle] = useState('');
  const [noteLink, setNoteLink] = useState('');
  const [noteSubject, setNoteSubject] = useState('');
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [uploadingNote, setUploadingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Affairs Form
  const [affairTitle, setAffairTitle] = useState('');
  const [affairDate, setAffairDate] = useState('');
  const [affairLink, setAffairLink] = useState('');
  const [uploadingAffair, setUploadingAffair] = useState(false);

  // Practice Set Form
  const [practiceTitle, setPracticeTitle] = useState('');
  const [practiceSubject, setPracticeSubject] = useState('');
  const [practiceFile, setPracticeFile] = useState<File | null>(null);
  const [practiceLink, setPracticeLink] = useState('');
  const [uploadingPractice, setUploadingPractice] = useState(false);

  // Site Info Form
  const [aboutContent, setAboutContent] = useState('');
  const [contactContent, setContactContent] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // Pyq Form
  const [pyqTitle, setPyqTitle] = useState('');
  const [pyqLink, setPyqLink] = useState('');
  const [pyqSubject, setPyqSubject] = useState('');
  const [pyqFile, setPyqFile] = useState<File | null>(null);
  const [uploadingPyq, setUploadingPyq] = useState(false);
  const [editingPyqId, setEditingPyqId] = useState<string | null>(null);

  // Pattern Form
  const [patternExamName, setPatternExamName] = useState('');
  const [patternFiles, setPatternFiles] = useState<File[]>([]);
  const [uploadingPattern, setUploadingPattern] = useState(false);

  // Video Form
  const [videoTitle, setVideoTitle] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [videoSubject, setVideoSubject] = useState('');

  // Carousel Form
  const [carouselFile, setCarouselFile] = useState<File | null>(null);
  const [carouselPriority, setCarouselPriority] = useState('1');
  const [carouselBadge, setCarouselBadge] = useState<'none' | 'live' | 'new'>('none');
  const [uploadingCarousel, setUploadingCarousel] = useState(false);
  const [clearingCarousel, setClearingCarousel] = useState(false);
  // Crop modal
  const [cropSrc, setCropSrc] = useState('');
  const [showCropModal, setShowCropModal] = useState(false);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState('');
  const [clearingTests, setClearingTests] = useState(false);
  const [savingTest, setSavingTest] = useState(false);
  
  // Search and Filter State
  const [mockSearch, setMockSearch] = useState('');
  const [mockFilterCategory, setMockFilterCategory] = useState('All');
  const [mockFilterType, setMockFilterType] = useState('All');
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Test marks
  const [marksPerCorrect, setMarksPerCorrect] = useState('1');
  const [negativeMarks, setNegativeMarks] = useState('0.25');

  // Social Links Form
  const [socialYoutube, setSocialYoutube] = useState('');
  const [socialTelegram, setSocialTelegram] = useState('');
  const [socialWhatsapp, setSocialWhatsapp] = useState('');
  const [savingSocials, setSavingSocials] = useState(false);

  const { user, profile } = useAuth();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingStudent?.focusPassword && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [editingStudent]);

  if (!user || (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'bakolaypan@gmail.com')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-black text-rose-600 mb-2">Access Denied</h2>
        <p className="text-slate-500 font-bold">You do not have permission to access the admin panel.</p>
        <Link to="/dashboard" className="mt-6 text-indigo-600 font-bold px-6 py-3 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-all">
          Go to Student Dashboard
        </Link>
      </div>
    );
  }

  useEffect(() => {
    setLoading(true);
    const qTests = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
    const qNotes = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const qVideos = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const qPyqs = query(collection(db, 'pyqs'), orderBy('createdAt', 'desc'));
    const qPatterns = query(collection(db, 'patterns'), orderBy('createdAt', 'desc'));
    const qAffairs = query(collection(db, 'affairs'), orderBy('createdAt', 'desc'));
    const qPractice = query(collection(db, 'practice_sets'), orderBy('createdAt', 'desc'));
    const qCarousels = query(collection(db, 'carousel'), orderBy('createdAt', 'desc'));
    const qStudents = query(collection(db, 'profiles'), where('role', 'in', ['user', 'student']));

    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubTests = onSnapshot(qTests, (snap) => {
      setTests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => console.error(err));

    const unsubNotes = onSnapshot(qNotes, (snap) => {
      setNotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubVideos = onSnapshot(qVideos, (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubPyqs = onSnapshot(qPyqs, (snap) => {
      setPyqs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubPatterns = onSnapshot(qPatterns, (snap) => {
      setPatterns(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubAffairs = onSnapshot(qAffairs, (snap) => {
      setAffairs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubPractice = onSnapshot(qPractice, (snap) => {
      setPracticeSets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubCarousels = onSnapshot(qCarousels, (snap) => {
      setCarousels(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubSocials = onSnapshot(doc(db, 'settings', 'social_links'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSocialYoutube(data.youtube || '');
        setSocialTelegram(data.telegram || '');
        setSocialWhatsapp(data.whatsapp || '');
      }
    }, (err) => console.error(err));

    const unsubInfo = onSnapshot(doc(db, 'settings', 'site_info'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAboutContent(data.content || '');
        setContactContent(data.contact || '');
      }
    }, (err) => console.error(err));

    const fetchStats = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setStats(await res.json());

        // Fetch Category Order
        const orderRes = await fetch('/api/category-order');
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setCategoryOrder(orderData.order || []);
        }

        // Fetch Custom Categories
        const catsRes = await fetch('/api/custom-categories');
        if (catsRes.ok) {
          const catsData = await catsRes.json();
          setCustomMockCategories(catsData.categories || []);
        }
      } catch (err) {
        console.error('Stats fetch failed:', err);
      }
    };
    fetchStats();
    const statsInterval = setInterval(fetchStats, 60000); // Update stats every minute

    return () => {
      unsubStudents();
      unsubTests();
      unsubNotes();
      unsubVideos();
      unsubPyqs();
      unsubPatterns();
      unsubAffairs();
      unsubPractice();
      unsubCarousels();
      unsubSocials();
      unsubInfo();
      clearInterval(statsInterval);
    };
  }, []);

  // Load attempts when student is selected for analysis
  useEffect(() => {
    async function loadStudentAttempts() {
      if (!selectedStudentForAnalysis) return;
      setLoadingAttempts(true);
      setSelectedAttemptForDeepAnalysis(null);
      setDeepAnalysisQuestions([]);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/admin/student-attempts/${selectedStudentForAnalysis.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStudentAttemptsList(data.attempts || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAttempts(false);
      }
    }
    loadStudentAttempts();
  }, [selectedStudentForAnalysis]);

  // Load deep question analysis when attempt is selected
  useEffect(() => {
    async function loadAttemptDeepAnalysis() {
      if (!selectedAttemptForDeepAnalysis) return;
      setLoadingDeepAnalysis(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/admin/test-attempt-analysis/${selectedAttemptForDeepAnalysis.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDeepAnalysisQuestions(data.questions || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDeepAnalysis(false);
      }
    }
    loadAttemptDeepAnalysis();
  }, [selectedAttemptForDeepAnalysis]);


  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingTest(true);
    try {
      const token = await user.getIdToken();
      const method = editingTestId ? 'PUT' : 'POST';
      const url = editingTestId ? `/api/admin/tests/${editingTestId}` : '/api/admin/create-test';
      
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title, 
          topic, 
          subjectName,
          category,
          testType,
          duration: parseInt(duration) || 30,
          marksPerCorrect: parseFloat(marksPerCorrect) || 1,
          negativeMarks: parseFloat(negativeMarks) || 0,
          isActive: true 
        })
      });
      if (res.ok) {
        setTitle('');
        setTopic('');
        setSubjectName('');
        setCategory('GK');
        setDuration('30');
        setEditingTestId(null);
        alert(editingTestId ? 'Test updated successfully!' : 'Test created successfully!');
      } else alert(await res.text());
    } catch (err) {
      console.error(err);
      alert('Error processing test');
    } finally {
      setSavingTest(false);
    }
  };

  const handleUpdateCategoryOrder = async () => {
    const orderInput = prompt('Enter categories in order separated by commas (e.g. GK, Math, English)', categoryOrder.join(', '));
    if (orderInput === null) return;
    
    const newOrder = orderInput.split(',').map(s => s.trim()).filter(s => s !== '');
    setIsUpdatingOrder(true);
    try {
      const response = await fetch('/api/admin/category-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({ order: newOrder })
      });
      if (response.ok) {
        setCategoryOrder(newOrder);
        alert('Category order updated successfully!');
      } else {
        throw new Error('Failed to update order');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating category order');
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title?.toLowerCase().includes(mockSearch.toLowerCase()) || 
                          test.topic?.toLowerCase().includes(mockSearch.toLowerCase());
    const matchesCategory = mockFilterCategory === 'All' || test.category === mockFilterCategory;
    const matchesType = mockFilterType === 'All' || test.testType === mockFilterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleEditTest = (test: any) => {
    setEditingTestId(test.id);
    setTitle(test.title || '');
    setTopic(test.topic || '');
    setSubjectName(test.subjectName || '');
    setCategory(test.category || 'GK');
    setTestType(test.testType || 'topic');
    setDuration(test.duration?.toString() || '30');
    setMarksPerCorrect(test.marksPerCorrect?.toString() || '1');
    setNegativeMarks(test.negativeMarks?.toString() || '0.25');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !user) {
      alert('Note Title is required');
      return;
    }
    setUploadingNote(true);
    try {
      let finalLink = noteLink;

      if (noteFile) {
        const randomID = Math.random().toString(36).substring(2, 8);
        const fileName = `${Date.now()}_${randomID}_${noteFile.name}`;
        const fileRef = ref(storage, `notes/${fileName}`);
        const snapshot = await uploadBytes(fileRef, noteFile);
        finalLink = await getDownloadURL(snapshot.ref);
      }

      if (!finalLink && !editingNoteId) {
        alert('Please provide either a link or upload a file.');
        setUploadingNote(false);
        return;
      }

      const noteData: any = {
        title: noteTitle,
        subject: noteSubject || 'General',
        updatedAt: serverTimestamp(),
        authorId: user.uid
      };
      if (finalLink) noteData.link = finalLink;

      if (editingNoteId) {
        await updateDoc(doc(db, 'notes', editingNoteId), noteData);
      } else {
        await addDoc(collection(db, 'notes'), {
          ...noteData,
          createdAt: serverTimestamp()
        });
      }

      setNoteTitle('');
      setNoteLink('');
      setNoteSubject('');
      setNoteFile(null);
      setEditingNoteId(null);
      const fileInput = document.getElementById('note-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      alert(editingNoteId ? 'Note updated successfully!' : 'Note added successfully!');
    } catch (err) {
      console.error(err);
      alert('Error processing note');
    } finally {
      setUploadingNote(false);
    }
  };

  const handleEditNote = (note: any) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteSubject(note.subject || '');
    setNoteLink(note.link || '');
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddPyq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pyqTitle || !user) {
      alert('PYQ Title is required');
      return;
    }
    setUploadingPyq(true);
    try {
      let finalLink = pyqLink;

      if (pyqFile) {
        const randomID = Math.random().toString(36).substring(2, 8);
        const fileName = `${Date.now()}_${randomID}_${pyqFile.name}`;
        const fileRef = ref(storage, `pyqs/${fileName}`);
        const snapshot = await uploadBytes(fileRef, pyqFile);
        finalLink = await getDownloadURL(snapshot.ref);
      }

      if (!finalLink && !editingPyqId) {
        alert('Please provide either a link or upload a file.');
        setUploadingPyq(false);
        return;
      }

      const pyqData: any = {
        title: pyqTitle,
        subject: pyqSubject || 'General',
        updatedAt: serverTimestamp(),
        authorId: user.uid
      };
      if (finalLink) pyqData.link = finalLink;

      if (editingPyqId) {
        await updateDoc(doc(db, 'pyqs', editingPyqId), pyqData);
      } else {
        await addDoc(collection(db, 'pyqs'), {
           ...pyqData,
           createdAt: serverTimestamp()
        });
      }

      setPyqTitle('');
      setPyqLink('');
      setPyqSubject('');
      setPyqFile(null);
      setEditingPyqId(null);
      const fileInput = document.getElementById('pyq-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      alert(editingPyqId ? 'PYQ updated successfully!' : 'PYQ added successfully!');
    } catch (err) {
      console.error(err);
      alert('Error processing PYQ');
    } finally {
      setUploadingPyq(false);
    }
  };

  const handleEditPyq = (pyq: any) => {
    setEditingPyqId(pyq.id);
    setPyqTitle(pyq.title);
    setPyqSubject(pyq.subject || '');
    setPyqLink(pyq.link || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddPattern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patternExamName || patternFiles.length === 0 || !user) {
      console.log("Validation failed:", { patternExamName, filesCount: patternFiles.length, user: !!user });
      alert("Please enter an Exam Name and select at least one file.");
      return;
    }
    
    // Admin check from email as backup
    if (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'bakolaypan@gmail.com') {
      alert("You don't have permission to perform this action.");
      return;
    }
    
    // Size limit check (20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    const oversizedFiles = patternFiles.filter(f => f.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`Some files are too large (max 20MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setUploadingPattern(true);
    console.log("Starting pattern upload for:", patternExamName);
    
    try {
      const uploadPromises = patternFiles.map(async (file) => {
        // Add random suffix to avoid collisions if multiple files are named same or uploaded same time
        const randomID = Math.random().toString(36).substring(2, 8);
        const fileName = `${Date.now()}_${randomID}_${file.name}`;
        const fileRef = ref(storage, `patterns/${fileName}`);
        
        console.log("Uploading file:", file.name, "as", fileName);
        const snapshot = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(snapshot.ref);
        console.log("File uploaded successfully:", file.name, "URL:", url);
        
        return { name: file.name, url, type: file.type };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      console.log("All files uploaded to storage, saving to Firestore...");

      await addDoc(collection(db, 'patterns'), {
        title: patternExamName,
        files: uploadedFiles,
        createdAt: serverTimestamp(),
        authorId: user.uid
      });
      
      console.log("Pattern saved to Firestore successfully.");

      setPatternExamName('');
      setPatternFiles([]);
      const fileInput = document.getElementById('pattern-files-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      alert('Exam Pattern & Syllabus added successfully!');
    } catch (err) {
      console.error("Error in handleAddPattern:", err);
      if (err instanceof Error && err.message.includes('permission-denied')) {
        alert('Permission Denied: Your account does not have admin privileges in the database.');
      } else {
        alert('Error adding Pattern. Please check your connection and try again.');
      }
    } finally {
      setUploadingPattern(false);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle || !videoLink || !user) return;
    try {
      await addDoc(collection(db, 'videos'), {
        title: videoTitle,
        link: videoLink,
        subject: videoSubject || 'General',
        createdAt: serverTimestamp(),
        authorId: user.uid
      });
      setVideoTitle('');
      setVideoLink('');
      setVideoSubject('');
    } catch (err) {
      console.error(err);
      alert('Error adding video');
    }
  };

  const handleAddCarousel = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleAddCarousel started');
    if (!carouselFile || !user) {
      console.warn('handleAddCarousel: Missing file or user');
      return;
    }
    try {
      if (carousels.length >= 3) {
        console.warn('Carousel limit reached (3)');
        alert('You can only have up to 3 carousel pictures.');
        return;
      }
      setUploadingCarousel(true);
      console.log('Compressing image...');
      
      const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1200;
              const MAX_HEIGHT = 800;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              console.log(`Image compressed. Size: ${Math.round(dataUrl.length / 1024)} KB`);
              resolve(dataUrl);
            };
            img.onerror = (err) => {
              console.error('Image load error:', err);
              reject(err);
            };
          };
          reader.onerror = (err) => {
            console.error('FileReader error:', err);
            reject(err);
          };
        });
      };

      const link = await compressImage(carouselFile);

      console.log('Attempting addDoc to carousel collection...');
      await addDoc(collection(db, 'carousel'), {
        link: link,
        priority: parseInt(carouselPriority) || 1,
        badge: carouselBadge, // 'none' | 'live' | 'new'
        createdAt: serverTimestamp(),
        authorId: user.uid
      });
      console.log('Carousel item added successfully');
      setCarouselFile(null);
      setCroppedPreviewUrl('');
      setCropSrc('');
      setCarouselPriority('1');
      setCarouselBadge('none');
      const fileInput = document.getElementById('carousel-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      alert('Carousel Image Added!');
    } catch (err: any) {
      console.error('Error in handleAddCarousel:', err);
      // Construct a better error message
      let msg = 'Error adding carousel picture.';
      if (err.message && err.message.includes('quota')) msg += ' Storage quota exceeded.';
      else if (err.message) msg += ' ' + err.message;
      alert(msg);
    } finally {
      setUploadingCarousel(false);
    }
  };

  const handleUpdateCarouselPriority = async (id: string, currentPriority: number) => {
    const newPriority = prompt('Enter new priority order (1, 2, 3, etc.):', currentPriority.toString());
    if (newPriority === null) return;
    const priorityVal = parseInt(newPriority);
    if (isNaN(priorityVal)) {
      alert('Invalid priority number');
      return;
    }

    try {
      await updateDoc(doc(db, 'carousel', id), { priority: priorityVal });
      alert('Carousel Order Updated!');
    } catch (err) {
      console.error(err);
      alert('Error updating priority');
    }
  };

  const handleBulkClearCarousel = async () => {
    if (!confirm('This will delete ALL carousel images. Are you sure?') || !user) return;
    setClearingCarousel(true);
    try {
      const token = await user.getIdToken();
      // We'll call a special endpoint or just loop if we had to, but let's try to fix backend or add direct delete
      for (const item of carousels) {
        await fetch(`/api/admin/carousel/${item.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      alert('Carousel cleared!');
    } catch (err) {
      console.error(err);
      alert('Error clearing carousel');
    } finally {
      setClearingCarousel(false);
    }
  };

  const handleBulkClearTests = async () => {
    if (!confirm('This will delete ALL Mock Tests and their Questions. THIS CANNOT BE UNDONE. Proceed?') || !user) return;
    setClearingTests(true);
    try {
      const token = await user.getIdToken();
      for (const test of tests) {
        await fetch(`/api/admin/tests/${test.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      alert('All tests deleted successfully!');
    } catch (err) {
      console.error(err);
      alert('Error clearing tests');
    } finally {
      setClearingTests(false);
    }
  };
  const handleSaveSocials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await setDoc(doc(db, 'settings', 'social_links'), {
        youtube: socialYoutube,
        telegram: socialTelegram,
        whatsapp: socialWhatsapp,
        updatedAt: serverTimestamp(),
        authorId: user.uid
      });
      alert('Social links updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Error updating social links. Make sure you have the correct permissions.');
    } finally {
      setSavingSocials(false);
    }
  };

  const handleAddAffair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affairTitle || !user) return;
    setUploadingAffair(true);
    try {
      await addDoc(collection(db, 'affairs'), {
        title: affairTitle,
        date: affairDate || new Date().toISOString().split('T')[0],
        link: affairLink,
        createdAt: serverTimestamp(),
        authorId: user.uid
      });
      setAffairTitle('');
      setAffairDate('');
      setAffairLink('');
      alert('Current Affair added successfully!');
    } catch (err) {
      console.error(err);
      alert('Error adding current affair');
    } finally {
      setUploadingAffair(false);
    }
  };

  const handleAddPractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceTitle || !user) return;
    setUploadingPractice(true);
    try {
      let finalLink = practiceLink;
      if (practiceFile) {
        const randomID = Math.random().toString(36).substring(2, 8);
        const fileName = `${Date.now()}_${randomID}_${practiceFile.name}`;
        const fileRef = ref(storage, `practice/${fileName}`);
        const snapshot = await uploadBytes(fileRef, practiceFile);
        finalLink = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, 'practice_sets'), {
        title: practiceTitle,
        subject: practiceSubject || 'General',
        link: finalLink,
        createdAt: serverTimestamp(),
        authorId: user.uid
      });
      setPracticeTitle('');
      setPracticeSubject('');
      setPracticeLink('');
      setPracticeFile(null);
      const fileInput = document.getElementById('practice-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      alert('Practice Set added successfully!');
    } catch (err) {
      console.error(err);
      alert('Error adding practice set');
    } finally {
      setUploadingPractice(false);
    }
  };

  const handleSaveSiteInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingInfo(true);
    try {
      await setDoc(doc(db, 'settings', 'site_info'), {
        content: aboutContent,
        contact: contactContent,
        updatedAt: serverTimestamp(),
        authorId: user.uid
      });
      alert('Site info updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Error updating site info');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleDeleteContent = async (coll: string, id: string) => {
    console.log(`handleDeleteContent called for ${coll} with ID ${id}`);
    if (!confirm('Are you sure you want to delete this permanently?')) {
      console.log('Delete cancelled by user');
      return;
    }
    if (!user) {
      console.error('No authenticated user found during delete attempt');
      return;
    }
    try {
      const token = await user.getIdToken();
      console.log('Got auth token for delete request');
      
      // Map matching collection names to API paths
      const pathMap: Record<string, string> = {
        'tests': 'tests',
        'notes': 'notes',
        'videos': 'videos',
        'pyqs': 'pyqs',
        'patterns': 'patterns',
        'affairs': 'affairs',
        'practice_sets': 'practice_sets',
        'carousel': 'carousel'
      };
      
      const apiPath = pathMap[coll] || coll;
      const url = `/api/admin/${apiPath}/${encodeURIComponent(id)}`;
      console.log(`Sending DELETE request to: ${url}`);
      
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`Server responded with status: ${res.status}`);
      if (res.ok) {
        console.log(`${coll} delete successfully acknowledged by server`);
        alert('Deleted successfully!');
      } else {
        const bodyText = await res.text();
        let errorMsg = bodyText;
        try {
          const errJson = JSON.parse(bodyText);
          errorMsg = errJson.message || errJson.error || bodyText;
        } catch {
          // Fallback to raw text
        }
        console.error(`${coll} delete failed on server (Status ${res.status}):`, errorMsg);
        alert(`Delete failed: ${errorMsg}`);
      }
    } catch (err) {
      console.error(`${coll} delete execution error:`, err);
      alert('Network error while deleting. Please check your connection.');
    }
  };

  const toggleActive = async (test: any) => {
    try {
      if(!user) return;
      const token = await user.getIdToken();
      await fetch(`/api/admin/tests/${test.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: test.title, 
          topic: test.topic, 
          subjectName: test.subjectName,
          category: test.category,
          testType: test.testType,
          duration: test.duration || 30,
          isActive: !test.isActive 
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingStudent) return;
    setSavingStudent(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingStudent.name,
          phoneNumber: editingStudent.phoneNumber,
          status: editingStudent.status,
          password: editingStudent.newPassword // Optional
        })
      });
      if (res.ok) {
        setEditingStudent(null);
        alert('Student updated successfully!');
      } else {
        alert(await res.text());
      }
    } catch (err) {
      alert('Failed to update student');
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure? This will PERMANENTLY delete student account and auth credentials.') || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) alert('Student account deleted');
      else alert('Failed to delete student');
    } catch (err) {
      alert('Network error');
    }
  };

  const handleBlockStudent = async (student: any) => {
    const newStatus = student.status === 'blocked' ? 'active' : 'blocked';
    if (!confirm(`Are you sure you want to ${newStatus === 'blocked' ? 'BLOCK' : 'UNBLOCK'} this student?`) || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: student.name,
          phoneNumber: student.phoneNumber,
          status: newStatus
        })
      });
      if (res.ok) alert(`Student ${newStatus === 'blocked' ? 'blocked' : 'unblocked'}`);
      else alert('Failed to change student status');
    } catch (err) {
      alert('Network error');
    }
  };

  const handleExportStudents = () => {
    if (students.length === 0) return;
    const headers = ['Name', 'Mobile', 'Registration Date', 'Tests Taken', 'Score', 'Status'];
    const csvContent = students.map(s => [
      s.name,
      s.phoneNumber,
      s.registrationDate ? new Date(s.registrationDate).toLocaleDateString() : 'N/A',
      s.totalTestsTaken || 0,
      s.cumulativeScore || 0,
      s.status || 'active'
    ].join(',')).join('\n');
    
    const blob = new Blob([[headers.join(','), csvContent].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_database_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  const updateDuration = async (test: any) => {
    const newDur = prompt('Enter new duration in minutes:', test.duration || '30');
    if (newDur === null) return;
    const durNum = parseInt(newDur);
    if (isNaN(durNum)) return alert('Invalid number');

    try {
      if(!user) return;
      const token = await user.getIdToken();
      await fetch(`/api/admin/tests/${test.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: test.title, 
          topic: test.topic, 
          subjectName: test.subjectName,
          category: test.category,
          testType: test.testType,
          duration: durNum,
          isActive: test.isActive 
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Tab Navigation */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit flex-wrap gap-1">
        <button 
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
        >
          <UserIcon className="w-4 h-4" />
          Students
        </button>
        <button 
          onClick={() => setActiveTab('mock')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'mock' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
        >
          <FileText className="w-4 h-4" />
          Mock Tests
        </button>
        <button 
          onClick={() => setActiveTab('typing')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'typing' ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-100' : 'text-slate-500 hover:text-fuchsia-600 hover:bg-fuchsia-50'}`}
        >
          <Keyboard className="w-4 h-4" />
          Typing Tests
        </button>
        <button 
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'notes' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
        >
          <BookOpen className="w-4 h-4" />
          Study Notes
        </button>
        <button 
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'video' ? 'bg-rose-600 text-white shadow-md shadow-rose-100' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'}`}
        >
          <Play className="w-4 h-4" />
          Recorded Videos
        </button>
        <button 
          onClick={() => setActiveTab('pyq')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'pyq' ? 'bg-amber-600 text-white shadow-md shadow-amber-100' : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'}`}
        >
          <FileText className="w-4 h-4" />
          Py Qs
        </button>
        <button 
          onClick={() => setActiveTab('pattern')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'pattern' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
        >
          <FileText className="w-4 h-4" />
          Exam Pattern & Syllabus
        </button>
        <button 
          onClick={() => setActiveTab('carousel')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'carousel' ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-100' : 'text-slate-500 hover:text-fuchsia-600 hover:bg-fuchsia-50'}`}
        >
          <Plus className="w-4 h-4" />
          Carousel
        </button>
        <button 
          onClick={() => setActiveTab('social')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'social' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-100' : 'text-slate-500 hover:text-cyan-600 hover:bg-cyan-50'}`}
        >
          <Plus className="w-4 h-4" />
          Social Links
        </button>
        <button 
          onClick={() => setActiveTab('affairs')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'affairs' ? 'bg-orange-600 text-white shadow-md shadow-orange-100' : 'text-slate-500 hover:text-orange-600 hover:bg-orange-50'}`}
        >
          <Clock className="w-4 h-4" />
          Current Affairs
        </button>
        <button 
          onClick={() => setActiveTab('practice')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'practice' ? 'bg-teal-600 text-white shadow-md shadow-teal-100' : 'text-slate-500 hover:text-teal-600 hover:bg-teal-50'}`}
        >
          <Plus className="w-4 h-4" />
          Practice Sets
        </button>
        <button 
          onClick={() => setActiveTab('site_info')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'site_info' ? 'bg-slate-700 text-white shadow-md shadow-slate-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <Edit2 className="w-4 h-4" />
          About & Contact Info
        </button>
        <button 
          onClick={() => setActiveTab('student_analysis')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'student_analysis' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
        >
          <UserIcon className="w-4 h-4" />
          STUDENT ANALYSIS
        </button>
      </div>

      {activeTab === 'student_analysis' && (() => {
        const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
        const [studentAttempts, setStudentAttempts] = useState<any[]>([]);
        const [loadingAttempts, setLoadingAttempts] = useState(false);
        const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
        const [deepQuestions, setDeepQuestions] = useState<any[]>([]);
        const [loadingDeep, setLoadingDeep] = useState(false);
        const [searchQuery, setSearchQuery] = useState('');

        // Load attempts for selected student
        useEffect(() => {
          if (!selectedStudent) return;
          async function fetchAttempts() {
            setLoadingAttempts(true);
            setSelectedAttempt(null);
            setDeepQuestions([]);
            try {
              const token = await auth.currentUser?.getIdToken();
              const res = await fetch(`/api/admin/student-attempts/${selectedStudent.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                const data = await res.json();
                setStudentAttempts(data.attempts || []);
              }
            } catch (err) {
              console.error(err);
            } finally {
              setLoadingAttempts(false);
            }
          }
          fetchAttempts();
        }, [selectedStudent]);

        // Load deep questions when attempt is clicked
        useEffect(() => {
          if (!selectedAttempt) return;
          async function fetchDeepQuestions() {
            setLoadingDeep(true);
            try {
              const token = await auth.currentUser?.getIdToken();
              const res = await fetch(`/api/admin/test-attempt-analysis/${selectedAttempt.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                const data = await res.json();
                setDeepQuestions(data.questions || []);
              }
            } catch (err) {
              console.error(err);
            } finally {
              setLoadingDeep(false);
            }
          }
          fetchDeepQuestions();
        }, [selectedAttempt]);

        // Export PDF
        const handlePDFExport = (student: any, attempts: any[]) => {
          const doc = new jsPDF();
          doc.setFontSize(22);
          doc.setTextColor(79, 70, 229);
          doc.text(`Master Aptitude Student Performance Report`, 14, 20);

          doc.setFontSize(11);
          doc.setTextColor(100, 116, 139);
          doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27);

          doc.setFontSize(13);
          doc.setTextColor(30, 41, 59);
          doc.text(`Basic Information`, 14, 38);
          doc.line(14, 40, 196, 40);

          doc.setFontSize(11);
          doc.text(`Student Name: ${student.name}`, 14, 48);
          doc.text(`Mobile Number: ${student.phoneNumber || 'N/A'}`, 14, 55);
          doc.text(`Email: ${student.email || 'N/A'}`, 14, 62);
          doc.text(`Course: ${student.courseName || 'General Course'}`, 14, 69);
          doc.text(`Registered: ${student.registrationDate ? new Date(student.registrationDate).toLocaleDateString() : 'N/A'}`, 14, 76);

          doc.setFontSize(13);
          doc.text(`Performance History`, 14, 90);
          doc.line(14, 92, 196, 92);

          const headers = [["Mock Test Title", "Score Obtained", "Accuracy %", "Rank", "Date Attempted"]];
          const tableData = attempts.map(att => [
            att.testTitle,
            att.score,
            `${att.accuracy}%`,
            att.rank || 'N/A',
            new Date(att.createdAt).toLocaleDateString()
          ]);

          (doc as any).autoTable({
            startY: 96,
            head: headers,
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }
          });

          doc.save(`${student.name}_analysis_report.pdf`);
        };

        // Export Excel (CSV)
        const handleCSVExport = (student: any, attempts: any[]) => {
          const csvRows = [
            ["Mock Test", "Marks", "Accuracy", "Rank", "Date"],
            ...attempts.map(att => [
              att.testTitle,
              att.score,
              `${att.accuracy}%`,
              att.rank || 'N/A',
              new Date(att.createdAt).toLocaleDateString()
            ])
          ];
          const csvContent = "data:text/csv;charset=utf-8," 
            + csvRows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `${student.name}_mock_history.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        // Print Analysis
        const handlePrint = () => {
          window.print();
        };

        // Filters student list (Active only)
        const activeStudents = students.filter(s => {
          if (s.status === 'blocked') return false;
          const matchesSearch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (s.phoneNumber || '').includes(searchQuery) ||
                                (s.email || '').toLowerCase().includes(searchQuery.toLowerCase());
          return matchesSearch;
        });

        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            {!selectedStudent ? (
              // List View of Active Students
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
                    STUDENT-WISE PERFORMANCE ANALYSIS
                  </h2>
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input 
                        type="text"
                        placeholder="Search student, mobile, email..."
                        className="pl-11 pr-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-600 outline-hidden w-64 md:w-80 font-medium text-sm bg-white"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Student Name</th>
                        <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Mobile Number</th>
                        <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Course</th>
                        <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Total Mock Attempts</th>
                        <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-5 text-right text-xs font-black text-slate-400 uppercase tracking-widest">View Analysis</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                      {activeStudents.map(student => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black mr-4 uppercase">
                                {(student.name || 'S').charAt(0)}
                              </div>
                              <span className="text-sm font-bold text-slate-800">{student.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-600">{student.phoneNumber || 'N/A'}</span>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span className="text-sm text-slate-500 font-bold">{student.courseName || 'General Aptitude'}</span>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span className="text-sm font-black text-indigo-600">{student.totalTestsTaken || 0}</span>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600">
                              Active
                            </span>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap text-right">
                            <button 
                              onClick={() => setSelectedStudent(student)}
                              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                              VIEW DETAILS
                            </button>
                          </td>
                        </tr>
                      ))}
                      {activeStudents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                            No active students found matching search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Detailed Performance Dashboard View
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedStudent(null)} 
                      className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors"
                      title="Back to Student List"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-0.5">Student Dashboard</span>
                      <h3 className="text-2xl font-black text-slate-800">{selectedStudent.name}</h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => handlePDFExport(selectedStudent, studentAttempts)}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Export PDF
                    </button>
                    <button 
                      onClick={() => handleCSVExport(selectedStudent, studentAttempts)}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Export Excel
                    </button>
                    <button 
                      onClick={handlePrint}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Print Analysis
                    </button>
                  </div>
                </div>

                {/* Dashboard Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left: Basic Details & Advanced Metrics */}
                  <div className="lg:col-span-1 space-y-8">
                    
                    {/* Basic details */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Basic Information</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Name</span>
                          <span className="text-sm font-bold text-slate-800">{selectedStudent.name}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Mobile Number</span>
                          <span className="text-sm font-medium text-slate-600">{selectedStudent.phoneNumber || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Email Address</span>
                          <span className="text-sm font-medium text-slate-600">{selectedStudent.email || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Registration Date</span>
                          <span className="text-sm font-medium text-slate-500">
                            {selectedStudent.registrationDate ? new Date(selectedStudent.registrationDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Course</span>
                          <span className="text-sm font-bold text-indigo-600">{selectedStudent.courseName || 'General Aptitude'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Active Status</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Metrics */}
                    {studentAttempts.length > 0 && (() => {
                      // Compute Advanced Analytics
                      const scores = studentAttempts.map(a => a.score || 0);
                      const maxScore = Math.max(...scores);
                      const minScore = Math.min(...scores);
                      const totalTime = studentAttempts.reduce((acc, curr) => acc + (curr.timeTaken || 0), 0);
                      const avgTime = Math.round(totalTime / studentAttempts.length);

                      return (
                        <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
                          <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Advanced Statistics</h4>
                          
                          <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-800 pb-2">
                              <span className="text-xs text-slate-400 font-bold">Highest Score</span>
                              <span className="text-sm font-black text-indigo-300 font-mono">{maxScore}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-2">
                              <span className="text-xs text-slate-400 font-bold">Lowest Score</span>
                              <span className="text-sm font-black text-rose-400 font-mono">{minScore}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-2">
                              <span className="text-xs text-slate-400 font-bold">Average Solving Latency</span>
                              <span className="text-sm font-black text-emerald-400 font-mono">{Math.floor(avgTime / 60)}m {avgTime % 60}s</span>
                            </div>
                            <div className="flex justify-between pb-2">
                              <span className="text-xs text-slate-400 font-bold">Total Practice Time</span>
                              <span className="text-sm font-black text-indigo-300 font-mono">{Math.floor(totalTime / 60)}m {totalTime % 60}s</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  </div>

                  {/* Right: Mock Test Summary, History & Deep Question analysis */}
                  <div className="lg:col-span-2 space-y-8">
                    
                    {/* Overview Cards & History */}
                    {loadingAttempts ? (
                      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-400 font-bold">Loading student logs...</p>
                      </div>
                    ) : (
                      <>
                        {/* Summary Metrics */}
                        {(() => {
                          const total = studentAttempts.length;
                          const avgScore = total > 0 ? (studentAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / total).toFixed(1) : '0.0';
                          const avgAccuracy = total > 0 ? Math.round(studentAttempts.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / total) : 0;
                          
                          return (
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mock Attempts</span>
                                <span className="text-2xl font-black text-slate-900">{total}</span>
                              </div>
                              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Avg Score</span>
                                <span className="text-2xl font-black text-indigo-600">{avgScore}</span>
                              </div>
                              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Avg Accuracy</span>
                                <span className="text-2xl font-black text-emerald-600">{avgAccuracy}%</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Progression Graph */}
                        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-4">
                          <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400 animate-pulse" />
                            Progression & Improvement Graph
                          </h5>
                          {studentAttempts.length > 1 ? (
                            <div className="relative pt-4">
                              <svg viewBox="0 0 500 150" className="w-full h-40 overflow-visible">
                                <line x1="40" y1="10" x2="480" y2="10" stroke="#1e293b" strokeDasharray="3,3" />
                                <line x1="40" y1="50" x2="480" y2="50" stroke="#1e293b" strokeDasharray="3,3" />
                                <line x1="40" y1="90" x2="480" y2="90" stroke="#1e293b" strokeDasharray="3,3" />
                                <line x1="40" y1="130" x2="480" y2="130" stroke="#1e293b" />

                                {(() => {
                                  const pts = [...studentAttempts].reverse().slice(-8);
                                  const maxScore = Math.max(...pts.map(p => p.score), 100);
                                  const xStep = pts.length > 1 ? 440 / (pts.length - 1) : 440;
                                  
                                  const pointsCoords = pts.map((p, idx) => {
                                    const x = 40 + idx * xStep;
                                    const y = 130 - ((p.score || 0) / maxScore) * 120;
                                    return { x, y, score: p.score, title: p.testTitle };
                                  });

                                  const dPath = pointsCoords.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                                  return (
                                    <>
                                      <path d={dPath} fill="none" stroke="url(#indigoGrad2)" strokeWidth="3" strokeLinecap="round" />
                                      {pointsCoords.map((p, idx) => (
                                        <g key={idx}>
                                          <circle cx={p.x} cy={p.y} r="5" fill="#6366f1" />
                                          <text x={p.x} y={p.y - 12} textAnchor="middle" fill="#a5b4fc" className="text-[10px] font-bold font-mono">
                                            {p.score}
                                          </text>
                                          <text x={p.x} y="145" textAnchor="middle" fill="#64748b" className="text-[8px] font-medium">
                                            {pts[idx].testTitle.substring(0, 10)}
                                          </text>
                                        </g>
                                      ))}
                                      <defs>
                                        <linearGradient id="indigoGrad2" x1="0" y1="0" x2="1" y2="0">
                                          <stop offset="0%" stopColor="#818cf8" />
                                          <stop offset="100%" stopColor="#34d399" />
                                        </linearGradient>
                                      </defs>
                                    </>
                                  );
                                })()}
                              </svg>
                            </div>
                          ) : (
                            <div className="h-40 flex items-center justify-center border border-slate-800 border-dashed rounded-2xl text-slate-500 text-sm font-bold">
                              Take at least 2 mock tests to display progression graph.
                            </div>
                          )}
                        </div>

                        {/* Mock History List */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mock Test History</h4>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-400">
                                  <th className="pb-3 text-xs font-black uppercase tracking-widest">Mock Test</th>
                                  <th className="pb-3 text-xs font-black uppercase tracking-widest">Marks</th>
                                  <th className="pb-3 text-xs font-black uppercase tracking-widest">Accuracy</th>
                                  <th className="pb-3 text-xs font-black uppercase tracking-widest">Rank</th>
                                  <th className="pb-3 text-xs font-black uppercase tracking-widest">Date</th>
                                  <th className="pb-3 text-xs font-black uppercase tracking-widest text-right">View Analysis</th>
                                </tr>
                              </thead>
                              <tbody>
                                {studentAttempts.map(attempt => (
                                  <tr key={attempt.id} className="hover:bg-slate-50/50">
                                    <td className="py-4 text-sm font-bold text-slate-800 truncate max-w-[200px]" title={attempt.testTitle}>
                                      {attempt.testTitle}
                                    </td>
                                    <td className="py-4 text-sm font-mono font-bold text-indigo-600">{attempt.score}</td>
                                    <td className="py-4">
                                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-xs font-bold">
                                        {attempt.accuracy}%
                                      </span>
                                    </td>
                                    <td className="py-4 text-sm text-slate-500 font-bold">#{attempt.rank || 'N/A'}</td>
                                    <td className="py-4 text-xs text-slate-500 font-medium">
                                      {attempt.createdAt ? new Date(attempt.createdAt).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="py-4 text-right">
                                      <button 
                                        onClick={() => setSelectedAttempt(attempt)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                                          selectedAttempt?.id === attempt.id 
                                            ? 'bg-rose-600 text-white' 
                                            : 'bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white'
                                        }`}
                                      >
                                        Analyze
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {studentAttempts.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                                      No mock test attempts recorded yet.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Deep Question analysis Matrix */}
                        {selectedAttempt && (
                          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-in fade-in duration-300">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                              <span>Question-Wise Response Analysis — {selectedAttempt.testTitle}</span>
                              <button 
                                onClick={() => setSelectedAttempt(null)}
                                className="text-[10px] text-rose-500 font-black uppercase tracking-widest hover:underline"
                              >
                                Clear Analysis
                              </button>
                            </h4>

                            {loadingDeep ? (
                              <div className="flex flex-col items-center justify-center py-10">
                                <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                <p className="text-slate-400 font-bold text-xs">Loading answers...</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-slate-400">
                                      <th className="pb-3 text-[10px] font-black uppercase tracking-widest">Question No</th>
                                      <th className="pb-3 text-[10px] font-black uppercase tracking-widest">Student Answer</th>
                                      <th className="pb-3 text-[10px] font-black uppercase tracking-widest">Correct Answer</th>
                                      <th className="pb-3 text-[10px] font-black uppercase tracking-widest">Status</th>
                                      <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-right">Time Taken</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {deepQuestions.map(q => (
                                      <tr key={q.questionNo} className="hover:bg-slate-50/50">
                                        <td className="py-3 text-sm font-mono font-bold text-slate-800">Q{q.questionNo}</td>
                                        <td className="py-3 text-sm font-mono font-bold text-slate-500">{q.studentAnswer || '--'}</td>
                                        <td className="py-3 text-sm font-mono font-bold text-emerald-600">{q.correctAnswer}</td>
                                        <td className="py-3">
                                          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wide ${
                                            !q.studentAnswer ? 'bg-slate-100 text-slate-400' :
                                            q.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                          }`}>
                                            {!q.studentAnswer ? 'Skipped' : q.isCorrect ? 'Correct' : 'Wrong'}
                                          </span>
                                        </td>
                                        <td className="py-3 text-right text-xs font-mono text-slate-400">{q.timeTaken || 0} sec</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                  </div>

                </div>

              </div>
            )}
          </div>
        );
      })()}

      {activeTab === 'mock' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
              Mock Test Management
            </h2>
            <button 
              onClick={handleUpdateCategoryOrder}
              disabled={isUpdatingOrder}
              className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              {isUpdatingOrder ? 'Updating...' : 'Set Category Order'}
            </button>
          </div>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{editingTestId ? 'Edit Mock Test' : 'Create New Mock Test'}</h3>
            <form onSubmit={handleCreateTest} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Test Title</label>
                <input 
                  type="text" 
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={title} onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. Physics Section A"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Topic Name</label>
                <input 
                  type="text" 
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={topic} onChange={e => setTopic(e.target.value)} 
                  placeholder="e.g. Mechanics"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject Name</label>
                <input 
                  type="text" 
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={subjectName} onChange={e => setSubjectName(e.target.value)} 
                  placeholder="e.g. Physics"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                <select
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={category} onChange={e => setCategory(e.target.value)}
                >
                  <option value="GK">GK</option>
                  <option value="English">English</option>
                  <option value="Math">Math</option>
                  <option value="Reasoning">Reasoning</option>
                  <option value="Computer">Computer</option>
                  <option value="Science">Science</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                  <option value="Polity">Polity</option>
                  <option value="Economics">Economics</option>
                  <option value="Current Affairs">Current Affairs</option>
                  {customMockCategories.filter(c => c.categoryType === 'mock').map(c => (
                    <option key={c.id} value={c.categoryName}>{c.categoryName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Test Type</label>
                <select
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={testType} onChange={e => setTestType(e.target.value)}
                >
                  <option value="topic">Topic Wise Mock Test</option>
                  <option value="sectional">Sectional Mock Test</option>
                  <option value="full">Full Mock Test</option>
                </select>
              </div>
              <div className="w-full">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Duration (Mins)</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={duration} onChange={e => setDuration(e.target.value)} 
                />
              </div>
              <div className="w-full">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Marks (+ve)</label>
                <input 
                  type="number" step="0.1"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={marksPerCorrect} onChange={e => setMarksPerCorrect(e.target.value)} 
                />
              </div>
              <div className="w-full">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Negative (-ve)</label>
                <input 
                  type="number" step="0.01"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={negativeMarks} onChange={e => setNegativeMarks(e.target.value)} 
                />
              </div>
              <div className="md:col-span-4 flex gap-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-indigo-50 flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  {editingTestId ? 'Update Test' : 'Build Test'}
                </button>
                {editingTestId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingTestId(null);
                      setTitle('');
                      setTopic('');
                      setDuration('30');
                    }}
                    className="flex-1 bg-slate-100 text-slate-600 px-6 py-4 rounded-xl hover:bg-slate-200 font-bold transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-4 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <input 
                type="text" 
                placeholder="Search mock tests..." 
                className="w-full bg-slate-50 border-none rounded-xl p-3 pl-10 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                value={mockSearch}
                onChange={e => setMockSearch(e.target.value)}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <select 
              className="bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500"
              value={mockFilterCategory}
              onChange={e => setMockFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {Array.from(new Set(tests.map(t => t.category).filter(Boolean))).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select 
              className="bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500"
              value={mockFilterType}
              onChange={e => setMockFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="topic">Topic Wise</option>
              <option value="sectional">Sectional</option>
              <option value="full">Full Mock</option>
            </select>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Test Name</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Topic</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Time</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50 relative">
                {loading && <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-bold">Fetching Tests...</td></tr>}
                {!loading && filteredTests.map(test => (
                  <tr key={test.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-bold text-slate-800">{test.title || 'Untitled'}</td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-medium text-slate-500">
                      <div className="flex flex-col gap-1">
                        <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-600 inline-block w-fit">{test.topic || 'No Topic'}</span>
                        {test.subjectName && <span className="text-xs text-slate-400 font-bold">{test.subjectName}</span>}
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">
                            {test.testType === 'topic' ? 'Topic Wise' : test.testType === 'sectional' ? 'Sectional' : 'Full Mock'}
                          </span>
                          {test.category && <span className="text-[10px] uppercase font-black text-emerald-500 bg-emerald-50 px-2 rounded">{test.category}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm text-slate-500">
                      <button onClick={() => updateDuration(test)} className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg hover:bg-indigo-100 transition-colors">
                        {test.duration || 30}m
                      </button>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm">
                      <button 
                        onClick={() => toggleActive(test)}
                        className={`px-4 py-1.5 inline-flex text-xs font-black uppercase tracking-widest rounded-full transition-all ${test.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {test.isActive ? 'Active' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right text-sm font-bold">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditTest(test)}
                          className="text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all border border-amber-100 font-bold text-xs"
                          title="Edit Test Settings (Title, Time)"
                        >
                          Settings
                        </button>
                        <Link 
                          to={`/admin/test/${test.id}`} 
                          className="text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all border border-indigo-100 font-bold text-xs"
                          title="Modify Questions & Solutions"
                        >
                          Modify
                        </Link>
                        <button
                          onClick={() => handleDeleteContent('tests', test.id)}
                          className="text-rose-500 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-all border border-rose-100 font-bold text-xs"
                          title="Delete Test"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => copyLink(`${window.location.origin}/test/${test.id}`, test.id)}
                          className={`px-3 py-1.5 rounded-lg transition-all border font-bold text-xs flex items-center gap-1 ${copiedId === test.id ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'text-violet-600 hover:bg-violet-100 border-violet-100'}`}
                          title="Copy shareable link"
                        >
                          {copiedId === test.id ? <><Check className="w-3 h-3" /> Copied!</> : <><Link2 className="w-3 h-3" /> Share</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && tests.length === 0 && <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-bold">No tests created yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'typing' && (
        <AdminTypingTests />
      )}

      {activeTab === 'notes' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-emerald-600 rounded-full"></span>
            Study Notes Repository
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{editingNoteId ? 'Update Study Material' : 'Upload / Link New Study Material'}</h3>
            <form onSubmit={handleAddNote} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Note Title <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" required
                    className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                    value={noteTitle} onChange={e => setNoteTitle(e.target.value)} 
                    placeholder="e.g. Organic Chemistry Guide"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject / Category (Optional)</label>
                  <input 
                    type="text"
                    className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                    value={noteSubject} onChange={e => setNoteSubject(e.target.value)} 
                    placeholder="e.g. Chemistry"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Resource Link (Optional)</label>
                  <input 
                    type="url"
                    className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                    value={noteLink} onChange={e => setNoteLink(e.target.value)} 
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">OR Upload File (Optional)</label>
                  <input 
                    id="note-file-input"
                    type="file" 
                    className="w-full rounded-xl border-slate-200 border-2 p-2 outline-hidden font-medium text-xs file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setNoteFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button 
                  disabled={uploadingNote}
                  type="submit" 
                  className="bg-emerald-600 disabled:opacity-50 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-emerald-50 flex items-center justify-center gap-2"
                >
                  {uploadingNote ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      {editingNoteId ? 'Update Note' : 'Add Note'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map(note => (
              <div key={note.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all">
                <div className="absolute top-4 right-4 flex gap-1">
                  <button
                    onClick={() => copyLink(note.link || note.fileUrl || '', `note-${note.id}`)}
                    className={`p-2 rounded-xl transition-colors ${copiedId === `note-${note.id}` ? 'text-emerald-600 bg-emerald-50' : 'text-violet-500 hover:bg-violet-50'}`}
                    title="Copy shareable link"
                  >
                    {copiedId === `note-${note.id}` ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEditNote(note)}
                    className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-xl transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteContent('notes', note.id)}
                    className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 mb-1">{note.title}</h4>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{note.subject}</p>
                <a 
                  href={note.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  View Resource
                </a>
              </div>
            ))}
            {notes.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 font-bold">No study notes uploaded yet.</div>}
          </div>
        </div>
      )}

      {activeTab === 'video' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-rose-600 rounded-full"></span>
            Video Library Management
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Submit New Educational Video</h3>
            <form onSubmit={handleAddVideo} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Video Title</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={videoTitle} onChange={e => setVideoTitle(e.target.value)} 
                  placeholder="e.g. Newton's Laws Explained"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={videoSubject} onChange={e => setVideoSubject(e.target.value)} 
                  placeholder="e.g. Physics"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Video Link (YouTube/Vimeo)</label>
                <input 
                  type="url" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={videoLink} onChange={e => setVideoLink(e.target.value)} 
                  placeholder="https://youtube.com/..."
                />
              </div>
              <button type="submit" className="bg-rose-600 text-white px-6 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-rose-50 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                Add Video
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(video => (
              <div key={video.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all">
                <div className="absolute top-4 right-4 flex gap-1">
                  <button
                    onClick={() => copyLink(video.link || '', `video-${video.id}`)}
                    className={`p-2 rounded-xl transition-colors ${copiedId === `video-${video.id}` ? 'text-emerald-600 bg-emerald-50' : 'text-violet-500 hover:bg-rose-50'}`}
                    title="Copy shareable link"
                  >
                    {copiedId === `video-${video.id}` ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteContent('videos', video.id)}
                    className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 group-hover:bg-rose-600 group-hover:text-white transition-all">
                  <Play className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 mb-1">{video.title}</h4>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{video.subject}</p>
                <a 
                  href={video.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center text-rose-600 font-bold text-sm bg-rose-50 px-4 py-2 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  Watch Now
                </a>
              </div>
            ))}
            {videos.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 font-bold">No videos linked yet.</div>}
          </div>
        </div>
      )}

      {activeTab === 'pyq' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-amber-600 rounded-full"></span>
            Previous Year Questions
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{editingPyqId ? 'Update PYQ' : 'Upload New PYQ'}</h3>
            <form onSubmit={handleAddPyq} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" required
                    className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                    value={pyqTitle} onChange={e => setPyqTitle(e.target.value)} 
                    placeholder="e.g. 2023 Paper"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject (Optional)</label>
                  <input 
                    type="text"
                    className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                    value={pyqSubject} onChange={e => setPyqSubject(e.target.value)} 
                    placeholder="e.g. Maths"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Resource Link (Optional)</label>
                  <input 
                    type="url"
                    className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                    value={pyqLink} onChange={e => setPyqLink(e.target.value)} 
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">OR Upload File (Optional)</label>
                  <input 
                    id="pyq-file-input"
                    type="file" 
                    className="w-full rounded-xl border-slate-200 border-2 p-2 outline-hidden font-medium text-xs file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setPyqFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button 
                  disabled={uploadingPyq}
                  type="submit" 
                  className="bg-amber-600 disabled:opacity-50 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-amber-50 flex items-center justify-center gap-2"
                >
                  {uploadingPyq ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      {editingPyqId ? 'Update PYQ' : 'Add PYQ'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pyqs.map(pyq => (
              <div key={pyq.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all">
                <div className="absolute top-4 right-4 flex gap-1">
                  <button
                    onClick={() => copyLink(pyq.fileUrl || pyq.link || '', `pyq-${pyq.id}`)}
                    className={`p-2 rounded-xl transition-colors ${copiedId === `pyq-${pyq.id}` ? 'text-emerald-600 bg-emerald-50' : 'text-violet-500 hover:bg-violet-50'}`}
                    title="Copy shareable link"
                  >
                    {copiedId === `pyq-${pyq.id}` ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEditPyq(pyq)}
                    className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-xl transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteContent('pyqs', pyq.id)}
                    className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 mb-1">{pyq.title}</h4>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{pyq.subject}</p>
                <a 
                  href={pyq.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center text-amber-600 font-bold text-sm bg-amber-50 px-4 py-2 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  View Resource
                </a>
              </div>
            ))}
            {pyqs.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 font-bold">No Pyqs uploaded yet.</div>}
          </div>
        </div>
      )}

      {activeTab === 'pattern' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
            Exam Pattern & Syllabus
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Upload Exam Pattern & Syllabus</h3>
            <form onSubmit={handleAddPattern} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Exam Name</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={patternExamName} onChange={e => setPatternExamName(e.target.value)} 
                  placeholder="e.g. SSC CGL 2024"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Syllabus Files (PDF/Images)</label>
                <input 
                  id="pattern-files-input"
                  type="file" required multiple
                  accept="image/*,.pdf"
                  className="w-full rounded-xl border-slate-200 border-2 p-2.5 outline-hidden font-medium text-sm file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                  onChange={e => setPatternFiles(Array.from(e.target.files || []))} 
                />
              </div>
              <button 
                type="submit" 
                disabled={uploadingPattern}
                className="bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-blue-50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploadingPattern ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {uploadingPattern ? 'Uploading...' : 'Add Pattern'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {patterns.map(pattern => (
              <div key={pattern.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all">
                <button 
                  onClick={() => handleDeleteContent('patterns', pattern.id)} 
                  className="absolute top-4 right-4 text-rose-500 hover:bg-rose-50 p-2 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 mb-4">{pattern.title}</h4>
                <div className="flex flex-wrap gap-2">
                  {pattern.files ? pattern.files.map((file: any, idx: number) => (
                    <a 
                      key={idx}
                      href={file.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 font-bold text-[10px] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors uppercase tracking-tight"
                    >
                      {file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                    </a>
                  )) : (
                    <a 
                      href={pattern.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      View Resource
                    </a>
                  )}
                </div>
              </div>
            ))}
            {patterns.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 font-bold">No Pattern uploaded yet.</div>}
          </div>
        </div>
      )}

      {activeTab === 'carousel' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Crop modal */}
          {showCropModal && (
            <ImageCropper
              src={cropSrc}
              onCrop={blob => {
                const file = new File([blob], 'carousel-cropped.jpg', { type: 'image/jpeg' });
                setCarouselFile(file);
                setCroppedPreviewUrl(URL.createObjectURL(blob));
                setShowCropModal(false);
              }}
              onCancel={() => setShowCropModal(false)}
            />
          )}

          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-fuchsia-600 rounded-full"></span>
            Carousel Management
          </h2>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Upload Carousel Image</h3>
                <p className="text-sm text-slate-500">
                  Up to <span className="font-bold text-fuchsia-600">3 images</span> in the home carousel.
                  Images are cropped before upload so they display perfectly.
                </p>
              </div>
              <button
                disabled={clearingCarousel || carousels.length === 0}
                onClick={handleBulkClearCarousel}
                className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2 border border-rose-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {clearingCarousel ? 'Clearing...' : 'Clear All'}
              </button>
            </div>

            <form onSubmit={handleAddCarousel} className="space-y-5">
              {/* File picker + crop preview row */}
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Left: file input */}
                <div className="flex-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    1 · Choose Image from Gallery
                  </label>
                  <input
                    id="carousel-file-input"
                    type="file"
                    accept="image/*"
                    className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-fuchsia-50 file:text-fuchsia-700 hover:file:bg-fuchsia-100"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // Reset any previous crop
                      setCarouselFile(null);
                      setCroppedPreviewUrl('');
                      // Read as data URL → open crop modal
                      const reader = new FileReader();
                      reader.onload = ev => {
                        setCropSrc(ev.target?.result as string);
                        setShowCropModal(true);
                      };
                      reader.readAsDataURL(file);
                      // Reset input so same file can be re-selected
                      e.target.value = '';
                    }}
                  />
                  {!croppedPreviewUrl && (
                    <p className="mt-2 text-[11px] text-slate-400 font-medium">
                      After choosing, a crop tool will open so you can frame it perfectly.
                    </p>
                  )}
                </div>

                {/* Right: cropped preview */}
                {croppedPreviewUrl && (
                  <div className="shrink-0">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                      2 · Cropped Preview
                    </label>
                    <div className="relative w-48 h-28 rounded-xl overflow-hidden border-2 border-fuchsia-300 shadow-md">
                      <img src={croppedPreviewUrl} alt="Cropped preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => { setCroppedPreviewUrl(''); setCarouselFile(null); }}
                          className="text-white bg-rose-500 rounded-lg px-3 py-1 text-xs font-bold shadow"
                        >
                          Re-crop
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ready to upload
                    </p>
                  </div>
                )}
              </div>

              {/* Priority + Badge + submit */}
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="sm:w-40">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    3 · Display Order
                  </label>
                  <input
                    type="number" required min="1" max="10"
                    className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium focus:border-fuchsia-500"
                    value={carouselPriority} onChange={e => setCarouselPriority(e.target.value)}
                    placeholder="1"
                  />
                </div>

                {/* Badge selector */}
                <div className="sm:w-56">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    4 · Corner Badge
                  </label>
                  <div className="flex gap-2">
                    {/* None */}
                    <button
                      type="button"
                      onClick={() => setCarouselBadge('none')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${
                        carouselBadge === 'none'
                          ? 'border-slate-400 bg-slate-100 text-slate-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      None
                    </button>
                    {/* LIVE */}
                    <button
                      type="button"
                      onClick={() => setCarouselBadge('live')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${
                        carouselBadge === 'live'
                          ? 'border-red-500 bg-red-500 text-white shadow-md shadow-red-200'
                          : 'border-red-200 bg-red-50 text-red-500 hover:border-red-400'
                      }`}
                    >
                      🔴 LIVE
                    </button>
                    {/* NEW */}
                    <button
                      type="button"
                      onClick={() => setCarouselBadge('new')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${
                        carouselBadge === 'new'
                          ? 'border-green-500 bg-green-500 text-white shadow-md shadow-green-200'
                          : 'border-green-200 bg-green-50 text-green-600 hover:border-green-400'
                      }`}
                    >
                      🟢 NEW
                    </button>
                  </div>
                </div>

                <button
                  disabled={uploadingCarousel || carousels.length >= 3 || !carouselFile}
                  type="submit"
                  className="flex-1 bg-fuchsia-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl hover:bg-fuchsia-700 font-bold transition-all shadow-lg shadow-fuchsia-100 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {uploadingCarousel ? 'Uploading…' : !carouselFile ? 'Choose & Crop Image First' : 'Upload Cropped Image'}
                </button>
              </div>
            </form>

            {carousels.length >= 3 && (
              <p className="mt-4 text-xs text-rose-500 font-bold bg-rose-50 p-3 rounded-lg border border-rose-100 flex items-center gap-2">
                <X className="w-4 h-4" />
                Limit reached (3/3). Delete an existing image below to add a new one.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {carousels.sort((a,b) => (a.priority || 99) - (b.priority || 99)).map((carousel, index) => (
              <div key={carousel.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Order: {carousel.priority || index + 1}</span>
                    <button 
                      onClick={() => handleUpdateCarouselPriority(carousel.id, carousel.priority || index + 1)}
                      className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                      title="Change Order"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                  <button 
                    onClick={() => handleDeleteContent('carousel', carousel.id)} 
                    className="text-white bg-rose-500 hover:bg-rose-600 p-2 rounded-lg shadow-sm flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    DELETE
                  </button>
                </div>
                <div className="w-full h-40 bg-slate-100 rounded-2xl mb-4 overflow-hidden relative">
                   <img src={carousel.link} alt="Carousel slide" className="w-full h-full object-cover" />
                </div>
                <a 
                  href={carousel.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center text-fuchsia-600 font-bold text-sm bg-fuchsia-50 px-4 py-2 rounded-xl hover:bg-fuchsia-100 transition-colors mt-auto w-fit"
                >
                  View Large
                </a>
              </div>
            ))}
            {carousels.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 font-bold">No carousel images uploaded yet.</div>}
          </div>
        </div>
      )}

      {activeTab === 'social' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-cyan-600 rounded-full"></span>
            Social Links Management
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Update Links</h3>
            <form onSubmit={handleSaveSocials} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">YouTube Channel URL</label>
                <input 
                  type="url"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={socialYoutube} onChange={e => setSocialYoutube(e.target.value)} 
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Telegram Channel URL</label>
                <input 
                  type="url"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={socialTelegram} onChange={e => setSocialTelegram(e.target.value)} 
                  placeholder="https://t.me/..."
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp Group URL</label>
                <input 
                  type="url"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={socialWhatsapp} onChange={e => setSocialWhatsapp(e.target.value)} 
                  placeholder="https://chat.whatsapp.com/..."
                />
              </div>
              <button disabled={savingSocials} type="submit" className="w-full md:w-auto bg-cyan-600 disabled:opacity-50 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-cyan-50 flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {savingSocials ? 'Saving...' : 'Save Links'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'affairs' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-orange-600 rounded-full"></span>
            Current Affairs Management
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Add Current Affair</h3>
            <form onSubmit={handleAddAffair} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={affairTitle} onChange={e => setAffairTitle(e.target.value)} 
                  placeholder="Title"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Date (YYYY-MM-DD)</label>
                <input 
                  type="date"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={affairDate} onChange={e => setAffairDate(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">External Link (Optional)</label>
                <input 
                  type="url"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={affairLink} onChange={e => setAffairLink(e.target.value)} 
                  placeholder="https://..."
                />
              </div>
              <div className="md:col-span-3">
                <button disabled={uploadingAffair} type="submit" className="w-full md:w-auto bg-orange-600 disabled:opacity-50 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  {uploadingAffair ? 'Saving...' : 'Add Current Affair'}
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {affairs.map(item => (
              <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group">
                <button 
                  onClick={() => handleDeleteContent('affairs', item.id)} 
                  className="absolute top-4 right-4 text-rose-500 hover:bg-rose-50 p-2 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <Clock className="w-6 h-6 text-orange-600 mb-4" />
                <h4 className="font-bold text-slate-800 mb-1">{item.title}</h4>
                <p className="text-xs font-bold text-slate-400 mb-4">{item.date}</p>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-orange-600 text-sm font-bold hover:underline">
                    Read More →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'practice' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-teal-600 rounded-full"></span>
            Practice Set Management
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Add Practice Set</h3>
            <form onSubmit={handleAddPractice} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={practiceTitle} onChange={e => setPracticeTitle(e.target.value)} 
                  placeholder="Set Title"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject</label>
                <input 
                  type="text"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={practiceSubject} onChange={e => setPracticeSubject(e.target.value)} 
                  placeholder="Subject"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">OR Upload File</label>
                <input 
                  id="practice-file-input"
                  type="file"
                  className="w-full rounded-xl border-slate-200 border-2 p-2 outline-hidden font-medium text-xs" 
                  onChange={e => setPracticeFile(e.target.files ? e.target.files[0] : null)}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">External Link</label>
                <input 
                  type="url"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={practiceLink} onChange={e => setPracticeLink(e.target.value)} 
                  placeholder="https://..."
                />
              </div>
              <div className="md:col-span-3">
                <button disabled={uploadingPractice} type="submit" className="w-full md:w-auto bg-teal-600 disabled:opacity-50 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  {uploadingPractice ? 'Saving...' : 'Add Practice Set'}
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {practiceSets.map(item => (
              <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group">
                <div className="absolute top-4 right-4 flex gap-1">
                  <button
                    onClick={() => copyLink(item.fileUrl || item.link || '', `ps-${item.id}`)}
                    className={`p-2 rounded-xl transition-colors ${copiedId === `ps-${item.id}` ? 'text-emerald-600 bg-emerald-50' : 'text-violet-500 hover:bg-violet-50'}`}
                    title="Copy shareable link"
                  >
                    {copiedId === `ps-${item.id}` ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteContent('practice_sets', item.id)}
                    className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <FileText className="w-6 h-6 text-teal-600 mb-4" />
                <h4 className="font-bold text-slate-800 mb-1">{item.title}</h4>
                <p className="text-xs font-bold text-slate-400 mb-4">{item.subject}</p>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-teal-600 text-sm font-bold hover:underline">
                    Download / View →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'site_info' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-slate-700 rounded-full"></span>
            About Us & Contact Info
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Edit Site Information</h3>
            <form onSubmit={handleSaveSiteInfo} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">About Us Content</label>
                <textarea 
                  className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-medium min-h-[200px]"
                  value={aboutContent} onChange={e => setAboutContent(e.target.value)}
                  placeholder="Tell students about Master Aptitude..."
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Contact Us Details</label>
                <textarea 
                  className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-medium min-h-[150px]"
                  value={contactContent} onChange={e => setContactContent(e.target.value)}
                  placeholder="Address, Phone, Email details..."
                />
              </div>
              <button disabled={savingInfo} type="submit" className="w-full md:w-auto bg-slate-700 disabled:opacity-50 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {savingInfo ? 'Saving...' : 'Update Information'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Students</span>
              <span className="text-3xl font-black text-slate-900">{stats.total}</span>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Active Now</span>
              <span className="text-3xl font-black text-emerald-700">{stats.active}</span>
            </div>
            <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 shadow-sm">
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-1">Blocked Accounts</span>
              <span className="text-3xl font-black text-rose-700">{stats.blocked}</span>
            </div>
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 shadow-sm">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">Today's Reg.</span>
              <span className="text-3xl font-black text-indigo-700">{stats.today}</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
              Student Database
            </h2>
            <div className="flex flex-wrap gap-4 items-center">
              <select 
                value={studentFilter}
                onChange={e => setStudentFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-600 outline-hidden font-bold text-sm bg-white"
              >
                <option value="all">All Students</option>
                <option value="active">Active Only</option>
                <option value="blocked">Blocked Only</option>
              </select>
              
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Search name or ID..."
                  className="pl-11 pr-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-600 outline-hidden w-full md:w-64 font-medium text-sm"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                />
              </div>

              <button 
                onClick={handleExportStudents}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Mobile Number</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Registration Date</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Last Login</th>
                  <th className="px-8 py-5 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {students
                  .filter(s => {
                    const matchesSearch = (s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) || 
                                        (s.phoneNumber || '').includes(studentSearch) ||
                                        (s.id || '').includes(studentSearch);
                    const matchesFilter = studentFilter === 'all' ? true : 
                                       studentFilter === 'blocked' ? s.status === 'blocked' : 
                                       s.status !== 'blocked';
                    return matchesSearch && matchesFilter;
                  })
                  .map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 ${student.status === 'blocked' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600'} rounded-full flex items-center justify-center font-black mr-4 uppercase`}>
                          {(student.name || 'S').charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-slate-800">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-600">{student.phoneNumber}</span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="text-sm text-slate-500 font-medium">
                        {student.registrationDate ? new Date(student.registrationDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase w-fit tracking-widest ${student.status === 'blocked' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {student.status === 'blocked' ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="text-sm text-slate-500 font-medium">
                        {student.lastTestAt ? new Date(student.lastTestAt).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingStudent({ ...student, focusPassword: false, newPassword: '' })}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                          title="Edit Name/Mobile"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedStudentForAnalysis(student);
                            setShowStudentAttemptsModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Analyze Mock Attempts"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingStudent({ ...student, focusPassword: true, newPassword: '' })}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleBlockStudent(student)}
                          className={`p-2 rounded-xl transition-all ${student.status === 'blocked' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'}`}
                          title={student.status === 'blocked' ? 'Unblock Student' : 'Block Student'}
                        >
                          {student.status === 'blocked' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleDeleteStudent(student.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete Student Forever"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-black text-xl uppercase tracking-widest italic">Database Empty</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 relative animate-in zoom-in duration-300">
            <button onClick={() => setEditingStudent(null)} className="absolute top-8 right-8 p-3 hover:bg-slate-100 rounded-2xl transition-all">
              <X className="w-5 h-5 text-slate-400" />
            </button>
            
            <h3 className="text-2xl font-black text-slate-800 mb-2">
              {editingStudent.focusPassword ? 'Reset Account Password' : 'Edit Student Profile'}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">System ID: {editingStudent.id}</p>
            
            <form onSubmit={handleUpdateStudent} className="space-y-6">
              <div className={editingStudent.focusPassword ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  type="text" required
                  className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-medium focus:border-indigo-600"
                  value={editingStudent.name}
                  onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                />
              </div>
              <div className={editingStudent.focusPassword ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mobile Number</label>
                <input 
                  type="tel" required
                  className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-medium focus:border-indigo-600"
                  value={editingStudent.phoneNumber}
                  onChange={e => setEditingStudent({...editingStudent, phoneNumber: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className={editingStudent.focusPassword ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Account Status</label>
                  <select 
                    className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-bold focus:border-indigo-600"
                    value={editingStudent.status || 'active'}
                    onChange={e => setEditingStudent({...editingStudent, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">
                    {editingStudent.focusPassword ? 'Set New Password' : 'New Password (Optional)'}
                  </label>
                  <input 
                    ref={passwordInputRef}
                    type="password"
                    placeholder="••••••••"
                    className={`w-full rounded-2xl border-2 p-4 outline-hidden font-medium focus:border-indigo-600 ${editingStudent.focusPassword ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200'}`}
                    value={editingStudent.newPassword}
                    onChange={e => setEditingStudent({...editingStudent, newPassword: e.target.value})}
                  />
                </div>
              </div>
              
              <button 
                disabled={savingStudent}
                type="submit" 
                className="w-full bg-indigo-600 py-5 text-white font-black text-sm uppercase tracking-[0.2em] rounded-3xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 disabled:bg-slate-300"
              >
                {savingStudent ? 'Saving Changes...' : editingStudent.focusPassword ? 'Update Password' : 'Update Records'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Student Attempts & Advanced Analytics Modal */}
      {showStudentAttemptsModal && selectedStudentForAnalysis && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-slate-900 text-white w-full max-w-5xl rounded-[40px] shadow-2xl border border-slate-800 overflow-hidden flex flex-col my-8 max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-8 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div>
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] block mb-1">Advanced Mock Test Analytics</span>
                <h3 className="text-2xl font-black text-white">{selectedStudentForAnalysis.name}'s Dashboard</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Mobile: {selectedStudentForAnalysis.phoneNumber || 'N/A'}</p>
              </div>
              <button 
                onClick={() => {
                  setShowStudentAttemptsModal(false);
                  setSelectedStudentForAnalysis(null);
                  setSelectedAttemptForDeepAnalysis(null);
                  setDeepAnalysisQuestions([]);
                }} 
                className="w-12 h-12 bg-slate-800 hover:bg-rose-600 rounded-full flex items-center justify-center transition-all text-slate-300 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 min-h-0">
              
              {loadingAttempts ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-400 font-bold">Loading attempt statistics...</p>
                </div>
              ) : (
                <>
                  {/* Aggregated Overview Cards */}
                  {(() => {
                    const totalAttempts = studentAttemptsList.length;
                    const avgAccuracy = totalAttempts > 0 
                      ? Math.round(studentAttemptsList.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / totalAttempts)
                      : 0;
                    const avgScore = totalAttempts > 0
                      ? (studentAttemptsList.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalAttempts).toFixed(1)
                      : '0.0';

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-6 rounded-3xl border border-indigo-500/20 relative overflow-hidden group">
                          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Total Mock Attempts</span>
                          <span className="text-4xl font-black text-indigo-300">{totalAttempts}</span>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6 rounded-3xl border border-emerald-500/20 relative overflow-hidden group">
                          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-2">Average Accuracy</span>
                          <span className="text-4xl font-black text-emerald-300">{avgAccuracy}%</span>
                        </div>
                        <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 p-6 rounded-3xl border border-rose-500/20 relative overflow-hidden group">
                          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-2">Average Score</span>
                          <span className="text-4xl font-black text-rose-300">{avgScore} <span className="text-sm font-bold text-slate-500">pts</span></span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Attempts List */}
                  <div className="bg-slate-950/40 rounded-3xl border border-slate-800 p-6">
                    <h4 className="text-lg font-black text-white mb-6 uppercase tracking-tight flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      All Mock Test Attempts
                    </h4>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="pb-4 text-xs font-black uppercase tracking-widest">Test Title</th>
                            <th className="pb-4 text-xs font-black uppercase tracking-widest">Date</th>
                            <th className="pb-4 text-xs font-black uppercase tracking-widest">Score</th>
                            <th className="pb-4 text-xs font-black uppercase tracking-widest">Accuracy</th>
                            <th className="pb-4 text-xs font-black uppercase tracking-widest">Time Taken</th>
                            <th className="pb-4 text-xs font-black uppercase tracking-widest text-right">Analysis</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {studentAttemptsList.map((attempt) => (
                            <tr key={attempt.id} className="hover:bg-slate-800/20 transition-all">
                              <td className="py-4 font-bold text-white truncate max-w-[200px]" title={attempt.testTitle}>
                                {attempt.testTitle}
                              </td>
                              <td className="py-4 text-sm text-slate-400 font-medium">
                                {attempt.createdAt ? new Date(attempt.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-4 font-mono font-bold text-indigo-400">
                                {attempt.score} <span className="text-[10px] text-slate-500 font-medium">/ {attempt.totalQuestions || 0}</span>
                              </td>
                              <td className="py-4">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  (attempt.accuracy || 0) >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                                  (attempt.accuracy || 0) >= 55 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {attempt.accuracy || 0}%
                                </span>
                              </td>
                              <td className="py-4 text-sm text-slate-400 font-mono">
                                {Math.floor((attempt.timeTaken || 0) / 60)}m {(attempt.timeTaken || 0) % 60}s
                              </td>
                              <td className="py-4 text-right">
                                <button 
                                  onClick={() => setSelectedAttemptForDeepAnalysis(attempt)}
                                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    selectedAttemptForDeepAnalysis?.id === attempt.id 
                                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' 
                                      : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white'
                                  }`}
                                >
                                  Deep Analysis
                                </button>
                              </td>
                            </tr>
                          ))}
                          {studentAttemptsList.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-500 font-bold">
                                No mock test attempts recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Deep Question-Wise Analysis Panel */}
                  {selectedAttemptForDeepAnalysis && (
                    <div className="bg-slate-950/40 rounded-3xl border border-slate-850 p-6 space-y-8 animate-in fade-in duration-300">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
                        <div>
                          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1">Deep Dive Report</span>
                          <h4 className="text-lg font-black text-white uppercase tracking-tight">{selectedAttemptForDeepAnalysis.testTitle}</h4>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-900/60 px-4 py-2 rounded-2xl border border-slate-800">
                          <span className="text-xs text-slate-400 font-bold">Rank:</span>
                          <span className="text-sm font-black text-indigo-400">#{selectedAttemptForDeepAnalysis.rank || 'N/A'}</span>
                        </div>
                      </div>

                      {loadingDeepAnalysis ? (
                        <div className="flex flex-col items-center justify-center py-10">
                          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                          <p className="text-slate-400 font-bold text-sm">Extracting response logs...</p>
                        </div>
                      ) : (
                        <>
                          {/* Subject-Wise and Time Analytics */}
                          {(() => {
                            const totalQuestions = deepAnalysisQuestions.length;
                            const correctAnswers = deepAnalysisQuestions.filter(q => q.isCorrect).length;
                            const wrongAnswers = deepAnalysisQuestions.filter(q => q.studentAnswer && !q.isCorrect).length;
                            const skippedAnswers = deepAnalysisQuestions.filter(q => !q.studentAnswer).length;

                            // Calculate Fastest/Slowest solved questions
                            const solvedQuestions = deepAnalysisQuestions.filter(q => q.timeTaken > 0);
                            const fastestQuestion = solvedQuestions.length > 0 
                              ? solvedQuestions.reduce((min, q) => q.timeTaken < min.timeTaken ? q : min, solvedQuestions[0])
                              : null;
                            const slowestQuestion = solvedQuestions.length > 0
                              ? solvedQuestions.reduce((max, q) => q.timeTaken > max.timeTaken ? q : max, solvedQuestions[0])
                              : null;

                            // Group by Subject
                            const subjectStats: { [key: string]: { total: number, correct: number } } = {};
                            deepAnalysisQuestions.forEach(q => {
                              const sub = q.subject || 'General';
                              if (!subjectStats[sub]) {
                                subjectStats[sub] = { total: 0, correct: 0 };
                              }
                              subjectStats[sub].total += 1;
                              if (q.isCorrect) subjectStats[sub].correct += 1;
                            });

                            const weakTopics: string[] = [];
                            const strongTopics: string[] = [];
                            Object.entries(subjectStats).forEach(([subject, stats]) => {
                              const acc = (stats.correct / stats.total) * 100;
                              if (acc >= 80) strongTopics.push(subject);
                              else if (acc < 50) weakTopics.push(subject);
                            });

                            return (
                              <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  
                                  {/* Stats details & Timing metrics */}
                                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                                    <div className="space-y-4">
                                      <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Question Summary</h5>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20 text-center">
                                          <span className="text-xl font-bold text-emerald-400 block">{correctAnswers}</span>
                                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Correct</span>
                                        </div>
                                        <div className="bg-rose-500/10 p-3.5 rounded-xl border border-rose-500/20 text-center">
                                          <span className="text-xl font-bold text-rose-400 block">{wrongAnswers}</span>
                                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Wrong</span>
                                        </div>
                                        <div className="bg-slate-800 p-3.5 rounded-xl text-center">
                                          <span className="text-xl font-bold text-slate-300 block">{skippedAnswers}</span>
                                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Skipped</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800">
                                      <div>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">⚡ Fastest Answer</span>
                                        <span className="text-sm font-bold text-emerald-400 font-mono">
                                          {fastestQuestion ? `Q${fastestQuestion.questionNo} (${fastestQuestion.timeTaken}s)` : 'N/A'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">🐢 Slowest Answer</span>
                                        <span className="text-sm font-bold text-rose-400 font-mono">
                                          {slowestQuestion ? `Q${slowestQuestion.questionNo} (${slowestQuestion.timeTaken}s)` : 'N/A'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Subject-Wise & Topics strengths */}
                                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6">
                                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Subject Analysis</h5>
                                    
                                    <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2">
                                      {Object.entries(subjectStats).map(([subject, stats]) => {
                                        const accuracy = Math.round((stats.correct / stats.total) * 100);
                                        return (
                                          <div key={subject} className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold text-slate-300">
                                              <span>{subject}</span>
                                              <span>{stats.correct}/{stats.total} ({accuracy}%)</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                              <div 
                                                style={{ width: `${accuracy}%` }} 
                                                className={`h-full rounded-full ${accuracy >= 80 ? 'bg-emerald-500' : accuracy >= 50 ? 'bg-indigo-500' : 'bg-rose-500'}`}
                                              ></div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                </div>

                                {/* Strengths and Weaknesses */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10">
                                    <h5 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-3">🔥 Student Strengths</h5>
                                    <div className="flex flex-wrap gap-2">
                                      {strongTopics.map(t => (
                                        <span key={t} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-black rounded-lg border border-emerald-500/20">{t}</span>
                                      ))}
                                      {strongTopics.length === 0 && <span className="text-slate-500 text-xs font-bold">No strong topics detected yet.</span>}
                                    </div>
                                  </div>
                                  <div className="bg-rose-500/5 p-5 rounded-2xl border border-rose-500/10">
                                    <h5 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-3">⚠️ Weak Areas</h5>
                                    <div className="flex flex-wrap gap-2">
                                      {weakTopics.map(t => (
                                        <span key={t} className="px-3 py-1.5 bg-rose-500/10 text-rose-400 text-xs font-black rounded-lg border border-rose-500/20">{t}</span>
                                      ))}
                                      {weakTopics.length === 0 && <span className="text-slate-500 text-xs font-bold">No critical weak areas detected. Outstanding!</span>}
                                    </div>
                                  </div>
                                </div>

                                {/* Question-Wise Response Matrix */}
                                <div className="space-y-4">
                                  <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Question-Wise Response Matrix</h5>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="border-b border-slate-800 text-slate-400">
                                          <th className="pb-3 text-xs font-black uppercase tracking-widest">Q#</th>
                                          <th className="pb-3 text-xs font-black uppercase tracking-widest">Subject</th>
                                          <th className="pb-3 text-xs font-black uppercase tracking-widest">Student Ans</th>
                                          <th className="pb-3 text-xs font-black uppercase tracking-widest">Correct Ans</th>
                                          <th className="pb-3 text-xs font-black uppercase tracking-widest">Result</th>
                                          <th className="pb-3 text-xs font-black uppercase tracking-widest text-right">Time Taken</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/30">
                                        {deepAnalysisQuestions.map((q) => (
                                          <tr key={q.questionNo} className="hover:bg-slate-800/10">
                                            <td className="py-3 font-mono font-bold text-sm">Q{q.questionNo}</td>
                                            <td className="py-3 text-xs font-bold text-slate-300">{q.subject || 'General'}</td>
                                            <td className="py-3 font-mono font-bold text-slate-400">{q.studentAnswer || 'Skipped'}</td>
                                            <td className="py-3 font-mono font-bold text-emerald-400">{q.correctAnswer}</td>
                                            <td className="py-3">
                                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                !q.studentAnswer ? 'bg-slate-800 text-slate-400' :
                                                q.isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                              }`}>
                                                {!q.studentAnswer ? 'Skipped' : q.isCorrect ? 'Correct' : 'Wrong'}
                                              </span>
                                            </td>
                                            <td className="py-3 text-right font-mono text-xs text-slate-400">
                                              {q.timeTaken || 0}s
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}

                </>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function QuestionManager() {
  const { testId } = useParams();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  
  if (!user || (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'bakolaypan@gmail.com')) {
    return null;
  }

  // Form states
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState('');
  const [qTopic, setQTopic] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState('');
  const [qSolution, setQSolution] = useState('');

  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    const q = query(collection(db, 'questions'), where('testId', '==', testId));
    const unsub = onSnapshot(q, (snap) => {
      let qs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      qs.sort((a, b) => (a.qNo || 0) - (b.qNo || 0));
      setQuestions(qs);
      setLoading(false);
    }, (err) => console.error(err));
    return () => unsub();
  }, [testId]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText || !user) return;
    if (!qOptions.every(opt => opt.trim() !== '')) return alert('All 4 options must be filled');
    const uniqueOptions = new Set(qOptions.map(o => o.trim()));
    if (uniqueOptions.size < 4) return alert('All 4 options must be unique. Duplicate options are not allowed.');
    if (!qCorrect) return alert('Select a correct answer');

    try {
      const token = await user.getIdToken();
      const method = editingQuestionId ? 'PUT' : 'POST';
      const url = editingQuestionId ? `/api/admin/questions/${editingQuestionId}` : '/api/admin/questions';
      
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          testId, 
          topic: qTopic, 
          qNo: editingQuestionId ? undefined : questions.length + 1, 
          questionText: qText, 
          options: qOptions, 
          correctAnswer: qCorrect,
          solution: qSolution
        })
      });
      if (res.ok) {
        setQText(''); setQTopic(''); setQOptions(['', '', '', '']); setQCorrect(''); setQSolution('');
        setEditingQuestionId(null);
        alert(editingQuestionId ? 'Question updated!' : 'Question added!');
      } else alert(await res.text());
    } catch (error) {
      console.error(error);
      alert('Failed to process question');
    }
  };

  const handleEditQuestion = (q: any) => {
    setEditingQuestionId(q.id);
    setQText(q.questionText);
    setQTopic(q.topic || '');
    setQOptions([...q.options]);
    setQCorrect(q.correctAnswer);
    setQSolution(q.solution || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      console.log(`Attempting to delete question ${qId}`);
      const res = await fetch(`/api/admin/questions/${qId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        console.log('Question delete initiated');
        alert('Question deleted!');
      } else {
        const bodyText = await res.text();
        let errorMsg = bodyText;
        try {
          const errJson = JSON.parse(bodyText);
          errorMsg = errJson.message || errJson.error || bodyText;
        } catch {
          // Fallback to raw text
        }
        console.error('Question delete failed:', errorMsg);
        alert(`Failed to delete question: ${errorMsg}`);
      }
    } catch(err) {
      console.error('Question delete execution error:', err);
      alert('Network error while deleting question.');
    }
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <Link to="/admin" className="mr-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition group">
          <ArrowLeft className="w-5 h-5 text-indigo-600 group-hover:-translate-x-1 transition-transform" />
        </Link>
        <h2 className="text-2xl font-black text-slate-800">Manage Test Questions</h2>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
         <h3 className="text-lg font-bold text-slate-800 mb-6">{editingQuestionId ? 'Edit Question' : 'Add New Question'}</h3>
         <form onSubmit={handleAddQuestion} className="space-y-6">
           <div>
             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Question Description</label>
             <textarea 
               className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-medium"
               rows={3} value={qText} onChange={e => setQText(e.target.value)} required 
               placeholder="Write the question here..."
             />
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {qOptions.map((opt, i) => (
               <div key={i}>
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Option {i+1}</label>
                 <input 
                   type="text" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                   value={opt} onChange={e => {
                     const newOpts = [...qOptions];
                     newOpts[i] = e.target.value;
                     setQOptions(newOpts);
                   }} required 
                   placeholder={`Possibility ${i+1}`}
                 />
               </div>
             ))}
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Correct Answer</label>
               <select 
                 className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-bold text-indigo-600"
                 value={qCorrect} onChange={e => setQCorrect(e.target.value)} required
               >
                 <option value="">Select correct option...</option>
                 {qOptions.filter(o => o.trim() !== '').map((opt, i) => (
                   <option key={i} value={opt}>{opt}</option>
                 ))}
               </select>
             </div>
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Topic</label>
               <input 
                 type="text" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                 value={qTopic} onChange={e => setQTopic(e.target.value)}
                 placeholder="e.g. Quantum Physics" 
               />
             </div>
           </div>

           <div>
             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Solution / More Details</label>
             <textarea 
               className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-medium"
               rows={3} value={qSolution} onChange={e => setQSolution(e.target.value)}
               placeholder="Explain the logic or provide the step-by-step solution..."
             />
           </div>

           <div className="flex justify-end gap-4 pt-4">
             {editingQuestionId && (
               <button 
                 type="button" 
                 onClick={() => {
                   setEditingQuestionId(null);
                   setQText(''); setQTopic(''); setQOptions(['', '', '', '']); setQCorrect(''); setQSolution('');
                 }}
                 className="bg-slate-100 text-slate-600 px-8 py-4 rounded-xl hover:bg-slate-200 font-bold transition-all"
               >
                 Cancel
               </button>
             )}
             <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-indigo-50 flex items-center gap-2">
               <Plus className="w-5 h-5" /> {editingQuestionId ? 'Update Question' : 'Add Question to Test'}
             </button>
           </div>
         </form>
      </div>

       <div className="space-y-4">
        {loading ? <p className="text-slate-400 font-bold text-center py-10">Fetching questions...</p> : 
         questions.map((q, i) => (
           <div key={q.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 relative group transition-all hover:shadow-md">
             <div className="absolute top-6 right-6 flex gap-2">
               <button 
                 onClick={() => handleEditQuestion(q)} 
                 className="text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all border border-indigo-100 font-bold text-xs"
                 title="Edit Question"
               >
                 Edit
               </button>
               <button 
                 onClick={() => handleDeleteQuestion(q.id)} 
                 className="text-rose-500 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-all border border-rose-100 font-bold text-xs"
                 title="Delete Question"
               >
                 Delete
               </button>
             </div>
             <div className="flex items-start mb-6">
                <span className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black mr-4 shrink-0">
                  {i+1}
                </span>
                <h4 className="font-bold text-slate-800 text-lg pr-20 leading-tight">{q.questionText}</h4>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
               {q.options.map((opt: string, j: number) => (
                 <div key={j} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between
                   ${opt === q.correctAnswer 
                     ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm' 
                     : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                   <span className="font-bold">{opt}</span>
                   {opt === q.correctAnswer && (
                     <div className="bg-emerald-500 text-white p-1 rounded-full">
                       <Plus className="w-3 h-3 rotate-45" /> 
                     </div>
                   )}
                 </div>
               ))}
             </div>
             {q.solution && (
                <div className="mt-4 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Solution / Explanation</p>
                  <p className="text-sm text-slate-600">{q.solution}</p>
                </div>
              )}
           </div>
         ))
        }
        {questions.length === 0 && !loading && <p className="text-slate-400 font-bold text-center py-10">No questions added yet.</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-slate-900 flex items-center tracking-tighter leading-none">
                <span className="bg-indigo-600 text-white text-[8px] px-2 py-1 uppercase rounded-md mr-3 tracking-[0.2em] font-black shadow-lg shadow-indigo-100">ADMIN</span>
                MASTER APTITUDE
              </h1>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1 ml-[64px]">By Suman Sir</p>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors">Student View</Link>
              <button 
                onClick={() => signOut(auth)}
                className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full animate-in fade-in duration-700">
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/test/:testId" element={<QuestionManager />} />
        </Routes>
      </main>
    </div>
  );
}

