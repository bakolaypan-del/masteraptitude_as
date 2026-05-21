import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import FirstVisitModal from '../components/FirstVisitModal';
import { Clock, RefreshCcw, ArrowLeft, Trophy, AlertCircle, BarChart3, CheckCircle2, Keyboard, Zap, Target, Star } from 'lucide-react';

interface TypingTest {
  id: string;
  title: string;
  paragraph: string;
  duration: number;
}

export default function TypingTestRunner() {
  const { id } = useParams<{ id: string }>();
  const { user, profileIncomplete } = useAuth();
  const [showFirstVisitModal, setShowFirstVisitModal] = useState(false);
  const navigate = useNavigate();

  const [test, setTest] = useState<TypingTest | null>(null);
  const [loading, setLoading] = useState(true);

  const [typedText, setTypedText] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [errors, setErrors] = useState(0);
  const [correctWords, setCorrectWords] = useState(0);
  const [wrongWords, setWrongWords] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [hasFocus, setHasFocus] = useState(true);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function fetchTest() {
      if (!user || !id) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/typing-test/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTest(data);
          setTimeLeft(data.duration * 60);
        } else {
          navigate('/typing-test');
        }
      } catch (err) {
        console.error("Failed to load test", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTest();
  }, [user, id, navigate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      handleFinish();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (!test || typedText.length === 0) return;

    let correctChars = 0;
    const targetText = test.paragraph.substring(0, typedText.length);
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === targetText[i]) correctChars++;
    }

    const timeElapsedMinutes = (test.duration * 60 - timeLeft) / 60;
    const calculatedWpm = timeElapsedMinutes > 0 ? Math.round((correctChars / 5) / timeElapsedMinutes) : 0;
    const calculatedAccuracy = typedText.length > 0 ? Math.round((correctChars / typedText.length) * 100) : 0;
    const calculatedErrors = typedText.length - correctChars;

    const typedWordsArray = typedText.trim().split(/\s+/).filter(w => w.length > 0);
    const targetWordsArray = test.paragraph.trim().split(/\s+/);
    let cWords = 0, wWords = 0;
    typedWordsArray.forEach((word, index) => {
      if (index < targetWordsArray.length) {
        if (word === targetWordsArray[index]) cWords++;
        else wWords++;
      }
    });

    setWpm(calculatedWpm);
    setAccuracy(calculatedAccuracy);
    setErrors(calculatedErrors);
    setCorrectWords(cWords);
    setWrongWords(wWords);
  }, [typedText, test, timeLeft]);

  const handleStart = () => {
    if (profileIncomplete) {
      setShowFirstVisitModal(true);
      return;
    }
    setIsActive(true);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isActive && !isFinished) handleStart();
    if (!isFinished && test) {
      if (e.target.value.length <= test.paragraph.length) {
        setTypedText(e.target.value);
      }
      if (e.target.value.length === test.paragraph.length) {
        setTypedText(e.target.value);
        handleFinish();
      }
    }
  };

  const handleFinish = async () => {
    setIsActive(false);
    setIsFinished(true);
    await submitResult();
  };

  const submitResult = async () => {
    if (!user || !test || submitting) return;
    setSubmitting(true);
    try {
      const timeTakenMinutes = (test.duration * 60 - timeLeft) / 60;
      const token = await user.getIdToken();
      const res = await fetch('/api/typing-test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ testId: test.id, typedText, wpm, accuracy, errors, correctWords, wrongWords, timeTakenMinutes })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.resultId) setResultId(data.resultId);
      }
    } catch (err) {
      console.error("Failed to submit result", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (test) {
      setTimeLeft(test.duration * 60);
      setTypedText('');
      setIsActive(false);
      setIsFinished(false);
      setWpm(0); setAccuracy(0); setErrors(0);
      setCorrectWords(0); setWrongWords(0);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = test ? Math.round((typedText.length / test.paragraph.length) * 100) : 0;

  const renderParagraph = () => {
    if (!test) return null;
    return (
      <div className="font-mono text-base md:text-lg leading-loose tracking-wide select-none">
        {test.paragraph.split('').map((char, index) => {
          let className = "text-slate-500";
          if (index < typedText.length) {
            if (typedText[index] === char) {
              className = "text-emerald-400";
            } else {
              className = "text-rose-400 bg-rose-500/20 rounded underline decoration-rose-400/50";
            }
          } else if (index === typedText.length && isActive) {
            className = "bg-indigo-500/40 border-l-2 border-indigo-400 animate-pulse text-slate-200";
          }
          return (
            <span key={index} className={className}>
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-900/50 animate-pulse">
          <Keyboard className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -inset-3 rounded-3xl border-2 border-indigo-500/30 animate-ping" />
      </div>
      <p className="mt-6 text-indigo-200 font-bold tracking-wider animate-pulse">Loading Test Environment...</p>
    </div>
  );

  if (!test) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
        <p className="text-white font-bold text-xl">Test Not Found</p>
        <button onClick={() => navigate('/typing-test')} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors">
          Back to Tests
        </button>
      </div>
    </div>
  );

  return (
    <>
    {showFirstVisitModal && (
      <FirstVisitModal onComplete={() => { setShowFirstVisitModal(false); setIsActive(true); inputRef.current?.focus(); }} />
    )}
    <div
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      className="min-h-screen flex flex-col selection:bg-indigo-500/30 select-none"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-4"
        style={{ background: 'rgba(15, 12, 41, 0.8)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/typing-test')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Keyboard className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-none">{test.title}</h1>
                <p className="text-xs text-slate-400 mt-0.5">{test.duration} min · Typing Test</p>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono font-black text-lg transition-all
            ${timeLeft < 60 && isActive
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse shadow-lg shadow-rose-500/20'
              : 'bg-white/10 border-white/20 text-white'}`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col gap-5">

        {/* Live Stats (only during test) */}
        {!isFinished && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {/* WPM */}
              <div className="relative rounded-2xl p-4 border border-indigo-500/30 overflow-hidden"
                style={{ background: 'rgba(99,102,241,0.1)' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent" />
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">Speed</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-indigo-300">{wpm}</span>
                    <span className="text-xs text-indigo-400 font-bold">WPM</span>
                  </div>
                </div>
              </div>

              {/* Accuracy */}
              <div className="relative rounded-2xl p-4 border border-emerald-500/30 overflow-hidden"
                style={{ background: 'rgba(16,185,129,0.1)' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-transparent" />
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-300 font-black uppercase tracking-widest">Accuracy</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-emerald-300">{accuracy}</span>
                    <span className="text-xs text-emerald-400 font-bold">%</span>
                  </div>
                </div>
              </div>

              {/* Errors */}
              <div className="relative rounded-2xl p-4 border border-rose-500/30 overflow-hidden"
                style={{ background: 'rgba(239,68,68,0.1)' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-rose-600/10 to-transparent" />
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle className="w-3 h-3 text-rose-400" />
                    <span className="text-[10px] text-rose-300 font-black uppercase tracking-widest">Errors</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-rose-300">{errors}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-400 tabular-nums">{progress}%</span>
            </div>
          </>
        )}

        {/* Result screen */}
        {isFinished ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="w-full max-w-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>

              {/* Trophy header */}
              <div className="relative p-8 text-center overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
                {/* Blur orbs */}
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-indigo-300/20 rounded-full blur-xl" />

                <div className="relative">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30 shadow-xl">
                    <Trophy className="w-10 h-10 text-yellow-300" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight">Test Completed! 🎉</h2>
                  <p className="text-indigo-200 mt-1 font-medium">Here's your performance report</p>
                  {submitting && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-indigo-200 text-sm">
                      <div className="w-4 h-4 border-2 border-indigo-200/30 border-t-indigo-200 rounded-full animate-spin" />
                      Saving result...
                    </div>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl p-5 border border-indigo-500/20 flex items-center gap-4"
                  style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">Speed</p>
                    <p className="text-2xl font-black text-white">{wpm} <span className="text-sm text-indigo-300 font-bold">WPM</span></p>
                  </div>
                </div>

                <div className="rounded-2xl p-5 border border-emerald-500/20 flex items-center gap-4"
                  style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-300 font-black uppercase tracking-widest">Accuracy</p>
                    <p className="text-2xl font-black text-white">{accuracy}<span className="text-sm text-emerald-300 font-bold">%</span></p>
                  </div>
                </div>

                <div className="rounded-2xl p-5 border border-rose-500/20 flex items-center gap-4"
                  style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-rose-300 font-black uppercase tracking-widest">Errors</p>
                    <p className="text-2xl font-black text-white">{errors}</p>
                  </div>
                </div>

                <div className="rounded-2xl p-5 border border-sky-500/20 flex items-center gap-4"
                  style={{ background: 'rgba(14,165,233,0.1)' }}>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-sky-300 font-black uppercase tracking-widest">Time Used</p>
                    <p className="text-2xl font-black text-white">{formatTime(test.duration * 60 - timeLeft)}</p>
                  </div>
                </div>
              </div>

              {/* Word stats */}
              <div className="px-6 pb-2">
                <div className="rounded-2xl border border-white/10 p-4 flex justify-around text-center"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Correct Words</p>
                    <p className="text-xl font-black text-emerald-400">{correctWords}</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Wrong Words</p>
                    <p className="text-xl font-black text-rose-400">{wrongWords}</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Progress</p>
                    <p className="text-xl font-black text-indigo-400">{progress}%</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 flex flex-wrap gap-3">
                <button onClick={() => navigate('/typing-test')}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-300 border border-white/10 hover:bg-white/10 transition-colors min-w-[120px]"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  ← Back to Tests
                </button>
                {resultId && (
                  <button onClick={() => navigate(`/typing-test/${resultId}/analysis`)}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 transition-all shadow-lg shadow-fuchsia-600/30 min-w-[120px]">
                    <Star className="w-4 h-4 inline mr-2" />
                    View Analysis
                  </button>
                )}
                <button onClick={handleRetry}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 min-w-[120px]">
                  <RefreshCcw className="w-4 h-4" /> Retry Test
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Typing area */
          <div className="flex flex-col flex-1 gap-4 relative">
            <div
              className="relative rounded-3xl border border-white/10 p-6 md:p-8 overflow-y-auto cursor-text min-h-[240px]"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}
              onClick={() => inputRef.current?.focus()}
            >
              {/* Start overlay */}
              {!isActive && typedText.length === 0 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl cursor-pointer"
                  style={{ background: 'rgba(15,12,41,0.75)', backdropFilter: 'blur(8px)' }}
                  onClick={handleStart}>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-900/50 hover:scale-110 transition-transform">
                      <Keyboard className="w-8 h-8 text-white" />
                    </div>
                    <div className="px-8 py-3 rounded-2xl font-black text-lg text-white border border-indigo-400/30"
                      style={{ background: 'rgba(99,102,241,0.3)' }}>
                      ⌨️ Click to Start Typing
                    </div>
                    <p className="mt-3 text-slate-400 text-sm">Timer starts when you type the first character</p>
                  </div>
                </div>
              )}

              {/* Focus lost overlay */}
              {isActive && !hasFocus && (
                <div className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl cursor-pointer"
                  style={{ background: 'rgba(15,12,41,0.85)', backdropFilter: 'blur(10px)' }}
                  onClick={() => { inputRef.current?.focus(); setHasFocus(true); }}>
                  <div className="text-center animate-bounce">
                    <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
                    <div className="px-6 py-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 font-black text-rose-300 text-lg">
                      Focus Lost! Click to Resume
                    </div>
                    <p className="mt-2 text-rose-400/70 text-sm">Test is paused</p>
                  </div>
                </div>
              )}

              {renderParagraph()}
            </div>

            {/* Hidden textarea */}
            <textarea
              ref={inputRef}
              value={typedText}
              onChange={handleInputChange}
              onBlur={() => { if (isActive) setHasFocus(false); }}
              onFocus={() => setHasFocus(true)}
              disabled={isFinished}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="opacity-0 absolute w-0 h-0 p-0 m-0 border-none outline-none resize-none overflow-hidden"
            />

            {/* Hint bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Correct
                <div className="w-2 h-2 rounded-full bg-rose-500 ml-2" /> Error
                <div className="w-2 h-2 rounded-full bg-indigo-500 ml-2 animate-pulse" /> Cursor
              </span>
              <span>Test auto-submits when time runs out or paragraph is complete</span>
            </div>
          </div>
        )}
      </main>
    </div>
    </>
  );
}
