import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Keyboard, Clock, BarChart, Play, Loader2, ArrowLeft, Trophy, Eye, Search, Sparkles, Calendar, Clipboard } from 'lucide-react';

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

export default function TypingTestList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<TypingTest[]>([]);
  const [results, setResults] = useState<TypingResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection Panel States
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [loadedFilter, setLoadedFilter] = useState<{ duration: number; difficulty: string } | null>(null);

  // Optional Improvements Search State
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        
        // Fetch active typing tests
        const testsRes = await fetch('/api/typing-tests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const testsData = testsRes.ok ? await testsRes.json() : [];
        setTests(testsData);

        // Fetch student's results
        const resultsRes = await fetch('/api/typing-results/student', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resultsData = resultsRes.ok ? await resultsRes.json() : [];
        setResults(resultsData);
      } catch (err) {
        console.error("Error fetching typing test data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // Aggregate stats overall for student dashboard header
  const totalAttemptsCount = results.length;
  const overallBestWpm = results.length > 0 ? Math.max(...results.map(r => r.wpm)) : 0;
  const overallBestAccuracy = results.length > 0 ? Math.max(...results.map(r => r.accuracy)) : 0;

  // Handle Loading of Tests
  const handleLoadTests = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDuration || !selectedDifficulty) return;
    setLoadedFilter({
      duration: Number(selectedDuration),
      difficulty: selectedDifficulty
    });
  };

  // Match test difficulty with selected value (supports medium/moderate synonym mapping)
  const isDifficultyMatching = (testDiff: string, filterDiff: string) => {
    const td = testDiff.toLowerCase();
    const fd = filterDiff.toLowerCase();
    if (fd === 'moderate') {
      return td === 'moderate' || td === 'medium';
    }
    return td === fd;
  };

  // Filter tests based on active selections & search box
  const getFilteredTests = () => {
    if (!loadedFilter) return [];
    return tests.filter(t => {
      const isDurationOk = t.duration === loadedFilter.duration;
      const isDifficultyOk = isDifficultyMatching(t.difficulty, loadedFilter.difficulty);
      const isSearchOk = t.title.toLowerCase().includes(searchQuery.toLowerCase());
      return isDurationOk && isDifficultyOk && isSearchOk;
    });
  };

  const loadedTests = getFilteredTests();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center shadow-sm">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="p-2 hover:bg-slate-100 rounded-full transition-colors mr-4"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Keyboard className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Typing Test Panel</h1>
            <p className="text-xs text-slate-400 font-semibold">Select and attempt professional typing runs</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Header Stats Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
          <div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" /> Professional Setup & Examination
            </h2>
            <p className="text-slate-400 text-sm mt-1">Acquire visual speed, rhythm, and accuracy stats instantly.</p>
          </div>
          
          {results.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-6 divide-x divide-white/10">
              <div className="text-center">
                <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider block">Best Speed</span>
                <span className="text-xl font-black text-white">{overallBestWpm} <span className="text-xs font-semibold text-indigo-200">WPM</span></span>
              </div>
              <div className="text-center pl-6">
                <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider block">Best Accuracy</span>
                <span className="text-xl font-black text-emerald-300">{overallBestAccuracy}%</span>
              </div>
              <div className="text-center pl-6">
                <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider block">Total Attempts</span>
                <span className="text-xl font-black text-white">{totalAttemptsCount}</span>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* SELECTION WINDOW MODAL / CARD SYSTEM */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <Clipboard className="w-5 h-5 text-indigo-500" /> Typing Test Setup
              </h3>
              
              <form onSubmit={handleLoadTests} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                {/* STEP 1: Select Time Duration */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                    Select Typing Test Duration
                  </label>
                  <select 
                    name="duration"
                    value={selectedDuration}
                    onChange={e => {
                      setSelectedDuration(e.target.value);
                      setLoadedFilter(null); // Reset matches on change
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700"
                  >
                    <option value="">Select Duration</option>
                    <option value="1">1 Minute</option>
                    <option value="2">2 Minutes</option>
                    <option value="3">3 Minutes</option>
                    <option value="4">4 Minutes</option>
                    <option value="5">5 Minutes</option>
                    <option value="10">10 Minutes</option>
                  </select>
                </div>

                {/* STEP 2: Select Test Level */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                    Select Test Level
                  </label>
                  <select 
                    name="difficulty"
                    value={selectedDifficulty}
                    onChange={e => {
                      setSelectedDifficulty(e.target.value);
                      setLoadedFilter(null); // Reset matches on change
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700"
                  >
                    <option value="">Select Level</option>
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                {/* Load Tests Button */}
                <button
                  type="submit"
                  disabled={!selectedDuration || !selectedDifficulty}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" /> Load Tests
                </button>
              </form>
            </div>

            {/* STEP 3: Display Tests list after filtering */}
            {loadedFilter && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Header for Loaded Tests & Search Options */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      Loaded Roster ({loadedTests.length} test{loadedTests.length !== 1 ? 's' : ''} found)
                    </h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Showing matching results for {loadedFilter.duration} Minute duration &middot; {loadedFilter.difficulty} level.
                    </p>
                  </div>

                  {/* Optional Improvement: Search Box */}
                  <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input 
                      type="text" 
                      placeholder="Search matching tests..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                    />
                  </div>
                </div>

                {loadedTests.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                    <Keyboard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-slate-700">No Tests Match Selections</h4>
                    <p className="text-slate-500 text-sm mt-1">There are no active typing tests matches currently configured.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                            <th className="p-4 pl-6">Test Name</th>
                            <th className="p-4 text-center">Attempts</th>
                            <th className="p-4 text-center">Best WPM</th>
                            <th className="p-4 text-center">Last Attempt Date</th>
                            <th className="p-4 pr-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loadedTests.map(test => {
                            const testAttempts = results.filter(r => r.testId === test.id);
                            const totalAttempts = testAttempts.length;
                            
                            const latestAttempt = totalAttempts > 0 ? [...testAttempts].sort((a, b) => b.timestamp - a.timestamp)[0] : null;
                            const bestWpmVal = totalAttempts > 0 ? Math.max(...testAttempts.map(r => r.wpm)) : 0;

                            return (
                              <tr key={test.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 pl-6">
                                  <div className="font-bold text-slate-800 text-sm">{test.title}</div>
                                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{test.language}</div>
                                </td>
                                <td className="p-4 text-center font-bold text-slate-700 text-sm">
                                  {totalAttempts > 0 ? (
                                    <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-xs">{totalAttempts} Attempts</span>
                                  ) : (
                                    <span className="text-slate-300 font-normal">0</span>
                                  )}
                                </td>
                                <td className="p-4 text-center font-black text-indigo-600 text-sm">
                                  {totalAttempts > 0 ? (
                                    <span>{bestWpmVal} <span className="text-[10px] font-normal text-slate-400">WPM</span></span>
                                  ) : (
                                    <span className="text-slate-300 font-normal">--</span>
                                  )}
                                </td>
                                <td className="p-4 text-center text-xs text-slate-500 font-semibold">
                                  {latestAttempt ? (
                                    <span className="flex items-center justify-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      {new Date(latestAttempt.timestamp).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-normal">--</span>
                                  )}
                                </td>
                                <td className="p-4 pr-6 text-right">
                                  {totalAttempts === 0 ? (
                                    <button
                                      onClick={() => navigate(`/typing-test/${test.id}`)}
                                      className="text-xs bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer"
                                    >
                                      <Play className="w-3.5 h-3.5" /> Attempt Test
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-2 justify-end">
                                      {latestAttempt && (
                                        <button
                                          onClick={() => navigate(`/typing-test/${latestAttempt.id}/analysis`)}
                                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2.5 rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center gap-1 cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5" /> View Analysis
                                        </button>
                                      )}
                                      <button
                                        onClick={() => navigate(`/typing-test/${test.id}`)}
                                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-100 flex items-center gap-1 cursor-pointer"
                                      >
                                        <Play className="w-3.5 h-3.5" /> Reattempt Test
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
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
