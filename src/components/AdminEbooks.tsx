import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { uploadFileViaBackend } from '../lib/upload';
import { invalidateCacheField } from '../lib/cache';
import {
  Plus, Trash2, Edit2, Save, X, Search, Filter,
  FileText, Image as ImgIcon, FileUp, Sparkles, Check,
  Pin, RefreshCw, Eye, ExternalLink, Download, BookOpen, Link2
} from 'lucide-react';

export interface EbookItem {
  id: string;
  title: string;
  subject: string;
  format: 'text' | 'image' | 'pdf' | 'mixed';
  content?: string;
  imageUrl?: string;
  imageCaption?: string;
  pdfUrl?: string;
  pdfTitle?: string;
  status: 'published' | 'draft';
  pinned?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const EBOOK_SUBJECT_OPTIONS = [
  'Mathematics',
  'General Knowledge / GS',
  'History',
  'Geography',
  'Science',
  'English Language',
  'Reasoning',
  'Computer Knowledge',
  'Polity & Governance',
  'Current Affairs',
  'General / Other'
];

export default function AdminEbooks() {
  const [items, setItems] = useState<EbookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [editingItem, setEditingItem] = useState<EbookItem | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(EBOOK_SUBJECT_OPTIONS[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [format, setFormat] = useState<'text' | 'image' | 'pdf' | 'mixed'>('pdf');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [pinned, setPinned] = useState(false);

  // Uploading state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterFormat, setFilterFormat] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: EbookItem[] = snap.docs.map(d => {
        const data = d.data();
        // Handle legacy fields (link, thumbnailUrl, sections, etc.)
        let legacyPdfUrl = data.pdfUrl || data.link || '';
        let legacyPdfTitle = data.pdfTitle || '';
        let legacyImageUrl = data.imageUrl || data.thumbnailUrl || '';

        // If legacy sections exist, extract URLs
        if (data.sections && Array.isArray(data.sections)) {
          const pdfSec = data.sections.find((s: any) => s.type === 'pdf' && s.pdfUrl);
          if (pdfSec && !legacyPdfUrl) {
            legacyPdfUrl = pdfSec.pdfUrl;
            legacyPdfTitle = pdfSec.pdfTitle || '';
          }
          const imgSec = data.sections.find((s: any) => s.type === 'image' && s.imageUrl);
          if (imgSec && !legacyImageUrl) {
            legacyImageUrl = imgSec.imageUrl;
          }
        }

        return {
          id: d.id,
          title: data.title || '',
          subject: data.subject || 'General',
          format: data.format || (legacyImageUrl ? 'image' : legacyPdfUrl ? 'pdf' : 'text'),
          content: data.content || data.description || '',
          imageUrl: legacyImageUrl,
          imageCaption: data.imageCaption || '',
          pdfUrl: legacyPdfUrl,
          pdfTitle: legacyPdfTitle || (legacyPdfUrl ? 'Ebook PDF' : ''),
          status: data.status || 'published',
          pinned: !!(data.pinned || data.pinToHomepage),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      setItems(list);
    } catch (err: any) {
      console.error("Failed to fetch Ebooks / Notes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setTitle('');
    setSubject(EBOOK_SUBJECT_OPTIONS[0]);
    setCustomSubject('');
    setFormat('pdf');
    setContent('');
    setImageUrl('');
    setImageCaption('');
    setPdfUrl('');
    setPdfTitle('');
    setStatus('published');
    setPinned(false);
    setViewMode('editor');
  };

  const handleOpenEdit = (item: EbookItem) => {
    setEditingItem(item);
    setTitle(item.title || '');
    if (EBOOK_SUBJECT_OPTIONS.includes(item.subject)) {
      setSubject(item.subject);
      setCustomSubject('');
    } else {
      setSubject('General / Other');
      setCustomSubject(item.subject || '');
    }
    setFormat(item.format || 'pdf');
    setContent(item.content || '');
    setImageUrl(item.imageUrl || '');
    setImageCaption(item.imageCaption || '');
    setPdfUrl(item.pdfUrl || '');
    setPdfTitle(item.pdfTitle || '');
    setStatus(item.status || 'published');
    setPinned(!!item.pinned);
    setViewMode('editor');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadFileViaBackend(file, 'study_note_images', auth.currentUser);
      setImageUrl(url);
    } catch (err: any) {
      alert(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const url = await uploadFileViaBackend(file, 'study_note_pdfs', auth.currentUser, file.name);
      setPdfUrl(url);
      if (!pdfTitle) setPdfTitle(file.name);
    } catch (err: any) {
      alert(`PDF upload failed: ${err.message}`);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter Ebook Title.');
      return;
    }

    const finalSubject = subject === 'General / Other' ? (customSubject.trim() || 'General') : subject;

    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        subject: finalSubject,
        format,
        content: content.trim(),
        description: content.trim(), // Legacy compatibility
        imageUrl: imageUrl.trim(),
        thumbnailUrl: imageUrl.trim(), // Legacy compatibility
        pdfUrl: pdfUrl.trim(),
        link: pdfUrl.trim() || imageUrl.trim(), // Legacy compatibility
        pdfTitle: pdfTitle.trim(),
        status,
        pinned,
        pinToHomepage: pinned, // Legacy compatibility
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        // UPDATE existing document
        const docRef = doc(db, 'notes', editingItem.id);
        await updateDoc(docRef, payload);
        console.log("Ebook updated successfully:", editingItem.id);
      } else {
        // CREATE new document
        payload.createdAt = serverTimestamp();
        payload.authorId = auth.currentUser?.uid || '';
        await addDoc(collection(db, 'notes'), payload);
        console.log("New Ebook added successfully.");
      }

      await invalidateCacheField('notes');
      await fetchNotes();
      setViewMode('list');
      alert(editingItem ? 'Ebook & Study Note updated successfully!' : 'Ebook & Study Note published successfully!');
    } catch (err: any) {
      console.error("Error saving Ebook:", err);
      alert(`Failed to save Ebook: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Ebook / Study Note?')) return;
    try {
      await deleteDoc(doc(db, 'notes', id));
      await invalidateCacheField('notes');
      setItems(items.filter(i => i.id !== id));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const copyShareLink = (url: string, id: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => alert(`Link: ${url}`));
  };

  // Filtered items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = filterSubject === 'ALL' || item.subject === filterSubject;
    const matchesFormat = filterFormat === 'ALL' || item.format === filterFormat;

    return matchesSearch && matchesSubject && matchesFormat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Ebook & Study Notes Management</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Post, edit, and update Ebooks & Study Notes in Text, Image, and PDF formats for students.
          </p>
        </div>

        {viewMode === 'list' ? (
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add New Ebook / Study Note
          </button>
        ) : (
          <button
            onClick={() => setViewMode('list')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Cancel & Return
          </button>
        )}
      </div>

      {/* Editor View (Create / Edit Form) */}
      {viewMode === 'editor' && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              {editingItem ? `Edit: ${editingItem.title}` : 'Add New Ebook / Study Note'}
            </h3>
            {editingItem && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-lg">
                Editing Existing Item
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ebook Title */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                Ebook / Study Note Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Complete General Science Formula & Rapid Revision Ebook 2026"
                className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-800 focus:border-emerald-600 outline-none transition-all"
              />
            </div>

            {/* Subject / Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                Subject / Category
              </label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-800 focus:border-emerald-600 outline-none transition-all"
              >
                {EBOOK_SUBJECT_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {subject === 'General / Other' && (
                <input
                  type="text"
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  placeholder="Enter custom subject name"
                  className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-800 focus:border-emerald-600 outline-none mt-2"
                />
              )}
            </div>

            {/* Content Format Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                Content Format
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFormat('text')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                    format === 'text' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Text
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('image')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                    format === 'image' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ImgIcon className="w-3.5 h-3.5" /> Image
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                    format === 'pdf' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('mixed')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                    format === 'mixed' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> All
                </button>
              </div>
            </div>

            {/* Text Format Input */}
            {(format === 'text' || format === 'mixed') && (
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                  Ebook Text Content / Chapter Notes
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Enter study notes, book summary, key formulas, or chapter text..."
                  className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-medium text-slate-800 focus:border-emerald-600 outline-none transition-all leading-relaxed"
                />
              </div>
            )}

            {/* Image Upload Input */}
            {(format === 'image' || format === 'mixed') && (
              <div className="md:col-span-2 space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ImgIcon className="w-4 h-4 text-emerald-600" /> Book Cover / Infographic Image
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200 cursor-pointer transition-all flex items-center gap-1.5">
                    {uploadingImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImgIcon className="w-4 h-4" />}
                    {uploadingImage ? 'Uploading Image...' : 'Upload Image File'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                  <span className="text-xs text-slate-400 font-bold">OR</span>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="Paste Cover Image URL directly"
                    className="flex-1 min-w-[200px] rounded-xl border-2 border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600"
                  />
                </div>

                <input
                  type="text"
                  value={imageCaption}
                  onChange={e => setImageCaption(e.target.value)}
                  placeholder="Image caption (optional)"
                  className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600"
                />

                {imageUrl && (
                  <div className="relative w-40 h-28 rounded-xl border border-slate-200 overflow-hidden mt-2 bg-white">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PDF Upload Input */}
            {(format === 'pdf' || format === 'mixed') && (
              <div className="md:col-span-2 space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileUp className="w-4 h-4 text-rose-600" /> Ebook PDF Document
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 cursor-pointer transition-all flex items-center gap-1.5">
                    {uploadingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                    {uploadingPdf ? 'Uploading PDF...' : 'Upload PDF File'}
                    <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} disabled={uploadingPdf} />
                  </label>
                  <span className="text-xs text-slate-400 font-bold">OR</span>
                  <input
                    type="text"
                    value={pdfUrl}
                    onChange={e => setPdfUrl(e.target.value)}
                    placeholder="Paste Ebook PDF URL directly"
                    className="flex-1 min-w-[200px] rounded-xl border-2 border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600"
                  />
                </div>

                <input
                  type="text"
                  value={pdfTitle}
                  onChange={e => setPdfTitle(e.target.value)}
                  placeholder="PDF Title / Download button label (e.g. Download Complete Ebook PDF)"
                  className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600"
                />

                {pdfUrl && (
                  <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                    <span className="truncate flex items-center gap-2">
                      <FileUp className="w-4 h-4" /> {pdfTitle || 'Ebook PDF Attached'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPdfUrl('')}
                      className="p-1 text-rose-600 hover:text-rose-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Status & Pinned */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                Publication Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-800 focus:border-emerald-600 outline-none transition-all"
              >
                <option value="published">🚀 Published (Visible to Students)</option>
                <option value="draft">📝 Draft (Hidden)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="pinned_ebook"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label htmlFor="pinned_ebook" className="text-xs font-extrabold text-slate-700 cursor-pointer flex items-center gap-1">
                <Pin className="w-3.5 h-3.5 text-emerald-600" /> Pin / Highlight to Top of Ebooks
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : editingItem ? 'Update Ebook' : 'Save & Publish Ebook'}
            </button>
          </div>
        </form>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Ebooks by title, subject or content..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
              />
            </div>

            {/* Filter Subject */}
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="bg-white rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">All Subjects</option>
              {EBOOK_SUBJECT_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Filter Format */}
            <select
              value={filterFormat}
              onChange={e => setFilterFormat(e.target.value)}
              className="bg-white rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">All Formats</option>
              <option value="text">Text Only</option>
              <option value="image">Image Format</option>
              <option value="pdf">PDF Ebook</option>
              <option value="mixed">Mixed Format</option>
            </select>
          </div>

          {/* Table / List */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs font-medium">Loading Ebooks & Study Notes...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs">
              No Ebooks uploaded yet. Click "Add New Ebook / Study Note" to post one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 relative ${
                    item.status === 'draft' ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase rounded-lg">
                        {item.subject}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {item.pinned && (
                          <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase rounded-md flex items-center gap-1">
                          {item.format === 'image' && <ImgIcon className="w-3 h-3 text-indigo-500" />}
                          {item.format === 'pdf' && <FileUp className="w-3 h-3 text-rose-500" />}
                          {item.format === 'text' && <FileText className="w-3 h-3 text-emerald-500" />}
                          {item.format === 'mixed' && <Sparkles className="w-3 h-3 text-violet-500" />}
                          {item.format}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-black text-slate-900 text-base leading-snug">{item.title}</h4>

                    {item.content && (
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {item.content}
                      </p>
                    )}

                    {item.imageUrl && (
                      <div className="relative h-28 rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {item.pdfUrl && (
                      <a
                        href={item.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between w-full px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-black text-xs transition-all"
                      >
                        <span className="truncate flex items-center gap-1.5">
                          <FileUp className="w-3.5 h-3.5 shrink-0" /> {item.pdfTitle || 'Download Ebook PDF'}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    )}

                    {/* Actions: SHARE, EDIT & DELETE */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => copyShareLink(item.pdfUrl || item.imageUrl || '', `ebook-${item.id}`)}
                        className={`p-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                          copiedId === `ebook-${item.id}` ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Copy share link"
                      >
                        {copiedId === `ebook-${item.id}` ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                        {copiedId === `ebook-${item.id}` ? 'Copied!' : 'Link'}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          title="Edit Ebook"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          title="Delete Ebook"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
