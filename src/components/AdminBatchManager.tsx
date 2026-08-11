import React, { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { uploadFileViaBackend } from '../lib/upload';
import {
  Video, FileText, Plus, Trash2, Edit2, Play, Download,
  CheckCircle, Lock, ExternalLink, Sparkles, BookOpen, Layers
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
  createdAt?: any;
}

interface BatchNote {
  id: string;
  batchId: string;
  title: string;
  subject?: string;
  pdfUrl: string;
  allowDownload: boolean;
  createdAt?: any;
}

const BATCHES = [
  { id: 'manzil_batch_1.0', name: 'Manzil Batch 1.0' }
];

export default function AdminBatchManager() {
  const { user } = useAuth();
  const [selectedBatchId, setSelectedBatchId] = useState('manzil_batch_1.0');
  const [activeTab, setActiveTab] = useState<'videos' | 'notes' | 'tests'>('videos');

  // Videos State
  const [videos, setVideos] = useState<BatchVideo[]>([]);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoSubject, setVideoSubject] = useState('Mathematics');
  const [videoChapter, setVideoChapter] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);

  // Notes State
  const [notes, setNotes] = useState<BatchNote[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubject, setNoteSubject] = useState('Mathematics');
  const [notePdfUrl, setNotePdfUrl] = useState('');
  const [notePdfFile, setNotePdfFile] = useState<File | null>(null);
  const [noteAllowDownload, setNoteAllowDownload] = useState(true);
  const [savingNote, setSavingNote] = useState(false);

  // Loading
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBatchContent();
  }, [selectedBatchId]);

  const fetchBatchContent = async () => {
    setLoading(true);
    try {
      // Fetch Videos
      const qv = query(collection(db, 'batch_videos'), where('batchId', '==', selectedBatchId));
      const snapV = await getDocs(qv);
      const listV = snapV.docs.map(d => ({ id: d.id, ...d.data() } as BatchVideo));
      setVideos(listV);

      // Fetch Notes
      const qn = query(collection(db, 'batch_notes'), where('batchId', '==', selectedBatchId));
      const snapN = await getDocs(qn);
      const listN = snapN.docs.map(d => ({ id: d.id, ...d.data() } as BatchNote));
      setNotes(listN);
    } catch (err) {
      console.error('Fetch batch content error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract YouTube Video ID
  const extractYoutubeId = (url: string): string => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url.trim();
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim() || !videoUrl.trim()) {
      alert('Please enter video title and YouTube URL.');
      return;
    }

    const ytId = extractYoutubeId(videoUrl);
    if (!ytId) {
      alert('Invalid YouTube URL or Video ID.');
      return;
    }

    setSavingVideo(true);
    try {
      const data = {
        batchId: selectedBatchId,
        title: videoTitle.trim(),
        subject: videoSubject.trim(),
        chapter: videoChapter.trim(),
        youtubeUrl: videoUrl.trim(),
        youtubeId: ytId,
        description: videoDesc.trim(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'batch_videos'), data);
      setVideos(prev => [{ id: docRef.id, ...data }, ...prev]);
      alert('Class video added successfully to ' + selectedBatchId + '!');
      setShowVideoModal(false);
      setVideoTitle('');
      setVideoChapter('');
      setVideoUrl('');
      setVideoDesc('');
    } catch (err: any) {
      console.error('Save video error:', err);
      alert('Failed to add video: ' + (err.message || err));
    } finally {
      setSavingVideo(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class video?')) return;
    try {
      await deleteDoc(doc(db, 'batch_videos', id));
      setVideos(prev => prev.filter(v => v.id !== id));
      alert('Video deleted.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete video.');
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      alert('Please enter note title.');
      return;
    }

    setSavingNote(true);
    try {
      let finalPdfUrl = notePdfUrl.trim();
      if (notePdfFile) {
        finalPdfUrl = await uploadFileViaBackend(notePdfFile, 'batch_notes', user);
      }

      if (!finalPdfUrl) {
        alert('Please select a PDF file or enter a valid PDF URL.');
        setSavingNote(false);
        return;
      }

      const data = {
        batchId: selectedBatchId,
        title: noteTitle.trim(),
        subject: noteSubject.trim(),
        pdfUrl: finalPdfUrl,
        allowDownload: noteAllowDownload,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'batch_notes'), data);
      setNotes(prev => [{ id: docRef.id, ...data }, ...prev]);
      alert('Class Note PDF added successfully!');
      setShowNoteModal(false);
      setNoteTitle('');
      setNotePdfUrl('');
      setNotePdfFile(null);
    } catch (err: any) {
      console.error('Save note error:', err);
      alert('Failed to add note: ' + (err.message || err));
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class note?')) return;
    try {
      await deleteDoc(doc(db, 'batch_notes', id));
      setNotes(prev => prev.filter(n => n.id !== id));
      alert('Note deleted.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete note.');
    }
  };

  const toggleNoteDownload = async (note: BatchNote) => {
    try {
      const nextVal = !note.allowDownload;
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, allowDownload: nextVal } : n));
      await updateDoc(doc(db, 'batch_notes', note.id), { allowDownload: nextVal });
    } catch (err) {
      console.error('Toggle download permission error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full font-black text-xs uppercase tracking-wider">
                👑 Exclusive Paid Batch Portal
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Manzil Batch 1.0 Content Manager</h2>
            <p className="text-emerald-200 text-sm mt-1 max-w-xl">
              Publish recorded YouTube class videos, upload PDF lecture notes, and manage batch student access.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
              className="bg-white/10 text-white font-black text-sm px-4 py-2.5 rounded-xl border border-white/20 outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              {BATCHES.map(b => (
                <option key={b.id} value={b.id} className="text-slate-900">{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sub Tabs: Videos vs Notes */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'videos' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Video className="w-4 h-4" />
          📹 Recorded Videos ({videos.length})
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'notes' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          📄 Class Notes & PDFs ({notes.length})
        </button>
      </div>

      {/* 📹 VIDEOS TAB CONTENT */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-lg">Class Video Lectures</h3>
            <button
              onClick={() => setShowVideoModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Class Video
            </button>
          </div>

          {loading ? (
            <p className="text-slate-400 font-bold text-sm">Loading batch videos...</p>
          ) : videos.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
              <div className="text-5xl mb-3">📹</div>
              <h4 className="font-black text-slate-800 text-base uppercase tracking-wider mb-1">No Videos Added Yet</h4>
              <p className="text-slate-400 text-xs font-medium">Click "Add Class Video" above to publish your recorded YouTube classes for Manzil Batch 1.0 students.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {videos.map(v => (
                <div key={v.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-xl transition-all">
                  {/* YouTube Thumbnail Preview */}
                  <div className="aspect-video bg-slate-900 relative overflow-hidden group">
                    <img
                      src={`https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
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

                      <h4 className="font-extrabold text-slate-900 text-base leading-snug mb-2">{v.title}</h4>
                      {v.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">{v.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                      <a
                        href={v.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Test Link
                      </a>

                      <button
                        onClick={() => handleDeleteVideo(v.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 📄 NOTES TAB CONTENT */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-lg">Class Lecture Notes & PDFs</h3>
            <button
              onClick={() => setShowNoteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Class Note PDF
            </button>
          </div>

          {loading ? (
            <p className="text-slate-400 font-bold text-sm">Loading batch class notes...</p>
          ) : notes.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
              <div className="text-5xl mb-3">📄</div>
              <h4 className="font-black text-slate-800 text-base uppercase tracking-wider mb-1">No Class Notes Uploaded Yet</h4>
              <p className="text-slate-400 text-xs font-medium">Click "Add Class Note PDF" above to upload PDF notes for Manzil Batch 1.0 students.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {notes.map(n => (
                <div key={n.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-wider rounded-md border border-emerald-100">
                        {n.subject || 'Class Note'}
                      </span>

                      <button
                        onClick={() => toggleNoteDownload(n)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer border ${
                          n.allowDownload ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                        title="Click to toggle PDF Download permission for students"
                      >
                        {n.allowDownload ? '📄 Download: Allowed' : '🔒 Read-Only (No Download)'}
                      </button>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-base leading-snug mb-2">{n.title}</h4>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-4">
                    <a
                      href={n.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> View PDF
                    </a>

                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete class note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 📹 ADD VIDEO MODAL */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-black text-slate-900 text-lg">Add Recorded Class Video</h3>

            <form onSubmit={handleSaveVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Video Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Percentage Concept & Shortcut Tricks (Class 01)"
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics"
                    value={videoSubject}
                    onChange={e => setVideoSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Chapter / Topic</label>
                  <input
                    type="text"
                    placeholder="e.g. Chapter 01"
                    value={videoChapter}
                    onChange={e => setVideoChapter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">YouTube Video Link / ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://youtu.be/xyz123 or dQw4w9WgXcQ"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Unlisted YouTube video links are fully supported for private batch access.</p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Short summary or homework instructions for students..."
                  value={videoDesc}
                  onChange={e => setVideoDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVideo}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingVideo ? 'Publishing...' : 'Publish Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📄 ADD NOTE MODAL */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-black text-slate-900 text-lg">Add Class Lecture Note PDF</h3>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Note Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Percentage Class 01 Formulas & Practice Sheet"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={noteSubject}
                  onChange={e => setNoteSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Upload PDF File</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => setNotePdfFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">OR Enter Direct PDF URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={notePdfUrl}
                  onChange={e => setNotePdfUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="noteAllowDownload"
                  checked={noteAllowDownload}
                  onChange={e => setNoteAllowDownload(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="noteAllowDownload" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Allow students to download PDF locally
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingNote ? 'Uploading...' : 'Save Class Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
