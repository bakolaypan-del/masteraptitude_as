import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import TestRunner from './pages/TestRunner';
import TypingTestList from './pages/TypingTestList';
import TypingTestRunner from './pages/TypingTestRunner';
import TypingTestAnalysis from './pages/TypingTestAnalysis';
import { NewsListPage, NewsDetailPage } from './pages/NewsPage';
import InstallApp from './pages/InstallApp';
import AnalysisPage from './pages/AnalysisPage';
import ReviewPage from './pages/ReviewPage';
import PaidMockPage from './pages/PaidMockPage';
import ContentListPage from './pages/ContentListPage';
import CurrentAffairsPage from './pages/CurrentAffairsPage';

function SecurityWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    // 1. Disable Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Disable Developer Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Disable Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J (DevTools)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) {
        e.preventDefault();
        return false;
      }
      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      // Disable Ctrl+S (Save Page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
    };

    // 3. Prevent Print Screen (Limited effectiveness but adds friction)
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('');
        alert('Screenshots are disabled for security reasons.');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <>
      {children}
      {/* Watermark Overlay - Display user info if logged in */}
      <div className="security-watermark">
        {Array.from({ length: 48 }).map((_, i) => (
          <div key={i} className="watermark-item">
            {user?.email || 'MASTER APTITUDE'}
          </div>
        ))}
      </div>
    </>
  );
}

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SecurityWrapper>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/install" element={<InstallApp />} />
            <Route path="/review/:code" element={<ReviewPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/test/:testId" element={
              <ProtectedRoute>
                <TestRunner />
              </ProtectedRoute>
            } />

            <Route path="/analysis/:resultId" element={
              <ProtectedRoute>
                <AnalysisPage />
              </ProtectedRoute>
            } />
            
            <Route path="/paid-mock" element={
              <ProtectedRoute>
                <PaidMockPage />
              </ProtectedRoute>
            } />

            <Route path="/typing-test" element={
              <ProtectedRoute>
                <TypingTestList />
              </ProtectedRoute>
            } />
            
            <Route path="/typing-test/:id" element={
              <ProtectedRoute>
                <TypingTestRunner />
              </ProtectedRoute>
            } />
            
            <Route path="/typing-test/:id/analysis" element={
              <ProtectedRoute>
                <TypingTestAnalysis />
              </ProtectedRoute>
            } />
            
            <Route path="/current-affairs" element={<ProtectedRoute><CurrentAffairsPage /></ProtectedRoute>} />
            <Route path="/practice-set" element={<ProtectedRoute><ContentListPage category="practice" /></ProtectedRoute>} />
            <Route path="/study-notes" element={<ProtectedRoute><ContentListPage category="notes" /></ProtectedRoute>} />
            <Route path="/vlog" element={<ProtectedRoute><ContentListPage category="video" /></ProtectedRoute>} />

            <Route path="/news" element={
              <ProtectedRoute>
                <NewsListPage />
              </ProtectedRoute>
            } />

            <Route path="/news/:slugOrId" element={
              <ProtectedRoute>
                <NewsDetailPage />
              </ProtectedRoute>
            } />

            <Route path="/admin/*" element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </SecurityWrapper>
      </BrowserRouter>
    </AuthProvider>
  );
}

