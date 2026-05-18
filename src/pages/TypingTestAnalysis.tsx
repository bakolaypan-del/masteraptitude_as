import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Clock, ArrowLeft, Trophy, AlertCircle, BarChart3, CheckCircle2, Calendar, TrendingUp } from 'lucide-react';

interface TypingResult {
  id: string;
  testId: string;
  testTitle: string;
  attemptNo: number;
  originalParagraph: string;
  typedText: string;
  wpm: number;
  accuracy: number;
  errors: number;
  correctWords: number;
  wrongWords: number;
  timeTakenMinutes: number;
  timestamp: number;
}

export default function TypingTestAnalysis() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [currentResult, setCurrentResult] = useState<TypingResult | null>(null);
  const [history, setHistory] = useState<TypingResult[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user || !id) return;
      try {
        const token = await user.getIdToken();
        
        // Fetch specific result details
        const res = await fetch(`/api/typing-result/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const resultData = await res.json();
          setCurrentResult(resultData);

          // Fetch all results to build history and graph
          const historyRes = await fetch('/api/typing-results/student', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (historyRes.ok) {
            const allResults: TypingResult[] = await historyRes.json();
            // Filter history for THIS specific test, ordered by attemptNo ascending
            const testHistory = allResults
              .filter(r => r.testId === resultData.testId)
              .sort((a, b) => a.attemptNo - b.attemptNo);
            setHistory(testHistory);
          }
        } else {
          console.error("Result not found");
          navigate('/typing-test');
        }
      } catch (err) {
        console.error("Failed to load analysis details", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
        <div className="text-center">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-900/50">
              <BarChart3 className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-500/30 animate-ping" />
          </div>
          <p className="text-indigo-200 font-bold tracking-wider animate-pulse">Loading detailed analysis...</p>
        </div>
      </div>
    );
  }

  if (!currentResult) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
        <div className="text-center">
          <p className="text-rose-400 font-bold text-xl mb-4">Result Not Found</p>
          <button onClick={() => navigate('/typing-test')} className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:from-indigo-500 hover:to-violet-500 transition-all">
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  // Calculate best metrics across history
  const bestWpm = Math.max(...history.map(r => r.wpm), 0);
  const bestAccuracy = Math.max(...history.map(r => r.accuracy), 0);
  const totalAttempts = history.length;

  const formatTime = (minutes: number) => {
    const totalSeconds = Math.round(minutes * 60);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to render the diff between original and typed text
  const renderTypedDiff = () => {
    const original = currentResult.originalParagraph || "";
    const typed = currentResult.typedText || "";
    const maxLength = Math.max(original.length, typed.length);
    const chars: React.ReactNode[] = [];

    for (let i = 0; i < maxLength; i++) {
      if (i < original.length) {
        const origChar = original[i];
        if (i < typed.length) {
          const typedChar = typed[i];
          if (origChar === typedChar) {
            chars.push(
              <span key={i} className="text-emerald-400 bg-emerald-500/10 font-mono">
                {origChar}
              </span>
            );
          } else {
            // Mistyped character
            chars.push(
              <span key={i} className="text-rose-400 bg-rose-500/10 underline decoration-rose-500 font-mono" title={`Expected: "${origChar}", Typed: "${typedChar}"`}>
                {typedChar === " " ? "_" : typedChar}
              </span>
            );
          }
        } else {
          // Untyped original characters
          chars.push(
            <span key={i} className="text-slate-500 font-mono">
              {origChar}
            </span>
          );
        }
      } else {
        // Extra characters typed by student past paragraph end
        chars.push(
          <span key={i} className="text-red-400 bg-red-900/30 underline font-mono">
            {typed[i]}
          </span>
        );
      }
    }

    return <div className="leading-relaxed text-lg tracking-wide whitespace-pre-wrap">{chars}</div>;
  };

  // Render Premium custom SVG Progress Graph
  const renderProgressGraph = () => {
    if (history.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center h-48 bg-slate-800/40 rounded-2xl border border-slate-700/50 text-slate-500">
          <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-bold">Need at least 2 attempts to generate progress graph.</p>
        </div>
      );
    }

    // Graph plotting logic
    const width = 500;
    const height = 150;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    const maxWpmVal = Math.max(...history.map(r => r.wpm), 40) + 10;
    const minWpmVal = Math.max(Math.min(...history.map(r => r.wpm), 20) - 10, 0);

    const getX = (index: number) => {
      if (history.length === 1) return paddingLeft + graphWidth / 2;
      return paddingLeft + (index / (history.length - 1)) * graphWidth;
    };

    const getY = (wpmVal: number) => {
      const scale = (wpmVal - minWpmVal) / (maxWpmVal - minWpmVal);
      return height - paddingBottom - scale * graphHeight;
    };

    // Construct path line
    const points = history.map((r, i) => `${getX(i)},${getY(r.wpm)}`).join(' ');

    return (
      <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 shadow-xl">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-fuchsia-400" />
          WPM Progress Curve
        </h3>
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px] overflow-visible">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
              const yVal = paddingTop + p * graphHeight;
              const wpmLabel = Math.round(maxWpmVal - p * (maxWpmVal - minWpmVal));
              return (
                <g key={idx} className="opacity-20">
                  <line x1={paddingLeft} y1={yVal} x2={width - paddingRight} y2={yVal} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1" />
                  <text x={paddingLeft - 8} y={yVal + 4} fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="end">{wpmLabel}</text>
                </g>
              );
            })}

            {/* Line connecting points */}
            <polyline fill="none" stroke="url(#line-gradient)" strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />

            {/* Area under the line */}
            <path
              d={`M ${getX(0)} ${height - paddingBottom} L ${points} L ${getX(history.length - 1)} ${height - paddingBottom} Z`}
              fill="url(#area-gradient)"
              className="opacity-25"
            />

            {/* Circle dots & labels */}
            {history.map((r, i) => (
              <g key={r.id}>
                <circle
                  cx={getX(i)}
                  cy={getY(r.wpm)}
                  r="5"
                  className={`${r.id === id ? 'fill-fuchsia-500 stroke-white' : 'fill-indigo-500 stroke-slate-900'} stroke-2 cursor-pointer transition-all`}
                  title={`Attempt ${r.attemptNo}: ${r.wpm} WPM`}
                />
                <text x={getX(i)} y={getY(r.wpm) - 10} fill="#ffffff" fontSize="9" fontWeight="extrabold" textAnchor="middle">
                  {r.wpm}
                </text>
                <text x={getX(i)} y={height - 12} fill="#64748b" fontSize="8" fontWeight="black" textAnchor="middle">
                  Att {r.attemptNo}
                </text>
              </g>
            ))}

            {/* Gradients */}
            <defs>
              <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
              <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen text-slate-300 font-sans flex flex-col" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
      {/* Fixed blur orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.08)' }} />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(124,58,237,0.06)' }} />

      <header className="sticky top-0 z-10 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(15,12,41,0.8)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/typing-test')}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Attempt #{currentResult.attemptNo} Analysis</span>
            <h1 className="text-lg font-black text-white">{currentResult.testTitle}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold px-4 py-2 rounded-xl border border-white/10"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Calendar className="w-4 h-4 text-indigo-400" />
          {new Date(currentResult.timestamp).toLocaleString()}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-8">
        
        {/* Performance Badges and Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-800/40 rounded-3xl p-6 border border-indigo-500/20 shadow-xl flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400"><Trophy className="w-7 h-7" /></div>
            <div>
              <p className="text-xs text-indigo-300 font-black uppercase tracking-widest">Personal Best Speed</p>
              <p className="text-3xl font-black text-white">{bestWpm} <span className="text-sm text-slate-500 font-medium">WPM</span></p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/40 to-slate-800/40 rounded-3xl p-6 border border-emerald-500/20 shadow-xl flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400"><CheckCircle2 className="w-7 h-7" /></div>
            <div>
              <p className="text-xs text-emerald-300 font-black uppercase tracking-widest">Best Accuracy</p>
              <p className="text-3xl font-black text-white">{bestAccuracy}%</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-fuchsia-900/40 to-slate-800/40 rounded-3xl p-6 border border-fuchsia-500/20 shadow-xl flex items-center gap-5">
            <div className="w-14 h-14 bg-fuchsia-500/20 rounded-2xl flex items-center justify-center text-fuchsia-400"><BarChart3 className="w-7 h-7" /></div>
            <div>
              <p className="text-xs text-fuchsia-300 font-black uppercase tracking-widest">Total Attempts</p>
              <p className="text-3xl font-black text-white">{totalAttempts}</p>
            </div>
          </div>
        </div>

        {/* Current Attempt Stats & Progress Curve */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Current Attempt Detailed Metrics Card */}
          <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Attempt #{currentResult.attemptNo} Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Speed</span>
                  <span className="text-2xl font-black text-indigo-400">{currentResult.wpm} <span className="text-xs font-semibold text-slate-500">WPM</span></span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Accuracy</span>
                  <span className="text-2xl font-black text-emerald-400">{currentResult.accuracy}%</span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Correct Words</span>
                  <span className="text-2xl font-black text-white">{currentResult.correctWords}</span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Errors</span>
                  <span className="text-2xl font-black text-rose-400">{currentResult.errors}</span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Wrong Words</span>
                  <span className="text-2xl font-black text-orange-400">{currentResult.wrongWords}</span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Time Taken</span>
                  <span className="text-2xl font-black text-sky-400">{formatTime(currentResult.timeTakenMinutes)}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate(`/typing-test/${currentResult.testId}`)}
              className="w-full text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all mt-6 hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
            >
              ↩ Reattempt This Test
            </button>
          </div>

          {/* Graph Section */}
          <div className="lg:col-span-2">
            {renderProgressGraph()}
          </div>
        </div>

        {/* Typed Comparison Text Diff */}
        <div className="bg-slate-800/40 p-6 md:p-8 rounded-3xl border border-slate-700/50 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-400" />
            Typed Comparison (Keystroke Breakdown)
          </h3>
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 max-h-[350px] overflow-y-auto shadow-inner select-none">
            {renderTypedDiff()}
          </div>
          <div className="flex gap-6 text-xs font-bold text-slate-500">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/30 rounded"></span> Correct Characters</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-rose-500/20 border border-rose-500/30 rounded"></span> Mistakes</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-800 rounded"></span> Remaining (Untyped)</div>
          </div>
        </div>

        {/* Historical Attempts Table */}
        <div className="bg-slate-800/40 rounded-3xl border border-slate-700/50 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Complete Attempt History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/30 text-slate-500 text-xs uppercase font-black tracking-widest border-b border-slate-700/50">
                  <th className="p-4 pl-6">Attempt</th>
                  <th className="p-4">WPM</th>
                  <th className="p-4">Accuracy</th>
                  <th className="p-4">Errors</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {history.map((r) => (
                  <tr key={r.id} className={`hover:bg-slate-800/20 transition-colors ${r.id === id ? 'bg-indigo-500/5' : ''}`}>
                    <td className="p-4 pl-6 font-black text-white">
                      #{r.attemptNo} {r.id === id && <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded ml-2 font-bold uppercase">Current View</span>}
                    </td>
                    <td className="p-4 text-slate-100 font-extrabold">{r.wpm} WPM</td>
                    <td className="p-4 font-extrabold text-emerald-400">{r.accuracy}%</td>
                    <td className="p-4 font-bold text-rose-400">{r.errors}</td>
                    <td className="p-4 text-xs text-slate-500">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="p-4 pr-6 text-right">
                      {r.id !== id && (
                        <button
                          onClick={() => navigate(`/typing-test/${r.id}/analysis`)}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          View Stats
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
