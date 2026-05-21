/**
 * AnalysisPage  (/analysis/:resultId)
 *
 * The ONE canonical place every analysis lives.
 * Used for:
 *  – Instant post-submission result (TestRunner navigates here with full state)
 *  – History revisit (Dashboard navigates here with result object; questions fetched lazily)
 *  – Direct URL (fallback API fetch of result + questions)
 *
 * Two sub-views:
 *  'summary'   – Dark-gradient result card + live leaderboard (mirrors TestRunner)
 *  'questions' – White bg question-by-question analysis (AnalysisQuestionList)
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import AnalysisQuestionList, { type AnalysisQuestion } from '../components/AnalysisQuestionList';
import {
  Trophy, ChevronRight, ChevronLeft, Download, ArrowLeft,
  BookOpen, CheckCircle, X as XIcon, AlertCircle, BarChart3, Clock,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LeaderboardData {
  myRank: number;
  totalParticipants: number;
  uniqueStudents: number;
  percentile: number;
  topRankers: { rank: number; name: string; score: number; isCurrentUser?: boolean }[];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AnalysisPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Navigation state passed from TestRunner or Dashboard
  const navState = (location.state || {}) as {
    result?: any;
    questions?: any[];
    test?: any;
    returnPath?: string;
  };

  // ── Views ──────────────────────────────────────────────────────────────────
  const [view, setView] = useState<'summary' | 'questions'>('summary');

  // ── Data ───────────────────────────────────────────────────────────────────
  const [result, setResult] = useState<any>(navState.result ?? null);
  const [questions, setQuestions] = useState<any[]>(navState.questions ?? []);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const [questionStats, setQuestionStats] = useState<Record<string, { correctPercent: number; avgTimeSecs: number }>>({});
  const [loading, setLoading] = useState(!navState.result);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // marksPerCorrect / negativeMarks resolved from multiple sources
  const marksPerCorrect: number = navState.test?.marksPerCorrect ?? result?.marksPerCorrect ?? 1;
  const negativeMarks: number = navState.test?.negativeMarks ?? result?.negativeMarks ?? 0.25;

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lbTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper: parse Firestore Timestamp | number | string → Date
  const parseTimestamp = (ts: any): Date | null => {
    if (!ts) return null;
    try {
      if (ts?.toDate) return ts.toDate();
      if (ts?.seconds) return new Date(ts.seconds * 1000);
      if (typeof ts === 'number') return new Date(ts);
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d;
    } catch { return null; }
  };

  // ── Fetch result + questions when no navigation state ──────────────────────
  useEffect(() => {
    if (navState.result) {
      setLoading(false);
      return;
    }
    if (!resultId || !user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/my-result/${resultId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setResult(data.result);
          setQuestions(data.questions ?? []);
        }
      } catch (e) {
        console.error('[AnalysisPage] fetch result failed', e);
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch questions — always fetch full questions (with solutions/explanations guaranteed) ──
  useEffect(() => {
    if (!result || !user) return;
    // Always fetch from /api/test-questions/:testId (returns full Firestore data including
    // explanation, solution, extraInfo, correctAnswer). Show spinner only when we have no
    // questions yet; otherwise silently upgrade in the background.
    const hasQuestions = questions.length > 0;
    if (!hasQuestions) setLoadingQuestions(true);
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/test-questions/${result.testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.questions?.length) setQuestions(data.questions);
        }
      } catch (e) {
        console.error('[AnalysisPage] questions fetch failed', e);
      }
      setLoadingQuestions(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.testId]);

  // ── Live leaderboard — always fetched, rank always based on 1st-attempt (server handles this) ──
  useEffect(() => {
    if (!result || !user) return;
    let pollCount = 0;
    setLeaderboardError(false);

    const fetchLB = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `/api/test-leaderboard/${result.testId}?myScore=${encodeURIComponent(result.score)}&isFirstAttempt=true`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          setLeaderboard(await res.json());
          setLeaderboardError(false);
          pollCount++;
          if (pollCount >= 3 && pollRef.current) clearInterval(pollRef.current);
          if (lbTimeoutRef.current) clearTimeout(lbTimeoutRef.current);
        }
      } catch {}
    };

    fetchLB();
    pollRef.current = setInterval(fetchLB, 15_000);
    // After 12 seconds without data, show error instead of infinite spinner
    lbTimeoutRef.current = setTimeout(() => {
      if (!leaderboard) setLeaderboardError(true);
    }, 12_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (lbTimeoutRef.current) clearTimeout(lbTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.testId]);

  // ── Community question stats (lazy, fire-and-forget) ─────────────────────
  useEffect(() => {
    if (!result || !user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/test-question-stats/${result.testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.stats) setQuestionStats(data.stats);
        }
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.testId]);

  // ── PDF download ──────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!user || !result) return;
    setDownloadingPDF(true);
    try {
      // Use already-loaded questions OR fetch fresh
      let qs = questions;
      if (!qs.length) {
        const token = await user.getIdToken();
        const res = await fetch(`/api/test-questions/${result.testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) qs = (await res.json()).questions ?? [];
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;

      const addBorder = (d: jsPDF) => {
        d.setDrawColor(0, 77, 0);
        d.setLineWidth(1);
        d.rect(margin - 2, margin - 2, pageWidth - 2 * (margin - 2), pageHeight - 2 * (margin - 2));
      };
      const addWatermarks = (d: jsPDF) => {
        d.saveGraphicsState();
        d.setGState(new (d as any).GState({ opacity: 0.05 }));
        d.setFontSize(30);
        d.setTextColor(150, 150, 150);
        d.setFont('helvetica', 'bold');
        for (let x = 30; x < pageWidth; x += 80) {
          for (let y = 50; y < pageHeight; y += 80) {
            d.text('Master Aptitude by Suman Sir', x, y, { align: 'center', angle: 45 });
          }
        }
        d.restoreGraphicsState();
      };
      const drawHeader = (d: jsPDF) => {
        const hY = margin + 5;
        d.setFillColor(0, 77, 0);
        d.roundedRect(margin, hY, contentWidth, 35, 3, 3, 'F');
        d.setTextColor(255, 255, 255);
        d.setFontSize(18);
        d.setFont('helvetica', 'bold');
        d.text('Master Aptitude by Suman Sir', pageWidth / 2, hY + 12, { align: 'center' });
        d.setFontSize(12);
        d.text(result.testTitle || 'Mock Test', pageWidth / 2, hY + 20, { align: 'center' });
        d.setFontSize(9);
        d.setFont('helvetica', 'normal');
        d.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, hY + 28, { align: 'center' });
      };
      const drawFooter = (d: jsPDF, pageNum: number) => {
        const fY = pageHeight - margin - 15;
        d.setFillColor(245, 245, 245);
        d.setDrawColor(200, 200, 200);
        d.roundedRect(margin, fY, contentWidth, 15, 2, 2, 'FD');
        d.setFontSize(8);
        d.setTextColor(80, 80, 80);
        d.setFont('helvetica', 'bold');
        d.text('Contact: 8900011708 (Shibnath)', margin + 5, fY + 9);
        d.setTextColor(0, 100, 255);
        d.text('Telegram: @MasterAptitudeGroup', pageWidth / 2, fY + 9, { align: 'center' });
        d.setTextColor(150, 150, 150);
        d.text(`Page ${pageNum}`, pageWidth - margin - 15, fY + 9);
      };

      addBorder(doc);
      addWatermarks(doc);
      drawHeader(doc);
      drawFooter(doc, 1);

      const correctAnswersMap = result.analysis ?? result.correctAnswersMap ?? {};
      let currentY = margin + 50;
      let pageNum = 1;

      qs.forEach((q: any, idx: number) => {
        if (currentY > pageHeight - 55) {
          doc.addPage();
          addBorder(doc);
          addWatermarks(doc);
          pageNum++;
          drawFooter(doc, pageNum);
          currentY = margin + 15;
        }
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const qText = `Q${idx + 1}. ${q.questionText || ''}`;
        const qLines = doc.splitTextToSize(qText, contentWidth);
        doc.text(qLines, margin, currentY);
        currentY += qLines.length * 5 + 2;

        q.options?.forEach((opt: string, oi: number) => {
          const label = String.fromCharCode(65 + oi);
          const correctAns = correctAnswersMap[q.id];
          const userAns = result.userAnswers?.[q.id] ?? '';
          if (opt === correctAns) {
            doc.setTextColor(0, 128, 0);
            doc.setFont('helvetica', 'bold');
          } else if (opt === userAns && opt !== correctAns) {
            doc.setTextColor(200, 0, 0);
            doc.setFont('helvetica', 'normal');
          } else {
            doc.setTextColor(80, 80, 80);
            doc.setFont('helvetica', 'normal');
          }
          const optLines = doc.splitTextToSize(`${label}) ${opt}`, contentWidth - 10);
          doc.text(optLines, margin + 5, currentY);
          currentY += optLines.length * 5;
        });
        currentY += 5;
      });

      doc.save(`${result.testTitle || 'Analysis'}.pdf`);
    } catch (e) {
      console.error('[AnalysisPage] PDF error', e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // ── Derived values for summary screen ─────────────────────────────────────
  const accuracy = result?.totalQuestions > 0
    ? ((result.correctAnswers / result.totalQuestions) * 100).toFixed(1)
    : result?.accuracy ?? 0;
  const accuracyNum = parseFloat(String(accuracy));
  const isReattempt = (result?.attemptNumber ?? 1) > 1;

  const feedback = accuracyNum >= 90
    ? { msg: 'Excellent! You are exam ready. Keep it up!', color: 'text-emerald-300', bg: 'rgba(16,185,129,0.12)', emoji: '🔥' }
    : accuracyNum >= 70
    ? { msg: 'Good performance! Practice more to improve speed and accuracy.', color: 'text-sky-300', bg: 'rgba(14,165,233,0.12)', emoji: '👍' }
    : accuracyNum >= 50
    ? { msg: 'Average performance. Focus on weak areas and regular practice.', color: 'text-amber-300', bg: 'rgba(245,158,11,0.12)', emoji: '📈' }
    : { msg: 'You need more practice. Analyze your mistakes carefully and improve concepts.', color: 'text-rose-300', bg: 'rgba(239,68,68,0.12)', emoji: '⚠️' };

  const rankDisplay = leaderboard
    ? `${leaderboard.myRank}/${leaderboard.totalParticipants}`
    : '...';

  // ── Build question list for AnalysisQuestionList ───────────────────────────
  const analysisQuestions: AnalysisQuestion[] = questions.map((q): AnalysisQuestion => {
    const correctAnswersMap = result?.analysis ?? result?.correctAnswersMap ?? {};
    const correctAnswer = correctAnswersMap[q.id] ?? q.correctAnswer ?? '';
    const userAnswer = result?.userAnswers?.[q.id] ?? '';
    const timeSecs = result?.questionTimes?.[q.id] ?? 0;
    const cs = questionStats[q.id];
    return {
      ...q,
      correctAnswer,
      userAnswer,
      timeSecs,
      communityStats: cs ? { correctPercent: cs.correctPercent, avgTimeSecs: cs.avgTimeSecs } : undefined,
    };
  });

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
        <div className="flex flex-col items-center gap-6 text-center px-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -inset-3 rounded-3xl border-2 border-indigo-500/30 animate-ping" />
          </div>
          <div className="w-8 h-8 border-3 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          <p className="text-white font-black text-lg">Loading Analysis…</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>
        <p className="text-white font-bold text-lg">Result not found.</p>
        <button onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ── Question Analysis View ─────────────────────────────────────────────────
  if (view === 'questions') {
    return (
      <div className="flex flex-col min-h-screen bg-[#f0f2f5] font-sans text-slate-900">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm shrink-0">
          <div className="flex items-center justify-between px-3 sm:px-6 h-14 gap-2">
            <button onClick={() => { setView('summary'); window.scrollTo(0, 0); }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all text-xs font-bold active:scale-95 shrink-0">
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Summary</span>
              <span className="sm:hidden">Back</span>
            </button>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-800 truncate text-center">
              {result.testTitle || 'Test Analysis'}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hidden sm:inline">Score</span>
                <span className="text-xs font-black text-indigo-600">{result.score}</span>
              </div>
              <button onClick={() => navigate('/dashboard')}
                className="px-2.5 sm:px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors">
                Exit
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8">
          <div className="max-w-3xl mx-auto pb-24">
            {loadingQuestions ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Questions…</p>
              </div>
            ) : (
              <AnalysisQuestionList
                marksPerCorrect={marksPerCorrect}
                negativeMarks={negativeMarks}
                questions={analysisQuestions}
              />
            )}
          </div>
        </main>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-center z-10">
          <button onClick={() => { setView('summary'); window.scrollTo(0, 0); }}
            className="w-full max-w-sm py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg active:scale-95 text-sm uppercase tracking-wider">
            Back to Summary
          </button>
        </div>
      </div>
    );
  }

  // ── Summary View (dark gradient — mirrors TestRunner result screen) ─────────
  return (
    <div className="min-h-screen flex items-start justify-center p-4 pt-6 pb-10"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}>

      {/* Ambient blobs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(99,102,241,0.12)' }} />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(16,185,129,0.08)' }} />

      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6 items-start relative z-10">

        {/* ── Left: Result Card ── */}
        <div className="flex-1 rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(30px)' }}>

          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" />

          <div className="p-6 sm:p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border-2 border-emerald-400/30 flex items-center justify-center mx-auto mb-4 shadow-2xl hover:scale-110 transition-transform duration-500">
              <Trophy className="w-10 h-10 text-yellow-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">
              {isReattempt ? 'Test Reattempted!' : 'Test Completed! 🎉'}
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              {isReattempt
                ? `Reattempt #${result.attemptNumber} — Does not affect leaderboard ranking.`
                : 'Your performance has been evaluated and recorded.'}
            </p>
          </div>

          {/* Feedback strip */}
          <div className="mx-4 sm:mx-6 mb-4 rounded-2xl p-4 flex items-start gap-3 border border-white/10"
            style={{ background: feedback.bg }}>
            <span className="text-2xl shrink-0">{feedback.emoji}</span>
            <p className={`text-sm font-bold leading-snug ${feedback.color}`}>{feedback.msg}</p>
          </div>

          {/* Stats grid */}
          <div className="px-4 sm:px-6 pb-6 grid grid-cols-2 gap-3">
            {[
              { label: 'Your Score', value: result.score, textColor: 'text-indigo-300', border: 'border-indigo-500/20' },
              { label: 'Rank (1st Attempt)', value: leaderboard ? `#${rankDisplay}` : '...', textColor: 'text-amber-300', border: 'border-amber-500/20' },
              { label: 'Percentile', value: leaderboard ? `${leaderboard.percentile}%ile` : '...', textColor: 'text-violet-300', border: 'border-violet-500/20' },
              { label: 'Accuracy', value: `${accuracy}%`, textColor: 'text-emerald-300', border: 'border-emerald-500/20' },
              { label: 'Correct', value: result.correctAnswers, textColor: 'text-teal-300', border: 'border-teal-500/20' },
              { label: 'Wrong', value: result.wrongAnswers, textColor: 'text-rose-300', border: 'border-rose-500/20' },
              { label: 'Skipped', value: result.unattempted, textColor: 'text-slate-400', border: 'border-slate-500/20' },
              { label: 'Total Students', value: leaderboard ? leaderboard.uniqueStudents.toLocaleString() : '...', textColor: 'text-sky-300', border: 'border-sky-500/20' },
            ].map(stat => (
              <div key={stat.label}
                className={`rounded-2xl border p-3 sm:p-4 text-center ${stat.border}`}
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${stat.textColor}`}>{stat.label}</p>
                <p className={`text-2xl sm:text-3xl font-black ${stat.textColor}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Attempt / date badge */}
          <div className="px-4 sm:px-6 pb-4 space-y-2">
            {/* Reattempt notice */}
            {result.attemptNumber > 1 && (
              <div className="rounded-xl border border-amber-400/30 px-4 py-2.5 flex items-start gap-2"
                style={{ background: 'rgba(251,191,36,0.08)' }}>
                <span className="text-amber-400 text-lg shrink-0">⚠️</span>
                <div>
                  <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest">
                    Reattempt #{result.attemptNumber}
                  </p>
                  <p className="text-[10px] text-amber-400/80 font-medium leading-snug mt-0.5">
                    This attempt does not affect your leaderboard rank. Your rank shown above is always based on your <strong className="text-amber-300">1st attempt</strong> score.
                  </p>
                </div>
              </div>
            )}
            {/* Timestamp */}
            {result.timestamp && (() => {
              const d = parseTimestamp(result.timestamp);
              return d ? (
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">
                  Attempted on {d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </p>
              ) : null;
            })()}
          </div>

          {/* CTA buttons */}
          <div className="px-4 sm:px-6 pb-6 flex flex-col gap-3">
            <button
              onClick={() => { setView('questions'); window.scrollTo(0, 0); }}
              className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl uppercase tracking-widest text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
              Analyze Your Performance <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="w-full py-3 text-slate-300 font-black rounded-2xl border border-white/10 hover:bg-white/5 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Download className="w-4 h-4" />
              {downloadingPDF ? 'Preparing PDF…' : 'Download Analysis PDF'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 text-slate-400 font-black rounded-2xl border border-white/10 hover:bg-white/5 transition-all uppercase tracking-widest text-xs"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* ── Right: Live Leaderboard ── */}
        <div className="w-full lg:w-72 rounded-3xl border border-white/10 overflow-hidden shadow-2xl shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(30px)' }}>

          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Live Rankings
              </h3>
              <span className="text-[10px] text-slate-400 font-bold">
                {leaderboard ? `${leaderboard.totalParticipants} student${leaderboard.totalParticipants !== 1 ? 's' : ''}` : '…'}
              </span>
            </div>

            {!leaderboard ? (
              leaderboardError ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <AlertCircle className="w-6 h-6 text-slate-500" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rankings unavailable</p>
                  <p className="text-[9px] text-slate-600">Check your connection and try again.</p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )
            ) : leaderboard.topRankers.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No rankings yet</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.topRankers.map(r => {
                  const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : null;
                  const isMe = r.isCurrentUser === true;
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

            {leaderboard && (
              <div className="mt-3 pt-3 border-t border-white/10 text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Your Rank</p>
                <p className="text-xl font-black text-amber-400">#{leaderboard.myRank}</p>
                {leaderboard.percentile !== undefined && (
                  <p className="text-[10px] font-bold text-violet-400 mt-0.5">
                    Top {(100 - leaderboard.percentile).toFixed(1)}%ile
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
