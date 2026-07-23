import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { collection, query, getDocs, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Search, TrendingUp, Calendar, Tag, Clock, ChevronRight, BookOpen } from 'lucide-react';
import ComingSoonBox from '../components/ComingSoonBox';

// ── News List Page ─────────────────────────────────────────────────────────────
export function NewsListPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, 'news_posts'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const categories = ['All', ...Array.from(new Set(posts.map((p: any) => p.category).filter(Boolean)))];
  const trendingPosts = posts.filter((p: any) => p.isTrending).slice(0, 3);

  const filteredPosts = posts.filter((p: any) => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = !searchQuery ||
      (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags || []).some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  const latestPosts = filteredPosts.slice(0, trendingPosts.length > 0 ? undefined : undefined);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-600" />
              News &amp; Updates
            </h1>
          </div>
          <div className="relative w-48 sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search news..."
              className="w-full bg-slate-100 border-none rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Trending Section */}
        {trendingPosts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Trending</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {trendingPosts.map(post => (
                <Link key={post.id} to={`/news/${post.slug || post.id}`} className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  {post.thumbnailUrl ? (
                    <div className="aspect-video overflow-hidden">
                      <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-violet-300" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">🔥 Trending</span>
                      {post.category && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">{post.category}</span>}
                    </div>
                    <h3 className="font-black text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">{post.title}</h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {post.publishDate || 'Recently'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                activeCategory === cat ? 'bg-violet-600 text-white shadow-md shadow-violet-100' : 'bg-white border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Post list */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">Loading news...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <ComingSoonBox categoryName={activeCategory !== 'All' ? activeCategory : 'Latest Job Notifications'} />
        ) : (
          <div className="space-y-4">
            {latestPosts.map(post => (
              <Link key={post.id} to={`/news/${post.slug || post.id}`} className="group flex gap-4 bg-white rounded-3xl border border-slate-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 items-start">
                {post.thumbnailUrl && (
                  <div className="w-20 h-14 sm:w-28 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                    <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {post.category && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">{post.category}</span>}
                    {post.isTrending && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">🔥</span>}
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><Calendar className="w-3 h-3" />{post.publishDate || ''}</span>
                  </div>
                  <h3 className="font-black text-slate-800 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors mb-2">{post.title}</h3>
                  <p className="text-xs text-slate-400 font-medium line-clamp-2 mb-2 hidden sm:block">{(post.content || '').slice(0, 120)}...</p>
                  <div className="flex flex-wrap gap-1">
                    {(post.tags || []).slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center gap-0.5"><Tag className="w-2.5 h-2.5" />{tag}</span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-violet-400 transition-colors shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── News Detail Page ───────────────────────────────────────────────────────────
export function NewsDetailPage() {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      if (!slugOrId) return;
      try {
        // Try by slug first
        const qSlug = query(collection(db, 'news_posts'), where('slug', '==', slugOrId));
        const snapSlug = await getDocs(qSlug);
        if (!snapSlug.empty) {
          setPost({ id: snapSlug.docs[0].id, ...snapSlug.docs[0].data() });
          return;
        }
        // Fallback: by document ID
        const docRef = doc(db, 'news_posts', slugOrId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slugOrId]);

  // SEO meta tags injection
  useEffect(() => {
    if (!post) return;
    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute('name', name); document.head.appendChild(tag); }
      tag.setAttribute('content', content);
    };
    const setOg = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute('property', property); document.head.appendChild(tag); }
      tag.setAttribute('content', content);
    };
    document.title = post.seoTitle || post.title || 'News | Master Aptitude';
    setMeta('description', post.metaDescription || post.content?.slice(0, 160) || '');
    setMeta('keywords', (post.keywords || []).join(', '));
    setOg('og:title', post.seoTitle || post.title || '');
    setOg('og:description', post.metaDescription || post.content?.slice(0, 160) || '');
    if (post.thumbnailUrl) setOg('og:image', post.thumbnailUrl);
    setOg('og:type', 'article');
    return () => { document.title = 'Master Aptitude'; };
  }, [post]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-black text-slate-600">Post not found</h2>
      <button onClick={() => navigate('/news')} className="px-5 py-3 bg-violet-600 text-white rounded-2xl font-bold text-sm hover:bg-violet-700 transition-all">Back to News</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/news')} className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-slate-400 truncate">{post.category || 'News'}</span>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Thumbnail */}
        {post.thumbnailUrl && (
          <div className="rounded-3xl overflow-hidden mb-6 border border-slate-100 shadow-sm">
            <img src={post.thumbnailUrl} alt={post.title} className="w-full max-h-64 sm:max-h-80 object-cover" />
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {post.category && <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-violet-100 text-violet-600">{post.category}</span>}
          {post.isTrending && <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-100 text-amber-600">🔥 Trending</span>}
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 ml-auto"><Calendar className="w-3.5 h-3.5" />{post.publishDate || ''}</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-6">{post.title}</h1>

        {/* Content */}
        <div className="prose prose-slate max-w-none text-slate-700 text-[15px] leading-relaxed space-y-4">
          {(post.content || post.description || '').split('\n').filter(Boolean).map((para: string, i: number) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {/* Attached Image Diagram */}
        {post.imageUrl && post.imageUrl !== post.thumbnailUrl && (
          <div className="mt-6 rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 p-2">
            <img src={post.imageUrl} alt={post.title} className="w-full max-h-96 object-contain rounded-xl" />
            {post.imageCaption && (
              <p className="text-xs text-slate-500 font-medium italic mt-2 text-center">{post.imageCaption}</p>
            )}
          </div>
        )}

        {/* Attached Official PDF Document */}
        {(post.pdfUrl || post.fileUrl || post.link) && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-rose-100 text-rose-700 rounded-xl font-bold text-base">📄</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{post.pdfTitle || 'Official Notification PDF Document'}</h4>
                <p className="text-[11px] text-slate-500 font-medium">Download full official notification PDF</p>
              </div>
            </div>
            <a
              href={post.pdfUrl || post.fileUrl || post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              Download PDF
            </a>
          </div>
        )}

        {/* Tags */}
        {(post.tags || []).length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-2 items-center">
            <Tag className="w-4 h-4 text-slate-400" />
            {(post.tags || []).map((tag: string) => (
              <span key={tag} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-violet-100 hover:text-violet-700 cursor-pointer transition-all">{tag}</span>
            ))}
          </div>
        )}

        {/* Back button */}
        <div className="mt-10">
          <button
            onClick={() => navigate('/news')}
            className="flex items-center gap-2 text-violet-600 font-bold text-sm hover:text-violet-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all news
          </button>
        </div>
      </article>
    </div>
  );
}
