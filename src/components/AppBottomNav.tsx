import React from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Radio, User, ShoppingBag, HelpCircle } from 'lucide-react';

type Tab = 'home' | 'my_purchases' | 'mock_landing' | 'live_test' | 'help' | 'profile';

const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'home',         icon: Home,          label: 'Home'        },
  { id: 'my_purchases', icon: ShoppingBag,   label: 'My Purchase' },
  { id: 'mock_landing', icon: BookOpen,      label: 'Test Series' },
  { id: 'help',         icon: HelpCircle,    label: 'Help'        },
  { id: 'profile',      icon: User,          label: 'Profile'     },
];

const MOCK_TABS = new Set(['mock_topic', 'mock_sectional', 'mock_full', 'mock_landing', 'mock_challenge']);

function resolveActive(pathname: string, activeTab: string): Tab {
  if (pathname === '/paid-mock') return 'my_purchases';
  if (activeTab === 'contact' || activeTab === 'about') return 'help';
  if (MOCK_TABS.has(activeTab)) return 'mock_landing';
  if (['home', 'my_purchases', 'help', 'profile'].includes(activeTab)) {
    return activeTab as Tab;
  }
  return 'home';
}

export default function AppBottomNav() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigateRoute = useNavigate();
  const location = useLocation();
  
  const activeTab = searchParams.get('tab') || 'home';
  const activeNav = resolveActive(location.pathname, activeTab);

  const handleClick = (id: Tab) => {
    if (id === 'my_purchases') {
      navigateRoute('/paid-mock');
    } else if (id === 'help') {
      if (location.pathname !== '/dashboard') {
        navigateRoute('/dashboard?tab=contact');
      } else {
        setSearchParams({ tab: 'contact', cat: '' });
      }
    } else {
      if (location.pathname !== '/dashboard') {
        navigateRoute(`/dashboard?tab=${id}`);
      } else {
        setSearchParams({ tab: id, cat: '' });
      }
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden py-1 px-2"
      style={{
        background: 'rgba(255,255,255,0.98)',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(16px)',
        paddingBottom: 'calc(4px + env(safe-area-inset-bottom))',
      }}>
      <div className="flex items-center justify-between h-[56px] gap-1">
        {tabs.map(({ id, icon: Icon, label }) => {
          const isActive = activeNav === id;
          return (
            <button key={id} onClick={() => handleClick(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 relative transition-all active:scale-95 py-1.5 px-1 rounded-2xl ${
                isActive ? 'bg-orange-500/10 border border-orange-200' : ''
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}>
              <Icon
                className={`transition-all ${isActive ? 'w-5 h-5 text-orange-600' : 'w-4.5 h-4.5 text-slate-400'}`}
                style={{ strokeWidth: isActive ? 2.5 : 1.8 }}
              />
              <span className={`text-[10px] leading-none ${isActive ? 'font-black text-orange-600' : 'font-semibold text-slate-500'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
