/**
 * Shared question-by-question analysis UI — compact, mobile-first.
 * Used by AnalysisPage (/analysis/:resultId).
 *
 * Each card shows:
 *  • Compact header  : Q# · status · marks · time
 *  • Question text   : tight, readable
 *  • Options         : 2-col chips, color-coded correct / wrong
 *  • Answer summary  : single-line "Your: X  |  Correct: Y"
 *  • Solution        : always shown if present
 *  • Extra Info/Tip  : always shown if present
 */
import React, { useState } from 'react';
import { CheckCircle, X, Clock, Target, ChevronDown, Lightbulb, BookOpen } from 'lucide-react';
import { RenderMathText } from './MathRenderer';

export interface AnalysisQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  timeSecs: number;
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
  communityStats?: { correctPercent: number; avgTimeSecs: number };
}

interface Props {
  questions: AnalysisQuestion[];
  marksPerCorrect?: number;
  negativeMarks?: number;
  showTopicSummary?: boolean;
}

// ── Ordinal labels ──────────────────────────────────────────────────────────
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ── Single question card ────────────────────────────────────────────────────
function QuestionCard({
  q, idx, marksPerCorrect, negativeMarks,
}: {
  q: AnalysisQuestion;
  idx: number;
  marksPerCorrect: number;
  negativeMarks: number;
}) {
  const [solutionOpen, setSolutionOpen] = useState(true);
  const [extraOpen, setExtraOpen] = useState(true);

  const isCorrect    = !!q.userAnswer && q.userAnswer === q.correctAnswer;
  const isUnattempted = !q.userAnswer;
  const isWrong      = !isCorrect && !isUnattempted;

  const solutionText = q.explanation || q.solution || '';
  const extraInfoText = q.extraInfo || q.note || q.hint || '';

  const marksText = isCorrect
    ? `+${marksPerCorrect}`
    : isUnattempted
    ? '0'
    : `−${negativeMarks}`;

  // Status colour tokens
  const statusColor = isCorrect
    ? { bg: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Correct', headerBg: 'bg-emerald-50 border-b border-emerald-100', leftBar: 'bg-emerald-500' }
    : isUnattempted
    ? { bg: 'bg-amber-400',   light: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   label: 'Skipped', headerBg: 'bg-amber-50 border-b border-amber-100',   leftBar: 'bg-amber-400' }
    : { bg: 'bg-rose-500',    light: 'bg-rose-50',     border: 'border-rose-200',    text: 'text-rose-700',    label: 'Wrong',   headerBg: 'bg-rose-50 border-b border-rose-100',     leftBar: 'bg-rose-500' };

  const timeStr = q.timeSecs > 0
    ? (q.timeSecs >= 60 ? `${Math.floor(q.timeSecs / 60)}m${q.timeSecs % 60}s` : `${q.timeSecs}s`)
    : null;

  return (
    <div className={`bg-white rounded-2xl border ${statusColor.border} shadow-sm overflow-hidden`}>

      {/* ── Compact header ─────────────────────────────────────────── */}
      <div className={`flex items-center justify-between px-3 py-2 ${statusColor.headerBg}`}>
        {/* Left: number + status */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] text-white shrink-0 ${statusColor.bg}`}>
            {idx + 1}
          </span>
          <div className="flex items-center gap-1">
            {isCorrect
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              : isUnattempted
              ? <span className="text-amber-500 text-[13px] shrink-0">–</span>
              : <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
            <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor.text}`}>
              {statusColor.label}
            </span>
          </div>
          {q.topic && (
            <span className="text-[9px] font-bold text-slate-400 truncate max-w-[80px] sm:max-w-[140px] hidden xs:inline">
              · {q.topic}
            </span>
          )}
        </div>

        {/* Right: marks + time + difficulty */}
        <div className="flex items-center gap-1.5 shrink-0">
          {q.difficulty && (
            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full hidden sm:inline
              ${q.difficulty === 'Easy'     ? 'bg-emerald-100 text-emerald-700' :
                q.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-700'    :
                                              'bg-rose-100 text-rose-700'}`}>
              {q.difficulty}
            </span>
          )}
          {timeStr && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold text-slate-400">
              <Clock className="w-2.5 h-2.5" />{timeStr}
            </span>
          )}
          <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
            isCorrect ? 'bg-emerald-100 text-emerald-700' :
            isUnattempted ? 'bg-amber-100 text-amber-700' :
            'bg-rose-100 text-rose-700'}`}>
            {marksText}
          </span>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">

        {/* ── Question text ──────────────────────────────────────────── */}
        <div className="text-[13px] sm:text-sm font-semibold text-slate-800 leading-snug break-words">
          <RenderMathText text={q.questionText} />
        </div>

        {q.equationLatex && (
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-center text-sm overflow-x-auto">
            <RenderMathText text={`$$${q.equationLatex}$$`} />
          </div>
        )}
        {q.imageUrl && (
          <div className="flex justify-center">
            <img src={q.imageUrl} alt="Question figure" loading="lazy"
              className="rounded-xl border border-slate-100 max-w-full"
              style={{ maxHeight: 180, objectFit: 'contain' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}

        {/* ── Options — 2-col compact chips ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-1.5">
          {q.options.map((opt, i) => {
            const label       = OPTION_LABELS[i] ?? String(i + 1);
            const isOptCorrect   = opt === q.correctAnswer;
            const isOptSelected  = opt === q.userAnswer;
            const isOptWrong     = isOptSelected && !isOptCorrect;

            return (
              <div key={i}
                className={`flex items-start gap-1.5 px-2.5 py-2 rounded-xl border text-[12px] leading-snug transition-all
                  ${isOptCorrect
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                    : isOptWrong
                    ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 font-medium'}`}>
                {/* Label badge */}
                <span className={`shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-black mt-0.5
                  ${isOptCorrect ? 'bg-emerald-500 text-white' :
                    isOptWrong   ? 'bg-rose-500 text-white'    :
                                   'bg-slate-200 text-slate-500'}`}>
                  {label}
                </span>
                <span className="flex-1 break-words min-w-0">
                  <RenderMathText text={opt} />
                </span>
                {isOptCorrect && <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />}
                {isOptWrong   && <X           className="w-3 h-3 text-rose-500    shrink-0 mt-0.5" />}
              </div>
            );
          })}
        </div>

        {/* ── Answer summary — single compact row ──────────────────── */}
        <div className={`flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold px-3 py-2 rounded-xl border
          ${isUnattempted ? 'bg-amber-50 border-amber-200' :
            isCorrect     ? 'bg-emerald-50 border-emerald-200' :
                            'bg-rose-50 border-rose-200'}`}>
          <span className="text-slate-500 font-medium shrink-0">Your answer:</span>
          <span className={`font-black shrink-0 ${isUnattempted ? 'text-amber-700' : isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
            {q.userAnswer || '— Not attempted'}
          </span>
          {!isCorrect && q.correctAnswer && (
            <>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-slate-500 font-medium shrink-0">Correct:</span>
              <span className="font-black text-emerald-700 shrink-0">{q.correctAnswer}</span>
            </>
          )}
        </div>

        {/* ── Community stats pills ────────────────────────────────── */}
        {(q.communityStats || q.successPercentage !== undefined) && (
          <div className="flex flex-wrap gap-1.5">
            {q.communityStats ? (
              <>
                <span className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-violet-50 text-violet-700 border border-violet-100 rounded-full">
                  {q.communityStats.correctPercent}% got correct
                </span>
                <span className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-full">
                  <Clock className="w-2.5 h-2.5" /> avg {q.communityStats.avgTimeSecs}s
                </span>
              </>
            ) : q.successPercentage !== undefined ? (
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border
                ${(q.successPercentage ?? 100) >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  (q.successPercentage ?? 100) >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-rose-50 text-rose-700 border-rose-200'}`}>
                {q.successPercentage}% students got this right
              </span>
            ) : null}
          </div>
        )}

        {/* ── Solution ─────────────────────────────────────────────── */}
        {solutionText && (
          <div className="rounded-xl border border-indigo-100 overflow-hidden">
            <button
              onClick={() => setSolutionOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                <BookOpen className="w-3.5 h-3.5" /> Solution
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-indigo-500 transition-transform duration-200 ${solutionOpen ? 'rotate-180' : ''}`} />
            </button>
            {solutionOpen && (
              <div className="px-3 py-3 bg-gradient-to-br from-indigo-50/60 to-violet-50/40">
                <div className="text-slate-700 text-[12px] sm:text-[13px] leading-relaxed font-medium break-words whitespace-pre-wrap">
                  <RenderMathText text={solutionText} />
                </div>
                {q.solutionImageUrl && (
                  <img src={q.solutionImageUrl} alt="Solution" loading="lazy"
                    className="mt-2.5 rounded-xl border border-indigo-100 max-w-full"
                    style={{ maxHeight: 180, objectFit: 'contain' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Extra Info / Tip ─────────────────────────────────────── */}
        {extraInfoText && (
          <div className="rounded-xl border border-amber-200 overflow-hidden">
            <button
              onClick={() => setExtraOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-700 uppercase tracking-widest">
                <Lightbulb className="w-3.5 h-3.5" /> Extra Info / Tip
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-amber-600 transition-transform duration-200 ${extraOpen ? 'rotate-180' : ''}`} />
            </button>
            {extraOpen && (
              <div className="px-3 py-3 bg-amber-50/60">
                <div className="text-amber-900 text-[12px] sm:text-[13px] leading-relaxed font-medium break-words">
                  <RenderMathText text={extraInfoText} />
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Main list component ─────────────────────────────────────────────────────
export default function AnalysisQuestionList({
  questions,
  marksPerCorrect = 1,
  negativeMarks = 0.25,
  showTopicSummary = true,
}: Props) {
  return (
    <div className="space-y-3">

      {/* ── Topic-wise summary ── */}
      {showTopicSummary && (() => {
        const tMap: Record<string, { total: number; correct: number; wrong: number; skip: number }> = {};
        questions.forEach(q => {
          const topic = q.topic || 'General';
          if (!tMap[topic]) tMap[topic] = { total: 0, correct: 0, wrong: 0, skip: 0 };
          tMap[topic].total++;
          if (!q.userAnswer)                       tMap[topic].skip++;
          else if (q.userAnswer === q.correctAnswer) tMap[topic].correct++;
          else                                      tMap[topic].wrong++;
        });
        const entries = Object.entries(tMap);
        if (entries.length <= 1) return null;
        return (
          <div className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-indigo-500" /> Topic-wise Breakdown
            </h3>
            <div className="space-y-3">
              {entries.map(([topic, s]) => {
                const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                return (
                  <div key={topic}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[55%]">{topic}</span>
                      <span className="text-[10px] font-black text-slate-500 shrink-0 tabular-nums">
                        {s.correct}/{s.total} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <div className="flex gap-2.5 mt-0.5 text-[9px] font-bold uppercase tracking-widest">
                      <span className="text-emerald-600">{s.correct} ✓</span>
                      <span className="text-rose-500">{s.wrong} ✗</span>
                      <span className="text-slate-400">{s.skip} —</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Question cards ── */}
      {questions.map((q, idx) => (
        <QuestionCard
          key={q.id}
          q={q}
          idx={idx}
          marksPerCorrect={marksPerCorrect}
          negativeMarks={negativeMarks}
        />
      ))}
    </div>
  );
}
