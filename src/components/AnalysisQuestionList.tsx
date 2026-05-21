/**
 * Shared question-by-question analysis UI.
 * Used by both TestRunner (immediately after submission) and
 * Dashboard history modal (when student reopens any past test).
 *
 * Render output is pixel-identical in both contexts.
 */
import React from 'react';
import { CheckCircle, X, Info, Clock, Target } from 'lucide-react';
import { RenderMathText } from './MathRenderer';

export interface AnalysisQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;   // full answer text
  userAnswer: string;      // full answer text (empty string = not attempted)
  timeSecs: number;        // seconds spent on this question
  topic?: string;
  equationLatex?: string;
  imageUrl?: string;
  solutionImageUrl?: string;
  explanation?: string;
  solution?: string;
  extraInfo?: string;
  note?: string;
  hint?: string;
  successPercentage?: number;
  difficulty?: string;
  // Optional community stats (only available right after submission)
  communityStats?: { correctPercent: number; avgTimeSecs: number };
}

interface Props {
  questions: AnalysisQuestion[];
  marksPerCorrect?: number;
  negativeMarks?: number;
  /** Show topic-wise summary bar at the top */
  showTopicSummary?: boolean;
}

export default function AnalysisQuestionList({ questions, marksPerCorrect = 1, negativeMarks = 0.25, showTopicSummary = true }: Props) {
  return (
    <div className="space-y-4">
      {/* ── Topic-wise summary ── */}
      {showTopicSummary && (() => {
        const tMap: Record<string, { total: number; correct: number; wrong: number; skip: number }> = {};
        questions.forEach(q => {
          const topic = q.topic || 'General';
          if (!tMap[topic]) tMap[topic] = { total: 0, correct: 0, wrong: 0, skip: 0 };
          tMap[topic].total++;
          if (!q.userAnswer) tMap[topic].skip++;
          else if (q.userAnswer === q.correctAnswer) tMap[topic].correct++;
          else tMap[topic].wrong++;
        });
        const entries = Object.entries(tMap);
        if (entries.length <= 1) return null;
        return (
          <div className="bg-white rounded-2xl border border-indigo-100 p-4 sm:p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" /> Topic-wise Analysis
            </h3>
            <div className="space-y-4">
              {entries.map(([topic, s]) => {
                const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                return (
                  <div key={topic}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[60%]">{topic}</span>
                      <span className="text-[10px] font-black text-slate-500 shrink-0">{s.correct}/{s.total} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <div className="flex gap-3 mt-1 text-[9px] font-bold uppercase tracking-widest flex-wrap">
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

      {/* ── Question cards ── */}
      {questions.map((q, idx) => {
        const isCorrect = !!q.userAnswer && q.userAnswer === q.correctAnswer;
        const isUnattempted = !q.userAnswer;
        const solutionText = q.explanation || q.solution || '';
        const extraInfoText = q.extraInfo || q.note || q.hint || '';

        return (
          <div key={q.id}
            className={`bg-white rounded-2xl sm:rounded-3xl border shadow-sm overflow-hidden
              ${isCorrect
                ? 'border-l-4 border-l-emerald-500 border-y-emerald-100 border-r-emerald-100'
                : isUnattempted
                ? 'border-l-4 border-l-amber-400 border-y-slate-100 border-r-slate-100'
                : 'border-l-4 border-l-rose-500 border-y-rose-100 border-r-rose-100'}`}>

            {/* Header bar */}
            <div className={`flex items-center justify-between px-4 py-2.5 text-[10px] font-black uppercase tracking-widest
              ${isCorrect ? 'bg-emerald-50 text-emerald-700' : isUnattempted ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-white/70 rounded-lg flex items-center justify-center font-black text-xs shadow-sm">
                  {idx + 1}
                </span>
                <span className="truncate max-w-[120px] sm:max-w-none">{q.topic || 'General'}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isUnattempted
                  ? <><Info className="w-3.5 h-3.5" /><span>Skipped</span></>
                  : isCorrect
                  ? <><CheckCircle className="w-3.5 h-3.5" /><span>Correct</span></>
                  : <><X className="w-3.5 h-3.5" /><span>Wrong</span></>
                }
                <span className="ml-2 px-1.5 py-0.5 bg-white/60 rounded text-[9px]">
                  {isCorrect ? `+${marksPerCorrect}` : isUnattempted ? '0' : `-${negativeMarks}`}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Question text */}
              <div className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed mb-4 break-words">
                <RenderMathText text={q.questionText} />
              </div>

              {q.equationLatex && (
                <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center text-base overflow-x-auto">
                  <RenderMathText text={`$$${q.equationLatex}$$`} />
                </div>
              )}
              {q.imageUrl && (
                <div className="mb-4 flex justify-center">
                  <img src={q.imageUrl} alt="Question figure" loading="lazy"
                    className="rounded-xl border border-slate-100 max-w-full"
                    style={{ maxHeight: 220, objectFit: 'contain' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                {q.options.map((opt, i) => {
                  const optionLabel = String.fromCharCode(65 + i);
                  const isOptionCorrect = opt === q.correctAnswer;
                  const isOptionSelected = opt === q.userAnswer;
                  let state: 'default' | 'correct' | 'incorrect' = 'default';
                  if (isOptionCorrect) state = 'correct';
                  else if (isOptionSelected && !isCorrect) state = 'incorrect';

                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all
                      ${state === 'correct' ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : ''}
                      ${state === 'incorrect' ? 'bg-rose-50 border-rose-400 text-rose-900' : ''}
                      ${state === 'default' ? 'bg-slate-50 border-slate-200 text-slate-600' : ''}`}>
                      <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center font-black text-xs mt-0.5
                        ${state === 'correct' ? 'bg-emerald-500 text-white' : state === 'incorrect' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {optionLabel}
                      </span>
                      <span className="font-medium text-sm leading-snug break-words min-w-0 flex-1 pt-0.5">{opt}</span>
                      {state === 'correct' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                      {state === 'incorrect' && <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                    </div>
                  );
                })}
              </div>

              {/* Answer summary strip */}
              <div className={`rounded-xl p-3 mb-3 text-xs font-bold flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4
                ${isUnattempted ? 'bg-amber-50 border border-amber-200' : isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Your Answer:</span>
                  <span className={`font-black ${isUnattempted ? 'text-amber-700' : isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {q.userAnswer || '— Not Attempted'}
                  </span>
                </div>
                {!isCorrect && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Correct Answer:</span>
                    <span className="font-black text-emerald-700">{q.correctAnswer}</span>
                  </div>
                )}
              </div>

              {/* Stats row — time, community */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {q.timeSecs > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 text-[9px] font-black uppercase tracking-widest">
                    <Clock className="w-3 h-3" />
                    Your time: {q.timeSecs >= 60 ? `${Math.floor(q.timeSecs / 60)}m ` : ''}{q.timeSecs % 60}s
                  </div>
                )}
                {q.communityStats && (
                  <>
                    <div className="flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-700 rounded-lg border border-violet-100 text-[9px] font-black uppercase tracking-widest">
                      Avg correct: {q.communityStats.correctPercent}%
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-sky-50 text-sky-700 rounded-lg border border-sky-100 text-[9px] font-black uppercase tracking-widest">
                      <Clock className="w-3 h-3" /> {q.communityStats.avgTimeSecs}s avg
                    </div>
                  </>
                )}
                {q.successPercentage !== undefined && !q.communityStats && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest
                    ${(q.successPercentage ?? 100) >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      (q.successPercentage ?? 100) >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {q.successPercentage}% students correct
                  </div>
                )}
                {q.difficulty && (
                  <div className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest
                    ${q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      q.difficulty === 'Moderate' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {q.difficulty}
                  </div>
                )}
              </div>

              {/* Solution */}
              {solutionText && (
                <div className="mt-3 bg-gradient-to-br from-indigo-50 to-violet-50 p-4 sm:p-5 rounded-xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                    <div className="w-1.5 h-3 bg-indigo-500 rounded-full" />
                    Solution
                  </p>
                  <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium break-words">
                    <RenderMathText text={solutionText} />
                  </div>
                  {q.solutionImageUrl && (
                    <img src={q.solutionImageUrl} alt="Solution" loading="lazy"
                      className="mt-3 rounded-xl border border-indigo-100 max-w-full"
                      style={{ maxHeight: 200, objectFit: 'contain' }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  )}
                </div>
              )}

              {/* Extra info / trick */}
              {extraInfoText && (
                <div className="mt-2.5 bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                    <div className="w-1.5 h-3 bg-amber-500 rounded-full" />
                    Quick Tip / Extra Info
                  </p>
                  <div className="text-amber-900 text-sm leading-relaxed font-medium break-words">
                    <RenderMathText text={extraInfoText} />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
