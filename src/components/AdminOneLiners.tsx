import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { uploadFileViaBackend } from '../lib/upload';
import RichTextEditor, { RenderQuestionHTML } from './RichTextEditor';
import {
  Plus, Trash2, Edit2, Save, X, Search, Filter,
  FileText, Image as ImgIcon, FileUp, Sparkles, Check,
  Pin, RefreshCw, Eye, ExternalLink, Download, Bookmark, Share2, Copy, Link2
} from 'lucide-react';

export interface OneLinerItem {
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
  readCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

const SUBJECT_OPTIONS = [
  'General Knowledge',
  'History',
  'Geography',
  'Science',
  'English',
  'Mathematics',
  'Reasoning',
  'Computer',
  'Polity',
  'Current Affairs',
  'Other'
];

async function apiToken() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await apiToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server error ${res.status}`);
  }
  return res.json();
}

export default function AdminOneLiners() {
  const [items, setItems] = useState<OneLinerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [editingItem, setEditingItem] = useState<OneLinerItem | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECT_OPTIONS[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [format, setFormat] = useState<'text' | 'image' | 'pdf' | 'mixed'>('text');
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

  const handleCopyShareLink = (item: OneLinerItem) => {
    const url = `${window.location.origin}/dashboard?tab=one_liner&id=${item.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2500);
      }).catch(() => {
        prompt('Copy One-Liner Share Link:', url);
      });
    } else {
      prompt('Copy One-Liner Share Link:', url);
    }
  };

  useEffect(() => {
    fetchOneLiners();
  }, []);

  const fetchOneLiners = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/one-liners');
      setItems(data.posts || []);
    } catch (err: any) {
      console.error("Failed to fetch one-liners:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setTitle('');
    setSubject(SUBJECT_OPTIONS[0]);
    setCustomSubject('');
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

  const handleOpenEdit = (item: OneLinerItem) => {
    setEditingItem(item);
    setTitle(item.title || '');
    if (SUBJECT_OPTIONS.includes(item.subject)) {
      setSubject(item.subject);
      setCustomSubject('');
    } else {
      setSubject('Other');
      setCustomSubject(item.subject || '');
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
      const url = await uploadFileViaBackend(file, 'one_liners_images', auth.currentUser);
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
      const url = await uploadFileViaBackend(file, 'one_liners_pdfs', auth.currentUser, file.name);
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
      alert('Please enter a title for the One Liner.');
      return;
    }

    const finalSubject = subject === 'Other' ? (customSubject.trim() || 'General') : subject;

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        subject: finalSubject,
        format,
        content: content.trim(),
        imageUrl: imageUrl.trim(),
        imageCaption: imageCaption.trim(),
        pdfUrl: pdfUrl.trim(),
        pdfTitle: pdfTitle.trim(),
        status,
        pinned
      };

      if (editingItem) {
        await apiFetch(`/api/admin/one-liners/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/api/admin/one-liners', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      await fetchOneLiners();
      setViewMode('list');
    } catch (err: any) {
      alert(`Failed to save One Liner: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this One Liner?')) return;
    try {
      await apiFetch(`/api/admin/one-liners/${id}`, { method: 'DELETE' });
      setItems(items.filter(i => i.id !== id));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // Filtered list
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            <span className="p-2 bg-violet-50 text-violet-600 rounded-xl">
              <Bookmark className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">One Liner Management</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Post and manage One Liners in Text, Image, and PDF formats for students.
          </p>
        </div>

        {viewMode === 'list' ? (
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Post New One Liner
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

      {/* Editor View */}
      {viewMode === 'editor' && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-in fade-in duration-200">
          <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            {editingItem ? 'Edit One Liner' : 'Create New One Liner'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                Title / Headline <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Battle of Plassey 1757 - Key Takeaways"
                className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-800 focus:border-indigo-600 outline-none transition-all"
              />
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                Subject / Category
              </label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-800 focus:border-indigo-600 outline-none transition-all"
              >
                {SUBJECT_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {subject === 'Other' && (
                <input
                  type="text"
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  placeholder="Enter custom subject"
                  className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-800 focus:border-indigo-600 outline-none mt-2"
                />
              )}
            </div>

            {/* Format Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                Content Format
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFormat('text')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                    format === 'text' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Text
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('image')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                    format === 'image' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ImgIcon className="w-3.5 h-3.5" /> Image
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                    format === 'pdf' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('mixed')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
                    format === 'mixed' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> All
                </button>
              </div>
            </div>

            {/* Text Format Input with Rich Formatting Tools */}
            {(format === 'text' || format === 'mixed') && (
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                  Text Content / Formatted Notes (Bengali & English, Styles, Colors, Icons, Alignment)
                </label>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Type or copy-paste One Liner text content, Bengali/English formatted notes..."
                  minHeight={160}
                />
              </div>
            )}

            {/* Image Upload Input */}
            {(format === 'image' || format === 'mixed') && (
              <div className="md:col-span-2 space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ImgIcon className="w-4 h-4 text-indigo-600" /> Image Format / Attachment
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-xl border border-indigo-200 cursor-pointer transition-all flex items-center gap-1.5">
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
                    className="flex-1 min-w-[200px] rounded-xl border-2 border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600"
                  />
                </div>

                <input
                  type="text"
                  value={imageCaption}
                  onChange={e => setImageCaption(e.target.value)}
                  placeholder="Image caption / notes (optional)"
                  className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600"
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
                  <FileUp className="w-4 h-4 text-rose-600" /> PDF Document Attachment
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
                    placeholder="Paste PDF Document URL directly"
                    className="flex-1 min-w-[200px] rounded-xl border-2 border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600"
                  />
                </div>

                <input
                  type="text"
                  value={pdfTitle}
                  onChange={e => setPdfTitle(e.target.value)}
                  placeholder="PDF Title / Button label (e.g. Download Complete One Liner PDF)"
                  className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600"
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
                className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-800 focus:border-indigo-600 outline-none transition-all"
              >
                <option value="published">🚀 Published (Visible to Students)</option>
                <option value="draft">📝 Draft (Hidden)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="pinned"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="pinned" className="text-xs font-extrabold text-slate-700 cursor-pointer flex items-center gap-1">
                <Pin className="w-3.5 h-3.5 text-indigo-600" /> Pin / Highlight to Top of Student One Liners
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
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : editingItem ? 'Update One Liner' : 'Save & Publish One Liner'}
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
                placeholder="Search One Liners by title or content..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 outline-none"
              />
            </div>

            {/* Filter Subject */}
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="bg-white rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">All Subjects</option>
              {SUBJECT_OPTIONS.map(s => (
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
              <option value="pdf">PDF Format</option>
              <option value="mixed">Mixed Format</option>
            </select>
          </div>

          {/* Table / List */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-medium">Loading One Liners...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs">
              No One Liners found. Click "Post New One Liner" to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    item.status === 'draft' ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.pinned && (
                        <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-black uppercase rounded-md">
                        {item.subject}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase rounded-md flex items-center gap-1">
                        {item.format === 'image' && <ImgIcon className="w-3 h-3 text-indigo-500" />}
                        {item.format === 'pdf' && <FileUp className="w-3 h-3 text-rose-500" />}
                        {item.format === 'text' && <FileText className="w-3 h-3 text-emerald-500" />}
                        {item.format === 'mixed' && <Sparkles className="w-3 h-3 text-violet-500" />}
                        {item.format}
                      </span>
                      {item.status === 'draft' && (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-bold uppercase rounded-md">
                          Draft
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-black rounded-md flex items-center gap-1">
                        <Eye className="w-3 h-3 text-indigo-600" /> {item.readCount || 0} Reads
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900">{item.title}</h4>

                    {item.content && (
                      <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <RenderQuestionHTML html={item.content} />
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium pt-1 flex-wrap">
                      {item.imageUrl && (
                        <span className="text-indigo-600 font-bold flex items-center gap-1">
                          <ImgIcon className="w-3 h-3" /> Has Image
                        </span>
                      )}
                      {item.pdfUrl && (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <FileUp className="w-3 h-3" /> Has PDF ({item.pdfTitle || 'Attachment'})
                        </span>
                      )}
                      <span>Posted: {new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => handleCopyShareLink(item)}
                      className={`px-3 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer border ${
                        copiedId === item.id 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs' 
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                      title="Copy Shareable Link for Students"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-indigo-600" /> Share Link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all cursor-pointer"
                      title="Delete"
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
    </div>
  );
}
