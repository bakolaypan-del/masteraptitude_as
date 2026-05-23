import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, orderBy, where, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Search, Tag, Eye, Calendar, Download, Play, BookOpen, FileText, Share2, Copy, Check, TrendingUp } from 'lucide-react';

// ── Config per category ─────────────────────────────────────────────────────
const CONFIG = {
  affairs: {
    collection: 'affairs',
    label: 'Current Affairs',
    color: 'orange',
    icon: '📰',
    accentBg: 'bg-orange-600',
    accentText: 'text-orange-600',
    accentBg50: 'bg-orange-50',
    badgeLabel: (item: any) => item.date || '',
    actionLabel: 'Read More',
    actionIcon: <FileText className="w-3.5 h-3.5" />,
    seoTitle: 'Current Affairs | Master Aptitude by Suman Sir',
    seoDesc: 'Latest current affairs for WBP, KP, PSC, Railway and WBCS aspirants. Daily updates by Suman Sir.',
  },
  practice: {
    collection: 'practice_sets',
    label: 'Practice Sets',
    color: 'teal',
    icon: '📝',
    accentBg: 'bg-teal-600',
    accentText: 'text-teal-600',
    accentBg50: 'bg-teal-50',
    badgeLabel: (item: any) => item.subject || 'General',
    actionLabel: 'Download',
    actionIcon: <Download className="w-3.5 h-3.5" />,
    seoTitle: 'Practice Sets | Master Aptitude by Suman Sir',
    seoDesc: 'Free practice sets and PDF downloads for WBP, KP, PSC, Railway exams. MCQ sets by Suman Sir.',
  },
  notes: {
    collection: 'notes',
    label: 'Study Notes',
    color: 'emerald',
    icon: '📚',
    accentBg: 'bg-emerald-600',
    accentText: 'text-emerald-600',
    accentBg50: 'bg-emerald-50',
    badgeLabel: (item: any) => item.subject || 'General',
    actionLabel: 'View Notes',
    actionIcon: <BookOpen className="w-3.5 h-3.5" />,
    seoTitle: 'Study Notes | Master Aptitude by Suman Sir',
    seoDesc: 'Comprehensive study notes for WBP, PSC, Railway and KP exams. Download PDF notes by Suman Sir.',
  },
  video: {
    collection: 'videos',
    label: 'Vlog & Videos',
    color: 'rose',
    icon: '🎬',
    accentBg: 'bg-rose-600',
    accentText: 'text-rose-600',
    accentBg50: 'bg-rose-50',
    badgeLabel: (item: any) => item.subject || 'General',
    actionLabel: 'Watch Now',
    actionIcon: <Play className="w-3.5 h-3.5" />,
    seoTitle: 'Video Classes | Master Aptitude by Suman Sir',
    seoDesc: 'Watch free video classes and vlogs for WBP, PSC, Railway exam preparation by Suman Sir.',
  },
} as const;

type Category = keyof typeof CONFIG;

// Helper: YouTube video ID → thumbnail
function ytThumb(url: string): string {
  const m = url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : '';
}

