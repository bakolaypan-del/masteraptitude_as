import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { RenderMathText } from '../components/MathRenderer';
import { Clock, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, Flag, Info, Globe, Play, Menu, X, Target, Trophy, Zap, BookOpen, Shield } from 'lucide-react';
import { translateQuestions } from '../services/translationService';

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
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});

  const [showInstructions, setShowInstructions] = useState(true);
  const [selectedLang, setSelectedLang] = useState('English');
  const [translating, setTranslating] = useState(false);
  const [originalQuestions, setOriginalQuestions] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isSubmittingRef = useRef(false);
  const timerRef = useRef<any>(null);
  const currentIdxRef = useRef(currentIdx);

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
        if (data.success === false) throw new Error(data.message || 'Failed to initialize test session.');
        if (!data.questions || !Array.isArray(data.questions)) throw new Error("Invalid question data received from the server.");
        if (data.questions.length === 0) throw new Error("No questions available for this test.");

        if (active) {
          setTest(data.test);
          setQuestions(data.questions);
          setOriginalQuestions(data.questions);
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
    return () => { active = false; };
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
          setQuestionTimes(prev => ({ ...prev, [currentQuestionId]: (prev[currentQuestionId] || 0) + 1 }));
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
  }, [submitting, result, questions.length, timeLeft]);

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
      const payload = originalQuestions.map(q => {
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
        body: JSON.stringify({ testId, answers: payload, timeTaken: timeTakenStr, questionTimes })
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

  const handleStartTest = async () => {
    if (selectedLang === 'Bengali') {
      setTranslating(true);
      try {
        const translated = await translateQuestions(originalQuestions, 'Bengali', user);
        setQuestions(translated);
      } catch (err) {
        console.error("Translation error:", err);
      } finally {
        setTranslating(false);
      }
    } else {
      setQuestions(originalQuestions);
    }
    setShowInstructions(false);
  };

  const t = (en: string, bn: string) => (selectedLang === 'Bengali' ? bn : en);

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
    const rules = [
      { icon: Shield, color: 'text-rose-400', text: t("You cannot switch tabs or minimize the browser window during the test.", "আপনি ট্যাব পরিবর্তন বা ব্রাউজার উইন্ডো ছোট করতে পারবেন না।") },
      { icon: Clock, color: 'text-amber-400', text: t("The timer starts immediately when you click Start Test.", "স্টার্ট বাটনে ক্লিক করার সাথে সাথেই টাইমার শুরু হবে।") },
      { icon: Flag, color: 'text-violet-400', text: t("You can mark questions for review and revisit them later.", "আপনি প্রশ্নগুলো রিভিউ করতে চিহ্নিত করতে পারেন।") },
      { icon: Zap, color: 'text-emerald-400', text: t("Your progress is saved automatically as you navigate.", "আপনার অগ্রগতি স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়।") },
      { icon: Target, color: 'text-sky-400', text: t("Ensure you have a stable internet connection.", "আপনার ইন্টারনেট সংযোগ স্থিতিশীল আছে কিনা নিশ্চিত করুন।") },
    ];

    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
        {/* Blur orbs */}
        <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(99,102,241,0.12)' }} />
        <div className="fixed bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(124,58,237,0.1)' }} />

        <div className="max-w-3xl w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative"
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(30px)' }}>

          {/* Header */}
          <div className="relative p-8 md:p-10 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl"
              style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full blur-2xl"
              style={{ background: 'rgba(165,180,252,0.1)' }} />
            <div className="relative flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-xl">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">
                  {t("Test Instructions", "পরীক্ষার নির্দেশাবলী")}
                </h2>
                <p className="text-indigo-200 font-medium text-sm">
                  {t("Please read carefully before starting.", "শুরু করার আগে মনোযোগ দিয়ে পড়ুন।")}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[60vh]">

            {/* Test Details + Marks grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 p-5"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info className="w-3 h-3 text-indigo-400" />
                  {t("Test Details", "পরীক্ষার বিবরণ")}
                </h3>
                <div className="space-y-3">
                  {[
                    [t("Test Name", "পরীক্ষার নাম"), test?.title],
                    [t("Topic", "বিষয়"), test?.topic],
                    [t("Total Questions", "মোট প্রশ্ন"), `${originalQuestions.length} ${t("Items", "টি")}`],
                    [t("Total Time", "মোট সময়"), `${test?.duration || 30} ${t("Minutes", "মিনিট")}`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-medium">{label}</span>
                      <span className="font-black text-white text-right ml-2 text-indigo-300">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 p-5"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Flag className="w-3 h-3 text-violet-400" />
                  {t("Marking Scheme", "নম্বর বিভাজন")}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-emerald-400 font-bold text-sm">{t("Correct Answer", "সঠিক উত্তর")}</span>
                    <span className="font-black text-emerald-400 text-lg">+{test?.marksPerCorrect || 1.0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-rose-400 font-bold text-sm">{t("Wrong Answer", "ভুল উত্তর")}</span>
                    <span className="font-black text-rose-400 text-lg">-{test?.negativeMarks || 0.25}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-slate-400 font-bold text-sm">{t("Unattempted", "চেষ্টা করা হয়নি")}</span>
                    <span className="font-black text-slate-400 text-lg">0.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3">
                {t("General Rules:", "সাধারণ নিয়মাবলী:")}
              </h3>
              <div className="space-y-2">
                {rules.map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-white/5"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <rule.icon className={`w-4 h-4 ${rule.color} shrink-0 mt-0.5`} />
                    <p className="text-sm text-slate-300 font-medium leading-snug">{rule.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Language selector */}
            <div className="border-t border-white/10 pt-5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Globe className="w-3 h-3 text-sky-400" />
                {t("Select Test Language", "পরীক্ষার ভাষা নির্বাচন করুন")}
              </h3>
              <div className="flex gap-3">
                {['English', 'Bengali'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`flex-1 py-3 rounded-2xl border-2 font-black text-sm uppercase tracking-widest transition-all
                      ${selectedLang === lang
                        ? 'border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-900/30'
                        : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-400'}
                    `}
                    style={selectedLang === lang
                      ? { background: 'rgba(99,102,241,0.15)' }
                      : { background: 'rgba(255,255,255,0.03)' }}>
                    {lang === 'Bengali' ? 'বাংলা' : 'English'}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-tight text-center">
                {t("Questions and Options will be automatically translated if Bengali is selected.", "বাংলা সিলেক্ট করলে প্রশ্ন ও অপশনগুলো স্বয়ংক্রিয়ভাবে অনুবাদ করা হবে।")}
              </p>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="p-6 md:p-8 border-t border-white/10 flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="flex-1 py-4 border border-white/10 text-slate-400 font-black rounded-2xl hover:bg-white/5 transition-colors uppercase tracking-widest text-xs"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              {t("Back to Dashboard", "ড্যাশবোর্ডে ফিরে যান")}
            </button>
            <button
              disabled={translating}
              onClick={handleStartTest}
              className="flex-[2] py-4 text-white font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
              {translating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {t("Translating Questions...", "প্রশ্ন অনুবাদ করা হচ্ছে...")}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  {t("Start Test Now", "এখনই পরীক্ষা শুরু করুন")}
                </>
              )}
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
            {questions.map((q, idx) => {
              const correctAnswer = result.analysis[q.id];
              const storedIdx = answers[q.id];
              const origQ = originalQuestions.find((oq: any) => oq.id === q.id);
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
                        <img src={q.imageUrl} alt="Question figure" className="max-h-52 rounded-xl object-contain border border-slate-100 bg-slate-50" />
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

                    <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Topic: {q.topic || 'General'}</span>
                      </div>
                      {isCorrect ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                          <span>+{test?.marksPerCorrect || 1.0} MARKS</span>
                        </div>
                      ) : isUnattempted ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-400 rounded-lg border border-slate-200">
                          <span>0.0 MARKS</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                          <span>-{test?.negativeMarks || 0.25} MARKS</span>
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
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
        {/* Blur orbs */}
        <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.12)' }} />
        <div className="fixed bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(16,185,129,0.08)' }} />

        <div className="max-w-xl w-full rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative"
          style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(30px)' }}>

          {/* Top gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" />

          {/* Trophy section */}
          <div className="p-10 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border-2 border-emerald-400/30 flex items-center justify-center mx-auto mb-6 shadow-2xl hover:scale-110 transition-transform duration-500">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Test Completed! 🎉</h2>
            <p className="text-slate-400 font-medium">Your performance has been evaluated and recorded globally.</p>
          </div>

          {/* Stats */}
          <div className="px-8 pb-8 grid grid-cols-2 gap-4">
            {[
              { label: 'Your Score', value: result.score, color: 'from-indigo-500 to-violet-600', textColor: 'text-indigo-300', border: 'border-indigo-500/20' },
              { label: 'Global Rank', value: `#${result.rank || '-'}`, color: 'from-amber-500 to-orange-500', textColor: 'text-amber-300', border: 'border-amber-500/20' },
              { label: 'Correct', value: result.correctAnswers, color: 'from-emerald-500 to-teal-600', textColor: 'text-emerald-300', border: 'border-emerald-500/20' },
              { label: 'Wrong', value: result.wrongAnswers, color: 'from-rose-500 to-pink-600', textColor: 'text-rose-300', border: 'border-rose-500/20' },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-2xl border p-5 text-center transition-all hover:-translate-y-1 hover:shadow-lg ${stat.border}`}
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${stat.textColor}`}>{stat.label}</p>
                <p className={`text-4xl font-black ${stat.textColor}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="px-8 pb-8 flex flex-col gap-3">
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
            <span className="hidden sm:inline">{t("Exit Test", "পরীক্ষা শেষ")}</span>
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
          {t("Warning: Tab switching or minimizing window will result in automatic submission.", "সতর্কতা: ট্যাব পরিবর্তন বা উইন্ডো ছোট করলে স্বয়ংক্রিয়ভাবে সাবমিট হয়ে যাবে।")}
          {warnings > 0 && <span className="text-red-600 font-bold ml-2">({warnings} {t("Warnings Recorded", "টি সতর্কতা")})</span>}
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
              {t("Question", "প্রশ্ন")} {currentIdx + 1} / {questions.length}
            </span>
            <div className="flex gap-3 text-[9px] md:text-[10px] font-black">
              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">+{test?.marksPerCorrect || 1.0} {t("Correct", "সঠিক")}</span>
              <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-100">-{test?.negativeMarks || 0.25} {t("Negative", "ভুল")}</span>
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
                <img src={currentQuestion.imageUrl} alt="Question figure" className="max-h-52 rounded-xl object-contain border border-slate-100 bg-slate-50" />
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
                  <span className="hidden xs:inline">{t("Previous", "আগেরটি")}</span>
                  <span className="xs:hidden">{t("Prev", "আগের")}</span>
                </button>
                <button onClick={handleNext} disabled={currentIdx === questions.length - 1}
                  className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100">
                  <span className="hidden xs:inline">{t("Save & Next", "সংরক্ষণ ও পরেরটি")}</span>
                  <span className="xs:hidden">{t("Next", "পরেরটি")}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto justify-center">
                <button onClick={() => clearResponse(currentQuestion.id)}
                  className="px-3 md:px-4 py-2 md:py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-[10px] md:text-sm hover:bg-slate-50 transition-colors whitespace-nowrap">
                  {t("Clear Response", "পরিষ্কার করুন")}
                </button>
                <button onClick={() => toggleReview(currentQuestion.id)}
                  className={`px-3 md:px-4 py-2 md:py-2.5 rounded-xl border font-bold text-[10px] md:text-sm flex items-center gap-2 transition-colors whitespace-nowrap
                    ${review.has(currentQuestion.id)
                      ? 'bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200'
                      : 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
                  <Flag className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                  {t("Mark for Review", "রিভিউ করুন")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className={`fixed md:relative inset-y-0 right-0 w-72 md:w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 p-5 md:p-6 overflow-y-auto z-[80] transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full md:translate-x-0'}`}>
          <div className="flex md:hidden items-center justify-between mb-5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{t("Test Progress", "পরীক্ষার অগ্রগতি")}</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Progress */}
          <div className="mb-5">
            <h3 className="hidden md:block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t("Test Progress", "পরীক্ষার অগ্রগতি")}</h3>
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
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t("Question Palette", "প্রশ্ন প্যালেট")}</h3>
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
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> {t("Answered", "উত্তর দেওয়া")}</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-amber-400 rounded-sm" /> {t("Review", "পর্যালোচনা")}</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-slate-200 rounded-sm border border-slate-300" /> {t("Unvisited", "দেখা হয়নি")}</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-rose-400 rounded-sm" /> {t("Skipped", "বাদ দেওয়া")}</div>
            </div>
            <button onClick={() => handleSubmission(false)} disabled={submitting}
              className={`w-full py-3 md:py-4 text-white rounded-xl font-black uppercase tracking-widest text-xs md:text-sm transition-all flex items-center justify-center shadow-lg active:scale-95
                ${submitting ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-xl hover:-translate-y-0.5 cursor-pointer'}`}
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
              {submitting ? (
                <>
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                  {t("Submitting", "সাবমিট হচ্ছে")}
                </>
              ) : t("Submit Test", "সাবমিট করুন")}
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

