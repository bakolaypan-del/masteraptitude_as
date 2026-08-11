import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import {
  Video, FileText, Play, Download, Lock, CheckCircle, ArrowLeft,
  BookOpen, Sparkles, X, ChevronRight, Layers, ShieldAlert, PhoneCall
} from 'lucide-react';

interface BatchVideo {
  id: string;
  batchId: string;
  title: string;
  subject?: string;
  chapter?: string;
  youtubeUrl: string;
  youtubeId: string;
  description?: string;
}

interface BatchNote {
  id: string;
  batchId: string;
  title: string;
  subject?: string;
  pdfUrl: string;
  allowDownload: boolean;
}

export default function ManzilBatchPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { batchId = 'manzil_batch_1.0' } = useParams();

  const [activeTab, setActiveTab] = useState<'videos' | 'notes' | 'tests'>('videos');
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Content
  const [videos, setVideos] = useState<BatchVideo[]>([]);
  const [notes, setNotes] = useState<BatchNote[]>([]);
  const [tests, setTests] = useState<any[]>([]);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  // Video Modal Player
  const [activeVideo, setActiveVideo] = useState<BatchVideo | null>(null);

  // PDF Reader Modal
  const [activePdfNote, setActivePdfNote] = useState<BatchNote | null>(null);

  useEffect(() => {
    checkEnrollmentAndFetchContent();
  }, [user, batchId]);

  const checkEnrollmentAndFetchContent = async () => {
    if (!user) {
      setIsEnrolled(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Check Student Profile for Enrollment across both 'profiles' and 'users' collections
      const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      
      const pData = profileSnap.exists() ? profileSnap.data() : {};
      const uData = userSnap.exists() ? userSnap.data() : {};
      const combined = { ...uData, ...pData };

      let enrolled = false;
      const bStr = String(combined.batch || '').toLowerCase();
      const bList = Array.isArray(combined.enrolledBatches) ? combined.enrolledBatches : [];

      if (combined.role === 'admin' || user.email?.toLowerCase() === 'bakolaypan@gmail.com') {
        enrolled = true;
      } else if (bList.includes(batchId) || combined.manzilBatchEnrolled === true) {
        enrolled = true;
      } else if (bStr.includes('manzil') || bStr.includes('paid')) {
        enrolled = true;
      }

      setIsEnrolled(enrolled);

      if (enrolled) {
        // Fetch Batch Videos
        const qv = query(collection(db, 'batch_videos'), where('batchId', '==', batchId));
        const snapV = await getDocs(qv);
        setVideos(snapV.docs.map(d => ({ id: d.id, ...d.data() } as BatchVideo)));

        // Fetch Batch Notes
        const qn = query(collection(db, 'batch_notes'), where('batchId', '==', batchId));
        const snapN = await getDocs(qn);
        setNotes(snapN.docs.map(d => ({ id: d.id, ...d.data() } as BatchNote)));

        // Fetch Batch Practice Tests
        const qt = query(collection(db, 'tests'), where('category', '==', 'Manzil Batch 1.0'));
        const snapT = await getDocs(qt);
        setTests(snapT.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (err) {
      console.error('Error loading batch portal:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists
  const subjects = Array.from(new Set([...videos.map(v => v.subject).filter(Boolean), ...notes.map(n => n.subject).filter(Boolean)]));
  const filteredVideos = selectedSubject === 'ALL' ? videos : videos.filter(v => v.subject === selectedSubject);
  const filteredNotes = selectedSubject === 'ALL' ? notes : notes.filter(n => n.subject === selectedSubject);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-extrabold text-slate-700 text-sm">Verifying Batch Membership...</p>
        </div>
      </div>
    );
  }

  // LOCKED ACCESS SCREEN FOR UNENROLLED STUDENTS
  if (!isEnrolled) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 md:p-6">
        <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black uppercase tracking-wider">
              🔒 Premium Paid Batch
            </span>
            <h2 className="font-black text-slate-900 text-2xl md:text-3xl tracking-tight">Manzil Batch 1.0</h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              This batch portal contains exclusive recorded class lectures, lecture PDF notes, and chapter-wise practice tests.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-2 text-indigo-700">
              <CheckCircle className="w-4 h-4" /> Comprehensive Chapter-wise Video Classes
            </div>
            <div className="flex items-center gap-2 text-indigo-700">
              <CheckCircle className="w-4 h-4" /> Downloadable Lecture PDF Notes
            </div>
            <div className="flex items-center gap-2 text-indigo-700">
              <CheckCircle className="w-4 h-4" /> Exclusive Batch Practice Mock Tests
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <a
              href="https://wa.me/919434863385?text=Hello%20Suman%20Sir,%20I%20want%20to%20enroll%20in%20Manzil%20Batch%201.0"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4" /> Contact Suman Sir to Unlock Access
            </a>

            <button
              onClick={() => navigate('/dashboard')}
              className="text-xs font-black text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← Back to Main Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // UNLOCKED BATCH PORTAL
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase tracking-wider rounded-md">
                  ✔ Enrolled Student Portal
                </span>
              </div>
              <h1 className="font-extrabold text-slate-900 text-lg md:text-xl leading-tight">Manzil Batch 1.0</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-extrabold">
              👑 Master Class Batch
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-6 space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                🧮 Official Recorded Classes & Study Material
              </span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">Manzil Batch 1.0</h2>
            <p className="text-emerald-200 text-sm font-medium">
              Access your recorded video lectures, lecture notes PDF, and chapter-wise practice tests curated by Suman Sir.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              activeTab === 'videos' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Video className="w-4 h-4" />
            📹 Class Videos ({videos.length})
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              activeTab === 'notes' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            📄 Class Notes ({notes.length})
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              activeTab === 'tests' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            🧪 Practice Sets ({tests.length})
          </button>
        </div>

        {/* Subject Filter Pills */}
        {subjects.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-1">Filter Subject:</span>
            <button
              onClick={() => setSelectedSubject('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                selectedSubject === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Subjects
            </button>
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSubject(s!)}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                  selectedSubject === s ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* 📹 CLASS VIDEOS TAB */}
        {activeTab === 'videos' && (
          <div>
            {filteredVideos.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs max-w-lg mx-auto">
                <div className="text-5xl mb-3">📹</div>
                <h3 className="font-black text-slate-800 text-base uppercase tracking-wider mb-1">No Videos Found</h3>
                <p className="text-slate-400 text-xs font-medium">New recorded video lectures for Manzil Batch 1.0 will be uploaded shortly.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map(v => (
                  <div
                    key={v.id}
                    onClick={() => setActiveVideo(v)}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    <div className="aspect-video bg-slate-900 relative overflow-hidden">
                      <img
                        src={`https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`}
                        alt={v.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                          <Play className="w-7 h-7 fill-current ml-1" />
                        </div>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {v.subject && (
                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-black text-[10px] uppercase tracking-wider rounded-md border border-blue-100">
                              {v.subject}
                            </span>
                          )}
                          {v.chapter && (
                            <span className="text-xs font-bold text-slate-400 truncate">
                              {v.chapter}
                            </span>
                          )}
                        </div>

                        <h3 className="font-extrabold text-slate-900 text-base leading-snug mb-2 group-hover:text-emerald-700 transition-colors">
                          {v.title}
                        </h3>
                        {v.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">{v.description}</p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                        <span>Watch In-App Class</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 📄 CLASS NOTES TAB */}
        {activeTab === 'notes' && (
          <div>
            {filteredNotes.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs max-w-lg mx-auto">
                <div className="text-5xl mb-3">📄</div>
                <h3 className="font-black text-slate-800 text-base uppercase tracking-wider mb-1">No Class Notes Found</h3>
                <p className="text-slate-400 text-xs font-medium">Lecture notes for Manzil Batch 1.0 will be uploaded shortly.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNotes.map(n => (
                  <div key={n.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-wider rounded-md border border-emerald-100">
                          {n.subject || 'Class Note'}
                        </span>
                        {n.allowDownload ? (
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                            Downloadable
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                            Read-Only
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base leading-snug mb-3">{n.title}</h3>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-2">
                      <button
                        onClick={() => setActivePdfNote(n)}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5" /> Read Note
                      </button>

                      {n.allowDownload && (
                        <a
                          href={n.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all flex items-center justify-center cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 🧪 PRACTICE SETS TAB */}
        {activeTab === 'tests' && (
          <div>
            {tests.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs max-w-lg mx-auto">
                <div className="text-5xl mb-3">🧪</div>
                <h3 className="font-black text-slate-800 text-base uppercase tracking-wider mb-1">No Practice Tests Found</h3>
                <p className="text-slate-400 text-xs font-medium">Batch practice tests for Manzil Batch 1.0 will be added shortly.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map(t => (
                  <div key={t.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-wider rounded-md border border-indigo-100">
                          Manzil Practice Test
                        </span>
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base leading-snug mb-2">{t.title}</h3>

                      <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mb-4">
                        <span>⏱️ {t.duration || 60} Mins</span>
                        <span>❓ {t.questions?.length || 50} Qs</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/test/${t.id}`)}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    >
                      Start Practice Test <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 📹 CUSTOM IN-APP YOUTUBE VIDEO PLAYER MODAL */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Manzil Batch 1.0 Recorded Class</span>
                <h3 className="font-black text-base md:text-lg truncate max-w-xl">{activeVideo.title}</h3>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&modestbranding=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {activeVideo.description && (
              <div className="p-4 md:p-6 bg-slate-900 border-t border-slate-800 text-slate-300 text-xs font-medium leading-relaxed overflow-y-auto">
                <p className="font-extrabold text-white mb-1 uppercase tracking-wider text-[10px] text-slate-400">Class Description & Notes:</p>
                {activeVideo.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📄 IN-APP PDF READER MODAL */}
      {activePdfNote && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Manzil Batch 1.0 Lecture Note</span>
                <h3 className="font-black text-base truncate max-w-xl">{activePdfNote.title}</h3>
              </div>
              <button
                onClick={() => setActivePdfNote(null)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 bg-slate-100 relative">
              <iframe
                src={activePdfNote.pdfUrl}
                title={activePdfNote.title}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
