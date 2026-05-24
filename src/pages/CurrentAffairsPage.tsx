import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  collection, query, getDocs, where, orderBy,
  doc, updateDoc, increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  ArrowLeft, Search, X, Calendar, Tag as TagIcon,
  BookmarkPlus, Bookmark, Share2, ExternalLink, Download,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  date?: string;
  description?: string;
  thumbnailUrl?: string;
  status?: string;
  pinToHomepage?: boolean;
  link?: string;
  tags?: string[];
  sections?: AffairSection[];
  viewCount?: number;
  createdAt?: any;
}

// ─── Bookmark helpers ─────────────────────────────────────────────────────────

const BKEY = 'ma_affairs_bookmarks';
const getBookmarks = (): string[] => {
  try { return JSON.parse(localStorage.getItem(BKEY) || '[]'); } catch { return []; }
};
const saveBookmarks = (bks: string[]) => localStorage.setItem(BKEY, JSON.stringify(bks));

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CurrentAffairsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<AffairPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [openPost, setOpenPost] = useState<AffairPost | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>(getBookmarks);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  useEffect(() => {
    document.title = 'Current Affairs | Master Aptitude';
    fetchPosts();
    return () => { document.title = 'Master Aptitude'; };
  }, []);

  // Auto-open article from ?post=<id> deep link
  useEffect(() => {
    const postId = searchParams.get('post');
    if (!postId || loading || posts.length === 0) return;
    const target = posts.find(p => p.id === postId);
    if (target) openArticle(target);
  }, [searchParams, posts, loading]);

  const fetchPosts = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'affairs'), where('status', '==', 'published'), orderBy('createdAt', 'desc'))
      ).catch(async () =>
        getDocs(query(collection(db, 'affairs'), orderBy('createdAt', 'desc')))
      );
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as AffairPost));
      all.sort((a, b) => (b.pinToHomepage ? 1 : 0) - (a.pinToHomepage ? 1 : 0));
      setPosts(all);
    } catch { setPosts([]); }
    finally { setLoading(false); }
  };

  // Extract all unique category names from all post sections
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach(p =>
      p.sections?.forEach(s => { if (s.type === 'category' && s.categoryName) set.add(s.categoryName); })
    );
    return Array.from(set);
  }, [posts]);

  const filtered = useMemo(() => posts.filter(p => {
    if (showBookmarksOnly && !bookmarks.includes(p.id)) return false;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q));
    const matchFilter = activeFilter === 'all' ||
      p.sections?.some(s => s.categoryName === activeFilter) ||
      p.tags?.some(t => t.toLowerCase().includes(activeFilter.toLowerCase()));
    return matchSearch && matchFilter;
  }), [posts, search, activeFilter, showBookmarksOnly, bookmarks]);

  const toggleBookmark = (id: string) => {
    const bks = getBookmarks();
    const next = bks.includes(id) ? bks.filter(b => b !== id) : [...bks, id];
    saveBookmarks(next);
    setBookmarks(next);
  };

  const openArticle = (post: AffairPost) => {
    setOpenPost(post);
    updateDoc(doc(db, 'affairs', post.id), { viewCount: increment(1) }).catch(() => {});
    window.scrollTo(0, 0);
  };

  const closeArticle = () => {
    setOpenPost(null);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Bengali + stylish fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Baloo+Da+2:wght@700&display=swap');
        @keyframes floatBlob { 0%,100%{transform:translate(-30%,-30%) scale(1)} 50%{transform:translate(-30%,-30%) scale(1.08)} }
        @keyframes floatBlob2{ 0%,100%{transform:translate(30%,30%) scale(1)} 50%{transform:translate(30%,30%) scale(1.06)} }
        .blob1 { animation: floatBlob 6s ease-in-out infinite; }
        .blob2 { animation: floatBlob2 8s ease-in-out infinite; }
        .scrollbar-none::-webkit-scrollbar { display:none; }
        .scrollbar-none { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>

      {/* ── Sticky Top Bar ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={openPost ? closeArticle : () => navigate('/dashboard')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {openPost ? (
            <>
              <h1 className="font-black text-slate-800 text-base flex-1 truncate line-clamp-1">{openPost.title}</h1>
              <button onClick={() => toggleBookmark(openPost.id)}
                title={bookmarks.includes(openPost.id) ? 'Remove bookmark' : 'Bookmark this article'}
                className={`p-2 rounded-xl transition-all shrink-0 ${bookmarks.includes(openPost.id) ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}>
                {bookmarks.includes(openPost.id) ? <Bookmark className="w-4 h-4 fill-current" /> : <BookmarkPlus className="w-4 h-4" />}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${openPost.title}\nhttps://masteraptitude.vercel.app/current-affairs`)}`}
                target="_blank" rel="noopener noreferrer" title="Share on WhatsApp"
                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all shrink-0">
                <Share2 className="w-4 h-4" />
              </a>
            </>
          ) : (
            <>
              <span className="text-xl shrink-0">📰</span>
              <h1 className="font-black text-slate-800 text-base flex-1 truncate">Current Affairs</h1>
              <div className="relative w-40 sm:w-56 shrink-0">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-slate-100 rounded-xl py-2 pl-8 pr-8 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-300" />
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button onClick={() => setShowBookmarksOnly(p => !p)}
                title={showBookmarksOnly ? 'Show all' : 'Show bookmarks'}
                className={`p-2 rounded-xl transition-colors shrink-0 ${showBookmarksOnly ? 'bg-amber-100 text-amber-600' : 'hover:bg-slate-100 text-slate-400'}`}>
                <Bookmark className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {openPost ? (
        // ── Inline Article Detail View ─────────────────────────────────────
        <div className="max-w-3xl mx-auto px-4 py-6 pb-10">
          {/* Thumbnail */}
          {openPost.thumbnailUrl && (
            <div className="rounded-2xl overflow-hidden bg-slate-100 mb-6 shadow-md">
              <img src={openPost.thumbnailUrl} alt={openPost.title} className="w-full aspect-video object-cover" />
            </div>
          )}

          {/* Article meta */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 leading-tight">{openPost.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {openPost.date && (
                <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />{openPost.date}
                </span>
              )}
              {(openPost.tags || []).map(t => (
                <span key={t} className="flex items-center gap-0.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  <TagIcon className="w-2.5 h-2.5" />{t}
                </span>
              ))}
            </div>
            {openPost.description && (
              <p className="text-base text-slate-600 leading-relaxed p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                {openPost.description}
              </p>
            )}
          </div>

          {/* Sections */}
          <div className="space-y-5 mb-6">
            {(openPost.sections || []).length > 0 ? (
              (openPost.sections || []).map(section => (
                <SectionRenderer key={section.id} section={section} />
              ))
            ) : openPost.link ? null : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm font-medium">No content sections yet.</p>
              </div>
            )}
          </div>

          {/* External link */}
          {openPost.link && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 mb-6">
              <p className="text-sm font-black text-blue-800 mb-3">📖 Read Full Article</p>
              <a href={openPost.link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95">
                Open Article <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Share footer */}
          <div className="border-t border-slate-200 pt-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Share this article</p>
            <div className="flex gap-2 flex-wrap">
              <a href={`https://wa.me/?text=${encodeURIComponent(`${openPost.title}\nhttps://masteraptitude.vercel.app/current-affairs`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-all active:scale-95">
                💬 WhatsApp
              </a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent('https://masteraptitude.vercel.app/current-affairs')}&text=${encodeURIComponent(openPost.title)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-600 transition-all active:scale-95">
                ✈️ Telegram
              </a>
            </div>
          </div>
        </div>
      ) : (
        // ── List View ──────────────────────────────────────────────────────
        <div className="max-w-5xl mx-auto px-4">
          {/* ── Bengali Intro Section ──────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-3xl my-6 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #312e81 50%, #0f172a 100%)' }}>
            {/* Animated background blobs */}
            <div className="blob1 absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)' }} />
            <div className="blob2 absolute bottom-0 right-0 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />

            <div className="relative z-10 px-6 py-8 md:py-10">
              <div className="flex items-start gap-4 md:gap-6">
                <div className="text-5xl md:text-6xl shrink-0" style={{ animation: 'bounce 2s ease-in-out infinite' }}>📰</div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white mb-3 leading-tight"
                    style={{ fontFamily: "'Baloo Da 2', sans-serif" }}>
                    Current Affairs Portal
                  </h2>
                  <p className="text-blue-200 leading-relaxed text-sm md:text-base mb-4"
                    style={{ fontFamily: "'Hind Siliguri', sans-serif", lineHeight: 1.9 }}>
                    বর্তমান সময়ে সকল Competitive Exam-এ Current Affairs অত্যন্ত গুরুত্বপূর্ণ একটি অংশ।
                    প্রতিদিনের জাতীয়, আন্তর্জাতিক, রাজ্য, গুরুত্বপূর্ণ দিবস, খেলাধুলা, বিজ্ঞান ও প্রযুক্তি
                    সম্পর্কিত আপডেট নিয়মিত পড়া সফলতার জন্য অপরিহার্য।
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['📋 জাতীয়', '🌍 আন্তর্জাতিক', '🏛️ রাজ্য', '⚽ খেলাধুলা', '🔬 বিজ্ঞান', '💰 অর্থনীতি', '🏆 পুরস্কার'].map(tag => (
                      <span key={tag} className="px-3 py-1 text-xs font-medium text-blue-100 rounded-full"
                        style={{
                          fontFamily: "'Hind Siliguri', sans-serif",
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          backdropFilter: 'blur(4px)',
                        }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Category Filter Tabs ────────────────────────────────────────── */}
          {allCategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
              <button onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                  activeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                }`}>
                All Topics
              </button>
              {allCategories.map(cat => (
                <button key={cat} onClick={() => setActiveFilter(cat === activeFilter ? 'all' : cat)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                    activeFilter === cat
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* ── Article Grid ────────────────────────────────────────────────── */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-3xl border border-slate-100 animate-pulse">
                  <div className="aspect-video bg-slate-100 rounded-t-3xl" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-8 bg-slate-100 rounded-xl w-1/2 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📰</div>
              <p className="text-slate-400 font-bold text-sm">
                {showBookmarksOnly
                  ? 'No bookmarked articles yet. Tap the bookmark icon on any article!'
                  : search
                  ? `No results for "${search}"`
                  : 'No current affairs articles available yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-8">
              {filtered.map(post => (
                <ArticleCard
                  key={post.id}
                  post={post}
                  isBookmarked={bookmarks.includes(post.id)}
                  onToggleBookmark={() => toggleBookmark(post.id)}
                  onOpen={() => openArticle(post)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────

function ArticleCard({
  post, isBookmarked, onToggleBookmark, onOpen,
}: {
  post: AffairPost;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onOpen: () => void;
}) {
  const cats = (post.sections || [])
    .filter(s => s.type === 'category' && s.categoryName)
    .map(s => s.categoryName as string);

  const hasSections = (post.sections?.length || 0) > 0;

  const displayDate = post.date
    || (post.createdAt?.seconds
      ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '');

  const shareText = encodeURIComponent(`${post.title}\nhttps://masteraptitude.vercel.app/current-affairs`);

  const handlePrimaryAction = () => {
    if (hasSections) {
      onOpen();
    } else if (post.link) {
      window.open(post.link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-50/60 hover:-translate-y-1 transition-all duration-300 overflow-hidden group flex flex-col cursor-pointer">
      {/* Thumbnail */}
      {post.thumbnailUrl ? (
        <div className="aspect-video overflow-hidden bg-slate-100 shrink-0">
          <img src={post.thumbnailUrl} alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy" />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-5xl shrink-0">
          📰
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Date + category pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {displayDate && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              <Calendar className="w-2.5 h-2.5" />{displayDate}
            </span>
          )}
          {cats.slice(0, 2).map(cat => (
            <span key={cat} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[100px]">
              {cat}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className="font-black text-slate-800 text-sm leading-snug mb-2 line-clamp-2 flex-1">
          {post.title}
        </h3>

        {/* Description */}
        {post.description && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
            {post.description}
          </p>
        )}

        {/* Tags */}
        {(post.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {(post.tags || []).slice(0, 3).map(t => (
              <span key={t} className="flex items-center gap-0.5 text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">
                <TagIcon className="w-2 h-2" />{t}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-auto gap-2">
          <div className="flex items-center gap-1.5">
            <button onClick={onToggleBookmark}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark this article'}
              className={`p-1.5 rounded-lg transition-all ${isBookmarked ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}>
              {isBookmarked
                ? <Bookmark className="w-4 h-4 fill-current" />
                : <BookmarkPlus className="w-4 h-4" />}
            </button>
            <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer"
              title="Share on WhatsApp"
              className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all">
              <Share2 className="w-4 h-4" />
            </a>
          </div>
          {(hasSections || post.link) && (
            <button onClick={handlePrimaryAction}
              className="px-3.5 py-2 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 active:scale-95 transition-all">
              Read More
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section Renderer ─────────────────────────────────────────────────────────

function SectionRenderer({ section }: { section: AffairSection }) {
  if (section.type === 'category') {
    return (
      <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
        {/* Gradient header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${section.categoryColorFrom || '#1d4ed8'}, ${section.categoryColorTo || '#4f46e5'})`,
          }}
          className="flex items-center gap-2 px-5 py-3"
        >
          <span className="text-xl leading-none">{section.categoryIcon}</span>
          <span className="text-white font-black text-sm" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
            {section.categoryName}
          </span>
        </div>
        {/* Content */}
        <div className="bg-white p-5 shadow-inner">
          {section.content ? (
            <div
              className="text-sm text-slate-700 leading-relaxed"
              style={{ fontFamily: "'Hind Siliguri', sans-serif", lineHeight: 1.9 }}
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          ) : (
            <p className="text-slate-400 text-sm italic">No content added yet.</p>
          )}
        </div>
      </div>
    );
  }

  if (section.type === 'image') {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        {section.imageUrl && (
          <img src={section.imageUrl} alt={section.imageCaption || 'Image'}
            className="w-full object-cover" loading="lazy" />
        )}
        {section.imageCaption && (
          <div className="bg-slate-50 px-4 py-2 text-center text-xs text-slate-500 italic border-t border-slate-100">
            {section.imageCaption}
          </div>
        )}
      </div>
    );
  }

  if (section.type === 'pdf') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-2xl shrink-0">📄</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm mb-1 truncate">{section.pdfTitle || 'PDF Document'}</p>
          {section.pdfUrl && (
            <a href={section.pdfUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-red-600 font-bold hover:underline">
              <Download className="w-3 h-3" /> Download / View PDF
            </a>
          )}
        </div>
      </div>
    );
  }

  return null;
}
