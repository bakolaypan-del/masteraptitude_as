import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { uploadFileViaBackend } from '../lib/upload';
import { invalidateCacheField } from '../lib/cache';
import {
  Plus, Trash2, Edit2, Save, X, Search, Filter,
  FileText, Image as ImgIcon, FileUp, Sparkles, Check,
  Pin, RefreshCw, Eye, ExternalLink, Download, BookOpen, Layers, Trophy
} from 'lucide-react';

export interface ExamPatternItem {
  id: string;
  title: string;
  examCategory: string;
  format: 'text' | 'image' | 'pdf' | 'mixed';
  content?: string;
  imageUrl?: string;
  imageCaption?: string;
  pdfUrl?: string;
  pdfTitle?: string;
  files?: Array<{ name: string; url: string; type?: string }>;
  status: 'published' | 'draft';
  pinned?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const EXAM_CATEGORY_OPTIONS = [
  'SSC (CGL, CHSL, CPO, MTS)',
  'Railway (RRB NTPC, Group D, ALP)',
  'Banking (IBPS, SBI, RBI)',
  'Defence (NDA, CDS, AFCAT)',
  'Police & State Exams',
  'Teaching (CTET, State TET)',
  'UPSC / Civil Services',
  'Engineering / GATE',
  'General / Other'
];

export default function AdminExamPatterns() {
  const [items, setItems] = useState<ExamPatternItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [editingItem, setEditingItem] = useState<ExamPatternItem | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [examCategory, setExamCategory] = useState(EXAM_CATEGORY_OPTIONS[0]);
  const [customCategory, setCustomCategory] = useState('');
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
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterFormat, setFilterFormat] = useState('ALL');

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'patterns'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: ExamPatternItem[] = snap.docs.map(d => {
        const data = d.data();
        // Handle legacy files format if present
        let legacyPdfUrl = data.pdfUrl || '';
        let legacyPdfTitle = data.pdfTitle || '';
        let legacyImageUrl = data.imageUrl || '';

        if (!legacyPdfUrl && data.files && data.files.length > 0) {
          const pdfFile = data.files.find((f: any) => f.type?.includes('pdf') || f.name?.endsWith('.pdf') || f.url?.includes('.pdf'));
          if (pdfFile) {
            legacyPdfUrl = pdfFile.url;
            legacyPdfTitle = pdfFile.name;
          }
          const imgFile = data.files.find((f: any) => f.type?.includes('image') || f.name?.match(/\.(jpg|png|jpeg|webp)$/i));
          if (imgFile && !legacyImageUrl) {
            legacyImageUrl = imgFile.url;
          }
        }

        return {
          id: d.id,
          title: data.title || '',
          examCategory: data.examCategory || 'General',
          format: data.format || (legacyImageUrl ? 'image' : legacyPdfUrl ? 'pdf' : 'text'),
          content: data.content || '',
          imageUrl: legacyImageUrl,
          imageCaption: data.imageCaption || '',
          pdfUrl: legacyPdfUrl,
          pdfTitle: legacyPdfTitle,
          files: data.files || [],
          status: data.status || 'published',
          pinned: !!data.pinned,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      setItems(list);
    } catch (err: any) {
      console.error("Failed to fetch exam patterns:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setTitle('');
    setExamCategory(EXAM_CATEGORY_OPTIONS[0]);
    setCustomCategory('');
    setFormat('text');
    setContent('');
    setImageUrl('');
    setImageCaption('');
    setPdfUrl('');
    setPdfTitle('');
    setStatus('published');
    setPinned(false);
    setViewMode('editor');
  };

  const handleOpenEdit = (item: ExamPatternItem) => {
    setEditingItem(item);
    setTitle(item.title || '');
    if (EXAM_CATEGORY_OPTIONS.includes(item.examCategory)) {
      setExamCategory(item.examCategory);
      setCustomCategory('');
    } else {
      setExamCategory('General / Other');
      setCustomCategory(item.examCategory || '');
    }
    setFormat(item.format || 'text');
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
      const url = await uploadFileViaBackend(file, 'patterns_images', auth.currentUser);
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
      const url = await uploadFileViaBackend(file, 'patterns_pdfs', auth.currentUser, file.name);
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
      alert('Please enter Exam / Pattern Title.');
      return;
    }

    const finalCategory = examCategory === 'General / Other' ? (customCategory.trim() || 'General') : examCategory;

    setSaving(true);
    try {
      // Build updated files array for backwards compatibility
      const files: Array<{ name: string; url: string; type?: string }> = [];
      if (pdfUrl) {
        files.push({ name: pdfTitle || 'Syllabus PDF', url: pdfUrl, type: 'application/pdf' });
      }
      if (imageUrl) {
        files.push({ name: imageCaption || 'Pattern Diagram Image', url: imageUrl, type: 'image/png' });
      }

      const payload: any = {
        title: title.trim(),
        examCategory: finalCategory,
        format,
        content: content.trim(),
        imageUrl: imageUrl.trim(),
        imageCaption: imageCaption.trim(),
        pdfUrl: pdfUrl.trim(),
        pdfTitle: pdfTitle.trim(),
        files,
        status,
        pinned,
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        // UPDATE existing document
        const docRef = doc(db, 'patterns', editingItem.id);
        await updateDoc(docRef, payload);
        console.log("Exam pattern updated successfully:", editingItem.id);
      } else {
        // CREATE new document
        payload.createdAt = serverTimestamp();
        payload.authorId = auth.currentUser?.uid || '';
        await addDoc(collection(db, 'patterns'), payload);
        console.log("New exam pattern added successfully.");
      }

      await invalidateCacheField('patterns');
      await fetchPatterns();
      setViewMode('list');
      alert(editingItem ? 'Exam Pattern & Syllabus updated successfully!' : 'Exam Pattern & Syllabus published successfully!');
    } catch (err: any) {
      console.error("Error saving exam pattern:", err);
      alert(`Failed to save Exam Pattern: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Exam Pattern & Syllabus?')) return;
    try {
      await deleteDoc(doc(db, 'patterns', id));
      await invalidateCacheField('patterns');
      setItems(items.filter(i => i.id !== id));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // Filtered items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.examCategory || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'ALL' || item.examCategory === filterCategory;
    const matchesFormat = filterFormat === 'ALL' || item.format === filterFormat;

    return matchesSearch && matchesCategory && matchesFormat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Trophy className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Exam Pattern & Syllabus Management</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Create, edit, and manage exam patterns and syllabus in Text, Image, and PDF formats for students.
          </p>
        </div>

        {viewMode === 'list' ? (
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add New Exam Pattern & Syllabus
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
              <Sparkles className="w-5 h-5 text-blue-600" />
              {editingItem ? `Edit: ${editingItem.title}` : 'Add New Exam Pattern & Syllabus'}
            </h3>
            {editingItem && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-lg">
                Editing Existing Item
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Exam Name / Title */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                Exam Title & Year <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. SSC CGL 2026 Tier 1 & Tier 2 Exam Pattern & Detailed Syllabus"
                className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-800 focus:border-blue-600 outline-none transition-all"
              />
            </div>

            {/* Exam Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                Exam Category / Board
              </label>
              <select
                value={examCategory}
                onChange={e => setExamCategory(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-800 focus:border-blue-600 outline-none transition-all"
              >
                {EXAM_CATEGORY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {examCategory === 'General / Other' && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category name"
                  className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-800 focus:border-blue-600 outline-none mt-2"
                />
              )}
            </div>

            {/* Content Format Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                Syllabus Content Format
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFormat('text')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                    format === 'text' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Text
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('image')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                    format === 'image' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ImgIcon className="w-3.5 h-3.5" /> Image
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                    format === 'pdf' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('mixed')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                    format === 'mixed' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
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
                  Detailed Exam Pattern & Syllabus Text / Notes
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Enter detailed Exam Pattern, Marking Scheme, Section Breakdown, and Topic Syllabus..."
                  className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-medium text-slate-800 focus:border-blue-600 outline-none transition-all leading-relaxed"
                />
              </div>
            )}

            {/* Image Upload Input */}
            {(format === 'image' || format === 'mixed') && (
              <div className="md:col-span-2 space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ImgIcon className="w-4 h-4 text-blue-600" /> Pattern Infographic / Diagram Image
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl border border-blue-200 cursor-pointer transition-all flex items-center gap-1.5">
                    {uploadingImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImgIcon className="w-4 h-4" />}
                    {uploadingImage ? 'Uploading Image...' : 'Upload Image File'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                  <span className="text-xs text-slate-400 font-bold">OR</span>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="Paste Image URL directly"
                    className="flex-1 min-w-[200px] rounded-xl border-2 border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                  />
                </div>

                <input
                  type="text"
                  value={imageCaption}
                  onChange={e => setImageCaption(e.target.value)}
                  placeholder="Image diagram caption (optional)"
                  className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
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
                  <FileUp className="w-4 h-4 text-rose-600" /> Syllabus PDF Document
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
                    placeholder="Paste Syllabus PDF URL directly"
                    className="flex-1 min-w-[200px] rounded-xl border-2 border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                  />
                </div>

                <input
                  type="text"
                  value={pdfTitle}
                  onChange={e => setPdfTitle(e.target.value)}
                  placeholder="PDF Title / Download button label (e.g. Download Official Notification PDF)"
                  className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                />

                {pdfUrl && (
                  <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                    <span className="truncate flex items-center gap-2">
                      <FileUp className="w-4 h-4" /> {pdfTitle || 'PDF Document Attached'}
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
                className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-800 focus:border-blue-600 outline-none transition-all"
              >
                <option value="published">🚀 Published (Visible to Students)</option>
                <option value="draft">📝 Draft (Hidden)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="pinned_pattern"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="pinned_pattern" className="text-xs font-extrabold text-slate-700 cursor-pointer flex items-center gap-1">
                <Pin className="w-3.5 h-3.5 text-blue-600" /> Pin / Highlight to Top of Exam Patterns
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
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : editingItem ? 'Update Exam Pattern' : 'Save & Publish Exam Pattern'}
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
                placeholder="Search patterns by exam name, syllabus or details..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-600 outline-none"
              />
            </div>

            {/* Filter Category */}
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-white rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">All Exam Categories</option>
              {EXAM_CATEGORY_OPTIONS.map(c => (
                <option key={c} value={c}>{c}</option>
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
              <option value="image">Image Diagram</option>
              <option value="pdf">PDF Syllabus</option>
              <option value="mixed">Mixed Format</option>
            </select>
          </div>

          {/* Table / List */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Loading Exam Patterns...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs">
              No Exam Pattern uploaded yet. Click "Add New Exam Pattern & Syllabus" to post one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 relative ${
                    item.status === 'draft' ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black uppercase rounded-lg">
                        {item.examCategory}
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
                          <FileUp className="w-3.5 h-3.5 shrink-0" /> {item.pdfTitle || 'Download Syllabus PDF'}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    )}

                    {/* Actions: EDIT & DELETE */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        title="Edit Exam Pattern"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        title="Delete Exam Pattern"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
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
