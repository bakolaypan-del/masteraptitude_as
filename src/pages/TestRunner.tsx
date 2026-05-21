import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { RenderMathText } from '../components/MathRenderer';
import { Clock, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, Flag, Info, Play, Menu, X, Target, Trophy, Zap, BookOpen, Shield } from 'lucide-react';

export default function TestRunner() {
  const { testId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<Set<string>>(new Set());

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [leaderboard, setLeaderboard] = useState<{ topRankers: { rank: number; name: string; score: number }[]; myRank: number; totalParticipants: number; uniqueStudents: number; percentile: number } | null>(null);
  const [questionStats, setQuestionStats] = useState<Record<string, { totalAttempts: number; correctPercent: number; avgTimeSecs: number }>>({});
  const leaderboardPollRef = useRef<any>(null);
  const leaderboardPollCountRef = useRef(0);

  const isSubmittingRef = useRef(false);
  const timerRef = useRef<any>(null);
  const currentIdxRef = useRef(currentIdx);
  // useRef instead of useState so the timer always writes/reads the latest value
  // regardless of which render's closure is active
  const questionTimesRef = useRef<Record<string, number>>({});

  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

  useEffect(() => {
    let active = true;

    async function loadTest(attempt = 1) {
      if (!user || !active) return;

      if (attempt === 1) {
        setLoading(true);
        setIsRetrying(false);
        setError('');
      }

      try {
        const token = await user.getIdToken();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(`/api/test/${testId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const contentType = res.headers.get("content-type");
        if (!res.ok) {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            throw new Error(errorData.message || errorData.error || 'Failed to load test data');
          } else {
            const text = await res.text();
            console.error("Non-JSON error from server:", text);
            if (res.status === 500) throw new Error(`Server encountered an internal error (500).`);
            else if (res.status === 503) throw new Error(`The database connection is currently offline.`);
            throw new Error(`Server returned an error (${res.status}).`);
          }
        }

        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format received from the server.");
        }

        const data = await res.json();
        if (data.success === false) {
          const msg = data.error || data.message || '';
          if (msg.toLowerCase().includes('no questions') || msg.toLowerCase().includes('not been added')) {
            setError('This test has no questions added yet. Please contact the admin.');
            setIsRetrying(false);
            setLoading(false);
            return;
          }
          throw new Error(msg || 'Failed to initialize test session.');
        }
        if (!data.questions || !Array.isArray(data.questions)) throw new Error("Invalid question data received from the server.");
        if (data.questions.length === 0) {
          setError('This test has no questions added yet. Please contact the admin.');
          setIsRetrying(false);
          setLoading(false);
          return;
        }

        if (active) {
          setTest(data.test);
          setQuestions(data.questions);
          setVisited(new Set([data.questions[0].id]));
          const durationMins = data.test?.duration || 30;
          setTimeLeft(Math.floor(durationMins * 60));
          setIsRetrying(false);
          setLoading(false);
          setError('');
        }
      } catch (err: any) {
        console.error(`Load test error (Attempt ${attempt}):`, err);
        if (!active) return;

        const friendlyMsg = err.name === 'AbortError'
          ? "Server is busy (request timed out). Please wait."
          : (err.message || 'Server is temporarily busy. Please try again.');

        if (attempt < 5) {
          setIsRetrying(true);
          setError(`Server is temporarily busy. Retrying automatically in 3 seconds... (Attempt ${attempt}/5)`);
          setTimeout(() => { if (active) loadTest(attempt + 1); }, 3000);
        } else {
          setError(`Unable to load mock test after multiple attempts. ${friendlyMsg}`);
          setIsRetrying(false);
          setLoading(false);
        }
      }
    }

    loadTest();
    return () => {
      active = false;
      if (leaderboardPollRef.current) clearInterval(leaderboardPollRef.current);
    };
  }, [testId, user]);

  useEffect(() => {
    if (questions.length > 0) {
      setVisited(prev => {
        const next = new Set(prev);
        if (questions[currentIdx]) next.add(questions[currentIdx].id);
        return next;
      });
    }
  }, [currentIdx, questions]);

  useEffect(() => {
    if (!showInstructions && !submitting && !result && questions.length > 0 && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        const activeIdx = currentIdxRef.current;
        const currentQuestionId = questions[activeIdx]?.id;
        if (currentQuestionId) {
          // Write directly to ref — no re-render needed, never stale
          questionTimesRef.current[currentQuestionId] = (questionTimesRef.current[currentQuestionId] || 0) + 1;
        }
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleSubmission(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // showInstructions added: timer must start the moment instructions are dismissed
  }, [showInstructions, submitting, result, questions.length, timeLeft]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !showInstructions && !submitting && !result && questions.length > 0) {
        setWarnings(w => w + 1);
        alert('Warning: Switching tabs during a test is strictly prohibited! This has been recorded.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [submitting, result, questions.length]);

  const handleSubmission = async (isAuto = false) => {
    if (isSubmittingRef.current || result || !user || questions.length === 0) return;

    if (!isAuto && !showConfirmModal) {
      setShowConfirmModal(true);
      return;
    }

    setShowConfirmModal(false);
    isSubmittingRef.current = true;
    setSubmitting(true);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    try {
      const payload = questions.map(q => {
        const storedIdx = answers[q.id];
        const selectedOriginalText = storedIdx !== undefined ? (q.options[parseInt(storedIdx)] || '') : '';
        return { id: q.id, selected: selectedOriginalText };
      });

      const token = await user.getIdToken();
      const timeSpentSeconds = (test?.duration || 30) * 60 - timeLeft;
      const mm = Math.floor(timeSpentSeconds / 60);
      const ss = timeSpentSeconds % 60;
      const timeTakenStr = `${mm}:${ss.toString().padStart(2, '0')}`;

      const res = await fetch('/api/submit-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ testId, answers: payload, timeTaken: timeTakenStr, questionTimes: questionTimesRef.current })
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await res.json();
          throw new Error(errorData.error || errorData.message || 'Failed to submit test');
        } else {
          throw new Error(`Submission failed with server error (${res.status}).`);
        }
      }

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format from server during submission.");
      }

      const responseData = await res.json();
      setResult(responseData);

      const submittedScore = parseFloat(responseData.score);
      const firstAttempt: boolean = !!responseData.isFirstAttempt;

      // Fetch question community stats once (lazy, for analysis view)
      user.getIdToken().then(tk => {
        fetch(`/api/test-question-stats/${testId}`, { headers: { Authorization: `Bearer ${tk}` } })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.stats) setQuestionStats(d.stats); })
          .catch(() => {});
      });

      // Poll leaderboard max 3 times to limit Firestore reads
      leaderboardPollCountRef.current = 0;
      const fetchLeaderboard = async () => {
        try {
          const tk = await user.getIdToken();
          const lbRes = await fetch(
            `/api/test-leaderboard/${testId}?myScore=${encodeURIComponent(submittedScore)}&isFirstAttempt=${firstAttempt}`,
            { headers: { Authorization: `Bearer ${tk}` } }
          );
          if (lbRes.ok) {
            setLeaderboard(await lbRes.json());
            leaderboardPollCountRef.current++;
            if (leaderboardPollCountRef.current >= 3) {
              clearInterval(leaderboardPollRef.current);
            }
          }
        } catch {}
      };
      fetchLeaderboard();
      leaderboardPollRef.current = setInterval(fetchLeaderboard, 15000);
    } catch (err: any) {
      console.error("Client submission error:", err);
      isSubmittingRef.current = false;
      setSubmitting(false);
      alert(err.message || 'There was a problem submitting your test. Please try again.');
    }
  };

  const handleSelectOption = (qId: string, optIndex: number) => {
    setAnswers(prev => ({ ...prev, [qId]: String(optIndex) }));
    setReview(prev => { const next = new Set(prev); next.delete(qId); return next; });
  };

  const toggleReview = (qId: string) => {
    setReview(prev => { const next = new Set(prev); if (next.has(qId)) next.delete(qId); else next.add(qId); return next; });
  };

  const clearResponse = (qId: string) => {
    setAnswers(prev => { const next = { ...prev }; delete next[qId]; return next; });
  };

  const handleExit = () => {
    if (test) {
      const type = `mock_${test.testType || 'topic'}`;
      const cat = test.category || '';
      navigate(`/dashboard?tab=${type}&cat=${cat}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleStartTest = () => {
    setShowInstructions(false);
  };

  // ─── Loading Screen ──────────────────────────────────────────────────────────
  if (loading || isRetrying) return (
    <div className="flex justify-center items-center h-screen" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
      <div className="flex flex-col items-center gap-6 text-center px-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-900/50">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -inset-3 rounded-3xl border-2 border-indigo-500/30 animate-ping" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-8 border-3 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
            <p className="text-white font-black text-lg">{isRetrying ? "Server busy. Retrying..." : "Loading Test Environment..."}</p>
          </div>
          {error && <p className="text-xs font-semibold text-rose-300 max-w-sm animate-pulse bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{error}</p>}
        </div>
      </div>
    </div>
  );

  // ─── Error Screen ─────────────────────────────────────────────────────────────
  if (error && !isRetrying) return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
      <div className="rounded-3xl border border-rose-500/20 p-10 text-center max-w-md w-full"
        style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
          <AlertTriangle className="w-8 h-8 text-rose-400 animate-bounce" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Failed to Load Test</h2>
        <p className="text-slate-400 mb-8 font-medium">{error}</p>
        <button onClick={() => navigate('/dashboard')}
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-900/50">
          Back to Home
        </button>
      </div>
    </div>
  );

  if (questions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
      <p className="text-white">This test has no questions yet.</p>
    </div>
  );

  // ─── Instructions Screen ──────────────────────────────────────────────────────
  if (showInstructions) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
        <div className="fixed top-1/4 left-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.1)' }} />

        <div className="w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(30px)' }}>

          {/* Top colour bar */}
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" />

          {/* Icon + test name */}
          <div className="flex flex-col items-center pt-8 pb-5 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl mb-4">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-black text-white leading-tight mb-1">{test?.title}</h2>
            {test?.topic && <p className="text-xs text-indigo-300 font-semibold">{test.topic}</p>}
          </div>

          {/* Key stats grid */}
          <div className="grid grid-cols-2 gap-3 px-6 pb-5">
            <div className="rounded-2xl border border-white/10 p-4 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Questions</p>
              <p className="text-2xl font-black text-white">{questions.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 p-4 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Time</p>
              <p className="text-2xl font-black text-white">{test?.duration || 30}<span className="text-sm text-slate-400 ml-1">min</span></p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 p-4 text-center" style={{ background: 'rgba(16,185,129,0.07)' }}>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Correct</p>
              <p className="text-2xl font-black text-emerald-400">+{test?.marksPerCorrect || 1.0}</p>
            </div>
            <div className="rounded-2xl border border-rose-500/20 p-4 text-center" style={{ background: 'rgba(239,68,68,0.07)' }}>
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Negative</p>
              <p className="text-2xl font-black text-rose-400">-{test?.negativeMarks || 0.25}</p>
            </div>
          </div>

          {/* Rules */}
          <div className="px-6 pb-5 space-y-2">
            {[
              { icon: Shield, color: 'text-rose-400', text: 'No tab switching — auto-submit on violation.' },
              { icon: Flag, color: 'text-violet-400', text: 'Flag questions to revisit before submitting.' },
              { icon: Zap, color: 'text-emerald-400', text: 'Your answers auto-save as you navigate.' },
            ].map(({ icon: Icon, color, text }, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <Icon className={`w-3.5 h-3.5 ${color} shrink-0 mt-0.5`} />
                <p className="text-xs text-slate-300 font-medium leading-snug">{text}</p>
              </div>
            ))}
            <div className="pt-1 text-center">
              <p className="text-[10px] text-slate-500 font-semibold">After submission you'll see full result &amp; per-question analysis.</p>
            </div>
          </div>

          {/* CTA */}
          <div className="px-6 pb-7 flex flex-col gap-3">
            <button onClick={handleStartTest}
              className="w-full py-4 text-white font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm active:scale-95"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
              <Play className="w-5 h-5 fill-current" />
              Start Test Now
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="w-full py-3 border border-white/10 text-slate-400 font-bold rounded-2xl hover:bg-white/5 transition-colors text-xs uppercase tracking-widest"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Analysis Screen ──────────────────────────────────────────────────────────
  if (result && showAnalysis) {
    return (
      <div className="flex flex-col h-screen bg-[#f8f9fa] font-sans text-slate-900 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAnalysis(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all text-sm font-bold active:scale-95">
              <ChevronLeft className="w-4 h-4" /> Back to Result
            </button>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">Test Analysis</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Score</span>
              <span className="text-sm font-black text-indigo-600">{result.score}</span>
            </div>
            <button onClick={handleExit}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-colors">
              Exit Analysis
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8f9fa]">
          <div className="max-w-4xl mx-auto space-y-8 pb-20">

            {/* Topic-wise summary — only shown when there are multiple topics */}
            {(() => {
              const tMap: Record<string, { total: number; correct: number; wrong: number; skip: number }> = {};
              questions.forEach(q => {
                const topic = q.topic || 'General';
                if (!tMap[topic]) tMap[topic] = { total: 0, correct: 0, wrong: 0, skip: 0 };
                tMap[topic].total++;
                const correctAns = result.analysis[q.id];
                const storedIdx = answers[q.id];
                const choice = storedIdx !== undefined ? (q.options[parseInt(storedIdx)] || '') : '';
                if (!choice) tMap[topic].skip++;
                else if (choice === correctAns) tMap[topic].correct++;
                else tMap[topic].wrong++;
              });
              const entries = Object.entries(tMap);
              if (entries.length <= 1) return null;
              return (
                <div className="bg-white rounded-[32px] border border-indigo-100 p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-500" /> Topic-wise Analysis
                  </h3>
                  <div className="space-y-4">
                    {entries.map(([topic, s]) => {
                      const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                      return (
                        <div key={topic}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-700">{topic}</span>
                            <span className="text-[10px] font-black text-slate-500">{s.correct}/{s.total} correct ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <div className="flex gap-3 mt-1 text-[9px] font-bold uppercase tracking-widest">
                            <span className="text-emerald-600">{s.correct} correct</span>
                            <span className="text-rose-500">{s.wrong} wrong</span>
                            <span className="text-slate-400">{s.skip} skipped</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {questions.map((q, idx) => {
              const correctAnswer = result.analysis[q.id];
              const storedIdx = answers[q.id];
              const origQ = questions.find((oq: any) => oq.id === q.id);
              const userChoice = (storedIdx !== undefined && origQ) ? (origQ.options[parseInt(storedIdx)] || '') : '';
              const isCorrect = !!userChoice && userChoice === correctAnswer;
              const isUnattempted = !userChoice;

              return (
                <div key={q.id} className={`bg-white rounded-[40px] border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500
                  ${isCorrect ? 'border-emerald-100' : isUnattempted ? 'border-slate-100' : 'border-rose-100'}`}
                  style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="p-8 md:p-10">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-sm font-black shadow-lg">{idx + 1}</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Question</span>
                          <span className="text-xs font-bold text-slate-600">{q.topic || 'General'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isUnattempted ? (
                          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-200">
                            <Info className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Not Attempted</span>
                          </div>
                        ) : isCorrect ? (
                          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-200">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Correct</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-full border border-rose-200">
                            <X className="w-4 h-4 text-rose-600" />
                            <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Incorrect</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-4 leading-relaxed px-2"><RenderMathText text={q.questionText} /></h3>
                    {q.equationLatex && (
                      <div className="mb-6 px-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-center text-xl overflow-x-auto">
                        <RenderMathText text={`$$${q.equationLatex}$$`} />
                      </div>
                    )}
                    {q.imageUrl && (
                      <div className="mb-8 px-2 flex justify-center">
                        <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 inline-flex flex-col items-center" style={{ maxWidth: '100%' }}>
                          <img src={q.imageUrl} alt="Question figure" loading="eager" style={{ maxHeight: 260, maxWidth: '100%', objectFit: 'contain', display: 'block' }} className="rounded-2xl"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {q.options.map((opt: string, i: number) => {
                        const optionLabel = String.fromCharCode(64 + (i + 1));
                        const origOpt = origQ?.options[i] ?? opt;
                        const isOptionCorrect = origOpt === correctAnswer;
                        const isOptionSelected = origOpt === userChoice;
                        let state: 'default' | 'correct' | 'incorrect' = 'default';
                        if (isOptionCorrect) state = 'correct';
                        else if (isOptionSelected && !isCorrect) state = 'incorrect';

                        return (
                          <div key={i} className={`flex items-center p-5 rounded-2xl border-2 transition-all relative
                            ${state === 'correct' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-md shadow-emerald-100 ring-2 ring-emerald-500/10' : ''}
                            ${state === 'incorrect' ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-md shadow-rose-100 ring-2 ring-rose-500/10' : ''}
                            ${state === 'default' ? 'bg-white border-slate-100 text-slate-600 hover:border-slate-300' : ''}`}>
                            <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-black text-sm
                              ${state === 'correct' ? 'bg-emerald-500 text-white shadow-md' : state === 'incorrect' ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                              {optionLabel}
                            </span>
                            <span className="font-bold text-sm md:text-base leading-tight pr-6 ml-3">{opt}</span>
                            {state === 'correct' && (
                              <div className="absolute right-4 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                            {state === 'incorrect' && (
                              <div className="absolute right-4 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center shadow-sm">
                                <X className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Community stats row */}
                    {questionStats[q.id] && (
                      <div className="mt-6 flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg border border-violet-100 text-[9px] font-black uppercase tracking-widest">
                          Avg correct: {questionStats[q.id].correctPercent}%
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg border border-sky-100 text-[9px] font-black uppercase tracking-widest">
                          <Clock className="w-3 h-3" /> Avg time: {questionStats[q.id].avgTimeSecs}s
                        </div>
                        <div className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg border border-slate-100 text-[9px] font-black uppercase tracking-widest">
                          {questionStats[q.id].totalAttempts} student{questionStats[q.id].totalAttempts !== 1 ? 's' : ''} attempted
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Target className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{q.topic || 'General'}</span>
                        </div>
                        {(() => {
                          const secs = result.questionTimes?.[q.id] ?? questionTimesRef.current[q.id] ?? 0;
                          const mm = Math.floor(secs / 60);
                          const ss = secs % 60;
                          const timeStr = mm > 0 ? `${mm}m ${ss}s` : `${ss}s`;
                          return (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                              <Clock className="w-3 h-3" />
                              <span>Your time: {timeStr}</span>
                            </div>
                          );
                        })()}
                      </div>
                      {isCorrect ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                          <span>+{test?.marksPerCorrect || 1.0} Marks</span>
                        </div>
                      ) : isUnattempted ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-400 rounded-lg border border-slate-200">
                          <span>0.0 Marks</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                          <span>-{test?.negativeMarks || 0.25} Marks</span>
                        </div>
                      )}
                    </div>

                    {q.explanation && (
                      <div className="mt-6 bg-[#f8fafc] p-6 md:p-8 rounded-[24px] border border-slate-100 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 text-indigo-500/5 transition-transform group-hover:scale-110">
                          <Info className="w-16 h-16 rotate-12" />
                        </div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 relative z-10">
                          <div className="w-1.5 h-3 bg-indigo-500 rounded-full"></div>
                          Solution Deep Dive
                        </p>
                        <div className="text-slate-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium relative z-10">
                          {q.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        <footer className="h-16 bg-white border-t border-slate-200 flex items-center justify-center px-6 shrink-0 z-10">
          <button onClick={() => { setShowAnalysis(false); window.scrollTo(0, 0); }}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 uppercase tracking-tighter">
            Back to Summary
          </button>
        </footer>
      </div>
    );
  }

  // ─── Result Summary Screen ────────────────────────────────────────────────────
  if (result) {
    const rankDisplay = leaderboard
      ? `${leaderboard.myRank}/${leaderboard.totalParticipants}`
      : '...';
    const accuracy = result.totalQuestions > 0
      ? ((result.correctAnswers / result.totalQuestions) * 100).toFixed(1)
      : result.accuracy ?? 0;
    const accuracyNum = parseFloat(String(accuracy));
    const isReattempt = result.attemptNumber > 1;

    const feedback = accuracyNum >= 90
      ? { msg: 'Excellent! You are exam ready. Keep it up!', color: 'text-emerald-300', bg: 'rgba(16,185,129,0.12)', emoji: '🔥' }
      : accuracyNum >= 70
      ? { msg: 'Good performance! Practice more to improve speed and accuracy.', color: 'text-sky-300', bg: 'rgba(14,165,233,0.12)', emoji: '👍' }
      : accuracyNum >= 50
      ? { msg: 'Average performance. Focus on weak areas and regular practice.', color: 'text-amber-300', bg: 'rgba(245,158,11,0.12)', emoji: '📈' }
      : { msg: 'You need more practice. Analyze your mistakes carefully and improve concepts.', color: 'text-rose-300', bg: 'rgba(239,68,68,0.12)', emoji: '⚠️' };

    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
        <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.12)' }} />
        <div className="fixed bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(16,185,129,0.08)' }} />

        <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Left: result card ── */}
          <div className="flex-1 rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(30px)' }}>

            <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" />

            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border-2 border-emerald-400/30 flex items-center justify-center mx-auto mb-4 shadow-2xl hover:scale-110 transition-transform duration-500">
                <Trophy className="w-10 h-10 text-yellow-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-1 tracking-tight">Test Completed! 🎉</h2>
              <p className="text-slate-400 text-sm font-medium">
                {isReattempt ? `Reattempt #${result.attemptNumber} — Does not affect leaderboard ranking.` : 'Your performance has been evaluated and recorded.'}
              </p>
            </div>

            {/* Performance feedback */}
            <div className="mx-6 mb-4 rounded-2xl p-4 flex items-start gap-3 border border-white/10" style={{ background: feedback.bg }}>
              <span className="text-2xl shrink-0">{feedback.emoji}</span>
              <p className={`text-sm font-bold leading-snug ${feedback.color}`}>{feedback.msg}</p>
            </div>

            <div className="px-6 pb-6 grid grid-cols-2 gap-3">
              {[
                { label: 'Your Score', value: result.score, textColor: 'text-indigo-300', border: 'border-indigo-500/20' },
                { label: 'Rank (1st Attempt)', value: leaderboard ? `#${rankDisplay}` : '...', textColor: 'text-amber-300', border: 'border-amber-500/20' },
                { label: 'Percentile', value: leaderboard ? `${leaderboard.percentile}%ile` : '...', textColor: 'text-violet-300', border: 'border-violet-500/20' },
                { label: 'Accuracy', value: `${accuracy}%`, textColor: 'text-emerald-300', border: 'border-emerald-500/20' },
                { label: 'Correct', value: result.correctAnswers, textColor: 'text-teal-300', border: 'border-teal-500/20' },
                { label: 'Wrong', value: result.wrongAnswers, textColor: 'text-rose-300', border: 'border-rose-500/20' },
                { label: 'Skipped', value: result.unattempted, textColor: 'text-slate-400', border: 'border-slate-500/20' },
                { label: 'Total Students', value: leaderboard ? leaderboard.uniqueStudents.toLocaleString() : '...', textColor: 'text-sky-300', border: 'border-sky-500/20' },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-2xl border p-4 text-center ${stat.border}`}
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${stat.textColor}`}>{stat.label}</p>
                  <p className={`text-3xl font-black ${stat.textColor}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="px-6 pb-6 flex flex-col gap-3">
              <button onClick={() => { setShowAnalysis(true); window.scrollTo(0, 0); }}
                className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl uppercase tracking-widest text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
                Analyze Your Performance <ChevronRight className="w-5 h-5" />
              </button>
              <button onClick={handleExit}
                className="w-full py-4 text-slate-400 font-black rounded-2xl border border-white/10 hover:bg-white/5 transition-all uppercase tracking-widest text-sm"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* ── Right: live leaderboard ── */}
          <div className="w-full lg:w-72 rounded-3xl border border-white/10 overflow-hidden shadow-2xl shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(30px)' }}>

            <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Live Rankings
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">{leaderboard ? `${leaderboard.totalParticipants} student${leaderboard.totalParticipants !== 1 ? 's' : ''}` : '...'}</span>
              </div>

              {!leaderboard ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : leaderboard.topRankers.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-6">No rankings yet</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.topRankers.map((r) => {
                    const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : null;
                    const isMe = (r as any).isCurrentUser === true;
                    return (
                      <div key={r.rank}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isMe ? 'border border-amber-400/40' : 'border border-white/5'}`}
                        style={{ background: isMe ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)' }}>
                        <span className="text-sm font-black text-slate-400 w-5 text-center">
                          {medal || `${r.rank}`}
                        </span>
                        <span className={`flex-1 text-sm font-bold truncate ${isMe ? 'text-amber-300' : 'text-slate-200'}`}>
                          {r.name}{isMe ? ' (You)' : ''}
                        </span>
                        <span className="text-xs font-black text-slate-400">{r.score}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {leaderboard && leaderboard.myRank > 10 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-amber-400/40"
                    style={{ background: 'rgba(251,191,36,0.1)' }}>
                    <span className="text-sm font-black text-amber-400 w-5 text-center">{leaderboard.myRank}</span>
                    <span className="flex-1 text-sm font-bold text-amber-300 truncate">You</span>
                    <span className="text-xs font-black text-slate-400">{result.score}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ─── Main Test UI ─────────────────────────────────────────────────────────────
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const currentQuestion = questions[currentIdx];
  const userInitial = (profile?.name || user?.email || 'U').charAt(0).toUpperCase();
  const answeredCount = Object.keys(answers).length;
  const isTimeCritical = timeLeft < 300; // last 5 minutes

  const handleNext = () => { if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1); };
  const handlePrev = () => { if (currentIdx > 0) setCurrentIdx(currentIdx - 1); };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl border border-white/20">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 text-center mb-4 uppercase tracking-tighter">Submit Test?</h3>
            <p className="text-slate-500 text-center mb-8 font-medium">
              Are you sure? You won't be able to change answers after submission.<br/>
              <span className="font-bold text-slate-700 mt-2 block">{answeredCount}/{questions.length} questions answered.</span>
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowConfirmModal(false)} disabled={submitting}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                No, Keep Going
              </button>
              <button onClick={() => handleSubmission(true)} disabled={submitting}
                className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-violet-700 shadow-lg transition-all">
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitting overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="bg-white p-12 rounded-[40px] shadow-2xl max-w-sm w-full">
            <div className="w-20 h-20 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-8 shadow-xl"></div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Calculating...</h3>
            <p className="text-slate-500 font-medium">Evaluating your performance and updating global rank.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm sticky top-0 z-[60]">
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={handleExit}
            className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all text-[10px] md:text-sm font-bold group">
            <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Exit Test</span>
          </button>
          <div className="hidden xs:flex w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 items-center justify-center text-white font-black text-xs shrink-0">M</div>
          <h1 className="text-xs md:text-base font-bold tracking-tight text-slate-800 truncate max-w-[120px] sm:max-w-none">
            {test?.title || 'Mock Test'}
            <span className="hidden md:inline text-slate-400 font-normal ml-2 text-sm">| {test?.topic}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 md:gap-5">
          {/* Timer */}
          <div className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1 md:py-2 rounded-full font-mono font-black text-xs md:text-sm transition-all border
            ${isTimeCritical
              ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse'
              : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
            <Clock className="w-3 h-3 md:w-4 md:h-4" />
            {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
          </div>

          <div className="flex items-center gap-2 md:gap-3 border-l pl-3 md:pl-5 border-slate-200">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] md:text-xs font-bold text-slate-700 truncate max-w-[80px]">{profile?.name || user?.email || user?.phoneNumber}</p>
              <p className="text-[8px] md:text-[10px] text-slate-500 tracking-wider">RANK: {profile?.globalRank === 0 ? '-' : `#${profile?.globalRank}`}</p>
            </div>
            <button onClick={() => setIsSidebarOpen(true)}
              className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-[10px] md:text-xs uppercase md:hidden">
              <Menu className="w-4 h-4" />
            </button>
            <div className="hidden md:flex w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 items-center justify-center text-white font-bold text-xs uppercase shadow-md cursor-pointer">
              {userInitial}
            </div>
          </div>
        </div>
      </header>

      {/* Warning banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-6 py-1.5 flex items-center gap-2 text-[9px] md:text-xs font-medium text-amber-800 shrink-0">
        <AlertTriangle className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0 text-amber-500" />
        <span className="truncate">
          Warning: Tab switching or minimizing window will result in automatic submission.
          {warnings > 0 && <span className="text-red-600 font-bold ml-2">({warnings} Warnings Recorded)</span>}
        </span>
      </div>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-slate-900/50 z-[70] md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Question Panel */}
        <section className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
          {/* Progress row */}
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest">
              Q {currentIdx + 1} / {questions.length}
            </span>
            <div className="flex gap-3 text-[9px] md:text-[10px] font-black">
              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">+{test?.marksPerCorrect || 1.0} Correct</span>
              <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-100">-{test?.negativeMarks || 0.25} Negative</span>
            </div>
          </div>

          {/* Question card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-8 flex-1 flex flex-col" style={{ borderLeft: '4px solid #4f46e5' }}>
            <h2 className="text-base md:text-xl font-semibold leading-relaxed mb-4 md:mb-6 text-slate-800">
              <RenderMathText text={currentQuestion.questionText} />
            </h2>
            {currentQuestion.equationLatex && (
              <div className="mb-4 md:mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-center text-xl overflow-x-auto">
                <RenderMathText text={`$$${currentQuestion.equationLatex}$$`} />
              </div>
            )}
            {currentQuestion.imageUrl && (
              <div className="mb-6 md:mb-8 flex justify-center">
                <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 inline-flex flex-col items-center" style={{ maxWidth: '100%' }}>
                  <img src={currentQuestion.imageUrl} alt="Question figure" loading="eager" style={{ maxHeight: 260, maxWidth: '100%', objectFit: 'contain', display: 'block' }} className="rounded-2xl"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                </div>
              </div>
            )}

            <div className="space-y-3 md:space-y-4">
              {(currentQuestion.options || []).map((opt: string, i: number) => {
                const isSelected = answers[currentQuestion.id] === String(i);
                const optionKey = `test-${testId}-q-${currentIdx}-opt-${i}`;
                const optionLabel = String.fromCharCode(65 + i);

                return (
                  <button key={optionKey} type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, i)}
                    className={`w-full flex items-center p-3 md:p-4 rounded-xl border-2 transition-all group relative text-left select-none break-words
                      ${isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md shadow-indigo-100'
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700'}`}>
                    <span className={`w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg flex items-center justify-center font-black mr-3 md:mr-4 transition-all text-xs md:text-sm
                      ${isSelected
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md'
                        : 'bg-slate-100 group-hover:bg-slate-200 text-slate-500'}`}>
                      {optionLabel}
                    </span>
                    <span className="font-medium text-sm md:text-base pr-6">{opt}</span>
                    {isSelected && (
                      <div className="absolute right-3 md:right-4 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shrink-0 shadow-md">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="mt-8 pt-6 lg:mt-auto border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={handlePrev} disabled={currentIdx === 0}
                  className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden xs:inline">Previous</span>
                  <span className="xs:hidden">Prev</span>
                </button>
                <button onClick={handleNext} disabled={currentIdx === questions.length - 1}
                  className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100">
                  <span className="hidden xs:inline">Save &amp; Next</span>
                  <span className="xs:hidden">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto justify-center">
                <button onClick={() => clearResponse(currentQuestion.id)}
                  className="px-3 md:px-4 py-2 md:py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-[10px] md:text-sm hover:bg-slate-50 transition-colors whitespace-nowrap">
                  Clear
                </button>
                <button onClick={() => toggleReview(currentQuestion.id)}
                  className={`px-3 md:px-4 py-2 md:py-2.5 rounded-xl border font-bold text-[10px] md:text-sm flex items-center gap-2 transition-colors whitespace-nowrap
                    ${review.has(currentQuestion.id)
                      ? 'bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200'
                      : 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
                  <Flag className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                  Review
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className={`fixed md:relative inset-y-0 right-0 w-72 md:w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 p-5 md:p-6 overflow-y-auto z-[80] transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full md:translate-x-0'}`}>
          <div className="flex md:hidden items-center justify-between mb-5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Questions</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Progress */}
          <div className="mb-5">
            <h3 className="hidden md:block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Progress</h3>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
              </div>
              <span className="text-xs font-black text-slate-700 tabular-nums">{answeredCount}/{questions.length}</span>
            </div>
          </div>

          {/* Question palette */}
          <div className="flex-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Question Palette</h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIdx;
                const isAnswered = !!answers[q.id];
                const isReview = review.has(q.id);
                const isVisited = visited.has(q.id);
                const isSkipped = isVisited && !isAnswered && !isReview;

                let btnStyles = "bg-slate-100 text-slate-400";
                if (isCurrent) btnStyles = "border-2 border-indigo-600 text-indigo-600 bg-indigo-50 shadow-md";
                else if (isReview) btnStyles = "bg-amber-400 text-white shadow-sm";
                else if (isAnswered) btnStyles = "bg-emerald-500 text-white shadow-sm";
                else if (isSkipped || isVisited) btnStyles = "bg-rose-400 text-white shadow-sm";

                return (
                  <button key={q.id}
                    onClick={() => { setCurrentIdx(idx); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className={`h-8 w-8 md:h-9 md:w-9 rounded-lg flex items-center justify-center text-[10px] md:text-xs font-bold transition-all hover:opacity-80 active:scale-90 ${btnStyles}`}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend + Submit */}
          <div className="mt-auto pt-5 border-t border-slate-100 space-y-4 sticky bottom-0 bg-white pb-2">
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-[9px] md:text-[10px] font-bold uppercase text-slate-600">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Answered</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-amber-400 rounded-sm" /> Review</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-slate-200 rounded-sm border border-slate-300" /> Unvisited</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-rose-400 rounded-sm" /> Skipped</div>
            </div>
            <button onClick={() => handleSubmission(false)} disabled={submitting}
              className={`w-full py-3 md:py-4 text-white rounded-xl font-black uppercase tracking-widest text-xs md:text-sm transition-all flex items-center justify-center shadow-lg active:scale-95
                ${submitting ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-xl hover:-translate-y-0.5 cursor-pointer'}`}
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
              {submitting ? (
                <>
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                  Submitting...
                </>
              ) : 'Submit Test'}
            </button>
          </div>
        </aside>
      </main>

      {/* Status bar */}
      <footer className="h-8 bg-slate-900 text-slate-400 flex items-center px-6 justify-between text-[9px] md:text-[10px] uppercase tracking-wider shrink-0 flex-wrap gap-2">
        <div className="flex gap-4">
          <span>Connection: <span className="text-emerald-400">Stable</span></span>
          <span>UID: {user.uid.slice(0, 8)}...</span>
        </div>
        <div className="flex gap-4">
          <span>Topic: {test?.topic || 'General'}</span>
          <span>ID: {test?.id?.slice(0, 8) || 'Unknown'}</span>
        </div>
      </footer>
    </div>
  );
}

