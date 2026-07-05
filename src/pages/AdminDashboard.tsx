import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { collection, query, getDocs, orderBy, doc, deleteDoc, where, addDoc, serverTimestamp, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { LogOut, ArrowLeft, Plus, Pencil, Trash2, FileText, BookOpen, Play, CheckCircle, Clock, X, User as UserIcon, Download, ShieldAlert, ShieldCheck, Key, Edit2, Search, LayoutDashboard, Layers, TrendingUp, Link2, Check, Star, MessageSquare, Globe, Copy, ExternalLink, RefreshCw, BarChart3 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

import AdminTypingTests from '../components/AdminTypingTests';
import AdminCurrentAffairs from '../components/AdminCurrentAffairs';
import AdminStudyNotes from '../components/AdminStudyNotes';
import { invalidateCacheField } from '../lib/cache';
import { uploadFileViaBackend } from '../lib/upload';
import { Keyboard } from 'lucide-react';
import { RenderMathText } from '../components/MathRenderer';
import RichTextEditor, { RenderQuestionHTML } from '../components/RichTextEditor';

type AdminTab = 'students' | 'mock' | 'typing' | 'notes' | 'video' | 'pyq' | 'pattern' | 'carousel' | 'social' | 'affairs' | 'practice' | 'site_info' | 'blog' | 'reviews' | 'paid_mock';

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
  const [batchFilter, setBatchFilter] = useState('all');
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
  const [customTestTypes, setCustomTestTypes] = useState<any[]>([]);
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
  const [deepAnalysisStudentView, setDeepAnalysisStudentView] = useState(false);
  
  // Test Form
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [category, setCategory] = useState('GK');
  const [duration, setDuration] = useState('30');
  const [testType, setTestType] = useState('topic');
  const [isPaid, setIsPaid] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [liveStartDate, setLiveStartDate] = useState('');
  const [liveEndDate, setLiveEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newTestTypeInput, setNewTestTypeInput] = useState('');
  const [addingTestType, setAddingTestType] = useState(false);

  // Note Form
  const [noteTitle, setNoteTitle] = useState('');
  const [noteLink, setNoteLink] = useState('');
  const [noteSubject, setNoteSubject] = useState('');
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [noteDesc, setNoteDesc] = useState('');
  const [noteTags, setNoteTags] = useState('');
  const [noteThumb, setNoteThumb] = useState<File | null>(null);
  const [noteStatus, setNoteStatus] = useState<'published' | 'draft'>('published');
  const [notePin, setNotePin] = useState(false);
  const [uploadingNote, setUploadingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Affairs Form
  const [affairTitle, setAffairTitle] = useState('');
  const [affairDate, setAffairDate] = useState('');
  const [affairLink, setAffairLink] = useState('');
  const [affairDesc, setAffairDesc] = useState('');
  const [affairTags, setAffairTags] = useState('');
  const [affairThumb, setAffairThumb] = useState<File | null>(null);
  const [affairStatus, setAffairStatus] = useState<'published' | 'draft'>('published');
  const [affairPin, setAffairPin] = useState(false);
  const [affairSlug, setAffairSlug] = useState('');
  const [uploadingAffair, setUploadingAffair] = useState(false);

  // Practice Set Form
  const [practiceTitle, setPracticeTitle] = useState('');
  const [practiceSubject, setPracticeSubject] = useState('');
  const [practiceFile, setPracticeFile] = useState<File | null>(null);
  const [practiceLink, setPracticeLink] = useState('');
  const [practiceDesc, setPracticeDesc] = useState('');
  const [practiceTags, setPracticeTags] = useState('');
  const [practiceThumb, setPracticeThumb] = useState<File | null>(null);
  const [practiceStatus, setPracticeStatus] = useState<'published' | 'draft'>('published');
  const [practicePin, setPracticePin] = useState(false);
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
  const [videoDesc, setVideoDesc] = useState('');
  const [videoTags, setVideoTags] = useState('');
  const [videoStatus, setVideoStatus] = useState<'published' | 'draft'>('published');
  const [videoPin, setVideoPin] = useState(false);

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

  // Mock Test Analysis Modal
  const [analysisModalTest, setAnalysisModalTest] = useState<any | null>(null);
  const [analysisModalData, setAnalysisModalData] = useState<any | null>(null);
  const [analysisModalLoading, setAnalysisModalLoading] = useState(false);
  const [analysisModalSearch, setAnalysisModalSearch] = useState('');
  const [analysisModalFilter, setAnalysisModalFilter] = useState<'all' | 'top' | 'failed' | 'low_accuracy'>('all');

  // Blog / News form
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [blogLoading, setBlogLoading] = useState(false);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogTags, setBlogTags] = useState('');
  const [blogCategory, setBlogCategory] = useState('News');
  const [blogPublishDate, setBlogPublishDate] = useState('');
  const [blogThumbnailFile, setBlogThumbnailFile] = useState<File | null>(null);
  const [blogThumbnailPreview, setBlogThumbnailPreview] = useState('');
  const [blogThumbnailUrl, setBlogThumbnailUrl] = useState('');
  const [uploadingBlogThumb, setUploadingBlogThumb] = useState(false);
  const [blogSeoTitle, setBlogSeoTitle] = useState('');
  const [blogMetaDesc, setBlogMetaDesc] = useState('');
  const [blogKeywords, setBlogKeywords] = useState('');
  const [blogSlug, setBlogSlug] = useState('');
  const [blogIsTrending, setBlogIsTrending] = useState(false);
  const [blogSavingPost, setBlogSavingPost] = useState(false);

  // ── Reviews state ─────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewLinks, setReviewLinks] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [editingReview, setEditingReview] = useState<any>(null);
  const [editReviewText, setEditReviewText] = useState('');
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewHover, setEditReviewHover] = useState(0);
  const [newLinkCategory, setNewLinkCategory] = useState('App Experience');
  const [newLinkExpiry, setNewLinkExpiry] = useState(30);
  const [creatingLink, setCreatingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showQRFor, setShowQRFor] = useState<string | null>(null);

  // ── Paid Mock state ────────────────────────────────────────────────────────
  const [paidBatches, setPaidBatches] = useState<any[]>([]);
  const [paidBatchLoading, setPaidBatchLoading] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [paidPayments, setPaidPayments] = useState<any[]>([]);
  const [paidPaymentsLoading, setPaidPaymentsLoading] = useState(false);
  const [paidMockSubTab, setPaidMockSubTab] = useState<'batches' | 'payments'>('batches');
  const [batchForm, setBatchForm] = useState({
    examName: '', description: '', price: '', thumbnailUrl: '',
    validity: '30 Days', totalMocks: '', features: '', isActive: true, isPopular: false,
  });
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchThumbFile, setBatchThumbFile] = useState<File | null>(null);
  const [batchThumbPreview, setBatchThumbPreview] = useState('');

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
    const qTests = query(collection(db, 'tests'), orderBy('createdAt', 'asc'));
    const qNotes = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const qVideos = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const qPyqs = query(collection(db, 'pyqs'), orderBy('createdAt', 'desc'));
    const qPatterns = query(collection(db, 'patterns'), orderBy('createdAt', 'desc'));
    const qAffairs = query(collection(db, 'affairs'), orderBy('createdAt', 'desc'));
    const qPractice = query(collection(db, 'practice_sets'), orderBy('createdAt', 'desc'));
    const qCarousels = query(collection(db, 'carousel'), orderBy('createdAt', 'desc'));
    const qBlogPosts = query(collection(db, 'news_posts'), orderBy('createdAt', 'desc'));
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

    const unsubBlog = onSnapshot(qBlogPosts, (snap) => {
      setBlogPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

        // Fetch Custom Categories and Test Types
        const catsRes = await fetch('/api/custom-categories');
        if (catsRes.ok) {
          const catsData = await catsRes.json();
          const allCats = catsData.categories || [];
          setCustomMockCategories(allCats.filter((c: any) => c.categoryType === 'mock' || !c.categoryType));
          setCustomTestTypes(allCats.filter((c: any) => c.categoryType === 'testtype'));
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
      unsubBlog();
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
          description,
          duration: parseInt(duration) || 30,
          marksPerCorrect: parseFloat(marksPerCorrect) || 1,
          negativeMarks: parseFloat(negativeMarks) || 0,
          isActive: true,
          isPaid,
          isLive,
          liveStartDate,
          liveEndDate
        })
      });
      if (res.ok) {
        setTitle('');
        setTopic('');
        setSubjectName('');
        setCategory('GK');
        setDuration('30');
        setIsPaid(false);
        setIsLive(false);
        setLiveStartDate('');
        setLiveEndDate('');
        setDescription('');
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
    setIsPaid(test.isPaid || false);
    setIsLive(test.isLive || false);
    setLiveStartDate(test.liveStartDate || '');
    setLiveEndDate(test.liveEndDate || '');
    setDescription(test.description || '');
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
        finalLink = await uploadFileViaBackend(noteFile, 'notes', user);
      }

      if (!finalLink && !editingNoteId) {
        alert('Please provide either a link or upload a file.');
        setUploadingNote(false);
        return;
      }

      let thumbUrl = '';
      if (noteThumb) thumbUrl = await uploadThumb(noteThumb, 'notes_thumbs');
      const noteData: any = {
        title: noteTitle,
        slug: toSlug(noteTitle),
        subject: noteSubject || 'General',
        description: noteDesc,
        tags: noteTags.split(',').map(t => t.trim()).filter(Boolean),
        thumbnailUrl: thumbUrl,
        status: noteStatus,
        pinToHomepage: notePin,
        viewCount: 0,
        updatedAt: serverTimestamp(),
        authorId: user.uid,
      };
      if (finalLink) noteData.link = finalLink;

      if (editingNoteId) {
        await updateDoc(doc(db, 'notes', editingNoteId), noteData);
      } else {
        await addDoc(collection(db, 'notes'), {
          ...noteData,
          createdAt: serverTimestamp(),
        });
      }
      await invalidateCacheField('notes');

      setNoteTitle(''); setNoteLink(''); setNoteSubject(''); setNoteFile(null);
      setNoteDesc(''); setNoteTags(''); setNoteThumb(null);
      setNoteStatus('published'); setNotePin(false);
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
        finalLink = await uploadFileViaBackend(pyqFile, 'pyqs', user);
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
      await invalidateCacheField('pyqs');

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
        console.log("Uploading file:", file.name);
        const url = await uploadFileViaBackend(file, 'patterns', user);
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
      await invalidateCacheField('patterns');
      
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
        slug: toSlug(videoTitle),
        link: videoLink,
        subject: videoSubject || 'General',
        description: videoDesc,
        tags: videoTags.split(',').map(t => t.trim()).filter(Boolean),
        status: videoStatus,
        pinToHomepage: videoPin,
        viewCount: 0,
        createdAt: serverTimestamp(),
        authorId: user.uid,
      });
      await invalidateCacheField('videos');
      setVideoTitle(''); setVideoLink(''); setVideoSubject('');
      setVideoDesc(''); setVideoTags('');
      setVideoStatus('published'); setVideoPin(false);
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
      await invalidateCacheField('carousel');
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
      await invalidateCacheField('carousel');
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
      await invalidateCacheField('carousel');
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
      await invalidateCacheField('categories');
      alert('Social links updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Error updating social links. Make sure you have the correct permissions.');
    } finally {
      setSavingSocials(false);
    }
  };

  const toSlug = (text: string) =>
    text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);

  const uploadThumb = async (file: File, folder: string): Promise<string> => {
    return uploadFileViaBackend(file, folder, user);
  };

  const handleAddAffair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affairTitle || !user) return;
    setUploadingAffair(true);
    try {
      let thumbUrl = '';
      if (affairThumb) thumbUrl = await uploadThumb(affairThumb, 'affairs');
      const slug = affairSlug || toSlug(affairTitle);
      await addDoc(collection(db, 'affairs'), {
        title: affairTitle,
        slug,
        date: affairDate || new Date().toISOString().split('T')[0],
        link: affairLink,
        description: affairDesc,
        tags: affairTags.split(',').map(t => t.trim()).filter(Boolean),
        thumbnailUrl: thumbUrl,
        status: affairStatus,
        pinToHomepage: affairPin,
        viewCount: 0,
        createdAt: serverTimestamp(),
        authorId: user.uid,
      });
      await invalidateCacheField('affairs');
      setAffairTitle(''); setAffairDate(''); setAffairLink('');
      setAffairDesc(''); setAffairTags(''); setAffairThumb(null);
      setAffairStatus('published'); setAffairPin(false); setAffairSlug('');
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
        finalLink = await uploadFileViaBackend(practiceFile, 'practice', user);
      }
      let thumbUrl = '';
      if (practiceThumb) thumbUrl = await uploadThumb(practiceThumb, 'practice_thumbs');
      await addDoc(collection(db, 'practice_sets'), {
        title: practiceTitle,
        slug: toSlug(practiceTitle),
        subject: practiceSubject || 'General',
        link: finalLink,
        description: practiceDesc,
        tags: practiceTags.split(',').map(t => t.trim()).filter(Boolean),
        thumbnailUrl: thumbUrl,
        status: practiceStatus,
        pinToHomepage: practicePin,
        viewCount: 0,
        createdAt: serverTimestamp(),
        authorId: user.uid,
      });
      await invalidateCacheField('practice_sets');
      setPracticeTitle(''); setPracticeSubject(''); setPracticeLink('');
      setPracticeDesc(''); setPracticeTags(''); setPracticeThumb(null);
      setPracticeStatus('published'); setPracticePin(false);
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
      await invalidateCacheField('categories');
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
          batch: editingStudent.batch || '',
          password: editingStudent.newPassword
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

  // ─── Open Mock Test Analysis Modal ──────────────────────────────────────────
  const openAnalysisModal = async (test: any) => {
    setAnalysisModalTest(test);
    setAnalysisModalData(null);
    setAnalysisModalLoading(true);
    setAnalysisModalSearch('');
    setAnalysisModalFilter('all');
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/test-analysis/${test.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : {};
      const entries: any[] = data.leaderboard || [];
      setAnalysisModalData({
        leaderboard: entries,
        uniqueStudents: data.uniqueStudents || 0,
        totalAttempts: data.totalAttempts || entries.length,
        avgScore: data.avgScore || 0,
        highScore: data.highScore || 0,
      });
    } catch (err) {
      console.error(err);
      setAnalysisModalData({ leaderboard: [], uniqueStudents: 0, totalAttempts: 0, avgScore: 0, highScore: 0 });
    } finally {
      setAnalysisModalLoading(false);
    }
  };

  // ─── Blog handlers ────────────────────────────────────────────────────────────
  const slugify = (text: string) =>
    text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);

  const handleBlogSave = async () => {
    if (!blogTitle.trim() || !blogContent.trim() || !user) return;
    const slug = blogSlug.trim() || slugify(blogTitle);
    setBlogSavingPost(true);
    try {
      let finalThumbUrl = blogThumbnailUrl;
      if (blogThumbnailFile) {
        setUploadingBlogThumb(true);
        finalThumbUrl = await uploadFileViaBackend(blogThumbnailFile, 'blog_thumbnails', user);
        setUploadingBlogThumb(false);
      }
      const postData: any = {
        title: blogTitle.trim(),
        content: blogContent.trim(),
        tags: blogTags.split(',').map(t => t.trim()).filter(Boolean),
        category: blogCategory,
        publishDate: blogPublishDate || new Date().toISOString().split('T')[0],
        thumbnailUrl: finalThumbUrl,
        seoTitle: blogSeoTitle.trim() || blogTitle.trim(),
        metaDescription: blogMetaDesc.trim(),
        keywords: blogKeywords.split(',').map(k => k.trim()).filter(Boolean),
        slug,
        isTrending: blogIsTrending,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (editingBlogId) {
        await updateDoc(doc(db, 'news_posts', editingBlogId), { ...postData, createdAt: undefined });
      } else {
        await addDoc(collection(db, 'news_posts'), postData);
      }
      await invalidateCacheField('affairs');
      // Reset form
      setBlogTitle(''); setBlogContent(''); setBlogTags(''); setBlogCategory('News');
      setBlogPublishDate(''); setBlogThumbnailFile(null); setBlogThumbnailPreview(''); setBlogThumbnailUrl('');
      setBlogSeoTitle(''); setBlogMetaDesc(''); setBlogKeywords(''); setBlogSlug(''); setBlogIsTrending(false);
      setEditingBlogId(null); setShowBlogForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save blog post');
    } finally {
      setBlogSavingPost(false);
      setUploadingBlogThumb(false);
    }
  };

  const handleEditBlog = (post: any) => {
    setEditingBlogId(post.id);
    setBlogTitle(post.title || '');
    setBlogContent(post.content || '');
    setBlogTags((post.tags || []).join(', '));
    setBlogCategory(post.category || 'News');
    setBlogPublishDate(post.publishDate || '');
    setBlogThumbnailUrl(post.thumbnailUrl || '');
    setBlogThumbnailPreview(post.thumbnailUrl || '');
    setBlogThumbnailFile(null);
    setBlogSeoTitle(post.seoTitle || '');
    setBlogMetaDesc(post.metaDescription || '');
    setBlogKeywords((post.keywords || []).join(', '));
    setBlogSlug(post.slug || '');
    setBlogIsTrending(post.isTrending || false);
    setShowBlogForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteBlog = async (postId: string) => {
    if (!confirm('Delete this post permanently?')) return;
    try {
      await deleteDoc(doc(db, 'news_posts', postId));
      await invalidateCacheField('affairs');
    } catch (err) {
      console.error(err);
      alert('Failed to delete post');
    }
  };

  // Export analysis as CSV
  const exportAnalysisCSV = () => {
    if (!analysisModalData || !analysisModalTest) return;
    const rows = [['Rank', 'Name', 'Score', 'Accuracy', 'Time (min)', 'Attempt #', 'Date']];
    (analysisModalData.leaderboard || []).forEach((e: any, i: number) => {
      rows.push([
        String(i + 1), e.name || 'Student', String(e.score || 0),
        `${e.accuracy || 0}%`, String(Math.round((e.timeTaken || 0) / 60)),
        String(e.attemptNumber || 1),
        e.submittedAt ? new Date(e.submittedAt).toLocaleDateString() : 'N/A',
      ]);
    });
    const csvContent = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${analysisModalTest.title || 'analysis'}_leaderboard.csv`;
    a.click(); URL.revokeObjectURL(url);
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
          onClick={() => setActiveTab('blog')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'blog' ? 'bg-violet-600 text-white shadow-md shadow-violet-100' : 'text-slate-500 hover:text-violet-600 hover:bg-violet-50'}`}
        >
          <BookOpen className="w-4 h-4" />
          News & Blog
        </button>
        <button
          onClick={() => {
            setActiveTab('reviews');
            if (reviews.length === 0) {
              setReviewsLoading(true);
              user?.getIdToken().then(token => {
                Promise.all([
                  fetch('/api/admin/reviews', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                  fetch('/api/admin/review-links', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                ]).then(([rd, ld]) => {
                  setReviews(rd.reviews || []);
                  setReviewLinks(ld.links || []);
                  setReviewsLoading(false);
                }).catch(() => setReviewsLoading(false));
              });
            }
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'reviews' ? 'bg-pink-600 text-white shadow-md shadow-pink-100' : 'text-slate-500 hover:text-pink-600 hover:bg-pink-50'}`}
        >
          <MessageSquare className="w-4 h-4" />
          Reviews
          {reviews.filter(r => r.status === 'pending').length > 0 && (
            <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {reviews.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('paid_mock');
            if (paidBatches.length === 0) {
              setPaidBatchLoading(true);
              user?.getIdToken().then(token =>
                fetch('/api/admin/paid-batches', { headers: { Authorization: `Bearer ${token}` } })
                  .then(r => r.json())
                  .then(d => setPaidBatches(Array.isArray(d) ? d : []))
                  .catch(() => {})
                  .finally(() => setPaidBatchLoading(false))
              );
            }
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'paid_mock' ? 'bg-amber-500 text-white shadow-md shadow-amber-100' : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'}`}
        >
          👑 Paid Mock
        </button>
      </div>

      

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
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Topic Name <span className="text-indigo-400 normal-case font-medium">(becomes sub-category)</span></label>
                <input
                  type="text"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium"
                  value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Alphabet Test"
                />
                {topic && category && (
                  <p className="mt-1.5 text-[10px] text-indigo-500 font-bold">
                    📂 {category} → <span className="text-violet-600">{topic}</span> → {title || 'Mock Test'}
                  </p>
                )}
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
                  value={category} onChange={e => {
                    if (e.target.value === '__add_new__') { setAddingCategory(true); }
                    else setCategory(e.target.value);
                  }}
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
                  {customMockCategories.map(c => (
                    <option key={c.id} value={c.categoryName}>{c.categoryName}</option>
                  ))}
                  <option value="__add_new__">+ Add New Category</option>
                </select>
                {addingCategory && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      className="flex-1 rounded-xl border-slate-200 border-2 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                      placeholder="New category name"
                      value={newCategoryInput}
                      onChange={e => setNewCategoryInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                    />
                    <button
                      type="button"
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700"
                      onClick={async () => {
                        const name = newCategoryInput.trim();
                        if (!name) return;
                        const token = await user?.getIdToken();
                        const r = await fetch('/api/admin/custom-categories', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ categoryName: name, categoryType: 'mock' })
                        });
                        if (r.ok) {
                          const data = await r.json();
                          setCustomMockCategories(prev => [...prev, { id: data.id, categoryName: name, categoryType: 'mock' }]);
                          setCategory(name);
                          setNewCategoryInput('');
                          setAddingCategory(false);
                        } else alert('Failed to add category');
                      }}
                    >Save</button>
                    <button type="button" className="px-3 py-2 text-slate-400 text-sm font-bold rounded-xl border-2 border-slate-200 hover:bg-slate-50" onClick={() => { setAddingCategory(false); setNewCategoryInput(''); }}>✕</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Test Type</label>
                <select
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium"
                  value={testType} onChange={e => {
                    if (e.target.value === '__add_type__') { setAddingTestType(true); }
                    else setTestType(e.target.value);
                  }}
                >
                  <option value="topic">Topic Wise Mock Test</option>
                  <option value="sectional">Sectional Mock Test</option>
                  <option value="full">Full Mock Test</option>
                  {customTestTypes.map(c => (
                    <option key={c.id} value={c.categoryName}>{c.categoryName}</option>
                  ))}
                  <option value="__add_type__">+ Add New Type</option>
                </select>
                {addingTestType && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      className="flex-1 rounded-xl border-slate-200 border-2 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                      placeholder="New test type name"
                      value={newTestTypeInput}
                      onChange={e => setNewTestTypeInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                    />
                    <button
                      type="button"
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700"
                      onClick={async () => {
                        const name = newTestTypeInput.trim();
                        if (!name) return;
                        const token = await user?.getIdToken();
                        const r = await fetch('/api/admin/custom-categories', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ categoryName: name, categoryType: 'testtype' })
                        });
                        if (r.ok) {
                          const data = await r.json();
                          setCustomTestTypes(prev => [...prev, { id: data.id, categoryName: name, categoryType: 'testtype' }]);
                          setTestType(name);
                          setNewTestTypeInput('');
                          setAddingTestType(false);
                        } else alert('Failed to add test type');
                      }}
                    >Save</button>
                    <button type="button" className="px-3 py-2 text-slate-400 text-sm font-bold rounded-xl border-2 border-slate-200 hover:bg-slate-50" onClick={() => { setAddingTestType(false); setNewTestTypeInput(''); }}>✕</button>
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Short Description <span className="text-slate-300 normal-case font-normal">(optional)</span></label>
                <textarea
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium resize-none"
                  rows={2}
                  placeholder="Brief description students will see before starting the test..."
                  value={description} onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Access</label>
                <div className="flex rounded-xl border-2 border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsPaid(false)}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${!isPaid ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    Free
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPaid(true)}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${isPaid ? 'bg-rose-500 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    Paid
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Live Test</label>
                <button
                  type="button"
                  onClick={() => setIsLive(v => !v)}
                  className={`w-full py-3 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isLive ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-300'}`}
                >
                  <span className={`relative flex h-2.5 w-2.5 ${isLive ? '' : 'opacity-40'}`}>
                    {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />}
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-current" />
                  </span>
                  {isLive ? 'Live — Set Dates Below' : 'Mark as Live Test'}
                </button>
              </div>
              {isLive && (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Live Start Date & Time</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border-rose-200 border-2 p-3 focus:ring-2 focus:ring-rose-400 outline-hidden font-medium"
                      value={liveStartDate} onChange={e => setLiveStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Live End Date & Time</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border-rose-200 border-2 p-3 focus:ring-2 focus:ring-rose-400 outline-hidden font-medium"
                      value={liveEndDate} onChange={e => setLiveEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
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
                      setDescription('');
                      setAddingCategory(false);
                      setNewCategoryInput('');
                      setAddingTestType(false);
                      setNewTestTypeInput('');
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

          {loading && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 px-8 py-10 text-center text-slate-400 font-bold">Fetching Tests...</div>
          )}
          {!loading && filteredTests.length === 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 px-8 py-10 text-center text-slate-400 font-bold">No tests created yet.</div>
          )}
          {!loading && filteredTests.length > 0 && (() => {
            // Build: category → topic → tests
            const catMap: Record<string, Record<string, typeof filteredTests>> = {};
            filteredTests.forEach(test => {
              const cat = test.category || 'Uncategorized';
              const top = test.topic || 'General';
              if (!catMap[cat]) catMap[cat] = {};
              if (!catMap[cat][top]) catMap[cat][top] = [];
              catMap[cat][top].push(test);
            });
            return (
              <div className="flex flex-col gap-6">
                {Object.entries(catMap).map(([catName, topicMap]) => (
                  <div key={catName} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Category header */}
                    <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</span>
                      <span className="font-black text-white text-sm uppercase tracking-widest">{catName}</span>
                      <span className="ml-auto text-[9px] font-black text-slate-400 bg-slate-700 px-2.5 py-1 rounded-full">
                        {Object.values(topicMap).flat().length} tests
                      </span>
                    </div>

                    {/* Topic groups */}
                    <div className="divide-y divide-slate-100">
                      {Object.entries(topicMap).map(([topicName, topicTests]) => (
                        <div key={topicName}>
                          {/* Topic / sub-category header */}
                          <div className="flex items-center gap-3 px-6 py-3 bg-indigo-50/60 border-b border-indigo-100">
                            <div className="w-5 h-5 bg-indigo-200 rounded-md flex items-center justify-center shrink-0">
                              <span className="text-[8px] font-black text-indigo-700">T</span>
                            </div>
                            <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">{topicName}</span>
                            <span className="text-[9px] font-bold text-indigo-400 bg-indigo-100 px-2 py-0.5 rounded-full ml-1">
                              {topicTests.length} {topicTests.length === 1 ? 'test' : 'tests'}
                            </span>
                          </div>

                          {/* Tests in this topic */}
                          <div className="divide-y divide-slate-50">
                            {topicTests.map((test, tidx) => (
                              <div key={test.id} className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors">
                                <span className="text-[10px] font-black text-slate-300 w-5 text-center shrink-0">{tidx + 1}</span>
                                <div className="flex-1 min-w-[160px]">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-slate-800">{test.title || 'Untitled'}</p>
                                    {test.isPaid
                                      ? <span className="text-[8px] font-black uppercase tracking-widest bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full border border-rose-200">Paid</span>
                                      : <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200">Free</span>
                                    }
                                    {test.isLive && (() => {
                                      const now = new Date();
                                      const started = test.liveStartDate && new Date(test.liveStartDate) <= now;
                                      const ended = test.liveEndDate && new Date(test.liveEndDate) < now;
                                      return ended
                                        ? <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">Past Live</span>
                                        : started
                                          ? <span className="text-[8px] font-black uppercase tracking-widest bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />Live Now</span>
                                          : <span className="text-[8px] font-black uppercase tracking-widest bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200">Upcoming Live</span>;
                                    })()}
                                  </div>
                                  <div className="flex flex-wrap gap-2 mt-1 items-center">
                                    <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">
                                      {test.testType === 'topic' ? 'Topic Wise' : test.testType === 'sectional' ? 'Sectional' : 'Full Mock'}
                                    </span>
                                    {test.subjectName && <span className="text-[10px] text-slate-400 font-bold">{test.subjectName}</span>}
                                  </div>
                                </div>
                                <button onClick={() => updateDuration(test)} className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg hover:bg-indigo-100 transition-colors text-xs shrink-0">
                                  {test.duration || 30}m
                                </button>
                                <button
                                  onClick={() => toggleActive(test)}
                                  className={`px-3 py-1 inline-flex text-[10px] font-black uppercase tracking-widest rounded-full transition-all shrink-0 ${test.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                >
                                  {test.isActive ? 'Active' : 'Draft'}
                                </button>
                                <div className="flex gap-2 items-center shrink-0 flex-wrap">
                                  <button
                                    onClick={() => handleEditTest(test)}
                                    className="text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all border border-amber-100 font-bold text-xs"
                                    title="Edit Test Settings"
                                  >
                                    Settings
                                  </button>
                                  <Link
                                    to={`/admin/test/${test.id}`}
                                    className="text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all border border-indigo-100 font-bold text-xs"
                                    title="Modify Questions"
                                  >
                                    Modify
                                  </Link>
                                  <button
                                    onClick={() => openAnalysisModal(test)}
                                    className="text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all border border-emerald-100 font-bold text-xs flex items-center gap-1"
                                    title="View Analytics"
                                  >
                                    <TrendingUp className="w-3 h-3" /> Analysis
                                  </button>
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
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'typing' && (
        <AdminTypingTests />
      )}

      {activeTab === 'notes' && <AdminStudyNotes />}

      {activeTab === 'video' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-rose-600 rounded-full"></span>
            Video Library Management
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-5">Add Vlog / Video</h3>
            <form onSubmit={handleAddVideo} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Video Title *</label>
                  <input type="text" required className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                    value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="e.g. WBP GK Live Class — June 2026" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">YouTube / Vimeo Link *</label>
                  <input type="url" required className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                    value={videoLink} onChange={e => setVideoLink(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Short Description / SEO Meta (max 160 chars)</label>
                <input type="text" maxLength={160} className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                  value={videoDesc} onChange={e => setVideoDesc(e.target.value)} placeholder="Watch WBP live class on GK topics by Suman Sir..." />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{videoDesc.length}/160</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject / Exam Category</label>
                  <input type="text" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                    value={videoSubject} onChange={e => setVideoSubject(e.target.value)} placeholder="e.g. WBP / PSC / Maths" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tags (comma separated)</label>
                  <input type="text" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                    value={videoTags} onChange={e => setVideoTags(e.target.value)} placeholder="WBP, PSC, Vlog, GK Class" />
                </div>
              </div>
              <div className="flex gap-6 items-end">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <select className="rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium text-sm"
                    value={videoStatus} onChange={e => setVideoStatus(e.target.value as 'published' | 'draft')}>
                    <option value="published">✅ Published</option>
                    <option value="draft">📝 Draft</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={videoPin} onChange={e => setVideoPin(e.target.checked)} className="w-4 h-4 accent-rose-600" />
                  <span className="text-sm font-bold text-slate-600">📌 Pin to Homepage</span>
                </label>
              </div>
              <button type="submit" className="bg-rose-600 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg flex items-center gap-2">
                <Plus className="w-5 h-5" /> Publish Video
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

      {activeTab === 'affairs' && <AdminCurrentAffairs />}

      {false && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-orange-600 rounded-full"></span>
            Current Affairs Management
          </h2>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8 space-y-6">
            <h3 className="text-lg font-bold text-slate-800">Add Current Affair</h3>
            <form onSubmit={handleAddAffair} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title *</label>
                  <input type="text" required className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                    value={affairTitle} onChange={e => { setAffairTitle(e.target.value); setAffairSlug(toSlug(e.target.value)); }}
                    placeholder="e.g. Important Current Affairs for WBP June 2026" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">SEO Slug (auto)</label>
                  <input type="text" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-mono text-sm text-slate-500"
                    value={affairSlug} onChange={e => setAffairSlug(e.target.value)} placeholder="auto-generated-from-title" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Short Description / SEO Meta (max 160 chars)</label>
                <input type="text" maxLength={160} className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                  value={affairDesc} onChange={e => setAffairDesc(e.target.value)}
                  placeholder="Download WBP, KP and PSC current affairs with MCQ practice..." />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{affairDesc.length}/160</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                  <input type="date" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                    value={affairDate} onChange={e => setAffairDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">External Link (optional)</label>
                  <input type="url" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                    value={affairLink} onChange={e => setAffairLink(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tags (comma separated)</label>
                  <input type="text" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                    value={affairTags} onChange={e => setAffairTags(e.target.value)} placeholder="WBP, PSC, Current Affairs" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Featured Image (optional)</label>
                  <input type="file" accept="image/*" className="w-full rounded-xl border-slate-200 border-2 p-2 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-700 file:font-bold"
                    onChange={e => setAffairThumb(e.target.files?.[0] || null)} />
                </div>
                <div className="flex gap-6 items-end pb-1">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                    <select className="rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium text-sm"
                      value={affairStatus} onChange={e => setAffairStatus(e.target.value as 'published' | 'draft')}>
                      <option value="published">✅ Published</option>
                      <option value="draft">📝 Draft</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input type="checkbox" checked={affairPin} onChange={e => setAffairPin(e.target.checked)} className="w-4 h-4 accent-orange-600" />
                    <span className="text-sm font-bold text-slate-600">📌 Pin to Homepage</span>
                  </label>
                </div>
              </div>
              <button disabled={uploadingAffair} type="submit" className="bg-orange-600 disabled:opacity-50 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {uploadingAffair ? 'Saving...' : 'Publish Current Affair'}
              </button>
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
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8 space-y-5">
            <h3 className="text-lg font-bold text-slate-800">Add Practice Set</h3>
            <form onSubmit={handleAddPractice} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title *</label>
                  <input type="text" required className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                    value={practiceTitle} onChange={e => setPracticeTitle(e.target.value)} placeholder="e.g. WBP Practice Set PDF — GK 2026" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject / Exam Category</label>
                  <input type="text" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                    value={practiceSubject} onChange={e => setPracticeSubject(e.target.value)} placeholder="e.g. GK / Maths / Reasoning" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Short Description / SEO Meta (max 160 chars)</label>
                <input type="text" maxLength={160} className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                  value={practiceDesc} onChange={e => setPracticeDesc(e.target.value)} placeholder="Download WBP Practice Set PDF with answers..." />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{practiceDesc.length}/160</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tags (comma separated)</label>
                  <input type="text" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                    value={practiceTags} onChange={e => setPracticeTags(e.target.value)} placeholder="WBP, PSC, Maths, GK" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">File Upload (PDF/DOCX)</label>
                  <input id="practice-file-input" type="file" accept=".pdf,.doc,.docx,.zip"
                    className="w-full rounded-xl border-slate-200 border-2 p-2 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700 file:font-bold"
                    onChange={e => setPracticeFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">OR External Link</label>
                  <input type="url" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                    value={practiceLink} onChange={e => setPracticeLink(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Featured Image (optional)</label>
                  <input type="file" accept="image/*" className="w-full rounded-xl border-slate-200 border-2 p-2 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700 file:font-bold"
                    onChange={e => setPracticeThumb(e.target.files?.[0] || null)} />
                </div>
                <div className="flex gap-6 items-end pb-1">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                    <select className="rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium text-sm"
                      value={practiceStatus} onChange={e => setPracticeStatus(e.target.value as 'published' | 'draft')}>
                      <option value="published">✅ Published</option>
                      <option value="draft">📝 Draft</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input type="checkbox" checked={practicePin} onChange={e => setPracticePin(e.target.checked)} className="w-4 h-4 accent-teal-600" />
                    <span className="text-sm font-bold text-slate-600">📌 Pin to Homepage</span>
                  </label>
                </div>
              </div>
              <button disabled={uploadingPractice} type="submit" className="bg-teal-600 disabled:opacity-50 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {uploadingPractice ? 'Uploading...' : 'Publish Practice Set'}
              </button>
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

              <select
                value={batchFilter}
                onChange={e => setBatchFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-600 outline-hidden font-bold text-sm bg-white"
              >
                <option value="all">All Batches</option>
                <option value="MANZIL 1.0">MANZIL 1.0</option>
                <option value="MANZIL 2.0">MANZIL 2.0</option>
                <option value="MANZIL 3.0">MANZIL 3.0</option>
              </select>

              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search name, mobile or ID..."
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
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Batch</th>
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
                    const matchesBatch = batchFilter === 'all' ? true : (s.batch || '') === batchFilter;
                    return matchesSearch && matchesFilter && matchesBatch;
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
                      {student.batch ? (
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${student.batch === 'Paid' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}>
                          {student.batch}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium">—</span>
                      )}
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
                          onClick={() => setEditingStudent({ ...student, focusPassword: false, newPassword: '', batch: student.batch || '' })}
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
                          onClick={() => setEditingStudent({ ...student, focusPassword: true, newPassword: '', batch: student.batch || '' })}
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
              <div className={`${editingStudent.focusPassword ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-xs font-black text-amber-600 uppercase tracking-widest mb-2">Batch / Category</label>
                <select
                  className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-bold focus:border-amber-500"
                  value={editingStudent.batch || ''}
                  onChange={e => setEditingStudent({...editingStudent, batch: e.target.value})}
                >
                  <option value="">None (General)</option>
                  <option value="MANZIL 1.0">MANZIL 1.0</option>
                  <option value="MANZIL 2.0">MANZIL 2.0</option>
                  <option value="MANZIL 3.0">MANZIL 3.0</option>
                </select>
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
                    <div className="bg-slate-950/40 rounded-3xl border border-slate-800 p-6 space-y-6 animate-in fade-in duration-300">
                      {/* Header */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 gap-4">
                        <div>
                          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1">Deep Dive Report</span>
                          <h4 className="text-lg font-black text-white">{selectedAttemptForDeepAnalysis.testTitle}</h4>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* View as Student toggle */}
                          <button
                            onClick={() => setDeepAnalysisStudentView(v => !v)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${deepAnalysisStudentView ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-300'}`}
                          >
                            <Play className="w-3 h-3" /> {deepAnalysisStudentView ? 'Admin View' : 'Student View'}
                          </button>
                          <button onClick={() => { setSelectedAttemptForDeepAnalysis(null); setDeepAnalysisQuestions([]); setDeepAnalysisStudentView(false); }} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-rose-400 transition-colors px-3 py-1.5 rounded-lg border border-slate-700 hover:border-rose-500">
                            Close
                          </button>
                        </div>
                      </div>

                      {loadingDeepAnalysis ? (
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
                          <p className="text-slate-400 font-bold text-sm">Loading full question data...</p>
                        </div>
                      ) : deepAnalysisQuestions.length > 0 && deepAnalysisStudentView ? (
                        /* ── Student View Mode ──────────────────────────────── */
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                            <Play className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-xs font-black text-indigo-400">Student View — this is exactly how {selectedStudentForAnalysis?.name || 'the student'} saw the questions</span>
                          </div>
                          {deepAnalysisQuestions.map(q => (
                            <div key={q.questionNo} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                              <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm shrink-0">{q.questionNo}</span>
                                {q.topic && <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">{q.topic}</span>}
                                <span className={`ml-auto px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${q.isSkipped ? 'bg-slate-100 text-slate-400' : q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {q.isSkipped ? 'Skipped' : q.isCorrect ? '✓ Correct' : '✗ Wrong'}
                                </span>
                              </div>
                              <p className="text-slate-800 font-medium text-sm leading-relaxed">{q.questionText}</p>
                              {q.equationLatex && <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center overflow-x-auto"><RenderMathText text={`$$${q.equationLatex}$$`} /></div>}
                              {q.imageUrl && (
                                <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex justify-center" style={{ maxHeight: 220 }}>
                                  <img src={q.imageUrl} alt="" loading="eager" style={{ maxHeight: 220, objectFit: 'contain' }} className="rounded-xl"
                                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                </div>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(q.options || []).map((opt: string, oi: number) => {
                                  const letter = String.fromCharCode(65 + oi);
                                  const isStudentChoice = opt === q.studentAnswer;
                                  const isCorrectOpt = opt === q.correctAnswer;
                                  let cls = 'border-slate-100 bg-slate-50 text-slate-500';
                                  if (isCorrectOpt) cls = 'border-emerald-200 bg-emerald-50 text-emerald-800';
                                  if (isStudentChoice && !isCorrectOpt) cls = 'border-rose-200 bg-rose-50 text-rose-700';
                                  return (
                                    <div key={oi} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border-2 ${cls}`}>
                                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${isCorrectOpt ? 'bg-emerald-500 text-white' : isStudentChoice ? 'bg-rose-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>{letter}</span>
                                      <span className="text-xs font-medium">{opt}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {(q.solution || q.explanation) && (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5">💡 Solution</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{q.solution || q.explanation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : deepAnalysisQuestions.length > 0 ? (
                        <>
                          {/* ── Summary KPI row ─────────────────────────── */}
                          {(() => {
                            const qs = deepAnalysisQuestions;
                            const correct = qs.filter(q => q.isCorrect).length;
                            const wrong = qs.filter(q => !q.isCorrect && !q.isSkipped).length;
                            const skipped = qs.filter(q => q.isSkipped).length;
                            const totalScore = qs.reduce((s, q) => s + (q.marksEarned || 0), 0);
                            const solvedQs = qs.filter(q => q.timeTaken > 0);
                            const fastest = solvedQs.length ? solvedQs.reduce((m, q) => q.timeTaken < m.timeTaken ? q : m, solvedQs[0]) : null;
                            const slowest = solvedQs.length ? solvedQs.reduce((m, q) => q.timeTaken > m.timeTaken ? q : m, solvedQs[0]) : null;
                            return (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                                  <span className="text-2xl font-black text-emerald-400 block">{correct}</span>
                                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Correct</span>
                                  <span className="text-[9px] text-emerald-700/60 block mt-0.5">+{(correct * (qs[0]?.marksPerCorrect || 1)).toFixed(2)} marks</span>
                                </div>
                                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-center">
                                  <span className="text-2xl font-black text-rose-400 block">{wrong}</span>
                                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Wrong</span>
                                  <span className="text-[9px] text-rose-700/60 block mt-0.5">-{(wrong * (qs[0]?.negativeMarks || 0.25)).toFixed(2)} marks</span>
                                </div>
                                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 text-center">
                                  <span className="text-2xl font-black text-slate-300 block">{skipped}</span>
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Skipped</span>
                                  <span className="text-[9px] text-slate-600 block mt-0.5">0 marks</span>
                                </div>
                                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-center">
                                  <span className="text-2xl font-black text-indigo-400 block font-mono">{totalScore >= 0 ? '+' : ''}{totalScore.toFixed(2)}</span>
                                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Net Score</span>
                                  {fastest && <span className="text-[9px] text-slate-500 block mt-0.5">⚡ Q{fastest.questionNo} ({fastest.timeTaken}s)</span>}
                                </div>
                              </div>
                            );
                          })()}

                          {/* ── Subject-wise bars ────────────────────────── */}
                          {(() => {
                            const subjectMap: Record<string, { total: number; correct: number }> = {};
                            deepAnalysisQuestions.forEach(q => {
                              const sub = q.subject || q.topic || 'General';
                              if (!subjectMap[sub]) subjectMap[sub] = { total: 0, correct: 0 };
                              subjectMap[sub].total++;
                              if (q.isCorrect) subjectMap[sub].correct++;
                            });
                            const subjects = Object.entries(subjectMap);
                            if (subjects.length < 2) return null;
                            return (
                              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-3">
                                <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Subject-Wise Performance</h5>
                                {subjects.map(([sub, s]) => {
                                  const acc = Math.round((s.correct / s.total) * 100);
                                  return (
                                    <div key={sub} className="flex items-center gap-3">
                                      <span className="text-xs font-bold text-slate-300 w-28 shrink-0 truncate">{sub}</span>
                                      <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                                        <div style={{ width: `${acc}%` }} className={`h-full rounded-full transition-all ${acc >= 75 ? 'bg-emerald-500' : acc >= 50 ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                                      </div>
                                      <span className={`text-xs font-black w-12 text-right ${acc >= 75 ? 'text-emerald-400' : acc >= 50 ? 'text-indigo-400' : 'text-rose-400'}`}>{s.correct}/{s.total}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* ── Question Cards ───────────────────────────── */}
                          <div className="space-y-4">
                            <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Question-Wise Analysis</h5>
                            {deepAnalysisQuestions.map((q, idx) => {
                              const resultColor = q.isSkipped ? 'border-slate-700 bg-slate-900/40' : q.isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5';
                              const resultBadge = q.isSkipped
                                ? <span className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-slate-800 text-slate-400 uppercase tracking-wider">Skipped</span>
                                : q.isCorrect
                                ? <span className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-emerald-500/15 text-emerald-400 uppercase tracking-wider">✓ Correct</span>
                                : <span className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-rose-500/15 text-rose-400 uppercase tracking-wider">✗ Wrong</span>;

                              return (
                                <div key={q.questionNo} className={`rounded-2xl border p-5 space-y-4 ${resultColor}`}>
                                  {/* Q# header row */}
                                  <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black text-slate-300 shrink-0">{q.questionNo}</span>
                                      {q.topic && <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg uppercase tracking-wider">{q.topic}</span>}
                                      {resultBadge}
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-black">
                                      <span className="text-slate-500">⏱ {q.timeTaken || 0}s</span>
                                      <span className={q.marksEarned > 0 ? 'text-emerald-400' : q.marksEarned < 0 ? 'text-rose-400' : 'text-slate-500'}>
                                        {q.marksEarned > 0 ? '+' : ''}{(q.marksEarned || 0).toFixed(2)} marks
                                      </span>
                                    </div>
                                  </div>

                                  {/* Question text */}
                                  {q.questionText && (
                                    <p className="text-sm font-medium text-slate-200 leading-relaxed">{q.questionText}</p>
                                  )}

                                  {/* Equation */}
                                  {q.equationLatex && (
                                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center overflow-x-auto">
                                      <RenderMathText text={`$$${q.equationLatex}$$`} />
                                    </div>
                                  )}

                                  {/* Question image */}
                                  {q.imageUrl && (
                                    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-800/50">
                                      <img
                                        src={q.imageUrl}
                                        alt={`Q${q.questionNo} figure`}
                                        className="max-h-56 w-auto mx-auto object-contain p-2"
                                        loading="eager"
                                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    </div>
                                  )}

                                  {/* Options grid */}
                                  {q.options && q.options.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {q.options.map((opt: string, oi: number) => {
                                        const letter = String.fromCharCode(65 + oi);
                                        const isStudentChoice = opt === q.studentAnswer;
                                        const isCorrectOpt = opt === q.correctAnswer;
                                        let cls = 'border-slate-700 bg-slate-800/40 text-slate-400';
                                        if (isCorrectOpt) cls = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
                                        if (isStudentChoice && !isCorrectOpt) cls = 'border-rose-500/40 bg-rose-500/10 text-rose-300';
                                        return (
                                          <div key={oi} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${cls}`}>
                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 ${isCorrectOpt ? 'bg-emerald-500/20 text-emerald-400' : isStudentChoice ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-500'}`}>{letter}</span>
                                            <span className="text-xs font-medium leading-relaxed flex-1">{opt}</span>
                                            {isCorrectOpt && <span className="text-[8px] font-black text-emerald-500 uppercase shrink-0">✓ Correct</span>}
                                            {isStudentChoice && !isCorrectOpt && <span className="text-[8px] font-black text-rose-500 uppercase shrink-0">Student</span>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Answer comparison row (when skipped) */}
                                  {q.isSkipped && (
                                    <div className="flex items-center gap-4 px-3 py-2 bg-slate-800/40 rounded-xl border border-slate-700">
                                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Correct Answer:</span>
                                      <span className="text-sm font-black text-emerald-400">{q.correctAnswer}</span>
                                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider ml-4">Student:</span>
                                      <span className="text-sm font-black text-slate-500 italic">Not attempted</span>
                                    </div>
                                  )}

                                  {/* Solution / Explanation */}
                                  {(q.solution || q.explanation) && (
                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">💡 Solution &amp; Explanation</span>
                                      </div>
                                      <p className="text-sm text-slate-300 leading-relaxed">
                                        {q.solution || q.explanation}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12 text-slate-500 font-bold">No question data available for this attempt.</div>
                      )}
                    </div>
                  )}

                </>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ── Blog / News Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'blog' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <span className="w-2 h-8 bg-violet-600 rounded-full" />
              News &amp; Blog
            </h2>
            <button
              onClick={() => { setShowBlogForm(true); setEditingBlogId(null); setBlogTitle(''); setBlogContent(''); setBlogTags(''); setBlogCategory('News'); setBlogPublishDate(''); setBlogThumbnailFile(null); setBlogThumbnailPreview(''); setBlogThumbnailUrl(''); setBlogSeoTitle(''); setBlogMetaDesc(''); setBlogKeywords(''); setBlogSlug(''); setBlogIsTrending(false); }}
              className="flex items-center gap-2 px-5 py-3 bg-violet-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-violet-700 shadow-lg shadow-violet-100 transition-all"
            >
              <Plus className="w-4 h-4" /> New Post
            </button>
          </div>

          {/* Blog Post Form */}
          {showBlogForm && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800">{editingBlogId ? 'Edit Post' : 'Create New Post'}</h3>
                <button onClick={() => setShowBlogForm(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Post Title *</label>
                  <input
                    type="text" value={blogTitle}
                    onChange={e => { setBlogTitle(e.target.value); if (!blogSlug) setBlogSlug(slugify(e.target.value)); }}
                    placeholder="e.g. RRB NTPC 2025 Official Notification Released"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 font-medium outline-hidden focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                  <select value={blogCategory} onChange={e => setBlogCategory(e.target.value)} className="w-full rounded-xl border-2 border-slate-200 p-3 font-medium outline-hidden focus:border-violet-500">
                    {['News', 'Update', 'Blog', 'Exam Alert', 'Result', 'Admit Card', 'Answer Key', 'Tips & Tricks'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Publish Date</label>
                  <input type="date" value={blogPublishDate} onChange={e => setBlogPublishDate(e.target.value)} className="w-full rounded-xl border-2 border-slate-200 p-3 font-medium outline-hidden focus:border-violet-500" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tags <span className="text-slate-300 normal-case font-normal">(comma separated)</span></label>
                  <input type="text" value={blogTags} onChange={e => setBlogTags(e.target.value)} placeholder="RRB, NTPC, 2025, Railway" className="w-full rounded-xl border-2 border-slate-200 p-3 font-medium outline-hidden focus:border-violet-500" />
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-2 border-amber-100 rounded-xl cursor-pointer select-none" onClick={() => setBlogIsTrending(v => !v)}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${blogIsTrending ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>
                      {blogIsTrending && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-xs font-black text-amber-700 uppercase tracking-wider">🔥 Mark as Trending</span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Thumbnail Image</label>
                  <div className={`relative border-2 border-dashed rounded-2xl transition-all ${blogThumbnailPreview ? 'border-violet-200 bg-violet-50/20' : 'border-slate-200 bg-slate-50 hover:border-violet-300'}`}>
                    {blogThumbnailPreview ? (
                      <div className="p-4 flex items-center gap-4">
                        <img src={blogThumbnailPreview} alt="Thumbnail" className="w-24 h-16 object-cover rounded-xl border border-slate-100" />
                        <button type="button" onClick={() => { setBlogThumbnailFile(null); setBlogThumbnailPreview(''); setBlogThumbnailUrl(''); }} className="text-xs font-bold text-rose-500 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 border border-rose-100"><X className="w-3 h-3" /> Remove</button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 p-6 cursor-pointer">
                        <FileText className="w-8 h-8 text-slate-300" />
                        <span className="text-sm font-bold text-slate-400">Click to upload thumbnail</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) { setBlogThumbnailFile(f); setBlogThumbnailPreview(URL.createObjectURL(f)); setBlogThumbnailUrl(''); }
                        }} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Content / Body *</label>
                  <textarea
                    rows={8} value={blogContent} onChange={e => setBlogContent(e.target.value)}
                    placeholder="Write your full post content here. You can use plain text or Markdown..."
                    className="w-full rounded-xl border-2 border-slate-200 p-3 font-medium outline-hidden focus:border-violet-500 resize-y"
                  />
                </div>
              </div>

              {/* SEO Section */}
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-violet-500" /> SEO Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">SEO Title <span className="text-slate-300 normal-case font-normal">(≤60 chars)</span></label>
                    <input type="text" value={blogSeoTitle} onChange={e => setBlogSeoTitle(e.target.value)} placeholder="Optimized title for search engines" className="w-full rounded-xl border-2 border-slate-200 p-3 font-medium outline-hidden focus:border-violet-500 bg-white" />
                    <p className="text-[10px] text-slate-400 mt-1">{blogSeoTitle.length}/60 chars</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">URL Slug</label>
                    <input type="text" value={blogSlug} onChange={e => setBlogSlug(slugify(e.target.value))} placeholder="e.g. rrb-ntpc-2025-notification" className="w-full rounded-xl border-2 border-slate-200 p-3 font-medium outline-hidden focus:border-violet-500 bg-white font-mono text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Meta Description <span className="text-slate-300 normal-case font-normal">(≤160 chars)</span></label>
                    <textarea rows={2} value={blogMetaDesc} onChange={e => setBlogMetaDesc(e.target.value)} placeholder="Brief description shown in search results..." className="w-full rounded-xl border-2 border-slate-200 p-3 font-medium outline-hidden focus:border-violet-500 bg-white resize-none" />
                    <p className="text-[10px] text-slate-400 mt-1">{blogMetaDesc.length}/160 chars</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Focus Keywords <span className="text-slate-300 normal-case font-normal">(comma separated)</span></label>
                    <input type="text" value={blogKeywords} onChange={e => setBlogKeywords(e.target.value)} placeholder="RRB NTPC 2025, Railway recruitment, NTPC notification" className="w-full rounded-xl border-2 border-slate-200 p-3 font-medium outline-hidden focus:border-violet-500 bg-white" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-end">
                <button onClick={() => setShowBlogForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                <button
                  onClick={handleBlogSave}
                  disabled={blogSavingPost || uploadingBlogThumb || !blogTitle.trim() || !blogContent.trim()}
                  className="px-6 py-3 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {blogSavingPost ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</> : <><Check className="w-4 h-4" />{editingBlogId ? 'Update Post' : 'Publish Post'}</>}
                </button>
              </div>
            </div>
          )}

          {/* Blog Posts List */}
          {blogPosts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center text-slate-400 font-bold">
              No posts yet. Create your first post!
            </div>
          ) : (
            <div className="space-y-4">
              {blogPosts.map(post => (
                <div key={post.id} className="bg-white rounded-3xl border border-slate-100 p-6 flex gap-5 items-start hover:shadow-md transition-all group">
                  {post.thumbnailUrl && (
                    <img src={post.thumbnailUrl} alt="" className="w-20 h-14 object-cover rounded-2xl shrink-0 border border-slate-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">{post.category || 'News'}</span>
                      {post.isTrending && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">🔥 Trending</span>}
                      <span className="text-[10px] text-slate-400 font-medium">{post.publishDate || (post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : '')}</span>
                    </div>
                    <h4 className="font-black text-slate-800 text-sm leading-snug mb-1 line-clamp-1">{post.title}</h4>
                    <p className="text-xs text-slate-400 font-medium line-clamp-2 mb-2">{post.content?.slice(0, 120)}...</p>
                    <div className="flex flex-wrap gap-1">
                      {(post.tags || []).slice(0, 4).map((tag: string) => (
                        <span key={tag} className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleEditBlog(post)} className="text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-100 font-bold text-xs transition-all">Edit</button>
                    <button onClick={() => handleDeleteBlog(post.id)} className="text-rose-500 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-100 font-bold text-xs transition-all">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Mock Test Analysis Modal ─────────────────────────────────────────── */}
      {analysisModalTest && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-start justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl my-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 bg-slate-900 text-white">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Test Analytics</p>
                <h3 className="text-xl font-black">{analysisModalTest.title}</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">{analysisModalTest.category} · {analysisModalTest.testType === 'topic' ? 'Topic Wise' : analysisModalTest.testType === 'sectional' ? 'Sectional' : 'Full Mock'}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={exportAnalysisCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
                <button onClick={() => setAnalysisModalTest(null)} className="p-2 rounded-xl hover:bg-slate-700 transition-all">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {analysisModalLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold">Loading analytics...</p>
              </div>
            ) : analysisModalData ? (
              <div className="p-8 space-y-8">
                {/* KPI Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Unique Students', value: analysisModalData.uniqueStudents, color: 'indigo' },
                    { label: 'Total Attempts', value: analysisModalData.totalAttempts, color: 'violet' },
                    { label: 'Avg Score', value: analysisModalData.avgScore, color: 'emerald' },
                    { label: 'Top Score', value: analysisModalData.highScore, color: 'amber' },
                  ].map(kpi => (
                    <div key={kpi.label} className={`bg-${kpi.color}-50 border border-${kpi.color}-100 rounded-2xl p-5 text-center`}>
                      <p className={`text-2xl font-black text-${kpi.color}-700`}>{kpi.value}</p>
                      <p className={`text-[10px] font-black text-${kpi.color}-400 uppercase tracking-widest mt-1`}>{kpi.label}</p>
                    </div>
                  ))}
                </div>

                {/* Score distribution bands */}
                {analysisModalData.leaderboard.length > 0 && (() => {
                  const entries = analysisModalData.leaderboard as any[];
                  const bands = [
                    { label: 'Excellent (≥80%)', color: 'emerald', count: entries.filter((e: any) => (e.accuracy || 0) >= 80).length },
                    { label: 'Good (60-79%)', color: 'indigo', count: entries.filter((e: any) => (e.accuracy || 0) >= 60 && (e.accuracy || 0) < 80).length },
                    { label: 'Average (40-59%)', color: 'amber', count: entries.filter((e: any) => (e.accuracy || 0) >= 40 && (e.accuracy || 0) < 60).length },
                    { label: 'Needs Work (<40%)', color: 'rose', count: entries.filter((e: any) => (e.accuracy || 0) < 40).length },
                  ];
                  const max = Math.max(...bands.map(b => b.count), 1);
                  return (
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Performance Distribution</h4>
                      <div className="space-y-3">
                        {bands.map(b => (
                          <div key={b.label} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 w-36 shrink-0">{b.label}</span>
                            <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                              <div style={{ width: `${(b.count / max) * 100}%` }} className={`h-full bg-${b.color}-500 rounded-full transition-all`} />
                            </div>
                            <span className={`text-sm font-black text-${b.color}-600 w-8 text-right`}>{b.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Top 10 Visual Leaderboard (student-panel style) ── */}
                {analysisModalData.leaderboard.length > 0 && (() => {
                  const top10 = (analysisModalData.leaderboard as any[]).slice(0, 10);
                  const podium = [top10[1], top10[0], top10[2]]; // order: 2nd | 1st | 3rd
                  const rest   = top10.slice(3);
                  const medals = ['🥈', '🥇', '🥉'];
                  const podiumH   = ['h-20', 'h-28', 'h-16'];
                  const podiumBg  = [
                    'from-slate-300 to-slate-400',
                    'from-amber-400 to-yellow-500',
                    'from-orange-300 to-amber-400',
                  ];
                  const podiumRank = [2, 1, 3];
                  return (
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 space-y-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">🏆 Top 10 Leaderboard</h4>
                        <span className="text-[10px] font-black text-indigo-300 bg-indigo-900/50 px-3 py-1 rounded-full border border-indigo-800">
                          {analysisModalData.leaderboard.length} Students Ranked
                        </span>
                      </div>

                      {/* Podium — top 3 */}
                      <div className="flex items-end justify-center gap-2 pt-2">
                        {podium.map((entry: any, i: number) => {
                          if (!entry) return <div key={i} className="flex-1 max-w-[120px]" />;
                          return (
                            <div key={i} className="flex flex-col items-center flex-1 max-w-[120px]">
                              <span className="text-2xl mb-1">{medals[i]}</span>
                              <p className="text-[11px] font-black text-white text-center truncate w-full px-1 mb-0.5">
                                {entry.name || 'Student'}
                              </p>
                              <p className="text-sm font-black text-amber-300 mb-1.5">{entry.score ?? 0}</p>
                              <div className={`w-full ${podiumH[i]} bg-gradient-to-b ${podiumBg[i]} rounded-t-2xl flex items-center justify-center shadow-lg`}>
                                <span className="text-white font-black text-lg">#{podiumRank[i]}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Ranks 4–10 */}
                      {rest.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {rest.map((entry: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2.5 transition-colors">
                              <span className="text-xs font-black text-slate-400 w-6 shrink-0">#{idx + 4}</span>
                              <span className="flex-1 text-sm font-bold text-slate-200 truncate">{entry.name || 'Student'}</span>
                              <span className="text-sm font-black text-indigo-300 font-mono shrink-0">{entry.score ?? 0}</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                (entry.accuracy || 0) >= 70 ? 'bg-emerald-900/60 text-emerald-300' :
                                (entry.accuracy || 0) >= 50 ? 'bg-amber-900/60 text-amber-300' :
                                'bg-rose-900/60 text-rose-300'
                              }`}>
                                {entry.accuracy || 0}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Rank + percentile summary strip */}
                      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
                        <div className="text-center">
                          <p className="text-xl font-black text-white">{analysisModalData.uniqueStudents}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Total Students</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-black text-amber-400">{top10[0]?.score ?? 0}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Top Score</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-black text-emerald-400">{analysisModalData.avgScore}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Avg Score</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Leaderboard with search/filter */}
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex-1">Full Student Rankings (First Attempt Only)</h4>
                    <div className="relative">
                      <input
                        type="text" value={analysisModalSearch} onChange={e => setAnalysisModalSearch(e.target.value)}
                        placeholder="Search by name..."
                        className="w-48 bg-slate-50 border-none rounded-xl p-2.5 pl-8 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                    <select value={analysisModalFilter} onChange={e => setAnalysisModalFilter(e.target.value as any)} className="bg-slate-50 border-none rounded-xl p-2.5 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500">
                      <option value="all">All</option>
                      <option value="top">Top 20%</option>
                      <option value="failed">Failed (&lt;35%)</option>
                      <option value="low_accuracy">Low Accuracy (&lt;50%)</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Accuracy</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(() => {
                          const total = analysisModalData.leaderboard.length;
                          return (analysisModalData.leaderboard as any[])
                            .filter((e: any, i: number) => {
                              const acc = e.accuracy || 0;
                              if (analysisModalFilter === 'top') return i < Math.ceil(total * 0.2);
                              if (analysisModalFilter === 'failed') return acc < 35;
                              if (analysisModalFilter === 'low_accuracy') return acc < 50;
                              return true;
                            })
                            .filter((e: any) => !analysisModalSearch || (e.name || '').toLowerCase().includes(analysisModalSearch.toLowerCase()))
                            .map((e: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50/60">
                                <td className="px-4 py-3 font-black text-sm text-slate-500">#{i + 1}</td>
                                <td className="px-4 py-3 font-bold text-sm text-slate-800">{e.name || 'Student'}</td>
                                <td className="px-4 py-3 font-black text-sm text-indigo-600 font-mono">{e.score || 0}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${(e.accuracy || 0) >= 70 ? 'bg-emerald-100 text-emerald-700' : (e.accuracy || 0) >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{e.accuracy || 0}%</span>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-400 font-mono">{Math.floor((e.timeTaken || 0) / 60)}m {(e.timeTaken || 0) % 60}s</td>
                                <td className="px-4 py-3 text-xs text-slate-400">{e.submittedAt ? new Date(e.submittedAt).toLocaleDateString() : 'N/A'}</td>
                              </tr>
                            ));
                        })()}
                      </tbody>
                    </table>
                    {analysisModalData.leaderboard.length === 0 && (
                      <p className="py-10 text-center text-slate-400 font-bold text-sm">No attempts recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Reviews Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'reviews' && (() => {
        const APP_URL = 'https://masteraptitude.vercel.app';

        const refreshReviews = async () => {
          if (!user) return;
          setReviewsLoading(true);
          const token = await user.getIdToken();
          const [rd, ld] = await Promise.all([
            fetch('/api/admin/reviews', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch('/api/admin/review-links', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          ]);
          setReviews(rd.reviews || []);
          setReviewLinks(ld.links || []);
          setReviewsLoading(false);
        };

        const updateReview = async (id: string, updates: any) => {
          const token = await user?.getIdToken();
          await fetch(`/api/admin/reviews/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(updates),
          });
          setReviews(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
        };

        const deleteReview = async (id: string) => {
          if (!confirm('Delete this review permanently?')) return;
          const token = await user?.getIdToken();
          await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          setReviews(prev => prev.filter(r => r.id !== id));
        };

        const createLink = async () => {
          setCreatingLink(true);
          const token = await user?.getIdToken();
          const res = await fetch('/api/admin/review-links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ category: newLinkCategory, expiryDays: newLinkExpiry }),
          });
          const d = await res.json();
          setReviewLinks(prev => [d, ...prev]);
          setCreatingLink(false);
        };

        const toggleLink = async (id: string, current: string) => {
          const token = await user?.getIdToken();
          const next = current === 'active' ? 'inactive' : 'active';
          await fetch(`/api/admin/review-links/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: next }),
          });
          setReviewLinks(prev => prev.map(l => l.id === id ? { ...l, status: next } : l));
        };

        const deleteLink = async (id: string) => {
          if (!confirm('Delete this review link?')) return;
          const token = await user?.getIdToken();
          await fetch(`/api/admin/review-links/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          setReviewLinks(prev => prev.filter(l => l.id !== id));
        };

        const copyToClipboard = (text: string, id: string) => {
          navigator.clipboard.writeText(text).then(() => {
            setCopiedLink(id);
            setTimeout(() => setCopiedLink(null), 2000);
          });
        };

        const filteredReviews = reviews.filter(r =>
          reviewFilter === 'all' ? true : r.status === reviewFilter
        );

        const CATEGORIES = ['App Experience', 'Mock Test Review', 'Course Review', 'Faculty Review', 'Website Experience', 'Practice Set Review', 'Overall Platform Review'];

        const totalApproved = reviews.filter(r => r.status === 'approved').length;
        const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 5), 0) / reviews.length).toFixed(1) : '0';

        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <span className="w-2 h-8 bg-pink-600 rounded-full" />
                Student Reviews
              </h2>
              <button onClick={refreshReviews} disabled={reviewsLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${reviewsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: reviews.length, color: 'indigo' },
                { label: 'Pending', value: reviews.filter(r => r.status === 'pending').length, color: 'amber' },
                { label: 'Approved', value: totalApproved, color: 'emerald' },
                { label: 'Avg Rating', value: avgRating + '⭐', color: 'pink' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                  <p className={`text-2xl font-black text-${color}-600`}>{value}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* ── Analytics ── */}
            {reviews.length > 0 && (() => {
              const fiveStar = reviews.filter(r => r.rating === 5).length;
              const fiveStarPct = Math.round((fiveStar / reviews.length) * 100);
              const rejected = reviews.filter(r => r.status === 'rejected').length;
              const featured = reviews.filter(r => r.featured).length;

              // Rating distribution
              const ratingDist = [5,4,3,2,1].map(star => ({
                star,
                count: reviews.filter(r => r.rating === star).length,
                pct: Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100),
              }));

              // Category breakdown (top 5)
              const catMap: Record<string, number> = {};
              reviews.forEach(r => { if (r.category) catMap[r.category] = (catMap[r.category] || 0) + 1; });
              const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
              const maxCat = topCats[0]?.[1] || 1;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Rating Distribution */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      Rating Distribution
                    </p>
                    <div className="space-y-2.5">
                      {ratingDist.map(({ star, count, pct }) => (
                        <div key={star} className="flex items-center gap-2.5">
                          <span className="text-[10px] font-black text-slate-500 w-4 shrink-0">{star}★</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: star === 5 ? '#22c55e' : star === 4 ? '#84cc16' : star === 3 ? '#eab308' : star === 2 ? '#f97316' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 w-8 text-right shrink-0">{count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-black text-emerald-600">{fiveStarPct}%</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">5★ Rate</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-rose-500">{rejected}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Rejected</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-pink-500">{featured}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Featured</p>
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <BarChart3 className="w-3 h-3 text-indigo-500" />
                      Top Categories
                    </p>
                    {topCats.length === 0 ? (
                      <p className="text-slate-300 text-sm font-bold text-center py-4">No category data yet</p>
                    ) : (
                      <div className="space-y-2.5">
                        {topCats.map(([cat, count]) => (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-600 truncate max-w-[70%]">{cat}</span>
                              <span className="text-[10px] font-black text-slate-400">{count}</span>
                            </div>
                            <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                style={{ width: `${Math.round((count / maxCat) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                      <p className="text-xs font-black text-indigo-600">{topCats[0]?.[0] || '—'}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Most Active Category</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Reviews List ── */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Filter tabs */}
              <div className="flex gap-1 p-4 border-b border-slate-100 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                  <button key={f} onClick={() => setReviewFilter(f)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${reviewFilter === f
                      ? f === 'all' ? 'bg-slate-800 text-white'
                        : f === 'pending' ? 'bg-amber-500 text-white'
                        : f === 'approved' ? 'bg-emerald-500 text-white'
                        : 'bg-rose-500 text-white'
                      : 'text-slate-500 hover:bg-slate-100'}`}>
                    {f} ({f === 'all' ? reviews.length : reviews.filter(r => r.status === f).length})
                  </button>
                ))}
              </div>

              {reviewsLoading ? (
                <div className="py-16 text-center text-slate-400 font-bold text-sm">Loading reviews...</div>
              ) : filteredReviews.length === 0 ? (
                <div className="py-16 text-center">
                  <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 font-bold text-sm">No reviews found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredReviews.map(review => (
                    <div key={review.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                      {editingReview?.id === review.id ? (
                        /* Edit mode */
                        <div className="space-y-3">
                          <div className="flex gap-1 mb-2">
                            {[1,2,3,4,5].map(s => (
                              <button key={s}
                                onMouseEnter={() => setEditReviewHover(s)}
                                onMouseLeave={() => setEditReviewHover(0)}
                                onClick={() => setEditReviewRating(s)}>
                                <Star className={`w-6 h-6 transition-colors ${s <= (editReviewHover || editReviewRating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={editReviewText}
                            onChange={e => setEditReviewText(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border-2 border-slate-200 p-3 text-sm font-medium outline-hidden focus:border-indigo-500 resize-none"
                          />
                          <div className="flex gap-2">
                            <button onClick={async () => {
                              await updateReview(review.id, { reviewText: editReviewText, rating: editReviewRating });
                              setEditingReview(null);
                            }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all">
                              Save
                            </button>
                            <button onClick={() => setEditingReview(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-200 transition-all">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-800 text-sm">{review.fullName}</span>
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                                ))}
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                review.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                                : review.status === 'rejected' ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                              }`}>{review.status}</span>
                              {review.showHomepage && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">On Homepage</span>
                              )}
                              {review.featured && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-pink-100 text-pink-700">⭐ Featured</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {review.createdAt?.seconds ? new Date(review.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </span>
                          </div>

                          <p className="text-sm text-slate-600 leading-relaxed mb-3">{review.reviewText}</p>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {review.status !== 'approved' && (
                              <button onClick={() => updateReview(review.id, { status: 'approved', showHomepage: true })}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black hover:bg-emerald-100 transition-all flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Approve
                              </button>
                            )}
                            {review.status !== 'rejected' && (
                              <button onClick={() => updateReview(review.id, { status: 'rejected' })}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-black hover:bg-rose-100 transition-all flex items-center gap-1">
                                <X className="w-3 h-3" /> Reject
                              </button>
                            )}
                            <button onClick={() => updateReview(review.id, { showHomepage: !review.showHomepage })}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 ${
                                review.showHomepage ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}>
                              <Globe className="w-3 h-3" />
                              {review.showHomepage ? 'Hide from Home' : 'Show on Home'}
                            </button>
                            <button onClick={() => updateReview(review.id, { featured: !review.featured })}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 ${
                                review.featured ? 'bg-pink-100 text-pink-700 hover:bg-pink-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}>
                              <Star className="w-3 h-3" />
                              {review.featured ? 'Unfeature' : 'Feature'}
                            </button>
                            <button onClick={() => {
                              setEditingReview(review);
                              setEditReviewText(review.reviewText);
                              setEditReviewRating(review.rating);
                            }} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black hover:bg-slate-200 transition-all flex items-center gap-1">
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button onClick={() => deleteReview(review.id)}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-black hover:bg-rose-100 transition-all flex items-center gap-1">
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Shareable Review Links ── */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-indigo-500" />
                  Shareable Review Links
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">Generate a link → share via WhatsApp / Telegram / QR</p>
              </div>

              {/* Create new link */}
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-5 space-y-4 border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Create New Shareable Link</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                    <select value={newLinkCategory} onChange={e => setNewLinkCategory(e.target.value)}
                      className="w-full rounded-xl border-2 border-slate-200 p-2.5 font-medium text-sm outline-hidden focus:border-indigo-500 bg-white">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Expiry (Days)</label>
                    <select value={newLinkExpiry} onChange={e => setNewLinkExpiry(Number(e.target.value))}
                      className="w-full rounded-xl border-2 border-slate-200 p-2.5 font-medium text-sm outline-hidden focus:border-indigo-500 bg-white">
                      <option value={0}>No Expiry</option>
                      <option value={7}>7 Days</option>
                      <option value={30}>30 Days</option>
                      <option value={90}>90 Days</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button onClick={createLink} disabled={creatingLink}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                      <Plus className="w-4 h-4" />
                      {creatingLink ? 'Creating...' : 'Generate Link'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Links list */}
              {reviewLinks.length === 0 ? (
                <div className="text-center py-10 rounded-2xl border-2 border-dashed border-slate-100">
                  <Link2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 font-bold text-sm">No review links yet.</p>
                  <p className="text-slate-300 text-xs mt-1">Generate one above and share with your students.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewLinks.map(link => {
                    const fullUrl = `${APP_URL}/review/${link.uniqueCode}`;
                    const shareMsg = encodeURIComponent(`📝 Share your review of Master Aptitude by Suman Sir!\n\n👉 ${fullUrl}\n\nYour feedback helps other aspirants. Takes just 1 minute! ⭐`);
                    const sharePlatforms = [
                      { label: 'WhatsApp',  emoji: '💬', bg: 'bg-emerald-500 hover:bg-emerald-600', href: `https://wa.me/?text=${shareMsg}` },
                      { label: 'Telegram',  emoji: '✈️', bg: 'bg-sky-500 hover:bg-sky-600',     href: `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${shareMsg}` },
                      { label: 'Facebook',  emoji: '📘', bg: 'bg-blue-600 hover:bg-blue-700',   href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}` },
                    ];
                    return (
                      <div key={link.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                        {/* Link header */}
                        <div className="p-4 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-700 text-sm">{link.category}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${link.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {link.status}
                            </span>
                            {link.expiryDate && (
                              <span className="text-[10px] text-slate-400 font-medium">Expires {new Date(link.expiryDate).toLocaleDateString('en-IN')}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => toggleLink(link.id, link.status)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${link.status === 'active' ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                              {link.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onClick={() => deleteLink(link.id)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* URL bar */}
                        <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-100">
                          <p className="flex-1 text-xs text-slate-500 font-mono truncate">{fullUrl}</p>
                          <button onClick={() => copyToClipboard(fullUrl, link.id)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all shrink-0 ${copiedLink === link.id ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                            {copiedLink === link.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedLink === link.id ? 'Copied!' : 'Copy Link'}
                          </button>
                          <a href={fullUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black hover:bg-slate-200 transition-all shrink-0">
                            <ExternalLink className="w-3 h-3" /> Open
                          </a>
                        </div>

                        {/* Share buttons — always visible */}
                        <div className="px-4 py-3 flex items-center gap-2 flex-wrap bg-white">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Share via:</span>
                          {sharePlatforms.map(({ label, emoji, bg, href }) => (
                            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-black ${bg} transition-all shadow-sm`}>
                              <span>{emoji}</span> {label}
                            </a>
                          ))}
                          <button onClick={() => setShowQRFor(showQRFor === link.id ? null : link.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${showQRFor === link.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}>
                            📷 QR Code
                          </button>
                        </div>

                        {/* QR Code panel */}
                        {showQRFor === link.id && (
                          <div className="flex flex-col items-center gap-3 py-6 px-4 bg-slate-50 border-t border-slate-100">
                            <div className="bg-white p-4 rounded-2xl shadow-md">
                              <QRCodeSVG value={fullUrl} size={180} fgColor="#0f0c29" bgColor="#ffffff" level="H"
                                imageSettings={{ src: '/icon-192.png', height: 36, width: 36, excavate: true }} />
                            </div>
                            <p className="text-[11px] text-slate-500 font-bold">Scan to open review form</p>
                            <p className="text-[10px] text-slate-400 font-mono">{link.uniqueCode}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        );
      })()}

      {/* ── Paid Mock Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'paid_mock' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Sub-tabs */}
          <div className="flex gap-2">
            {(['batches', 'payments'] as const).map(t => (
              <button key={t} onClick={() => {
                setPaidMockSubTab(t);
                if (t === 'payments' && paidPayments.length === 0) {
                  setPaidPaymentsLoading(true);
                  user?.getIdToken().then(token =>
                    fetch('/api/admin/payments', { headers: { Authorization: `Bearer ${token}` } })
                      .then(r => r.json())
                      .then(d => setPaidPayments(Array.isArray(d) ? d : []))
                      .catch(() => {})
                      .finally(() => setPaidPaymentsLoading(false))
                  );
                }
              }}
              className={`px-5 py-2 rounded-xl font-black text-sm transition-all ${paidMockSubTab === t ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-amber-300'}`}>
                {t === 'batches' ? '📦 Batches' : '💰 Payments'}
              </button>
            ))}
          </div>

          {/* ── Batches sub-tab ── */}
          {paidMockSubTab === 'batches' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div className="rounded-2xl p-6 space-y-4" style={{ background: '#fff', border: '1px solid #e8ecf3', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <h3 className="font-black text-base text-slate-800">{editingBatch ? '✏️ Edit Batch' : '➕ Create New Batch'}</h3>
                {/* Exam Name */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Exam Name *</label>
                  <input value={batchForm.examName} onChange={e => setBatchForm(f => ({ ...f, examName: e.target.value }))}
                    placeholder="e.g. PSC Clerkship Premium Batch"
                    className="w-full rounded-xl px-3 py-2 text-sm border border-slate-200 focus:border-indigo-400 outline-none" />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Description *</label>
                  <textarea rows={3} value={batchForm.description} onChange={e => setBatchForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2 text-sm border border-slate-200 focus:border-indigo-400 outline-none resize-none" />
                </div>

                {/* Thumbnail Upload */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Batch Thumbnail</label>
                  {batchThumbPreview || batchForm.thumbnailUrl ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50/30">
                      <img src={batchThumbPreview || batchForm.thumbnailUrl} alt="thumbnail"
                        className="w-20 h-14 object-cover rounded-lg border border-indigo-100 shrink-0" />
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white transition-all w-fit">
                          🔄 Replace Image
                          <input type="file" accept="image/*" className="hidden" onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) { setBatchThumbFile(f); setBatchThumbPreview(URL.createObjectURL(f)); setBatchForm(frm => ({ ...frm, thumbnailUrl: '' })); }
                          }} />
                        </label>
                        <button type="button" onClick={() => { setBatchThumbFile(null); setBatchThumbPreview(''); setBatchForm(f => ({ ...f, thumbnailUrl: '' })); }}
                          className="text-xs font-bold text-rose-500 hover:text-rose-700 px-3 py-1.5 rounded-lg border border-rose-100 bg-white transition-all w-fit">
                          🗑 Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 p-6 cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl">🖼️</div>
                      <span className="text-xs font-bold text-slate-500">Click to upload thumbnail</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG — shown on student dashboard</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setBatchThumbFile(f); setBatchThumbPreview(URL.createObjectURL(f)); setBatchForm(frm => ({ ...frm, thumbnailUrl: '' })); }
                      }} />
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Price (₹) *</label>
                    <input type="number" value={batchForm.price} onChange={e => setBatchForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="149" className="w-full rounded-xl px-3 py-2 text-sm border border-slate-200 focus:border-indigo-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Mocks</label>
                    <input type="number" value={batchForm.totalMocks} onChange={e => setBatchForm(f => ({ ...f, totalMocks: e.target.value }))}
                      placeholder="20" className="w-full rounded-xl px-3 py-2 text-sm border border-slate-200 focus:border-indigo-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Validity</label>
                    <select value={batchForm.validity} onChange={e => setBatchForm(f => ({ ...f, validity: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2 text-sm border border-slate-200 focus:border-indigo-400 outline-none">
                      {['30 Days', '60 Days', '90 Days', '6 Months', '1 Year', 'Unlimited'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Features (comma-separated)</label>
                  <input value={batchForm.features} onChange={e => setBatchForm(f => ({ ...f, features: e.target.value }))}
                    placeholder="Latest Pattern, Full Analysis, PYQ Included, Smart Ranking"
                    className="w-full rounded-xl px-3 py-2 text-sm border border-slate-200 focus:border-indigo-400 outline-none" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={batchForm.isActive} onChange={e => setBatchForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                    <span className="text-sm font-bold text-slate-700">Active (visible to students)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={batchForm.isPopular} onChange={e => setBatchForm(f => ({ ...f, isPopular: e.target.checked }))} className="rounded" />
                    <span className="text-sm font-bold text-slate-700">🔥 Most Popular</span>
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={async () => {
                      if (!batchForm.examName.trim() || !batchForm.price) return;
                      setBatchSaving(true);
                      try {
                        const token = await user!.getIdToken();
                        let thumbUrl = batchForm.thumbnailUrl;

                        // Upload thumbnail via server if a file was picked
                        if (batchThumbFile) {
                          const arrayBuf = await batchThumbFile.arrayBuffer();
                          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
                          const ext = batchThumbFile.type === 'image/png' ? '.png' : '.jpg';
                          const fileName = `batch_thumb_${Date.now()}${ext}`;
                          const upRes = await fetch('/api/admin/upload-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ base64, mimeType: batchThumbFile.type, fileName }),
                          });
                          const upData = await upRes.json();
                          if (!upRes.ok) throw new Error(upData.error || 'Thumbnail upload failed');
                          thumbUrl = upData.url;
                        }

                        const body = {
                          ...batchForm,
                          thumbnailUrl: thumbUrl,
                          features: batchForm.features.split(',').map(s => s.trim()).filter(Boolean),
                        };
                        const url = editingBatch ? `/api/admin/paid-batches/${editingBatch.id}` : '/api/admin/paid-batches';
                        const method = editingBatch ? 'PUT' : 'POST';
                        const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                        const data = await res.json();
                        if (editingBatch) {
                          setPaidBatches(prev => prev.map(b => b.id === editingBatch.id ? { ...b, ...body } : b));
                        } else {
                          setPaidBatches(prev => [{ id: data.id, ...body, enrolledCount: 0, createdAt: new Date().toISOString() }, ...prev]);
                        }
                        setEditingBatch(null);
                        setBatchForm({ examName: '', description: '', price: '', thumbnailUrl: '', validity: '30 Days', totalMocks: '', features: '', isActive: true, isPopular: false });
                        setBatchThumbFile(null); setBatchThumbPreview('');
                      } catch (e: any) { alert(e.message || 'Failed to save batch'); }
                      setBatchSaving(false);
                    }}
                    disabled={batchSaving}
                    className="flex-1 py-2.5 rounded-xl font-black text-sm text-white transition-all hover:brightness-110 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}
                  >
                    {batchSaving ? 'Saving...' : editingBatch ? 'Update Batch' : 'Create Batch'}
                  </button>
                  {editingBatch && (
                    <button onClick={() => { setEditingBatch(null); setBatchThumbFile(null); setBatchThumbPreview(''); setBatchForm({ examName: '', description: '', price: '', thumbnailUrl: '', validity: '30 Days', totalMocks: '', features: '', isActive: true, isPopular: false }); }}
                      className="px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Batch List */}
              <div className="space-y-3">
                <h3 className="font-black text-base text-slate-800">📋 All Batches ({paidBatches.length})</h3>
                {paidBatchLoading && <p className="text-slate-400 text-sm animate-pulse">Loading...</p>}
                {paidBatches.map(batch => (
                  <div key={batch.id} className="rounded-2xl p-4" style={{ background: '#fff', border: batch.isActive ? '1px solid #fde68a' : '1px solid #e8ecf3', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-black text-sm text-slate-800">{batch.examName}</span>
                          {batch.isPopular && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">🔥 POPULAR</span>}
                          {!batch.isActive && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">HIDDEN</span>}
                        </div>
                        <p className="text-xs text-slate-500 truncate mb-2">{batch.description}</p>
                        <div className="flex gap-3 text-xs font-bold text-slate-600">
                          <span>₹{batch.price}</span>
                          <span>{batch.totalMocks} mocks</span>
                          <span>{batch.validity}</span>
                          <span>{batch.enrolledCount || 0} enrolled</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => {
                          setEditingBatch(batch);
                          setBatchThumbFile(null); setBatchThumbPreview('');
                          setBatchForm({
                            examName: batch.examName || '', description: batch.description || '',
                            price: String(batch.price || ''), thumbnailUrl: batch.thumbnailUrl || '',
                            validity: batch.validity || '30 Days', totalMocks: String(batch.totalMocks || ''),
                            features: (batch.features || []).join(', '),
                            isActive: batch.isActive !== false, isPopular: !!batch.isPopular,
                          });
                        }} className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-black">✏️</button>
                        <button onClick={async () => {
                          if (!confirm(`Delete "${batch.examName}"?`)) return;
                          const token = await user!.getIdToken();
                          await fetch(`/api/admin/paid-batches/${batch.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                          setPaidBatches(prev => prev.filter(b => b.id !== batch.id));
                        }} className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors text-xs">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
                {!paidBatchLoading && paidBatches.length === 0 && (
                  <div className="rounded-2xl p-8 text-center" style={{ background: '#f8fafc', border: '2px dashed #e2e8f0' }}>
                    <p className="text-3xl mb-2">👑</p>
                    <p className="font-black text-slate-600 text-sm">No paid batches yet</p>
                    <p className="text-xs text-slate-400 mt-1">Create your first premium batch using the form</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Payments sub-tab ── */}
          {paidMockSubTab === 'payments' && (
            <div className="space-y-4">
              {/* Stats */}
              {(() => {
                const total = paidPayments.reduce((s, p) => s + (p.amount || 0), 0);
                const today = paidPayments.filter(p => p.createdAt?.startsWith(new Date().toISOString().slice(0, 10))).reduce((s, p) => s + (p.amount || 0), 0);
                return (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Total Revenue', value: `₹${total.toLocaleString()}`, color: '#10b981' },
                      { label: "Today's Earnings", value: `₹${today.toLocaleString()}`, color: '#f59e0b' },
                      { label: 'Total Purchases', value: paidPayments.length, color: '#6366f1' },
                    ].map(s => (
                      <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: '#fff', border: '1px solid #e8ecf3' }}>
                        <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Table */}
              {paidPaymentsLoading && <p className="text-slate-400 text-sm animate-pulse">Loading payments...</p>}
              <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e8ecf3' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8ecf3' }}>
                        {['Student', 'Batch', 'Amount', 'Transaction ID', 'Date', 'Status', 'Action'].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paidPayments.map(p => {
                        const isPending = p.status === 'pending_verification';
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: isPending ? '#fffbeb' : undefined }}>
                            <td className="px-3 py-3 text-xs font-bold text-slate-700">{p.studentName || p.studentId?.slice(0, 8)}</td>
                            <td className="px-3 py-3 text-xs text-slate-500">{paidBatches.find(b => b.id === p.batchId)?.examName || p.batchId?.slice(0, 10)}</td>
                            <td className="px-3 py-3 text-xs font-black text-emerald-600">₹{p.amount}</td>
                            <td className="px-3 py-3 text-xs text-slate-400 font-mono">{(p.transactionId || '').slice(0, 14)}</td>
                            <td className="px-3 py-3 text-xs text-slate-400">{p.createdAt?.slice(0, 10)}</td>
                            <td className="px-3 py-3">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                p.status === 'success' ? 'bg-green-100 text-green-700' :
                                p.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {p.status === 'success' ? '✔ PAID' : p.status === 'rejected' ? '✕ REJECTED' : '⏳ PENDING'}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              {isPending && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={async () => {
                                      const token = await user!.getIdToken();
                                      const res = await fetch(`/api/admin/payments/${p.id}/verify`, {
                                        method: 'PUT',
                                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'approve', batchId: p.batchId }),
                                      });
                                      if (res.ok) setPaidPayments(prev => prev.map(x => x.id === p.id ? { ...x, status: 'success' } : x));
                                    }}
                                    className="text-[9px] font-black px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                  >✔ Approve</button>
                                  <button
                                    onClick={async () => {
                                      const token = await user!.getIdToken();
                                      const res = await fetch(`/api/admin/payments/${p.id}/verify`, {
                                        method: 'PUT',
                                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'reject', batchId: p.batchId }),
                                      });
                                      if (res.ok) setPaidPayments(prev => prev.map(x => x.id === p.id ? { ...x, status: 'rejected' } : x));
                                    }}
                                    className="text-[9px] font-black px-2 py-1 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors"
                                  >✕ Reject</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!paidPaymentsLoading && paidPayments.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-8">No payments yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── Smart image compression ─────────────────────────────────────────────────
// • PNG inputs are ALWAYS kept as PNG (lossless) — critical for equations,
//   graphs, diagrams, and geometry figures where JPEG artifacts destroy clarity.
// • JPEG/other inputs get resized only if they exceed maxDimension; quality 0.82.
// • Files under 200 KB are returned as-is regardless of format.
async function compressImage(file: File, maxDimension = 1200, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    // Very small files — no benefit from re-encoding, return original
    if (file.size < 200 * 1024) {
      resolve(file);
      return;
    }

    const isPng       = file.type === 'image/png';
    const outputMime  = isPng ? 'image/png'  : 'image/jpeg';
    const outputExt   = isPng ? '.png'        : '.jpg';

    const reader = new FileReader();
    reader.onerror = () => resolve(file); // fallback on read error

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file); // fallback on decode error

      img.onload = () => {
        let { width, height } = img;
        const needsResize = width > maxDimension || height > maxDimension;

        // PNG within dimension limits → return the original file unchanged.
        // Equations and diagrams must never be re-encoded with lossy compression.
        if (isPng && !needsResize) {
          resolve(file);
          return;
        }

        if (needsResize) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width  = Math.round(width  * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Paint white background before drawing — prevents black fill when a
        // transparent PNG is being downsampled to JPEG.
        if (!isPng) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            const newName = file.name.replace(/\.[^.]+$/, outputExt);
            resolve(new File([blob], newName, { type: outputMime }));
          },
          outputMime,
          isPng ? undefined : quality // quality is irrelevant for PNG (lossless)
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
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
  const [qImageFile, setQImageFile] = useState<File | null>(null);
  const [qImagePreview, setQImagePreview] = useState<string>('');
  const [qImageUrl, setQImageUrl] = useState<string>('');
  const [uploadingQImage, setUploadingQImage] = useState(false);
  const [qEquation, setQEquation] = useState('');
  const [qSourceExam, setQSourceExam] = useState('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showPreview, setShowPreview] = useState(true);

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
      let finalImageUrl = qImageUrl;
      if (qImageFile) {
        setUploadingQImage(true);
        try {
          const compressed = await compressImage(qImageFile, 1200, 0.82);
          const ext = compressed.type === 'image/png' ? '.png' : '.jpg';
          const fileName = `question_image_${Date.now()}_q${ext}`;
          finalImageUrl = await uploadFileViaBackend(compressed, 'question_images', user, fileName);
        } catch (err: any) {
          setUploadingQImage(false);
          alert(`Image upload failed: ${err.message}`);
          return;
        }
        setUploadingQImage(false);
      }

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
          solution: qSolution,
          imageUrl: finalImageUrl,
          equationLatex: qEquation,
          sourceExam: qSourceExam.trim() || undefined
        })
      });
      if (res.ok) {
        setQText(''); setQTopic(''); setQOptions(['', '', '', '']); setQCorrect(''); setQSolution('');
        setQImageFile(null); setQImagePreview(''); setQImageUrl('');
        setQEquation(''); setQSourceExam('');
        setEditingQuestionId(null);
        alert(editingQuestionId ? 'Question updated!' : 'Question added!');
      } else alert(await res.text());
    } catch (error) {
      console.error(error);
      setUploadingQImage(false);
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
    setQImageUrl(q.imageUrl || '');
    setQImageFile(null);
    setQImagePreview(q.imageUrl || '');
    setQEquation(q.equationLatex || '');
    setQSourceExam(q.sourceExam || '');
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
      <div className="flex items-center mb-6 gap-4 flex-wrap">
        <Link to="/admin" className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition group">
          <ArrowLeft className="w-5 h-5 text-indigo-600 group-hover:-translate-x-1 transition-transform" />
        </Link>
        <h2 className="text-2xl font-black text-slate-800 flex-1">Manage Test Questions</h2>
        <button
          type="button"
          onClick={() => setShowPreview(v => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all border-2 ${showPreview ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
        >
          <Play className="w-3.5 h-3.5" /> Live Preview
        </button>
      </div>

      <div className={`flex gap-6 items-start ${showPreview ? 'flex-col lg:flex-row' : ''}`}>
        {/* ─── Form Column ─────────────────────────────────────── */}
        <div className={showPreview ? 'flex-1 min-w-0' : 'w-full'}>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
         <h3 className="text-lg font-bold text-slate-800 mb-6">{editingQuestionId ? 'Edit Question' : 'Add New Question'}</h3>
         <form onSubmit={handleAddQuestion} className="space-y-6">
           <div>
             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Question Description</label>
             <RichTextEditor
               value={qText}
               onChange={setQText}
               placeholder="Write the question here... (select text to format)"
               minHeight={100}
             />
           </div>

           {/* Source Exam */}
           <div>
             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
               Asked In / Source Exam <span className="text-slate-300 normal-case font-normal">(optional)</span>
             </label>
             <input
               type="text"
               value={qSourceExam}
               onChange={e => setQSourceExam(e.target.value)}
               placeholder="e.g. SSC CGL 2023, WBP Constable 2022, RRB NTPC Previous Year"
               list="source-exam-suggestions"
               className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 transition-colors"
               style={{ background: '#f0fdf4' }}
             />
             <datalist id="source-exam-suggestions">
               {['SSC CGL', 'SSC CHSL', 'SSC MTS', 'SSC GD', 'WBP Constable', 'WBP SI', 'WBPSC Clerkship', 'RRB NTPC', 'RRB Group D', 'RRB ALP', 'WBPSC Food SI', 'KP Constable'].map(s => (
                 <option key={s} value={s} />
               ))}
             </datalist>
           </div>

           <div>
             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Question Image <span className="text-slate-300 normal-case font-normal">(optional — for equations, diagrams, figures)</span></label>
             <div
               className={`relative border-2 border-dashed rounded-2xl transition-all ${qImagePreview ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/20'}`}
               onDragOver={e => e.preventDefault()}
               onDrop={e => {
                 e.preventDefault();
                 const file = e.dataTransfer.files[0];
                 if (file && file.type.startsWith('image/')) {
                   setQImageFile(file);
                   setQImagePreview(URL.createObjectURL(file));
                   setQImageUrl('');
                 }
               }}
             >
               {qImagePreview ? (
                 <div className="p-4 flex items-start gap-4">
                   {/* Fixed-size preview box — never grows beyond 280px wide */}
                   <div className="shrink-0 w-[200px] sm:w-[280px] rounded-2xl overflow-hidden border border-indigo-100 bg-slate-50 flex items-center justify-center" style={{ minHeight: 80, maxHeight: 220 }}>
                     <img
                       src={qImagePreview}
                       alt="Question image"
                       style={{ maxHeight: 220, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                       className="rounded-xl"
                     />
                   </div>
                   <div className="flex flex-col gap-2 pt-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image ready</p>
                     <p className="text-xs text-slate-400">Will be compressed &amp; uploaded on save.</p>
                     {/* Replace button */}
                     <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 border border-indigo-100 transition-all w-fit">
                       <FileText className="w-3 h-3" /> Replace
                       <input type="file" accept="image/*" className="hidden" onChange={e => {
                         const file = e.target.files?.[0];
                         if (file) { setQImageFile(file); setQImagePreview(URL.createObjectURL(file)); setQImageUrl(''); }
                       }} />
                     </label>
                     <button
                       type="button"
                       onClick={() => { setQImageFile(null); setQImagePreview(''); setQImageUrl(''); }}
                       className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 border border-rose-100 transition-all w-fit"
                     >
                       <X className="w-3 h-3" /> Remove
                     </button>
                   </div>
                 </div>
               ) : (
                 <label className="flex flex-col items-center justify-center gap-2 p-8 cursor-pointer">
                   <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                     <FileText className="w-6 h-6 text-slate-400" />
                   </div>
                   <span className="text-sm font-bold text-slate-500">Click to upload or drag &amp; drop</span>
                   <span className="text-xs text-slate-400">PNG, JPG, GIF, SVG · Auto-compressed to max 1200px</span>
                   <input type="file" accept="image/*" className="hidden" onChange={e => {
                     const file = e.target.files?.[0];
                     if (file) { setQImageFile(file); setQImagePreview(URL.createObjectURL(file)); setQImageUrl(''); }
                   }} />
                 </label>
               )}
             </div>
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
             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
               Math / Equation <span className="text-slate-300 normal-case font-normal">(optional — use LaTeX syntax, e.g. \frac{'{'}{'{'}a{'}'}{'}'}{'{'}{'{'}b{'}'}{'}'} or x^2+y^2=r^2)</span>
             </label>
             <textarea
               className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-medium font-mono text-sm"
               rows={2} value={qEquation} onChange={e => setQEquation(e.target.value)}
               placeholder="e.g.  \frac{a}{b} = c   or   x^2 + y^2 = r^2   or   \sqrt{a^2+b^2}"
             />
             {qEquation.trim() && (
               <div className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Live Preview</p>
                 <div className="text-center text-lg overflow-x-auto">
                   <RenderMathText text={`$$${qEquation}$$`} />
                 </div>
               </div>
             )}
             <div className="mt-2 flex flex-wrap gap-1.5">
               {[
                 { label: 'Fraction', latex: '\\frac{a}{b}' },
                 { label: 'Square Root', latex: '\\sqrt{x}' },
                 { label: 'Power', latex: 'x^{2}' },
                 { label: 'Subscript', latex: 'x_{n}' },
                 { label: 'Sum Σ', latex: '\\sum_{i=1}^{n} x_i' },
                 { label: 'Integral ∫', latex: '\\int_{a}^{b} f(x)dx' },
                 { label: 'Pi π', latex: '\\pi' },
                 { label: 'Alpha α', latex: '\\alpha' },
                 { label: 'Theta θ', latex: '\\theta' },
                 { label: '≥ / ≤', latex: '\\geq \\leq' },
                 { label: '±', latex: '\\pm' },
                 { label: 'Times ×', latex: '\\times' },
               ].map(({ label, latex }) => (
                 <button
                   key={label} type="button"
                   onClick={() => setQEquation(prev => prev ? `${prev} ${latex}` : latex)}
                   className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-500 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all"
                 >{label}</button>
               ))}
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
                   setQImageFile(null); setQImagePreview(''); setQImageUrl('');
                   setQEquation('');
                 }}
                 className="bg-slate-100 text-slate-600 px-8 py-4 rounded-xl hover:bg-slate-200 font-bold transition-all"
               >
                 Cancel
               </button>
             )}
             <button type="submit" disabled={uploadingQImage} className="bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-indigo-50 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
               {uploadingQImage ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading Image...</> : <><Plus className="w-5 h-5" /> {editingQuestionId ? 'Update Question' : 'Add Question to Test'}</>}
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
             <div className="flex items-start mb-4">
                <span className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black mr-4 shrink-0">
                  {i+1}
                </span>
                <div className="flex-1 pr-20">
                  <h4 className="font-bold text-slate-800 text-base leading-snug">
                    <RenderQuestionHTML html={q.questionText} />
                  </h4>
                  {q.sourceExam && (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-700 text-white">
                      📌 {q.sourceExam}
                    </span>
                  )}
                </div>
             </div>
             {q.equationLatex && (
               <div className="mb-4 ml-14 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center text-lg overflow-x-auto">
                 <RenderMathText text={`$$${q.equationLatex}$$`} />
               </div>
             )}
             {q.imageUrl && (
               <div className="mb-5 ml-14 w-fit max-w-full">
                 <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 inline-flex items-center justify-center" style={{ maxWidth: '100%', maxHeight: 220 }}>
                   <img
                     src={q.imageUrl}
                     alt="Question figure"
                     loading="lazy"
                     style={{ maxHeight: 220, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                     className="rounded-2xl"
                     onError={e => {
                       (e.currentTarget as HTMLImageElement).style.display = 'none';
                       const fallback = document.createElement('div');
                       fallback.className = 'flex items-center gap-2 p-3 text-rose-500 text-xs font-bold';
                       fallback.innerHTML = '⚠ Image failed to load — check Firebase Storage URL';
                       e.currentTarget.parentElement?.appendChild(fallback);
                     }}
                   />
                 </div>
               </div>
             )}
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
        </div>{/* end form column */}

        {/* ─── Live Preview Column ─────────────────────────────── */}
        {showPreview && (
          <div className="lg:w-[380px] lg:sticky lg:top-24 shrink-0">
            {/* View toggle */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Preview</span>
              <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
                <button type="button" onClick={() => setPreviewMode('desktop')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${previewMode === 'desktop' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>Desktop</button>
                <button type="button" onClick={() => setPreviewMode('mobile')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${previewMode === 'mobile' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>Mobile</button>
              </div>
            </div>

            <div className={`transition-all ${previewMode === 'mobile' ? 'max-w-[360px] mx-auto' : ''}`}>
              <div className={`bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-lg ${previewMode === 'mobile' ? 'rounded-[32px] border-4 border-slate-700' : ''}`}>
                {/* Mock phone notch */}
                {previewMode === 'mobile' && (
                  <div className="bg-slate-800 h-6 flex items-center justify-center">
                    <div className="w-16 h-1.5 rounded-full bg-slate-600" />
                  </div>
                )}
                <div className={`p-5 space-y-4 ${previewMode === 'mobile' ? 'text-[13px]' : 'text-[14px]'}`}>
                  {/* Question number */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-lg">Q {questions.length + 1}</span>
                    {qTopic && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{qTopic}</span>}
                  </div>

                  {/* Question text */}
                  <div className="font-semibold text-slate-800 leading-relaxed min-h-[40px]">
                    {qText
                      ? <RenderQuestionHTML html={qText} />
                      : <span className="text-slate-300 italic">Question will appear here...</span>
                    }
                  </div>

                  {/* Source exam badge */}
                  {qSourceExam && (
                    <div className="flex justify-end mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-700 text-white">
                        📌 {qSourceExam}
                      </span>
                    </div>
                  )}

                  {/* Math equation */}
                  {qEquation.trim() && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center overflow-x-auto">
                      <RenderMathText text={`$$${qEquation}$$`} />
                    </div>
                  )}

                  {/* Image */}
                  {qImagePreview && (
                    <div className="rounded-xl overflow-hidden border border-slate-100">
                      <img src={qImagePreview} alt="Question" className="w-full max-h-40 object-contain bg-slate-50" />
                    </div>
                  )}

                  {/* Options */}
                  <div className="space-y-2">
                    {qOptions.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const isCorrect = opt.trim() !== '' && opt === qCorrect;
                      return (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                          isCorrect ? 'bg-emerald-50 border-emerald-200' :
                          opt.trim() ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-dashed border-slate-200'
                        }`}>
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            isCorrect ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-200'
                          }`}>{letter}</span>
                          <span className={`font-medium ${opt.trim() ? (isCorrect ? 'text-emerald-800' : 'text-slate-700') : 'text-slate-300 italic text-xs'}`}>
                            {opt.trim() || `Option ${letter}...`}
                          </span>
                          {isCorrect && (
                            <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Solution */}
                  {qSolution && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Solution</p>
                      <p className="text-xs text-slate-600">{qSolution}</p>
                    </div>
                  )}

                  {/* Empty state */}
                  {!qText && !qImagePreview && !qEquation && qOptions.every(o => !o.trim()) && (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-xs font-bold text-slate-300">Start typing to see preview</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview hint */}
              <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest mt-3">This is how students will see the question</p>
            </div>
          </div>
        )}
      </div>{/* end flex row */}
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

