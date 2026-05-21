import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Home, BookOpen, Radio, GraduationCap, User } from 'lucide-react';

type Tab = 'home' | 'mock_landing' | 'live_test' | 'learn_landing' | 'profile';

const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'home',         icon: Home,          label: 'Home'     },
  { id: 'mock_landing', icon: BookOpen,       label: 'Tests'    },
  { id: 'live_test',    icon: Radio,          label: 'Live'     },
  { id: 'learn_landing',icon: GraduationCap,  label: 'Learn'    },
  { id: 'profile',      icon: User,           label: 'Profile'  },
];

const LEARN_TABS = new Set(['video', 'notes', 'affairs', 'practice', 'learn_landing']);
const MOCK_TABS  = new Set(['mock_topic', 'mock_sectional', 'mock_full', 'mock_landing']);

function resolveActive(tab: string): Tab {
  if (LEARN_TABS.has(tab)) return 'learn_landing';
  if (MOCK_TABS.has(tab))  return 'mock_landing';
  if (['pyq','pattern','about','contact'].includes(tab)) return 'home';
  return (tab as Tab) || 'home';
}

export default function AppBottomNav() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'home';
  const activeNav = resolveActive(activeTab);

  const navigate = (id: Tab) => setSearchParams({ tab: id, cat: '' });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        background: 'rgba(255,255,255,0.97)',
        borderTop: '1px solid #e8ecf3',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(16px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
      <div className="flex items-stretch h-[60px]">
        {tabs.map(({ id, icon: Icon, label }) => {
          const isActive = activeNav === id;
          return (
            <button key={id} onClick={() => navigate(id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all active:scale-90"
              style={{ WebkitTapHighlightColor: 'transparent' }}>
              {/* Active indicator pill */}
              {isActive && (
                <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full"
                  style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
              )}
              <div className={`flex items-center justify-center w-7 h-7 rounded-xl transition-all ${isActive ? 'bg-indigo-50' : ''}`}>
                <Icon
                  className={`transition-all ${isActive ? 'w-5 h-5' : 'w-4.5 h-4.5 w-[18px] h-[18px]'}`}
                  style={{ color: isActive ? '#6366f1' : '#94a3b8', strokeWidth: isActive ? 2.5 : 1.8 }}
                />
              </div>
              <span className="text-[9px] font-bold leading-none"
                style={{ color: isActive ? '#6366f1' : '#94a3b8', fontWeight: isActive ? 800 : 600 }}>
                {label}
              </span>
              {/* Live dot for Live tab */}
              {id === 'live_test' && (
                <span className="absolute top-2 right-[calc(50%-14px)] w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
