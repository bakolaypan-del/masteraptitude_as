import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Clock, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, Flag } from 'lucide-react';

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
    if (!submitting && !result && questions.length > 0 && timeLeft > 0) {
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
      if (document.visibilityState === 'hidden' && !submitting && !result && questions.length > 0) {
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

  if (loading) return <div className="flex justify-center items-center h-screen">Loading test environment...</div>;
  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
  if (questions.length === 0) return <div className="p-8 text-center text-gray-500">This test has no questions yet.</div>;

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
                          <span className="text-emerald-500">+1.0 Marks</span>
                        ) : isUnattempted ? (
                          <span className="text-slate-400">0.0 Marks</span>
                        ) : (
                          <span className="text-rose-500">-0.25 Marks</span>
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
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all text-sm font-bold mr-2 group"
            title="Exit Test"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Exit Test
          </button>
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">M</div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">
            {test?.title || 'Mock Test'}
            <span className="text-slate-400 font-normal ml-2">| {test?.topic}</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-full text-rose-600 font-mono font-bold">
            <Clock className="w-4 h-4" />
            {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
          </div>
          <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-700">{profile?.name || user?.email || user?.phoneNumber}</p>
              <p className="text-[10px] text-slate-500 tracking-wider">RANK: {profile?.globalRank === 0 ? '-' : `#${profile?.globalRank}`}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
              {userInitial}
            </div>
          </div>
        </div>
      </header>

      {/* Alert Banner */}
      <div className="bg-amber-100 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-xs font-medium text-amber-800 shrink-0">
        <AlertTriangle className="w-3.5 h-3.5" />
        Warning: Tab switching or minimizing window will result in automatic submission. (Visibility Detection Active)
        {warnings > 0 && <span className="text-red-600 font-bold ml-2">({warnings} Warnings Recorded)</span>}
      </div>

      {/* Main Content Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Question Panel */}
        <section className="flex-1 flex flex-col p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold uppercase tracking-widest">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <div className="flex gap-2 text-[10px] font-bold text-slate-400">
              <span className="text-green-600">+1.0 Correct</span>
              <span className="text-rose-600">-0.25 Negative</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex-1 flex flex-col">
            <h2 className="text-xl font-medium leading-relaxed mb-8 text-slate-800">
              {currentQuestion.questionText}
            </h2>

            <div className="space-y-4">
              {(currentQuestion.options || []).map((opt: string, i: number) => {
                // Check if selected and ensure it's not a generic empty match or undefined match
                const isSelected = answers[currentQuestion.id] !== undefined && answers[currentQuestion.id] === opt && opt !== '';
                // Force a stable key using question index and option index
                const optionKey = `test-${testId}-q-${currentIdx}-opt-${i}`;
                const optionLabel = String.fromCharCode(65 + i); 
                
                return (
                  <button 
                    key={optionKey}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, opt)}
                    className={`w-full flex items-center p-4 rounded-xl border-2 transition-all group relative text-left select-none
                      ${isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                  >
                    <span 
                      className={`w-8 h-8 shrink-0 rounded border flex items-center justify-center font-bold mr-4 transition-colors
                        ${isSelected 
                          ? 'border-indigo-600 bg-indigo-600 text-white' 
                          : 'border-slate-300 group-hover:border-slate-400 text-slate-500'
                        }`}
                    >
                      {optionLabel}
                    </span>
                    <span className="font-medium text-sm md:text-base">{opt}</span>
                    {isSelected && (
                      <div className="absolute right-4 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
                         <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-8 pt-6 lg:mt-auto border-t border-slate-100 flex justify-between items-center">
              <button 
                onClick={handlePrev}
                disabled={currentIdx === 0}
                className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold text-sm flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
               <div className="flex flex-wrap gap-2 justify-end">
                <button 
                  onClick={() => clearResponse(currentQuestion.id)}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Clear Response
                </button>
                <button 
                  onClick={() => toggleReview(currentQuestion.id)}
                  className={`px-4 py-2.5 rounded-lg border font-bold text-sm flex items-center gap-2 transition-colors
                    ${review.has(currentQuestion.id)
                      ? 'bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200'
                      : 'bg-white border-amber-400 text-amber-700 hover:bg-amber-50'
                    }`}
                >
                  <Flag className="w-4 h-4" />
                  Mark for Review
                </button>
                <button 
                  onClick={handleNext}
                  disabled={currentIdx === questions.length - 1}
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save & Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Status Panel */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 p-6 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Test Progress</h3>
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
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Question Palette</h3>
            <div className="grid grid-cols-5 gap-2">
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
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-8 w-8 rounded flex items-center justify-center text-xs font-bold transition-all hover:opacity-80 ${btnStyles}`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-auto space-y-4 pt-6 border-t border-slate-100 sticky bottom-0 bg-white pb-2">
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[10px] font-bold uppercase text-slate-600">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-green-500 rounded-sm"></div> Answered</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></div> Review</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-slate-200 rounded-sm border border-slate-300"></div> Unvisited</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></div> Skipped</div>
            </div>
            <button 
              onClick={() => handleSubmission(false)}
              disabled={submitting}
              className={`w-full mt-4 py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-slate-900 transition-all flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-95
                ${submitting ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
              `}
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                  Submitting
                </>
              ) : 'Submit Test'}
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

