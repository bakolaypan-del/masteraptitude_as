import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, CheckCheck, Sparkles, Clock, ChevronRight, Trash2 } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from '../lib/mockFirestore';
import { db } from '../lib/firebase';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category?: string;
  type?: 'mock' | 'sectional' | 'pyq' | 'practice' | 'general';
  testId?: string;
  targetTab?: string;
  isPinned?: boolean;
  createdAt: number;
}

interface NotificationBellProps {
  onNavigateTab?: (tab: string, category?: string) => void;
  onOpenTest?: (testId: string) => void;
  activeTests?: any[];
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onNavigateTab,
  onOpenTest,
  activeTests = []
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ma_read_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ma_hidden_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll on mobile when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fetch notifications
  useEffect(() => {
    let isMounted = true;
    const fetchNotifications = async () => {
      try {
        const notifRef = collection(db, 'notifications');
        const q = query(notifRef, orderBy('createdAt', 'desc'), limit(15));
        const snap = await getDocs(q);
        
        let dbNotifs: NotificationItem[] = [];
        if (!snap.empty) {
          snap.forEach(doc => {
            const data = doc.data();
            dbNotifs.push({
              id: doc.id,
              title: data.title || '🎯 New Update Available',
              message: data.message || 'Check out the latest content on Master Aptitude.',
              category: data.category,
              type: data.type || 'mock',
              testId: data.testId,
              targetTab: data.targetTab || 'home',
              isPinned: data.isPinned || false,
              createdAt: Number(data.createdAt) || Date.now()
            });
          });
        }

        const dynamicTestNotifs: NotificationItem[] = (activeTests || [])
          .slice(0, 5)
          .map((t: any) => {
            const isPyq = t.testType === 'pyq' || t.isPYQ;
            const isSec = t.testType === 'sectional';
            return {
              id: `test_notif_${t.id}`,
              title: isPyq ? `📄 New PYQ Released: ${t.category || 'WBPSC'}` : isSec ? `📚 New Sectional Mock: ${t.category}` : `🎯 New Mock Test: ${t.title}`,
              message: `New test '${t.title}' is now available. Click to start practicing!`,
              category: t.category,
              type: isPyq ? 'pyq' : isSec ? 'sectional' : 'mock',
              testId: t.id,
              targetTab: isPyq ? 'pyq' : isSec ? 'mock_sectional' : 'home',
              createdAt: t.createdAt ? Number(t.createdAt) : Date.now() - 3600000
            };
          });

        const combined = [...dbNotifs];
        dynamicTestNotifs.forEach(dt => {
          if (!combined.some(c => c.id === dt.id || c.testId === dt.testId)) {
            combined.push(dt);
          }
        });

        combined.sort((a, b) => b.createdAt - a.createdAt);

        if (isMounted) {
          setNotifications(combined);
        }
      } catch (err) {
        console.warn("Failed to load notifications:", err);
      }
    };

    fetchNotifications();

    return () => {
      isMounted = false;
    };
  }, [activeTests]);

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('ma_read_notification_ids', JSON.stringify(allIds));
    } catch (_) {}
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIds = notifications.map(n => n.id);
    setHiddenIds(allIds);
    try {
      localStorage.setItem('ma_hidden_notification_ids', JSON.stringify(allIds));
    } catch (_) {}
  };

  const handleMarkSingleRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      try {
        localStorage.setItem('ma_read_notification_ids', JSON.stringify(updated));
      } catch (_) {}
    }
  };

  const handleHideSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...hiddenIds, id];
    setHiddenIds(updated);
    try {
      localStorage.setItem('ma_hidden_notification_ids', JSON.stringify(updated));
    } catch (_) {}
  };

  const visibleNotifs = notifications.filter(n => !hiddenIds.includes(n.id));
  const unreadCount = visibleNotifs.filter(n => !readIds.includes(n.id)).length;
  const filteredNotifs = activeFilter === 'unread' 
    ? visibleNotifs.filter(n => !readIds.includes(n.id))
    : visibleNotifs;

  const formatTimeAgo = (timestamp: number) => {
    const diffMins = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 sm:p-2.5 rounded-2xl bg-white border border-slate-200/90 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 shadow-xs transition-all duration-200 cursor-pointer flex items-center justify-center group"
        title="Notifications"
      >
        <Bell className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] px-1 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 min-w-[20px] px-1 bg-gradient-to-r from-rose-500 to-red-600 text-[10px] font-black text-white items-center justify-center shadow-md border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Render Modal via Portal directly onto document.body */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-hidden select-none">
          {/* Opaque Dimming Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          {/* Modal Card Container */}
          <div className="fixed inset-x-3 top-16 max-h-[85vh] sm:max-h-[540px] sm:fixed sm:top-16 sm:right-6 sm:left-auto sm:w-[400px] bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-200/90 overflow-hidden flex flex-col z-[100000] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight flex items-center gap-2">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium">
                    Latest updates, mock tests & practice sets
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Filter Bar & Action Buttons */}
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveFilter('all'); }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  All ({visibleNotifs.length})
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveFilter('unread'); }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    activeFilter === 'unread'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 hover:underline cursor-pointer"
                    title="Mark all notifications as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> All Read
                  </button>
                )}
                {visibleNotifs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[10px] font-black text-rose-600 hover:text-rose-800 flex items-center gap-0.5 hover:underline cursor-pointer border-l border-slate-200 pl-2"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Notifications Content Scroll Container */}
            <div className="overflow-y-auto divide-y divide-slate-100 flex-1 min-h-0 bg-white">
              {filteredNotifs.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-black text-slate-800">No notifications found</p>
                  <p className="text-[11px] text-slate-500">You're all caught up with your latest practice tests!</p>
                </div>
              ) : (
                filteredNotifs.map(item => {
                  const isRead = readIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleMarkSingleRead(item.id)}
                      className={`p-4 transition-colors relative group cursor-pointer ${
                        isRead ? 'bg-white hover:bg-slate-50/90' : 'bg-indigo-50/50 hover:bg-indigo-50/80'
                      }`}
                    >
                      {!isRead && (
                        <span className="absolute top-4 left-2 w-2 h-2 rounded-full bg-rose-500"></span>
                      )}

                      <div className="pl-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-black text-xs text-slate-900 leading-snug flex items-center gap-1.5">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatTimeAgo(item.createdAt)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleHideSingle(item.id, e)}
                              className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-1"
                              title="Hide notification"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                          {item.message}
                        </p>

                        <div className="pt-1 flex items-center justify-between">
                          {item.category && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {item.category}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkSingleRead(item.id);
                              setIsOpen(false);
                              if (item.testId && onOpenTest) {
                                onOpenTest(item.testId);
                              } else if (item.targetTab && onNavigateTab) {
                                onNavigateTab(item.targetTab, item.category);
                              }
                            }}
                            className="ml-auto inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            View Details <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0">
              <p className="text-[10px] font-extrabold text-slate-500">
                🔔 Notifications update automatically whenever new tests are published
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
