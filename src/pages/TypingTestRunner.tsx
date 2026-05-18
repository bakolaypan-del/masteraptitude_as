import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Clock, RefreshCcw, ArrowLeft, Trophy, AlertCircle, BarChart3, CheckCircle2 } from 'lucide-react';

interface TypingTest {
  id: string;
  title: string;
  paragraph: string;
  duration: number; // in minutes
}

export default function TypingTestRunner() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState<TypingTest | null>(null);
  const [loading, setLoading] = useState(true);

  // Typing state
  const [typedText, setTypedText] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Results state
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [errors, setErrors] = useState(0);
  const [correctWords, setCorrectWords] = useState(0);
  const [wrongWords, setWrongWords] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [hasFocus, setHasFocus] = useState(true);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch test data
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
          console.error("Test not found");
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

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleFinish();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Calculations
  useEffect(() => {
    if (!test || typedText.length === 0) return;

    let correctChars = 0;
    const targetText = test.paragraph.substring(0, typedText.length);

    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === targetText[i]) {
        correctChars++;
      }
    }

    const timeElapsedMinutes = (test.duration * 60 - timeLeft) / 60;

    // WPM = (Total Correct Characters / 5) / TimeInMinutes
    const calculatedWpm = timeElapsedMinutes > 0 ? ((correctChars / 5) / timeElapsedMinutes) : 0;

    // Accuracy = (Correct Characters / Total Typed Characters) * 100
    const calculatedAccuracy = typedText.length > 0 ? (correctChars / typedText.length) * 100 : 0;

    const calculatedErrors = typedText.length - correctChars;

    // Word counts (naive split by space)
    const typedWordsArray = typedText.trim().split(/\s+/).filter(w => w.length > 0);
    const targetWordsArray = test.paragraph.trim().split(/\s+/);

    let cWords = 0;
    let wWords = 0;

    typedWordsArray.forEach((word, index) => {
      if (index < targetWordsArray.length) {
        if (word === targetWordsArray[index]) {
          cWords++;
        } else {
          wWords++;
        }
      }
    });

    setWpm(Math.round(calculatedWpm));
    setAccuracy(Math.round(calculatedAccuracy));
    setErrors(calculatedErrors);
    setCorrectWords(cWords);
    setWrongWords(wWords);

  }, [typedText, test, timeLeft]);

  const handleStart = () => {
    setIsActive(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isActive && !isFinished) {
      handleStart();
    }
    if (!isFinished && test) {
      // Prevent typing more than paragraph length
      if (e.target.value.length <= test.paragraph.length) {
        setTypedText(e.target.value);
      }
      // Auto finish if fully typed
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          testId: test.id,
          typedText,
          wpm,
          accuracy,
          errors,
          correctWords,
          wrongWords,
          timeTakenMinutes
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.resultId) {
          setResultId(data.resultId);
        }
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
      setWpm(0);
      setAccuracy(0);
      setErrors(0);
      setCorrectWords(0);
      setWrongWords(0);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderParagraph = () => {
    if (!test) return null;
    return (
      <div className="font-mono text-lg md:text-xl leading-relaxed tracking-wide text-slate-400 select-none">
        {test.paragraph.split('').map((char, index) => {
          let className = "";
          if (index < typedText.length) {
            if (typedText[index] === char) {
              className = "text-emerald-500 bg-emerald-500/10";
            } else {
              className = "text-rose-500 bg-rose-500/10 underline decoration-rose-500/50";
            }
          } else if (index === typedText.length && isActive) {
            className = "bg-indigo-500/30 border-l-2 border-indigo-500 animate-pulse text-slate-200";
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading Test...</div>;
  if (!test) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Test Not Found</div>;

  return (
    <div
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      className="min-h-screen bg-slate-900 text-slate-300 font-sans flex flex-col selection:bg-indigo-500/30 select-none"
    >
      <header className="bg-slate-800/50 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/typing-test')} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h1 className="text-xl font-bold text-slate-100 hidden sm:block">{test.title}</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Time</span>
            <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft < 60 && isActive ? 'text-rose-400 animate-pulse' : 'text-slate-100'}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full flex flex-col">
        {!isFinished && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/50 flex flex-col items-center justify-center shadow-lg">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Speed</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-indigo-400">{wpm}</span>
                <span className="text-xs text-slate-500 font-medium">WPM</span>
              </div>
            </div>
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/50 flex flex-col items-center justify-center shadow-lg">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Accuracy</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-emerald-400">{accuracy}</span>
                <span className="text-xs text-slate-500 font-medium">%</span>
              </div>
            </div>
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/50 flex flex-col items-center justify-center shadow-lg">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Errors</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-rose-400">{errors}</span>
              </div>
            </div>
          </div>
        )}

        {isFinished ? (
          <div className="bg-slate-800/80 rounded-3xl p-8 border border-slate-700 shadow-2xl mt-8 max-w-2xl mx-auto w-full animate-in zoom-in-95 duration-500">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
                <Trophy className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-3xl font-black text-white">Test Completed!</h2>
              <p className="text-slate-400 mt-2">Here is your performance report.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400"><BarChart3 className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Speed</p>
                  <p className="text-2xl font-black text-white">{wpm} WPM</p>
                </div>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400"><CheckCircle2 className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Accuracy</p>
                  <p className="text-2xl font-black text-white">{accuracy}%</p>
                </div>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4">
                <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400"><AlertCircle className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Errors</p>
                  <p className="text-2xl font-black text-white">{errors}</p>
                </div>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4">
                <div className="p-3 bg-sky-500/20 rounded-xl text-sky-400"><Clock className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Time Taken</p>
                  <p className="text-2xl font-black text-white">{formatTime(test.duration * 60 - timeLeft)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/typing-test')}
                className="flex-1 py-4 rounded-xl font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors min-w-[120px]"
              >
                Back to Tests
              </button>
              {resultId && (
                <button
                  onClick={() => navigate(`/typing-test/${resultId}/analysis`)}
                  className="flex-1 py-4 rounded-xl font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-500 transition-colors shadow-lg shadow-fuchsia-600/20 min-w-[120px]"
                >
                  View Analysis
                </button>
              )}
              <button
                onClick={handleRetry}
                className="flex-1 py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 min-w-[120px]"
              >
                <RefreshCcw className="w-5 h-5" /> Retry Test
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 gap-6 relative">
            <div
              className="bg-slate-800/50 p-6 md:p-8 rounded-3xl border border-slate-700 shadow-xl flex-1 overflow-y-auto"
              onClick={() => inputRef.current?.focus()}
            >
              {!isActive && typedText.length === 0 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-3xl cursor-pointer" onClick={handleStart}>
                  <div className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform">
                    <Clock className="w-6 h-6" /> Click here to Start Typing
                  </div>
                </div>
              )}
              {isActive && !hasFocus && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm rounded-3xl cursor-pointer" onClick={() => { inputRef.current?.focus(); setHasFocus(true); }}>
                  <div className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl flex flex-col items-center gap-2 hover:scale-105 transition-transform animate-bounce">
                    <AlertCircle className="w-8 h-8" />
                    <span>Focus Lost! Click here to Resume Test</span>
                  </div>
                </div>
              )}
              {renderParagraph()}
            </div>

            {/* Hidden Textarea for capturing input */}
            <textarea
              ref={inputRef}
              value={typedText}
              onChange={handleInputChange}
              onBlur={() => { if (isActive) setHasFocus(false); }}
              onFocus={() => { setHasFocus(true); }}
              disabled={isFinished}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="opacity-0 absolute w-0 h-0 p-0 m-0 border-none outline-none resize-none overflow-hidden"
            />

            <div className="text-center text-slate-500 text-sm">
              Keep typing to match the paragraph above. Test auto-submits when time runs out.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
