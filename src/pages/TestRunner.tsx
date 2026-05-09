import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Clock, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, Flag, Info, Globe, Play, Menu, X } from 'lucide-react';
import { translateQuestions } from '../services/translationService';

export default function TestRunner() {
  const { testId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
  const [selectedLang, setSelectedLang] = useState('English');
  const [translating, setTranslating] = useState(false);
  const [originalQuestions, setOriginalQuestions] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const isSubmittingRef = useRef(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    async function loadTest() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/test/${testId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          const text = await res.text();
          console.error("HTML response in loadTest:", text);
          throw new Error(`Server returned HTML instead of JSON. The backend might be offline. Status: ${res.status}`);
        }

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to load test');
        }
        const data = await res.json();
        setTest(data.test);
        setQuestions(data.questions);
        setOriginalQuestions(data.questions);
        if (data.questions.length > 0) {
           setVisited(new Set([data.questions[0].id]));
        }
        
        // Use test duration from DB, or fallback to 45s per question
        const durationMins = data.test.duration || (data.questions.length * 0.75);
        setTimeLeft(Math.floor(durationMins * 60));
      } catch (err: any) {
        console.error("Load test error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadTest();
  }, [testId, user]);

  useEffect(() => {
    if (questions.length > 0) {
      setVisited(prev => {
        const next = new Set(prev);
        if (questions[currentIdx]) {
          next.add(questions[currentIdx].id);
        }
        return next;
      });
    }
  }, [currentIdx, questions]);

  useEffect(() => {
    if (!showInstructions && !submitting && !result && questions.length > 0 && timeLeft > 0) {
      timerRef.current = setInterval(() => {
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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [submitting, result, questions.length, timeLeft]);

  // Anti-cheat
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
    if (isSubmittingRef.current || result || !user || questions.length === 0) {
      console.warn("Submission blocked: already submitting, has result, no user, or no questions");
      return;
    }
    
    if (!isAuto && !showConfirmModal) {
      setShowConfirmModal(true);
      return;
    }

    setShowConfirmModal(false);
    isSubmittingRef.current = true;
    setSubmitting(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    try {
      const payload = questions.map(q => ({
        id: q.id,
        selected: answers[q.id] || ''
      }));

      const token = await user.getIdToken();
      console.log("Submitting test...", { testId, questionCount: questions.length });
      
      const res = await fetch('/api/submit-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ testId, answers: payload })
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        const text = await res.text();
        console.error("HTML response in submitTest:", text);
        throw new Error(`Server returned HTML instead of JSON. The backend might be offline. Status: ${res.status}`);
      }

      const responseData = await res.json();
      
      if (!res.ok) {
        console.error("Server submission error:", responseData);
        throw new Error(responseData.error || 'The server encountered an error while calculating results.');
      }
      
      console.log("Submission success:", responseData);
      setResult(responseData);
    } catch (err: any) {
      console.error("Client submission error:", err);
      isSubmittingRef.current = false;
      setSubmitting(false); 
      alert(err.message || 'There was a problem submitting your test. Please try again.');
    }
  };

  const handleSelectOption = (qId: string, opt: string) => {
    setAnswers(prev => ({ ...prev, [qId]: opt }));
    setReview(prev => {
      const next = new Set(prev);
      next.delete(qId);
      return next;
    });
  };

  const toggleReview = (qId: string) => {
    setReview(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const clearResponse = (qId: string) => {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
  };

  const handleExit = () => {
    // Immediate navigate to ensure responsiveness
    navigate('/dashboard');
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

  if (loading) return <div className="flex justify-center items-center h-screen font-bold text-slate-600 bg-slate-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      Loading test environment...
    </div>
  </div>;

  if (error) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
     <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center max-w-md">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Failed to Load Test</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest">Back to Home</button>
     </div>
  </div>;

  if (questions.length === 0) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-center text-slate-500 font-bold">This test has no questions yet.</div>;

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-3xl w-full bg-white rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in duration-500">
          <div className="bg-indigo-600 p-6 md:p-8 text-white">
            <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tighter uppercase">
              {t("Test Instructions", "পরীক্ষার নির্দেশাবলী")}
            </h2>
            <p className="text-indigo-100 font-medium text-sm md:text-base">
              {t("Please read the following guidelines carefully before starting.", "শুরু করার আগে নিচের নির্দেশিকাগুলো মনোযোগ দিয়ে পড়ুন।")}
            </p>
          </div>
          
          <div className="p-6 md:p-12 space-y-6 md:y-8 flex-1 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-slate-50 p-4 md:p-6 rounded-3xl border border-slate-200">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-2">
                  <Info className="w-3 h-3" /> {t("Test Details", "পরীক্ষার বিবরণ")}
                </h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-slate-500 font-medium">{t("Test Name", "পরীক্ষার নাম")}</span>
                    <span className="font-bold text-slate-800 text-right ml-2">{test?.title}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-slate-500 font-medium">{t("Topic", "বিষয়")}</span>
                    <span className="font-bold text-slate-800">{test?.topic}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-slate-500 font-medium">{t("Total Questions", "মোট প্রশ্ন")}</span>
                    <span className="font-bold text-indigo-600">{originalQuestions.length} {t("Items", "টি")}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-slate-500 font-medium">{t("Total Time", "মোট সময়")}</span>
                    <span className="font-bold text-indigo-600">{test?.duration || 30} {t("Minutes", "মিনিট")}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 md:p-6 rounded-3xl border border-slate-200">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-2">
                  <Flag className="w-3 h-3" /> {t("Marking Scheme", "নম্বর বিভাজন")}
                </h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-emerald-600 font-bold">{t("Correct Answer", "সঠিক উত্তর")}</span>
                    <span className="font-black text-emerald-600">+{test?.marksPerCorrect || 1.0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-rose-600 font-bold">{t("Wrong Answer", "ভুল উত্তর")}</span>
                    <span className="font-black text-rose-600">-{test?.negativeMarks || 0.25}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-slate-500 font-medium">{t("Unattempted", "চেষ্টা করা হয়নি")}</span>
                    <span className="font-bold text-slate-800">0.0</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4">
              <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-tight">{t("General Rules:", "সাধারণ নিয়মাবলী:")}</h3>
              <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-slate-600 list-disc pl-5 font-medium">
                <li>{t("You cannot switch tabs or minimize the browser window. Doing so will result in immediate disqualification.", "আপনি ট্যাব পরিবর্তন করতে পারবেন না বা ব্রাউজার উইন্ডো ছোট করতে পারবেন না। এটি করলে অবিলম্বে অযোগ্য বলে গণ্য করা হবে।")}</li>
                <li>{t("The timer will start as soon as you click the Start Test button.", "আপনি 'শুরু করুন' বাটনে ক্লিক করার সাথে সাথেই টাইমার শুরু হবে।")}</li>
                <li>{t("You can mark questions for review and revisit them later.", "আপনি প্রশ্নগুলো পর্যালোচনার জন্য চিহ্নিত করতে পারেন এবং পরে আবার দেখতে পারেন।")}</li>
                <li>{t("Your progress is automatically saved as you navigate through questions.", "আপনি প্রশ্নের মধ্যে নেভিগেট করার সাথে সাথে আপনার অগ্রগতি স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়।")}</li>
                <li>{t("Ensure you have a stable internet connection.", "আপনার ইন্টারনেট সংযোগ স্থিতিশীল আছে কিনা তা নিশ্চিত করুন।")}</li>
              </ul>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2">
                <Globe className="w-3 h-3" /> {t("Select Test Language", "পরীক্ষার ভাষা নির্বাচন করুন")}
              </h3>
              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedLang('English')}
                  className={`flex-1 py-3 md:py-4 rounded-2xl border-2 font-black text-xs md:text-sm uppercase tracking-widest transition-all
                    ${selectedLang === 'English' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}
                  `}
                >
                  English
                </button>
                <button 
                  onClick={() => setSelectedLang('Bengali')}
                  className={`flex-1 py-3 md:py-4 rounded-2xl border-2 font-black text-xs md:text-sm uppercase tracking-widest transition-all
                    ${selectedLang === 'Bengali' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}
                  `}
                >
                  বাংলা
                </button>
              </div>
              <p className="mt-4 text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-tight text-center">
                {t("Questions and Options will be automatically translated if Bengali is selected.", "বাংলা সিলেক্ট করলে প্রশ্ন ও অপশনগুলো স্বয়ংক্রিয়ভাবে অনুবাদ করা হবে।")}
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3 md:gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 md:py-4 bg-white border border-slate-300 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition shadow-sm uppercase tracking-widest text-[10px] md:text-xs"
            >
              {t("Back to Dashboard", "ড্যাশবোর্ডে ফিরে যান")}
            </button>
            <button 
              disabled={translating}
              onClick={handleStartTest}
              className="flex-[2] py-3 md:py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-slate-900 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] md:text-xs disabled:opacity-50"
            >
              {translating ? (
                <>
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {t("Translating Questions...", "প্রশ্ন অনুবাদ করা হচ্ছে...")}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                  {t("Start Test Now", "এখনই পরীক্ষা শুরু করুন")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    if (showAnalysis) {
      return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowAnalysis(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all text-sm font-bold active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Result
              </button>
              <h1 className="text-lg font-bold tracking-tight text-slate-800">Test Analysis</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Score</span>
                <span className="text-sm font-black text-indigo-600">{result.score}</span>
              </div>
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-colors"
              >
                Exit Analysis
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              {questions.map((q, idx) => {
                const userChoice = answers[q.id] || '';
                const correctAnswer = result.analysis[q.id];
                const isCorrect = userChoice === correctAnswer;
                const isUnattempted = !userChoice;

                return (
                  <div key={q.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="p-6 md:p-8">
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                          Question {idx + 1}
                        </span>
                        {isUnattempted ? (
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            Not Attempted
                          </span>
                        ) : isCorrect ? (
                          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                            <CheckCircle className="w-3 h-3" /> Correct
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-rose-600 uppercase tracking-widest flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                            <AlertTriangle className="w-3 h-3" /> Incorrect
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-medium text-slate-800 mb-8 leading-relaxed">
                        {q.questionText}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((opt: string, i: number) => {
                          const optionLabel = String.fromCharCode(64 + (i + 1));
                          const isOptionCorrect = opt === correctAnswer;
                          const isOptionSelected = opt === userChoice;

                          let variant = "default";
                          if (isOptionCorrect) variant = "correct";
                          else if (isOptionSelected && !isCorrect) variant = "incorrect";

                          return (
                            <div 
                              key={i}
                              className={`flex items-center p-4 rounded-2xl border-2 transition-all relative
                                ${variant === 'correct' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm shadow-emerald-100' : ''}
                                ${variant === 'incorrect' ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-sm shadow-rose-100' : ''}
                                ${variant === 'default' ? 'bg-white border-slate-100 text-slate-600' : ''}
                              `}
                            >
                              <span className={`w-8 h-8 shrink-0 rounded flex items-center justify-center font-bold mr-4
                                ${variant === 'correct' ? 'bg-emerald-500 text-white' : ''}
                                ${variant === 'incorrect' ? 'bg-rose-500 text-white' : ''}
                                ${variant === 'default' ? 'bg-slate-100 text-slate-400' : ''}
                              `}>
                                {optionLabel}
                              </span>
                              <span className="font-medium text-sm md:text-base">{opt}</span>
                              
                              {variant === 'correct' && (
                                <div className="absolute right-4 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                              {variant === 'incorrect' && (
                                <div className="absolute right-4 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
                                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                        <span>Topic: {q.topic || 'General'}</span>
                        {isCorrect ? (
                          <span className="text-emerald-500">+{test?.marksPerCorrect || 1.0} Marks</span>
                        ) : isUnattempted ? (
                          <span className="text-slate-400">0.0 Marks</span>
                        ) : (
                          <span className="text-rose-500">-{test?.negativeMarks || 0.25} Marks</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

          <footer className="h-16 bg-white border-t border-slate-200 flex items-center justify-center px-6 shrink-0 z-10">
            <button 
              onClick={() => {
                setShowAnalysis(false);
                window.scrollTo(0, 0);
              }}
              className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 active:scale-95 uppercase tracking-tighter"
            >
              Back to Summary
            </button>
          </footer>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-[40px] shadow-2xl overflow-hidden p-10 border border-slate-100 text-center relative animate-in fade-in zoom-in duration-500">
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
          
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-white transition-transform hover:scale-110 duration-500">
             <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          
          <h2 className="text-5xl font-black text-slate-900 mb-2 tracking-tighter uppercase">Test Completed!</h2>
          <p className="text-slate-500 font-medium mb-12">Your performance has been evaluated and recorded globally.</p>
          
          <div className="grid grid-cols-2 gap-6 mb-12">
              <div className="bg-indigo-50/50 p-6 rounded-3xl border-2 border-indigo-100 shadow-xs transition-all hover:shadow-md hover:-translate-y-1">
                <p className="text-[10px] text-indigo-600 uppercase tracking-widest font-black mb-2 leading-none">Your Score</p>
                <p className="text-5xl font-black text-indigo-700 leading-none">{result.score}</p>
              </div>
              <div className="bg-amber-50/50 p-6 rounded-3xl border-2 border-amber-100 shadow-xs transition-all hover:shadow-md hover:-translate-y-1">
                <p className="text-[10px] text-amber-600 uppercase tracking-widest font-black mb-2 leading-none">Global Rank</p>
                <p className="text-5xl font-black text-amber-700 leading-none">#{result.rank || '-'}</p>
              </div>
              <div className="bg-emerald-50/50 p-6 rounded-3xl border-2 border-emerald-100 shadow-xs transition-all hover:shadow-md hover:-translate-y-1">
                <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-black mb-2 leading-none">Correct</p>
                <p className="text-4xl font-black text-emerald-700 leading-none">{result.correctAnswers}</p>
              </div>
              <div className="bg-rose-50/50 p-6 rounded-3xl border-2 border-rose-100 shadow-xs transition-all hover:shadow-md hover:-translate-y-1">
                <p className="text-[10px] text-rose-600 uppercase tracking-widest font-black mb-2 leading-none">Wrong</p>
                <p className="text-4xl font-black text-rose-700 leading-none">{result.wrongAnswers}</p>
              </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => setShowAnalysis(true)}
              className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 uppercase tracking-widest text-sm"
            >
              Analyze Your Performance
              <ChevronRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full bg-slate-100 text-slate-600 font-bold py-5 rounded-2xl hover:bg-slate-200 transition-all border border-slate-200 active:scale-95 uppercase tracking-widest text-sm"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const currentQuestion = questions[currentIdx];
  const userInitial = (profile?.name || user?.email || 'U').charAt(0).toUpperCase();

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl border border-white/20 transform">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
               <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 text-center mb-4 uppercase tracking-tighter">Submit Test?</h3>
            <p className="text-slate-500 text-center mb-8 font-medium">Are you sure you want to finalize your test? You won't be able to change your answers after submission.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                disabled={submitting}
              >
                No, Keep Going
              </button>
              <button 
                onClick={() => handleSubmission(true)}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-colors"
                disabled={submitting}
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitting Overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="bg-white p-12 rounded-[40px] shadow-2xl max-w-sm w-full border border-white/20">
            <div className="w-20 h-20 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-8 shadow-xl"></div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Calculating...</h3>
            <p className="text-slate-500 font-medium">Please wait while we evaluate your performance and update your global rank.</p>
          </div>
        </div>
      )}

      {/* Header Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm sticky top-0 z-[60]">
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={handleExit}
            className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all text-[10px] md:text-sm font-bold group"
            title="Exit Test"
          >
            <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">{t("Exit Test", "পরীক্ষা শেষ")}</span>
          </button>
          <div className="hidden xs:flex w-8 h-8 bg-indigo-600 rounded items-center justify-center text-white font-bold shrink-0">M</div>
          <h1 className="text-xs md:text-lg font-bold tracking-tight text-slate-800 truncate max-w-[120px] sm:max-w-none">
            {test?.title || 'Mock Test'}
            <span className="hidden md:inline text-slate-400 font-normal ml-2">| {test?.topic}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-1.5 md:gap-2 bg-rose-50 border border-rose-100 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-rose-600 font-mono font-bold text-xs md:text-sm">
            <Clock className="w-3 h-3 md:w-4 md:h-4" />
            {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
          </div>
          <div className="flex items-center gap-2 md:gap-3 border-l pl-3 md:pl-6 border-slate-200">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] md:text-xs font-bold text-slate-700 truncate max-w-[80px]">{profile?.name || user?.email || user?.phoneNumber}</p>
              <p className="text-[8px] md:text-[10px] text-slate-500 tracking-wider">RANK: {profile?.globalRank === 0 ? '-' : `#${profile?.globalRank}`}</p>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-[10px] md:text-xs uppercase md:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="hidden md:flex w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 items-center justify-center text-indigo-700 font-bold text-xs uppercase cursor-pointer">
              {userInitial}
            </div>
          </div>
        </div>
      </header>

      {/* Alert Banner */}
      <div className="bg-amber-100 border-b border-amber-200 px-4 md:px-6 py-2 flex items-center gap-2 text-[9px] md:text-xs font-medium text-amber-800 shrink-0">
        <AlertTriangle className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
        <span className="truncate">
          {t("Warning: Tab switching or minimizing window will result in automatic submission.", "সতর্কতা: ট্যাব পরিবর্তন বা উইন্ডো ছোট করলে স্বয়ংক্রিয়ভাবে সাবমিট হয়ে যাবে।")}
          {warnings > 0 && <span className="text-red-600 font-bold ml-2">({warnings} {t("Warnings Recorded", "টি সতর্কতা")})</span>}
        </span>
      </div>

      {/* Main Content Layout */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 z-[70] md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left: Question Panel */}
        <section className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
              {t("Question", "প্রশ্ন")} {currentIdx + 1} {t("of", "এর")} {questions.length}
            </span>
            <div className="flex gap-2 text-[9px] md:text-[10px] font-bold text-slate-400">
              <span className="text-green-600">+{test?.marksPerCorrect || 1.0} {t("Correct", "সঠিক")}</span>
              <span className="text-rose-600">-{test?.negativeMarks || 0.25} {t("Negative", "ভুল")}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-8 flex-1 flex flex-col">
            <h2 className="text-base md:text-xl font-medium leading-relaxed mb-6 md:mb-8 text-slate-800">
              {currentQuestion.questionText}
            </h2>

            <div className="space-y-3 md:space-y-4">
              {(currentQuestion.options || []).map((opt: string, i: number) => {
                const isSelected = answers[currentQuestion.id] !== undefined && answers[currentQuestion.id] === opt && opt !== '';
                const optionKey = `test-${testId}-q-${currentIdx}-opt-${i}`;
                const optionLabel = String.fromCharCode(65 + i); 
                
                return (
                  <button 
                    key={optionKey}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, opt)}
                    className={`w-full flex items-center p-3 md:p-4 rounded-xl border-2 transition-all group relative text-left select-none break-words
                      ${isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                  >
                    <span 
                      className={`w-7 h-7 md:w-8 md:h-8 shrink-0 rounded border flex items-center justify-center font-bold mr-3 md:mr-4 transition-colors text-xs md:text-sm
                        ${isSelected 
                          ? 'border-indigo-600 bg-indigo-600 text-white' 
                          : 'border-slate-300 group-hover:border-slate-400 text-slate-500'
                        }`}
                    >
                      {optionLabel}
                    </span>
                    <span className="font-medium text-sm md:text-base pr-6">{opt}</span>
                    {isSelected && (
                      <div className="absolute right-3 md:right-4 w-4 h-4 md:w-5 md:h-5 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
                         <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-8 pt-6 lg:mt-auto border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden xs:inline">{t("Previous", "আগেরটি")}</span>
                  <span className="xs:hidden">{t("Prev", "আগের")}</span>
                </button>
                <button 
                  onClick={handleNext}
                  disabled={currentIdx === questions.length - 1}
                  className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden xs:inline">{t("Save & Next", "সংরক্ষণ ও পরেরটি")}</span>
                  <span className="xs:hidden">{t("Next", "পরেরটি")}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
               <div className="flex gap-2 w-full sm:w-auto justify-center">
                <button 
                  onClick={() => clearResponse(currentQuestion.id)}
                  className="px-3 md:px-4 py-2 md:py-2.5 rounded-lg border border-slate-200 text-slate-500 font-bold text-[10px] md:text-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  {t("Clear Response", "পরিষ্কার করুন")}
                </button>
                <button 
                  onClick={() => toggleReview(currentQuestion.id)}
                  className={`px-3 md:px-4 py-2 md:py-2.5 rounded-lg border font-bold text-[10px] md:text-sm flex items-center gap-2 transition-colors whitespace-nowrap
                    ${review.has(currentQuestion.id)
                      ? 'bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200'
                      : 'bg-white border-amber-400 text-amber-700 hover:bg-amber-50'
                    }`}
                >
                  <Flag className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                  {t("Mark for Review", "রিভিউ করুন")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Status Panel (Desktop default, Mobile drawer) */}
        <aside className={`fixed md:relative inset-y-0 right-0 w-72 md:w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 p-6 overflow-y-auto z-[80] transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full md:translate-x-0'}`}>
          <div className="flex md:hidden items-center justify-between mb-6">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{t("Test Progress", "পরীক্ষার অগ্রগতি")}</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          <div className="mb-6">
            <h3 className="hidden md:block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t("Test Progress", "পরীক্ষার অগ্রগতি")}</h3>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300" 
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                ></div>
              </div>
              <span className="text-xs font-bold text-slate-700">{answeredCount}/{questions.length}</span>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t("Question Palette", "প্রশ্ন প্যালেট")}</h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIdx;
                const isAnswered = !!answers[q.id];
                const isReview = review.has(q.id);
                const isVisited = visited.has(q.id);
                const isSkipped = isVisited && !isAnswered && !isReview;

                let btnStyles = "bg-slate-100 text-slate-400"; // Unvisited
                
                if (isCurrent) {
                  btnStyles = "border-2 border-indigo-600 text-indigo-600 bg-white";
                } else if (isReview) {
                  btnStyles = "bg-amber-500 text-white shadow-sm";
                } else if (isAnswered) {
                  btnStyles = "bg-green-500 text-white shadow-sm";
                } else if (isSkipped) {
                  btnStyles = "bg-rose-500 text-white shadow-sm";
                } else if (isVisited) {
                   btnStyles = "bg-rose-500 text-white shadow-sm";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                        setCurrentIdx(idx);
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    className={`h-8 w-8 md:h-9 md:w-9 rounded-lg flex items-center justify-center text-[10px] md:text-xs font-bold transition-all hover:opacity-80 active:scale-90 ${btnStyles}`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-auto space-y-4 pt-6 border-t border-slate-100 sticky bottom-0 bg-white pb-2">
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[9px] md:text-[10px] font-bold uppercase text-slate-600">
              <div className="flex items-center gap-2"><div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-green-500 rounded-sm"></div> {t("Answered", "উত্তর দেওয়া")}</div>
              <div className="flex items-center gap-2"><div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-amber-500 rounded-sm"></div> {t("Review", "পর্যালোচনা")}</div>
              <div className="flex items-center gap-2"><div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-slate-200 rounded-sm border border-slate-300"></div> {t("Unvisited", "দেখা হয়নি")}</div>
              <div className="flex items-center gap-2"><div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-rose-500 rounded-sm"></div> {t("Skipped", "বাদ দেওয়া")}</div>
            </div>
            <button 
              onClick={() => handleSubmission(false)}
              disabled={submitting}
              className={`w-full mt-4 py-3 md:py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs md:text-sm hover:bg-slate-900 transition-all flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-95
                ${submitting ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
              `}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                  {t("Submitting", "সাবমিট হচ্ছে")}
                </>
              ) : t("Submit Test", "সাবমিট করুন")}
            </button>
          </div>
        </aside>
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-8 bg-slate-800 text-slate-300 flex items-center px-6 justify-between text-[10px] uppercase tracking-wider shrink-0 break-words flex-wrap gap-2">
        <div className="flex gap-4">
          <span>Connection: <span className="text-green-400">Stable</span></span>
          <span>User UID: {user.uid.slice(0, 8)}...</span>
        </div>
        <div className="flex gap-4">
          <span>Topic: {test?.topic || 'General'}</span>
          <span>Test ID: {test?.id || 'Unknown'}</span>
        </div>
      </footer>
    </div>
  );
}

