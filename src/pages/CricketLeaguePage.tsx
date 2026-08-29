import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw, Maximize2, Minimize2, Trophy, CheckCircle, AlertTriangle, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CricketLeaguePage() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [status, setStatus] = useState<{ connected: boolean; path: string; message: string } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    fetch('/api/cricket-league/status')
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);
        setLoadingStatus(false);
      })
      .catch((err) => {
        console.error('Failed to check Cricket Premier League status:', err);
        setStatus({
          connected: false,
          path: 'C:\\scratch\\cricket-premier-league',
          message: 'Unable to reach backend status server',
        });
        setLoadingStatus(false);
      });
  }, []);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const appPath = '/cricket-league-app/index.html';

  return (
    <div className={`min-h-screen bg-slate-900 text-white font-sans transition-all duration-300 ${isFullscreen ? 'p-0' : 'p-4 md:p-6'}`}>
      {!isFullscreen && (
        <div className="max-w-7xl mx-auto mb-4">
          {/* Navigation Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white transition-all flex items-center gap-2 border border-slate-600/50"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">Dashboard</span>
              </button>
              <div className="h-6 w-px bg-slate-700" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white flex items-center gap-2">
                    Cricket Premier League
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                      Connected Project
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Folder className="w-3.5 h-3.5 text-slate-500" />
                    <span>C:\scratch\cricket-premier-league</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRefresh}
                className="px-3.5 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-600 transition-all active:scale-95"
                title="Reload Live App"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Reload</span>
              </button>

              <a
                href={appPath}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                title="Open in New Tab"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Direct</span>
              </a>

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all"
                title="Toggle Fullscreen"
              >
                <Maximize2 className="w-4 h-4 text-indigo-400" />
              </button>
            </div>
          </div>

          {/* Connection Info Banner */}
          {!loadingStatus && (
            <div className="mt-3 flex items-center justify-between text-xs px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-slate-300">
              <div className="flex items-center gap-2">
                {status?.connected ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>
                      Live connection active — edits made in <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-[11px]">C:\scratch\cricket-premier-league</code> sync in real time.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>{status?.message || 'Folder not found on local disk'}</span>
                  </>
                )}
              </div>
              <span className="text-slate-500 hidden md:inline">Standalone Project Integration</span>
            </div>
          )}
        </div>
      )}

      {/* Embedded Application Frame */}
      <div
        className={`relative w-full ${
          isFullscreen ? 'h-screen rounded-none border-none' : 'max-w-7xl mx-auto h-[calc(100vh-180px)] min-h-[600px] rounded-2xl border border-slate-700/80'
        } bg-slate-950 shadow-2xl overflow-hidden`}
      >
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-50 p-2.5 rounded-xl bg-slate-900/90 text-white border border-slate-700 shadow-2xl hover:bg-slate-800 transition-all"
            title="Exit Fullscreen"
          >
            <Minimize2 className="w-5 h-5 text-indigo-400" />
          </button>
        )}

        <iframe
          key={iframeKey}
          src={appPath}
          title="Cricket Premier League"
          className="w-full h-full border-0 bg-white"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        />
      </div>
    </div>
  );
}