// Share menu
function ShareBtn({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = encodeURIComponent(`${title}\n${url}`);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => { setCopied(false); setOpen(false); }, 1200); });
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(p => !p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
        <Share2 className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-8 z-20 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 min-w-[140px]">
            {[
              { label: '💬 WhatsApp', href: `https://wa.me/?text=${text}` },
              { label: '✈️ Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}` },
              { label: '📘 Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
            ].map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors">
                {s.label}
              </a>
            ))}
            <div className="h-px bg-slate-100 my-1" />
            <button onClick={copy} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 w-full text-xs font-bold text-slate-700 transition-colors">
              {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Content Card ─────────────────────────────────────────────────────────────
function ContentCard({ item, cfg, appUrl }: { item: any; cfg: typeof CONFIG[Category]; appUrl: string; key?: React.Key }) {
  const thumb = item.thumbnailUrl || (item.link && cfg.collection === 'videos' ? ytThumb(item.link) : '');
  const shareUrl = item.link || appUrl;
  const displayDate = item.date || (item.createdAt?.seconds
    ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '');

  const handleClick = () => {
    if (item.id) {
      updateDoc(doc(db, cfg.collection, item.id), { viewCount: increment(1) }).catch(() => {});
    }
    if (item.link) window.open(item.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group">
      {/* Thumbnail */}
      {thumb ? (
        <div className="aspect-video overflow-hidden bg-slate-100">
          <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        </div>
      ) : (
        <div className={`aspect-video ${cfg.accentBg50} flex items-center justify-center text-4xl`}>
          {cfg.icon}
        </div>
      )}

      <div className="p-5">
        {/* Badge + date row */}
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${cfg.accentBg50} ${cfg.accentText}`}>
            {cfg.badgeLabel(item)}
          </span>
          <div className="flex items-center gap-1 text-slate-400">
            {displayDate && <><Calendar className="w-3 h-3" /><span className="text-[10px] font-medium">{displayDate}</span></>}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-black text-slate-800 text-sm leading-tight mb-2 line-clamp-2">{item.title}</h3>

        {/* Description */}
        {item.description && (
          <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-2">{item.description}</p>
        )}

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map((t: string) => (
              <span key={t} className="flex items-center gap-0.5 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-bold">
                <Tag className="w-2.5 h-2.5" />{t}
              </span>
            ))}
          </div>
        )}

        {/* Footer: view count + share + action */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <div className="flex items-center gap-1 text-slate-400">
            <Eye className="w-3 h-3" />
            <span className="text-[10px] font-medium">{item.viewCount || 0} views</span>
          </div>
          <div className="flex items-center gap-1">
            <ShareBtn url={shareUrl} title={item.title} />
            {item.link && (
              <button onClick={handleClick}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-black ${cfg.accentBg} hover:opacity-90 transition-all`}>
                {cfg.actionIcon} {cfg.actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContentListPage({ category }: { category: Category }) {
  const cfg = CONFIG[category];
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const APP_URL = 'https://masteraptitude.vercel.app';

  // SEO meta tags
  useEffect(() => {
    document.title = cfg.seoTitle;
    const setMeta = (name: string, content: string, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel) as HTMLMetaElement;
      if (!el) { el = document.createElement('meta'); prop ? el.setAttribute('property', name) : el.setAttribute('name', name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('description', cfg.seoDesc);
    setMeta('keywords', `WBP, KP, PSC, Railway, WBCS, ${cfg.label}, Suman Sir, Master Aptitude`);
    setMeta('og:title', cfg.seoTitle, true);
    setMeta('og:description', cfg.seoDesc, true);
    setMeta('og:url', `${APP_URL}/${category === 'affairs' ? 'current-affairs' : category === 'practice' ? 'practice-set' : category === 'notes' ? 'study-notes' : 'vlog'}`, true);
    setMeta('og:type', 'website', true);
    return () => { document.title = 'Master Aptitude'; };
  }, [category]);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const q = query(collection(db, cfg.collection), where('status', '==', 'published'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q).catch(async () => {
          // Fallback: fetch all (for items without status field)
          return getDocs(query(collection(db, cfg.collection), orderBy('createdAt', 'desc')));
        });
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort: pinned first
        all.sort((a: any, b: any) => (b.pinToHomepage ? 1 : 0) - (a.pinToHomepage ? 1 : 0));
        setItems(all);
      } catch { setItems([]); }
      finally { setLoading(false); }
    };
    fetch_();
  }, [category]);

  const filtered = items.filter(item =>
    !search ||
    item.title?.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase()) ||
    (item.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const pinned = filtered.filter((i: any) => i.pinToHomepage);
  const rest = filtered.filter((i: any) => !i.pinToHomepage);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xl shrink-0">{cfg.icon}</span>
          <h1 className="text-lg font-black text-slate-800 flex-1">{cfg.label}</h1>
          <div className="relative w-44 sm:w-60">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${cfg.label.toLowerCase()}...`}
              className="w-full bg-slate-100 rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-300 border-none" />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 animate-pulse">
                <div className="aspect-video bg-slate-100 rounded-t-3xl" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Pinned */}
            {pinned.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">📌 Pinned</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pinned.map(item => <ContentCard key={item.id} item={item} cfg={cfg} appUrl={APP_URL} />)}
                </div>
              </div>
            )}

            {/* All */}
            {rest.length > 0 && (
              <div>
                {pinned.length > 0 && <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-4">All {cfg.label}</h2>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map(item => <ContentCard key={item.id} item={item} cfg={cfg} appUrl={APP_URL} />)}
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">{cfg.icon}</div>
                <p className="text-slate-400 font-bold">{search ? `No results for "${search}"` : `No ${cfg.label.toLowerCase()} available yet.`}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
