import React, { useState, useEffect, useRef } from 'react';
import {
  collection, query, getDocs, addDoc, updateDoc, deleteDoc,
  doc, orderBy, serverTimestamp, getDoc, setDoc,
} from 'firebase/firestore';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from './AuthContext';
import RichTextEditor from './RichTextEditor';
import {
  Plus, Trash2, Edit2, GripVertical, Save, X, ArrowLeft,
  Settings, ChevronDown, Eye, Layers, Upload,
  Image as ImgIcon, FileText as PdfIcon, RefreshCw,
  Copy, Check, Link2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AffairCategory {
  id: string;
  name: string;
  icon: string;
  colorFrom: string;
  colorTo: string;
  order: number;
}

interface AffairSection {
  id: string;
  type: 'category' | 'image' | 'pdf';
  categoryName?: string;
  categoryIcon?: string;
  categoryColorFrom?: string;
  categoryColorTo?: string;
  content?: string;
  imageUrl?: string;
  imageCaption?: string;
  pdfUrl?: string;
  pdfTitle?: string;
}

interface AffairPost {
  id: string;
  title: string;
  slug?: string;
  date?: string;
  description?: string;
  thumbnailUrl?: string;
  status: 'published' | 'draft';
  pinToHomepage?: boolean;
  link?: string;
  tags?: string[];
  sections?: AffairSection[];
  viewCount?: number;
  createdAt?: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORY_PRESETS = [
  { name: 'Important Days',      icon: '🗓️', colorFrom: '#1d4ed8', colorTo: '#4f46e5' },
  { name: 'National News',       icon: '🇮🇳', colorFrom: '#ea580c', colorTo: '#b91c1c' },
  { name: 'International News',  icon: '🌍', colorFrom: '#16a34a', colorTo: '#0f766e' },
  { name: 'State News',          icon: '🏛️', colorFrom: '#7c3aed', colorTo: '#4338ca' },
  { name: 'Sports News',         icon: '⚽', colorFrom: '#e11d48', colorTo: '#be185d' },
  { name: 'Science & Technology',icon: '🔬', colorFrom: '#0284c7', colorTo: '#1d4ed8' },
  { name: 'Economy',             icon: '💰', colorFrom: '#d97706', colorTo: '#b45309' },
  { name: 'Awards & Honours',    icon: '🏆', colorFrom: '#ca8a04', colorTo: '#a16207' },
];

const COLOR_OPTIONS = [
  { from: '#1d4ed8', to: '#4f46e5', label: 'Blue' },
  { from: '#ea580c', to: '#b91c1c', label: 'Orange' },
  { from: '#16a34a', to: '#0f766e', label: 'Green' },
  { from: '#7c3aed', to: '#4338ca', label: 'Purple' },
  { from: '#e11d48', to: '#be185d', label: 'Rose' },
  { from: '#0284c7', to: '#1d4ed8', label: 'Cyan' },
  { from: '#d97706', to: '#b45309', label: 'Amber' },
  { from: '#ca8a04', to: '#a16207', label: 'Gold' },
  { from: '#0f766e', to: '#059669', label: 'Teal' },
  { from: '#475569', to: '#334155', label: 'Slate' },
];

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const toSlug = (t: string) =>
  t.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 80);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminCurrentAffairs() {
  const { user } = useAuth();

  const [view, setView] = useState<'list' | 'editor' | 'categories'>('list');
  const [posts, setPosts] = useState<AffairPost[]>([]);
  const [categories, setCategories] = useState<AffairCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Editor state ──
  const [editPost, setEditPost] = useState<AffairPost | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [pinned, setPinned] = useState(false);
  const [link, setLink] = useState('');
  const [tags, setTags] = useState('');
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [sections, setSections] = useState<AffairSection[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const addSectionRef = useRef<HTMLDivElement>(null);

  // ── Drag state ──
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // ── Copy link state ──
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const APP_URL = 'https://masteraptitude.vercel.app';

  const copyShareLink = (postId: string) => {
    const url = `${APP_URL}/current-affairs?post=${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(postId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => alert(`Share link:\n${url}`));
  };

  // ── Category form state ──
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📰');
  const [catColorFrom, setCatColorFrom] = useState(COLOR_OPTIONS[0].from);
  const [catColorTo, setCatColorTo] = useState(COLOR_OPTIONS[0].to);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addSectionRef.current && !addSectionRef.current.contains(e.target as Node)) {
        setShowAddSection(false);
      }
    };
    if (showAddSection) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddSection]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchPosts(), fetchCategories()]);
    setLoading(false);
  };

  const fetchPosts = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'affairs'), orderBy('createdAt', 'desc')));
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as AffairPost)));
    } catch { setPosts([]); }
  };

  const fetchCategories = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'affair_categories'));
      if (snap.exists()) {
        const cats = (snap.data().cats || []) as AffairCategory[];
        setCategories(cats.length > 0 ? cats : defaultCategories());
      } else {
        // No doc yet — use presets directly so the editor works immediately
        setCategories(defaultCategories());
      }
    } catch {
      setCategories(defaultCategories());
    }
  };

  const defaultCategories = (): AffairCategory[] =>
    DEFAULT_CATEGORY_PRESETS.map((p, i) => ({ ...p, id: `default_${i}`, order: i }));

  const seedDefaults = async () => {
    const cats = DEFAULT_CATEGORY_PRESETS.map((p, i) => ({ ...p, id: uid(), order: i }));
    await setDoc(doc(db, 'settings', 'affair_categories'), { cats });
    setCategories(cats);
  };

  // ── Editor helpers ─────────────────────────────────────────────────────────

  const openEditor = (post?: AffairPost) => {
    if (post) {
      setEditPost(post);
      setTitle(post.title || '');
      setSlug(post.slug || '');
      setDate(post.date || '');
      setDescription(post.description || '');
      setStatus(post.status || 'published');
      setPinned(post.pinToHomepage || false);
      setLink(post.link || '');
      setTags((post.tags || []).join(', '));
      setThumbPreview(post.thumbnailUrl || '');
      setThumbFile(null);
      setSections(post.sections || []);
    } else {
      setEditPost(null);
      setTitle(''); setSlug(''); setDate(''); setDescription('');
      setStatus('published'); setPinned(false); setLink(''); setTags('');
      setThumbPreview(''); setThumbFile(null); setSections([]);
    }
    setView('editor');
  };

  const handleThumbChange = (file: File) => {
    setThumbFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setThumbPreview(e.target?.result as string || '');
    reader.readAsDataURL(file);
  };

  const addCategorySection = (cat: AffairCategory) => {
    setSections(prev => [...prev, {
      id: uid(), type: 'category',
      categoryName: cat.name, categoryIcon: cat.icon,
      categoryColorFrom: cat.colorFrom, categoryColorTo: cat.colorTo,
      content: '',
    }]);
    setShowAddSection(false);
  };

  const addMediaSection = (type: 'image' | 'pdf') => {
    setSections(prev => [...prev, {
      id: uid(), type,
      ...(type === 'image' ? { imageUrl: '', imageCaption: '' } : { pdfUrl: '', pdfTitle: '' }),
    }]);
    setShowAddSection(false);
  };

  const updateSection = (id: string, changes: Partial<AffairSection>) =>
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));

  const deleteSection = (id: string) =>
    setSections(prev => prev.filter(s => s.id !== id));

  const handleSectionUpload = async (sectionId: string, file: File, type: 'image' | 'pdf') => {
    setUploadingSection(sectionId);
    try {
      const folder = type === 'image' ? 'affair-images' : 'affair-pdfs';
      const name = `${folder}/${Date.now()}_${uid()}_${file.name}`;
      const snap = await uploadBytes(sRef(storage, name), file);
      const url = await getDownloadURL(snap.ref);
      updateSection(sectionId, type === 'image' ? { imageUrl: url } : { pdfUrl: url });
    } catch {
      alert('Upload failed. Try again.');
    } finally {
      setUploadingSection(null);
    }
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null); setDragOverIdx(null); return;
    }
    const arr = [...sections];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(targetIdx, 0, moved);
    setSections(arr);
    setDragIdx(null); setDragOverIdx(null);
  };

  // ── Save post ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!title.trim() || !user) return;
    setSaving(true);
    try {
      let thumbFinalUrl = thumbPreview;
      if (thumbFile) {
        const name = `affair-thumbs/${Date.now()}_${uid()}_${thumbFile.name}`;
        const snap = await uploadBytes(sRef(storage, name), thumbFile);
        thumbFinalUrl = await getDownloadURL(snap.ref);
      }
      const data = {
        title: title.trim(),
        slug: slug || toSlug(title),
        date: date || new Date().toISOString().split('T')[0],
        description,
        status,
        pinToHomepage: pinned,
        link,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        thumbnailUrl: thumbFinalUrl,
        sections,
        updatedAt: serverTimestamp(),
      };
      if (editPost) {
        await updateDoc(doc(db, 'affairs', editPost.id), data);
      } else {
        await addDoc(collection(db, 'affairs'), {
          ...data, viewCount: 0,
          createdAt: serverTimestamp(), authorId: user.uid,
        });
      }
      await fetchPosts();
      setView('list');
    } catch (err) {
      console.error(err);
      alert('Error saving post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post permanently?')) return;
    await deleteDoc(doc(db, 'affairs', id));
    await fetchPosts();
  };

  // ── Category CRUD ──────────────────────────────────────────────────────────

  const openCatEdit = (cat: AffairCategory) => {
    setEditCatId(cat.id);
    setCatName(cat.name); setCatIcon(cat.icon);
    setCatColorFrom(cat.colorFrom); setCatColorTo(cat.colorTo);
  };

  const persistCategories = async (updated: AffairCategory[]) => {
    await setDoc(doc(db, 'settings', 'affair_categories'), { cats: updated });
    setCategories(updated);
  };

  const handleSaveCat = async () => {
    if (!catName.trim()) return;
    setSavingCat(true);
    try {
      let updated: AffairCategory[];
      if (editCatId) {
        updated = categories.map(c =>
          c.id === editCatId
            ? { ...c, name: catName, icon: catIcon, colorFrom: catColorFrom, colorTo: catColorTo }
            : c
        );
      } else {
        updated = [
          ...categories,
          { id: uid(), name: catName, icon: catIcon, colorFrom: catColorFrom, colorTo: catColorTo, order: categories.length },
        ];
      }
      await persistCategories(updated);
      setCatName(''); setCatIcon('📰'); setEditCatId(null);
      setCatColorFrom(COLOR_OPTIONS[0].from); setCatColorTo(COLOR_OPTIONS[0].to);
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await persistCategories(categories.filter(c => c.id !== id));
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════

  if (view === 'list') return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <span className="w-2 h-8 bg-orange-600 rounded-full" />
          Current Affairs Management
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setView('categories')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:border-orange-300 hover:text-orange-600 transition-all"
          >
            <Settings className="w-4 h-4" /> Manage Categories
          </button>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-sm hover:bg-slate-900 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Post
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
          <div className="text-5xl mb-4">📰</div>
          <p className="text-slate-400 font-bold mb-4">No posts yet. Create your first current affair!</p>
          <button onClick={() => openEditor()}
            className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-slate-900 transition-all">
            Create Post
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map(post => (
            <div key={post.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all flex flex-col">
              {post.thumbnailUrl ? (
                <div className="aspect-video overflow-hidden bg-slate-100 shrink-0">
                  <img src={post.thumbnailUrl} alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center text-4xl shrink-0">📰</div>
              )}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    post.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {post.status === 'published' ? '✅ Published' : '📝 Draft'}
                  </span>
                  {post.date && <span className="text-[10px] text-slate-400 font-medium">{post.date}</span>}
                </div>
                <h3 className="font-black text-slate-800 text-sm leading-tight mb-1 line-clamp-2 flex-1">{post.title}</h3>
                {post.description && (
                  <p className="text-slate-500 text-xs line-clamp-2 mb-2">{post.description}</p>
                )}
                <div className="flex items-center gap-3 text-slate-400 text-xs mb-3">
                  <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{(post.sections || []).length} sections</span>
                  {post.viewCount !== undefined && (
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.viewCount} views</span>
                  )}
                </div>
                <div className="flex gap-2 pt-3 border-t border-slate-50 mt-auto">
                  <button onClick={() => openEditor(post)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 text-slate-700 font-bold text-xs hover:bg-orange-50 hover:text-orange-600 transition-all">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => copyShareLink(post.id)}
                    title="Copy shareable link"
                    className={`p-2 rounded-xl transition-all ${
                      copiedId === post.id
                        ? 'bg-green-50 text-green-600'
                        : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {copiedId === post.id
                      ? <Check className="w-3.5 h-3.5" />
                      : <Link2 className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleDelete(post.id)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORIES VIEW
  // ══════════════════════════════════════════════════════════════════════════

  if (view === 'categories') return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-black text-slate-800">Category Manager</h2>
      </div>

      {categories.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4">
          <p className="text-amber-700 font-bold text-sm">No categories yet. Seed defaults to get started!</p>
          <button onClick={seedDefaults}
            className="px-4 py-2 bg-amber-600 text-white font-bold text-sm rounded-xl hover:bg-amber-700 transition-all flex items-center gap-2 shrink-0">
            <RefreshCw className="w-4 h-4" /> Seed Defaults
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div style={{ background: `linear-gradient(135deg, ${cat.colorFrom}, ${cat.colorTo})` }} className="h-1.5" />
            <div className="p-4 flex items-center gap-3">
              <div style={{ background: `linear-gradient(135deg, ${cat.colorFrom}, ${cat.colorTo})` }}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm">
                {cat.icon}
              </div>
              <span className="font-bold text-slate-800 text-sm flex-1">{cat.name}</span>
              <button onClick={() => openCatEdit(cat)}
                className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDeleteCat(cat.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border-2 border-slate-200 p-5">
        <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-4">
          {editCatId ? '✏️ Edit Category' : '➕ Add New Category'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Name</label>
            <input type="text" value={catName} onChange={e => setCatName(e.target.value)}
              placeholder="e.g. National News"
              className="w-full rounded-xl border-2 border-slate-200 p-3 text-sm font-medium outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Icon (emoji)</label>
            <input type="text" value={catIcon} onChange={e => setCatIcon(e.target.value)}
              placeholder="🗓️"
              className="w-full rounded-xl border-2 border-slate-200 p-3 text-sm font-medium outline-none focus:border-orange-400" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Color Theme</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {COLOR_OPTIONS.map(c => (
              <button key={c.label} type="button"
                onClick={() => { setCatColorFrom(c.from); setCatColorTo(c.to); }}
                style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${catColorFrom === c.from ? 'border-white shadow-lg scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                title={c.label} />
            ))}
          </div>
          <div style={{ background: `linear-gradient(135deg, ${catColorFrom}, ${catColorTo})` }}
            className="rounded-xl px-4 py-2.5 flex items-center gap-2">
            <span>{catIcon}</span>
            <span className="text-white font-black text-sm">{catName || 'Preview'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSaveCat} disabled={!catName.trim() || savingCat}
            className="px-5 py-2.5 bg-orange-600 text-white font-bold text-sm rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-all flex items-center gap-2">
            <Save className="w-4 h-4" />
            {savingCat ? 'Saving...' : editCatId ? 'Update Category' : 'Add Category'}
          </button>
          {editCatId && (
            <button
              onClick={() => {
                setEditCatId(null); setCatName(''); setCatIcon('📰');
                setCatColorFrom(COLOR_OPTIONS[0].from); setCatColorTo(COLOR_OPTIONS[0].to);
              }}
              className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:border-red-300 transition-all">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // EDITOR VIEW
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-black text-slate-800">{editPost ? '✏️ Edit Post' : '➕ New Post'}</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Fill in the basics, then build content sections below</p>
        </div>
        <button onClick={handleSave} disabled={!title.trim() || saving}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white font-black rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-all shadow-sm">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Post'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left: Basic Info ─────────────────────────────────────────────── */}
        <div className="xl:col-span-1 space-y-5">

          {/* Basic fields */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest border-b border-slate-100 pb-2">Basic Info</h3>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Title *</label>
              <input type="text" required value={title}
                onChange={e => { setTitle(e.target.value); setSlug(toSlug(e.target.value)); }}
                placeholder="e.g. May 2026 Current Affairs"
                className="w-full rounded-xl border-2 border-slate-200 p-3 text-sm font-medium outline-none focus:border-orange-400" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 p-3 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as 'published' | 'draft')}
                  className="w-full rounded-xl border-2 border-slate-200 p-3 text-sm outline-none focus:border-orange-400">
                  <option value="published">✅ Published</option>
                  <option value="draft">📝 Draft</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Short Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Brief description shown on cards..."
                className="w-full rounded-xl border-2 border-slate-200 p-3 text-sm outline-none focus:border-orange-400 resize-none" />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tags (comma separated)</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)}
                placeholder="WBP, PSC, National News"
                className="w-full rounded-xl border-2 border-slate-200 p-3 text-sm outline-none focus:border-orange-400" />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">External Link (optional)</label>
              <input type="url" value={link} onChange={e => setLink(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border-2 border-slate-200 p-3 text-sm outline-none focus:border-orange-400" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)}
                className="w-4 h-4 accent-orange-600" />
              <span className="text-sm font-bold text-slate-600">📌 Pin to Homepage</span>
            </label>
          </div>

          {/* Featured Image */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-3">Featured Image</h3>
            {thumbPreview ? (
              <div className="relative rounded-xl overflow-hidden mb-3">
                <img src={thumbPreview} alt="thumbnail" className="w-full aspect-video object-cover" />
                <button onClick={() => { setThumbPreview(''); setThumbFile(null); }}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-lg hover:bg-black/80 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="aspect-video bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 mb-3">
                <ImgIcon className="w-8 h-8 text-slate-300" />
                <span className="text-xs text-slate-400 font-medium">No image selected</span>
              </div>
            )}
            <label className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-300 cursor-pointer text-sm text-slate-500 font-bold hover:text-orange-600 transition-all">
              <Upload className="w-4 h-4" /> Choose Image
              <input type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleThumbChange(e.target.files[0])} />
            </label>
          </div>
        </div>

        {/* ── Right: Content Builder ───────────────────────────────────────── */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">Content Builder</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Drag the gradient headers to reorder sections</p>
              </div>

              {/* Add Section dropdown */}
              <div className="relative" ref={addSectionRef}>
                <button
                  onClick={() => setShowAddSection(p => !p)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Section
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAddSection ? 'rotate-180' : ''}`} />
                </button>

                {showAddSection && (
                  <div className="absolute right-0 top-11 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 min-w-[220px]">
                    <p className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categories</p>
                    {categories.length === 0 ? (
                      <p className="px-4 py-2 text-xs text-slate-400">
                        No categories.{' '}
                        <button onClick={() => { setShowAddSection(false); setView('categories'); }}
                          className="text-blue-600 font-bold underline">Add some</button>
                      </p>
                    ) : (
                      categories.map(cat => (
                        <button key={cat.id} onClick={() => addCategorySection(cat)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                          <div style={{ background: `linear-gradient(135deg, ${cat.colorFrom}, ${cat.colorTo})` }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-sm shrink-0">
                            {cat.icon}
                          </div>
                          <span className="text-sm font-bold text-slate-700">{cat.name}</span>
                        </button>
                      ))
                    )}
                    <div className="h-px bg-slate-100 my-1 mx-2" />
                    <p className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Media</p>
                    <button onClick={() => addMediaSection('image')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                        <ImgIcon className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">📷 Add Image</span>
                    </button>
                    <button onClick={() => addMediaSection('pdf')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                        <PdfIcon className="w-4 h-4 text-red-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">📄 Add PDF</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sections list */}
            {sections.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Layers className="w-10 h-10 opacity-40" />
                <p className="font-bold text-sm">No sections yet</p>
                <p className="text-xs text-center px-4">Click "Add Section" above to add category boxes, images, or PDFs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((section, i) => (
                  <div
                    key={section.id}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
                    onDrop={() => handleDrop(i)}
                    onDragLeave={() => setDragOverIdx(null)}
                    className={`rounded-2xl overflow-hidden border-2 transition-all duration-150 ${
                      dragOverIdx === i && dragIdx !== i
                        ? 'border-blue-400 shadow-lg scale-[1.005]'
                        : 'border-slate-200'
                    } ${dragIdx === i ? 'opacity-40' : 'opacity-100'}`}
                  >
                    {/* Draggable gradient header */}
                    <div
                      draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                      style={{
                        background: section.type === 'category'
                          ? `linear-gradient(135deg, ${section.categoryColorFrom}, ${section.categoryColorTo})`
                          : section.type === 'image' ? 'linear-gradient(135deg, #16a34a, #0f766e)'
                          : 'linear-gradient(135deg, #dc2626, #9f1239)',
                      }}
                      className="flex items-center gap-2 px-4 py-3 cursor-grab active:cursor-grabbing select-none"
                    >
                      <GripVertical className="w-4 h-4 text-white/60 shrink-0" />
                      <span className="text-lg leading-none">
                        {section.type === 'category' ? section.categoryIcon
                          : section.type === 'image' ? '📷' : '📄'}
                      </span>
                      <span className="text-white font-black text-sm flex-1">
                        {section.type === 'category' ? section.categoryName
                          : section.type === 'image' ? 'Image Block' : 'PDF Document'}
                      </span>
                      <button type="button" onClick={() => deleteSection(section.id)}
                        className="p-1 text-white/70 hover:text-white hover:bg-black/20 rounded-lg transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Section body — stopPropagation prevents editor content from triggering DnD */}
                    <div className="bg-white p-4" onDragStart={(e) => e.stopPropagation()}>

                      {/* ── Category section ── */}
                      {section.type === 'category' && (
                        <RichTextEditor
                          value={section.content || ''}
                          onChange={html => updateSection(section.id, { content: html })}
                          placeholder={`Write ${section.categoryName} content here...`}
                          minHeight={160}
                        />
                      )}

                      {/* ── Image section ── */}
                      {section.type === 'image' && (
                        <div className="space-y-3">
                          {section.imageUrl ? (
                            <div className="relative rounded-xl overflow-hidden">
                              <img src={section.imageUrl} alt="section" className="w-full max-h-64 object-cover" />
                              <button onClick={() => updateSection(section.id, { imageUrl: '' })}
                                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-lg hover:bg-black/80 transition-all">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label className={`flex flex-col items-center justify-center gap-2 aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:border-green-400 cursor-pointer transition-all ${uploadingSection === section.id ? 'opacity-50 pointer-events-none' : ''}`}>
                              {uploadingSection === section.id
                                ? <div className="w-6 h-6 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                                : <><ImgIcon className="w-8 h-8 text-slate-300" /><span className="text-xs text-slate-400 font-medium">Click to upload image</span></>
                              }
                              <input type="file" accept="image/*" className="hidden"
                                onChange={e => e.target.files?.[0] && handleSectionUpload(section.id, e.target.files[0], 'image')} />
                            </label>
                          )}
                          <input type="text" value={section.imageCaption || ''}
                            onChange={e => updateSection(section.id, { imageCaption: e.target.value })}
                            placeholder="Image caption (optional)"
                            className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-sm outline-none focus:border-green-400" />
                        </div>
                      )}

                      {/* ── PDF section ── */}
                      {section.type === 'pdf' && (
                        <div className="space-y-3">
                          <input type="text" value={section.pdfTitle || ''}
                            onChange={e => updateSection(section.id, { pdfTitle: e.target.value })}
                            placeholder="PDF title (e.g. Monthly Current Affairs PDF)"
                            className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-sm outline-none focus:border-red-400" />
                          {section.pdfUrl ? (
                            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
                              <PdfIcon className="w-5 h-5 text-red-600 shrink-0" />
                              <a href={section.pdfUrl} target="_blank" rel="noopener noreferrer"
                                className="text-red-600 text-sm font-bold hover:underline flex-1 truncate">
                                View uploaded PDF
                              </a>
                              <button onClick={() => updateSection(section.id, { pdfUrl: '' })}
                                className="p-1 text-red-400 hover:text-red-600 rounded-lg transition-all">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label className={`flex items-center gap-3 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:border-red-400 cursor-pointer transition-all ${uploadingSection === section.id ? 'opacity-50 pointer-events-none' : ''}`}>
                              {uploadingSection === section.id
                                ? <div className="w-5 h-5 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                                : <PdfIcon className="w-5 h-5 text-slate-400" />
                              }
                              <span className="text-sm text-slate-400 font-medium">
                                {uploadingSection === section.id ? 'Uploading...' : 'Click to upload PDF'}
                              </span>
                              <input type="file" accept=".pdf" className="hidden"
                                onChange={e => e.target.files?.[0] && handleSectionUpload(section.id, e.target.files[0], 'pdf')} />
                            </label>
                          )}
                          <input type="url" value={section.pdfUrl || ''}
                            onChange={e => updateSection(section.id, { pdfUrl: e.target.value })}
                            placeholder="Or paste PDF URL directly..."
                            className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-sm outline-none focus:border-red-400" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
