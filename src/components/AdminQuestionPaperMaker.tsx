import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { uploadFileViaBackend } from '../lib/upload';
import {
  exportCustomQuestionPaperToPDF,
  exportCustomQuestionPaperToWord,
  PaperQuestion,
  QuestionPaperSettings
} from '../lib/exportMockTest';
import { RenderQuestionHTML } from './RichTextEditor';
import {
  FileText, Plus, Trash2, Edit2, Save, X, Search, Filter,
  Download, Image as ImgIcon, Sparkles, Check, RefreshCw, Eye, Tag, Layers
} from 'lucide-react';

export interface SavedQuestionPaper {
  id?: string;
  settings: QuestionPaperSettings;
  questions: PaperQuestion[];
  createdAt?: any;
  updatedAt?: any;
}

const BADGE_COLOR_OPTIONS = [
  { name: 'Purple', value: 'purple', bg: 'bg-purple-100 text-purple-700 border-purple-200' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-100 text-blue-700 border-blue-200' },
  { name: 'Emerald', value: 'emerald', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { name: 'Amber', value: 'amber', bg: 'bg-amber-100 text-amber-700 border-amber-200' },
  { name: 'Rose', value: 'rose', bg: 'bg-rose-100 text-rose-700 border-rose-200' },
];

export default function AdminQuestionPaperMaker() {
  const [savedPapers, setSavedPapers] = useState<SavedQuestionPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'list'>('editor');

  // Paper Settings State
  const [settings, setSettings] = useState<QuestionPaperSettings>({
    headerTitle: 'MASTER APTITUDE BY SUMAN SIR',
    subHeader: 'WBP CONSTABLE & SSC SPECIAL PRACTICE QUESTION PAPER',
    footerText: 'MASTER APTITUDE BY SUMAN SIR • OFFICIAL PRINTED QUESTION PAPER',
    category: 'Police & State Exams',
    subject: 'General Knowledge & Mathematics',
    duration: 60,
    totalMarks: 50,
    negativeMarks: 0.25,
    showSolutions: true
  });

  // Question List State
  const [questions, setQuestions] = useState<PaperQuestion[]>([]);

  // Current Question Form State
  const [editingQIdx, setEditingQIdx] = useState<number | null>(null);
  const [questionEn, setQuestionEn] = useState('');
  const [questionBn, setQuestionBn] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [solution, setSolution] = useState('');
  const [sourceExam, setSourceExam] = useState('');
  const [sourceExamColor, setSourceExamColor] = useState('purple');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch saved papers on mount
  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'question_papers'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: SavedQuestionPaper[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data() as any
      }));
      setSavedPapers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionEn.trim() && !questionBn.trim()) {
      alert('Please enter question text in English or Bengali.');
      return;
    }
    if (options.filter(o => o.trim() !== '').length < 2) {
      alert('Please provide at least 2 options.');
      return;
    }
    if (!correctAnswer) {
      alert('Please select the correct answer.');
      return;
    }

    const newQ: PaperQuestion = {
      qNo: editingQIdx !== null ? questions[editingQIdx].qNo : questions.length + 1,
      questionEn: questionEn.trim(),
      questionBn: questionBn.trim(),
      options: options.map(o => o.trim()),
      correctAnswer: correctAnswer.trim(),
      solution: solution.trim(),
      sourceExam: sourceExam.trim(),
      sourceExamColor,
      imageUrl
    };

    if (editingQIdx !== null) {
      const updated = [...questions];
      updated[editingQIdx] = newQ;
      setQuestions(updated);
      setEditingQIdx(null);
    } else {
      setQuestions(prev => [...prev, newQ]);
    }

    // Reset Form
    setQuestionEn('');
    setQuestionBn('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('');
    setSolution('');
    setSourceExam('');
    setImageUrl('');
  };

  const handleEditQuestion = (idx: number) => {
    const q = questions[idx];
    setEditingQIdx(idx);
    setQuestionEn(q.questionEn || '');
    setQuestionBn(q.questionBn || '');
    setOptions(q.options || ['', '', '', '']);
    setCorrectAnswer(q.correctAnswer || '');
    setSolution(q.solution || '');
    setSourceExam(q.sourceExam || '');
    setSourceExamColor(q.sourceExamColor || 'purple');
    setImageUrl(q.imageUrl || '');
  };

  const handleDeleteQuestion = (idx: number) => {
    const updated = questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, qNo: i + 1 }));
    setQuestions(updated);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    setUploadingImage(true);
    try {
      const url = await uploadFileViaBackend(file, 'paper-maker-images', auth.currentUser);
      setImageUrl(url);
    } catch (err: any) {
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSavePaper = async () => {
    if (questions.length === 0) {
      alert('Please add at least one question before saving.');
      return;
    }
    try {
      await addDoc(collection(db, 'question_papers'), {
        settings,
        questions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert('Question paper saved successfully!');
      fetchPapers();
    } catch (err: any) {
      console.error(err);
      alert('Failed to save paper: ' + err.message);
    }
  };

  const handleLoadPaper = (paper: SavedQuestionPaper) => {
    if (paper.settings) setSettings(paper.settings);
    if (paper.questions) setQuestions(paper.questions);
    setViewMode('editor');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <span>📄 Question Paper Maker</span>
            <span className="text-xs px-2.5 py-0.5 bg-purple-100 text-purple-700 font-extrabold rounded-full border border-purple-200">
              Dual Language (EN + BN)
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Create professional 2-column A4 question papers in English & Bengali with colored exam tags and auto answer key tables at the end.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode(v => v === 'editor' ? 'list' : 'editor')}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            {viewMode === 'editor' ? `Saved Papers (${savedPapers.length})` : 'Back to Maker Editor'}
          </button>

          <button
            type="button"
            onClick={() => exportCustomQuestionPaperToPDF(settings, questions)}
            className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Download PDF
          </button>

          <button
            type="button"
            onClick={() => exportCustomQuestionPaperToWord(settings, questions)}
            className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download Word
          </button>

          <button
            type="button"
            onClick={handleSavePaper}
            className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Paper
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        /* Saved Papers List View */
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-800">Saved Question Papers</h3>
          {savedPapers.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium py-8 text-center">No saved papers found yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedPapers.map((paper, i) => (
                <div key={paper.id || i} className="p-5 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all space-y-3">
                  <div>
                    <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md uppercase">
                      {paper.settings?.category || 'General'}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-base mt-1">{paper.settings?.subHeader || paper.settings?.headerTitle}</h4>
                    <p className="text-xs text-slate-500">{paper.questions?.length || 0} Questions • Duration: {paper.settings?.duration || 60}m</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoadPaper(paper)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl hover:bg-indigo-100"
                    >
                      Load in Editor
                    </button>
                    <button
                      onClick={() => exportCustomQuestionPaperToPDF(paper.settings, paper.questions)}
                      className="px-3 py-1.5 bg-rose-50 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-100"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => exportCustomQuestionPaperToWord(paper.settings, paper.questions)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-100"
                    >
                      Word
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Paper Maker Editor View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Paper Settings & Question Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Paper Header / Footer Settings */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>⚙️ Header & Footer Customization</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Institute / Main Header Title
                  </label>
                  <input
                    type="text"
                    value={settings.headerTitle}
                    onChange={e => setSettings({ ...settings, headerTitle: e.target.value })}
                    placeholder="e.g. MASTER APTITUDE BY SUMAN SIR"
                    className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-bold focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Sub-Header / Practice Set Title
                  </label>
                  <input
                    type="text"
                    value={settings.subHeader}
                    onChange={e => setSettings({ ...settings, subHeader: e.target.value })}
                    placeholder="e.g. WBP CONSTABLE 2026 PRACTICE SET - 01"
                    className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-bold focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Time (Minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.duration}
                      onChange={e => setSettings({ ...settings, duration: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-bold focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Total Marks
                    </label>
                    <input
                      type="number"
                      value={settings.totalMarks}
                      onChange={e => setSettings({ ...settings, totalMarks: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-bold focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Negative
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={settings.negativeMarks}
                      onChange={e => setSettings({ ...settings, negativeMarks: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-bold focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Footer Note / Disclaimer
                  </label>
                  <input
                    type="text"
                    value={settings.footerText}
                    onChange={e => setSettings({ ...settings, footerText: e.target.value })}
                    placeholder="e.g. MASTER APTITUDE BY SUMAN SIR • OFFICIAL PRINTED QUESTION PAPER"
                    className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-bold focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Add / Edit Question Form */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>➕ {editingQIdx !== null ? `Edit Question #${editingQIdx + 1}` : 'Add Question'}</span>
              </h3>

              <form onSubmit={handleAddOrUpdateQuestion} className="space-y-4">
                {/* Question English */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Question Text (English)
                  </label>
                  <textarea
                    rows={2}
                    value={questionEn}
                    onChange={e => setQuestionEn(e.target.value)}
                    placeholder="Write question in English..."
                    className="w-full rounded-xl border-2 border-slate-200 p-3 text-xs font-bold focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* Question Bengali */}
                <div>
                  <label className="block text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">
                    Question Text (Bengali / বাংলা)
                  </label>
                  <textarea
                    rows={2}
                    value={questionBn}
                    onChange={e => setQuestionBn(e.target.value)}
                    placeholder="বাংলা ভাষায় প্রশ্ন লিখুন..."
                    className="w-full rounded-xl border-2 border-purple-200 bg-purple-50/30 p-3 text-xs font-bold focus:border-purple-600 outline-none"
                  />
                </div>

                {/* Exam Source Tag & Color Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Asked In Exam Badge <span className="normal-case font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={sourceExam}
                      onChange={e => setSourceExam(e.target.value)}
                      placeholder="e.g. WBP Constable 2023, SSC CGL 2022"
                      className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-bold focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Badge Highlight Color
                    </label>
                    <select
                      value={sourceExamColor}
                      onChange={e => setSourceExamColor(e.target.value)}
                      className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-bold focus:border-indigo-500 outline-none bg-white"
                    >
                      {BADGE_COLOR_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.name} Badge
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Options A, B, C, D */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Options (A, B, C, D)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {['A', 'B', 'C', 'D'].map((letter, idx) => (
                      <div key={letter} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-extrabold text-xs flex items-center justify-center shrink-0">
                          {letter}
                        </span>
                        <input
                          type="text"
                          required
                          value={options[idx] || ''}
                          onChange={e => {
                            const updated = [...options];
                            updated[idx] = e.target.value;
                            setOptions(updated);
                          }}
                          placeholder={`Option ${letter}`}
                          className="flex-1 rounded-xl border-2 border-slate-200 p-2 text-xs font-bold focus:border-indigo-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Correct Answer Selector */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Select Correct Answer
                  </label>
                  <select
                    required
                    value={correctAnswer}
                    onChange={e => setCorrectAnswer(e.target.value)}
                    className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-2.5 text-xs font-bold text-emerald-900 focus:border-emerald-500 outline-none"
                  >
                    <option value="">-- Choose Correct Option --</option>
                    {options.map((opt, idx) => {
                      if (!opt.trim()) return null;
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <option key={idx} value={opt}>
                          Option ({letter}): {opt}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Solution */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Solution / Explanation <span className="normal-case font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={solution}
                    onChange={e => setSolution(e.target.value)}
                    placeholder="Provide solution for the answer sheet..."
                    className="w-full rounded-xl border-2 border-slate-200 p-2.5 text-xs font-bold focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Attach Image / Diagram <span className="normal-case font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-slate-500"
                  />
                  {uploadingImage && <span className="text-xs text-indigo-600 font-bold block mt-1">Uploading image...</span>}
                  {imageUrl && <span className="text-xs text-emerald-600 font-bold block mt-1">✓ Image Attached</span>}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-2 pt-2">
                  {editingQIdx !== null && (
                    <button
                      type="button"
                      onClick={() => setEditingQIdx(null)}
                      className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-purple-200 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {editingQIdx !== null ? 'Update Question' : 'Add Question to Paper'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Side: Added Questions Preview List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 sticky top-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Question List ({questions.length})
                </h3>
                {questions.length > 0 && (
                  <button
                    onClick={() => setQuestions([])}
                    className="text-xs text-rose-600 hover:underline font-bold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {questions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                  No questions added to paper yet. Fill form on left to add questions!
                </div>
              ) : (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {questions.map((q, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 relative group hover:border-purple-300">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md shrink-0">
                          Q{q.qNo || idx + 1}
                        </span>

                        {q.sourceExam && (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase border ${
                            q.sourceExamColor === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            q.sourceExamColor === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            q.sourceExamColor === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            q.sourceExamColor === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {q.sourceExam}
                          </span>
                        )}

                        <div className="flex items-center gap-1 shrink-0 ml-auto">
                          <button
                            onClick={() => handleEditQuestion(idx)}
                            className="p-1 text-slate-400 hover:text-purple-600 rounded-lg"
                            title="Edit Question"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {q.questionEn && <p className="text-xs font-bold text-slate-800">{q.questionEn}</p>}
                      {q.questionBn && <p className="text-xs font-bold text-slate-700">{q.questionBn}</p>}

                      <div className="text-[10px] text-slate-500 font-bold bg-white p-2 rounded-xl border border-slate-100">
                        Ans: <span className="text-emerald-700 font-extrabold">{q.correctAnswer}</span>
                      </div>
                      {q.solution && (
                        <div className="text-xs text-slate-700 font-medium whitespace-pre-wrap break-words bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 mt-2">
                          <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block mb-1">Solution / Explanation:</span>
                          <RenderQuestionHTML html={q.solution} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
