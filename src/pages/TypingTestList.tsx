import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Keyboard, Clock, Play, Loader2, ArrowLeft, Trophy, Eye, Zap, Target, CheckCircle, Star } from 'lucide-react';

interface TypingTest {
  id: string;
  title: string;
  duration: number;
  difficulty: string;
  language: string;
  isActive: boolean;
}

interface TypingResult {
  id: string;
  testId: string;
  attemptNo: number;
  wpm: number;
  accuracy: number;
  errors: number;
  timestamp: number;
}

const DURATIONS = [
  { label: '1 Min', value: '1', icon: '⚡', color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-200' },
  { label: '2 Min', value: '2', icon: '🕐', color: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-200' },
  { label: '3 Min', value: '3', icon: '⏱️', color: 'from-violet-500 to-indigo-600', shadow: 'shadow-violet-200' },
  { label: '5 Min', value: '5', icon: '🎯', color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-200' },
  { label: '10 Min', value: '10', icon: '🏆', color: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-200' },
];

const DIFFICULTIES = [
  { label: 'Easy', value: 'easy', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', active: 'bg-emerald-500 text-white border-emerald-500', emoji: '😊' },
  { label: 'Moderate', value: 'moderate', color: 'bg-amber-100 text-amber-700 border-amber-300', active: 'bg-amber-500 text-white border-amber-500', emoji: '🔥' },
  { label: 'Hard', value: 'hard', color: 'bg-rose-100 text-rose-700 border-rose-300', active: 'bg-rose-500 text-white border-rose-500', emoji: '💪' },
];

export default function TypingTestList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<TypingTest[]>([]);
  const [results, setResults] = useState<TypingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [loadedFilter, setLoadedFilter] = useState<{ duration: number; difficulty: string } | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const [testsRes, resultsRes] = await Promise.all([
          fetch('/api/typing-tests', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/typing-results/student', { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);
        setTests(testsRes.ok ? await testsRes.json() : []);
        setResults(resultsRes.ok ? await resultsRes.json() : []);
      } catch (err) {
        console.error('Error fetching typing test data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const totalAttempts = results.length;
  const bestWpm = results.length > 0 ? Math.max(...results.map(r => r.wpm)) : 0;
  const bestAccuracy = results.length > 0 ? Math.max(...results.map(r => r.accuracy)) : 0;

  const isDifficultyMatch = (testDiff: string, filterDiff: string) => {
    const td = testDiff.toLowerCase();
    const fd = filterDiff.toLowerCase();
    return fd === 'moderate' ? (td === 'moderate' || td === 'medium') : td === fd;
  };

  const handleLoad = () => {
    if (!selectedDuration || !selectedDifficulty) return;
    setLoadedFilter({ duration: Number(selectedDuration), difficulty: selectedDifficulty });
  };

  const loadedTests = loadedFilter
    ? tests.filter(t => t.duration === loadedFilter.duration && isDifficultyMatch(t.difficulty, loadedFilter.difficulty))
    : [];

  return (
    <div className="min-h-screen font-sans select-none" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #eff6ff 100%)' }}>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
            <Keyboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight leading-tight">⌨️ Typing Test</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Speed · Accuracy · Excellence</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-5 md:p-8 space-y-8">

        {/* Hero Stats Banner */}
        <div className="rounded-3xl relative overflow-hidden text-white shadow-2xl" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
          <div className="absolute -top-12 -right-12 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }}></div>

          <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-black text-violet-300 uppercase tracking-[0.22em] mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block"></span>
                Professional Typing Examination
              </p>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1">Build Speed. <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200">Master Accuracy.</span></h2>
              <p className="text-white/50 text-sm">Choose your duration & level to begin.</p>
            </div>

            {totalAttempts > 0 && (
              <div className="flex gap-3 shrink-0">
                <div className="text-center bg-white/10 rounded-2xl px-5 py-3 border border-white/10 backdrop-blur-sm">
                  <div className="text-2xl font-black text-indigo-300">{bestWpm}</div>
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider mt-1">Best WPM</div>
                </div>
                <div className="text-center bg-white/10 rounded-2xl px-5 py-3 border border-white/10 backdrop-blur-sm">
                  <div className="text-2xl font-black text-emerald-300">{bestAccuracy}%</div>
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider mt-1">Accuracy</div>
                </div>
                <div className="text-center bg-white/10 rounded-2xl px-5 py-3 border border-white/10 backdrop-blur-sm">
                  <div className="text-2xl font-black text-amber-300">{totalAttempts}</div>
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider mt-1">Attempts</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-xl animate-pulse">
              <Keyboard className="w-7 h-7 text-white" />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading tests...</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Step 1: Duration Selection */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs font-black">1</span>
                Select Duration
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {DURATIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => { setSelectedDuration(d.value); setLoadedFilter(null); }}
                    className={`group relative rounded-2xl p-4 border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                      selectedDuration === d.value
                        ? `bg-gradient-to-br ${d.color} border-transparent text-white shadow-lg ${d.shadow}`
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:-translate-y-0.5'
                    }`}
                  >
                    <span className="text-xl">{d.icon}</span>
                    <span className="font-black text-xs">{d.label}</span>
                    {selectedDuration === d.value && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Difficulty Selection */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-violet-600 text-white rounded-lg flex items-center justify-center text-xs font-black">2</span>
                Select Difficulty
              </h3>
              <div className="flex flex-wrap gap-3">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.value}
                    onClick={() => { setSelectedDifficulty(d.value); setLoadedFilter(null); }}
                    className={`px-6 py-3 rounded-2xl border-2 font-black text-sm transition-all duration-200 flex items-center gap-2 ${
                      selectedDifficulty === d.value ? d.active : d.color + ' hover:-translate-y-0.5'
                    }`}
                  >
                    <span>{d.emoji}</span> {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Load Button */}
            <button
              onClick={handleLoad}
              disabled={!selectedDuration || !selectedDifficulty}
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all duration-200 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 disabled:bg-slate-300 disabled:shadow-none"
            >
              <Play className="w-5 h-5" /> Find Matching Tests
            </button>

            {/* Test Results */}
            {loadedFilter && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-400">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-7 bg-gradient-to-b from-indigo-500 to-violet-600 rounded-full"></div>
                  <h3 className="font-black text-slate-800 text-base">
                    {loadedTests.length > 0 ? `${loadedTests.length} Test${loadedTests.length > 1 ? 's' : ''} Found` : 'No Tests Found'}
                  </h3>
                  <span className="text-xs text-slate-400 font-bold ml-1">— {loadedFilter.duration} min · {loadedFilter.difficulty}</span>
                </div>

                {loadedTests.length === 0 ? (
                  <div className="bg-white rounded-3xl p-14 border border-slate-100 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Keyboard className="w-8 h-8 text-slate-300" />
                    </div>
                    <h4 className="font-black text-slate-600 text-base mb-1">No Tests Match</h4>
                    <p className="text-slate-400 text-sm">Try a different duration or difficulty level.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {loadedTests.map(test => {
                      const testAttempts = results.filter(r => r.testId === test.id);
                      const attempted = testAttempts.length > 0;
                      const best = attempted ? Math.max(...testAttempts.map(r => r.wpm)) : 0;
                      const bestAcc = attempted ? Math.max(...testAttempts.map(r => r.accuracy)) : 0;
                      const latest = attempted ? [...testAttempts].sort((a, b) => b.timestamp - a.timestamp)[0] : null;

                      return (
                        <div key={test.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-indigo-50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                          <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                            {/* Icon */}
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                              <Keyboard className="w-6 h-6 text-white" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="font-black text-slate-800 text-base leading-tight">{test.title}</h4>
                                {attempted && (
                                  <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <CheckCircle className="w-3 h-3" /> Attempted
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                                  <Clock className="w-3 h-3" /> {test.duration} min
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{test.language}</span>
                                {attempted && (
                                  <>
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{best} WPM best</span>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{bestAcc}% accuracy</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              {attempted && latest && (
                                <button
                                  onClick={() => navigate(`/typing-test/${latest.id}/analysis`)}
                                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Analysis
                                </button>
                              )}
                              <button
                                onClick={() => navigate(`/typing-test/${test.id}`)}
                                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 transition-all shadow-md shadow-indigo-200 active:scale-95"
                              >
                                <Play className="w-3.5 h-3.5" />
                                {attempted ? 'Retry' : 'Start Test'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
