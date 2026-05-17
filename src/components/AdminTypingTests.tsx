import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { Keyboard, Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, BarChart, ChevronDown, ChevronRight, Download, FileText, Filter } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminTypingTests() {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'manage' | 'add' | 'reports'>('manage');

  // Search & Filter State for Manage Tests
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDuration, setFilterDuration] = useState('All');
  const [filterDifficulty, setFilterDifficulty] = useState('All');

  // Reports state
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [paragraph, setParagraph] = useState('');
  const [duration, setDuration] = useState('5');
  const [difficulty, setDifficulty] = useState('Easy');
  const [language, setLanguage] = useState('English');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTests();
    fetchResults();
  }, [user]);

  const fetchTests = async () => {
    try {
      const q = query(collection(db, 'typing_tests'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setTests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchResults = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/typing-results', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setResults(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !paragraph) {
      alert("Title and Paragraph are required.");
      return;
    }
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/admin/typing-test/${editingId}` : '/api/admin/typing-test';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title, paragraph, duration: Number(duration), difficulty, language, isActive
        })
      });

      if (res.ok) {
        alert(editingId ? "Test updated!" : "Test created!");
        resetForm();
        fetchTests();
        setActiveTab('manage');
      } else {
        alert("Failed to save test.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this typing test? This cannot be undone.")) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/typing-test/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setTests(tests.filter(t => t.id !== id));
      } else {
        alert("Delete failed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (test: any) => {
    setEditingId(test.id);
    setTitle(test.title);
    setParagraph(test.paragraph);
    setDuration(test.duration.toString());
    setDifficulty(test.difficulty);
    setLanguage(test.language);
    setIsActive(test.isActive);
    setActiveTab('add');
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setParagraph('');
    setDuration('5');
    setDifficulty('Easy');
    setLanguage('English');
    setIsActive(true);
  };

  const handleSeed = async () => {
    if (!confirm("This will add dummy typing tests representing multiple durations (1, 2, 3, 5, 10 mins). Proceed?")) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/seed-typing-tests', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Seeded successfully!");
        fetchTests();
      }
    } catch(err) {
      console.error(err);
    }
  };

  // Process grouped student reports: Group results by unique (userId + '_' + testId)
  const getGroupedReports = () => {
    const groups: Record<string, {
      userId: string;
      testId: string;
      studentName: string;
      testTitle: string;
      attempts: number;
      bestWpm: number;
      latestAccuracy: number;
      latestTimestamp: number;
      allAttempts: any[];
    }> = {};

    results.forEach(res => {
      const key = `${res.userId}_${res.testId}`;
      if (!groups[key]) {
        groups[key] = {
          userId: res.userId,
          testId: res.testId,
          studentName: res.studentName || "Unknown Student",
          testTitle: res.testTitle || "Unknown Test",
          attempts: 0,
          bestWpm: 0,
          latestAccuracy: 0,
          latestTimestamp: 0,
          allAttempts: []
        };
      }
      
      const grp = groups[key];
      grp.allAttempts.push(res);
    });

    // Compute aggregated metrics for each group
    return Object.values(groups).map(g => {
      // Sort attempts descending to get latest
      const sortedAttempts = [...g.allAttempts].sort((a, b) => b.timestamp - a.timestamp);
      g.attempts = sortedAttempts.length;
      g.bestWpm = Math.max(...sortedAttempts.map(a => a.wpm), 0);
      g.latestAccuracy = sortedAttempts[0]?.accuracy || 0;
      g.latestTimestamp = sortedAttempts[0]?.timestamp || 0;
      g.allAttempts = sortedAttempts;
      return g;
    });
  };

  const groupedReports = getGroupedReports();

  // Export Grouped Reports to CSV
  const exportToCSV = () => {
    if (groupedReports.length === 0) return;
    const headers = ['Student', 'Test', 'Attempts', 'Best WPM', 'Latest Accuracy %', 'Last Attempt Date'];
    const csvContent = [
      headers.join(','),
      ...groupedReports.map(g => [
        `"${g.studentName.replace(/"/g, '""')}"`,
        `"${g.testTitle.replace(/"/g, '""')}"`,
        g.attempts,
        g.bestWpm,
        g.latestAccuracy,
        `"${new Date(g.latestTimestamp).toLocaleDateString()}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'typing_student_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Grouped Reports to PDF using autoTable
  const exportToPDF = () => {
    if (groupedReports.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Typing Test Student Performance Reports', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 26);

    const tableData = groupedReports.map(g => [
      g.studentName,
      g.testTitle,
      `${g.attempts} runs`,
      `${g.bestWpm} WPM`,
      `${g.latestAccuracy}%`,
      new Date(g.latestTimestamp).toLocaleDateString()
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['Student', 'Test Title', 'Attempts', 'Best Speed', 'Latest Accuracy', 'Last Attempt']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [217, 70, 239] } // Fuchsia color theme matching Admin Panel
    });

    doc.save('typing_student_results.pdf');
  };

  // Filter tests logic
  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDuration = filterDuration === 'All' || test.duration.toString() === filterDuration;
    const matchesDifficulty = filterDifficulty === 'All' || test.difficulty === filterDifficulty;
    return matchesSearch && matchesDuration && matchesDifficulty;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <span className="w-2 h-8 bg-fuchsia-600 rounded-full"></span>
          Typing Test Management
        </h2>
        <button onClick={handleSeed} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-lg font-bold transition-colors">
          Seed Dummy Tests
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-4">
        <button 
          onClick={() => { setActiveTab('manage'); resetForm(); }}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'manage' ? 'bg-fuchsia-100 text-fuchsia-700' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Manage Tests
        </button>
        <button 
          onClick={() => setActiveTab('add')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'add' ? 'bg-fuchsia-100 text-fuchsia-700' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <Plus className="w-4 h-4" /> {editingId ? 'Edit Test' : 'Add Test'}
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'reports' ? 'bg-fuchsia-100 text-fuchsia-700' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Student Reports
        </button>
      </div>

      {activeTab === 'manage' && (
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input 
                type="text" 
                placeholder="Search tests by title..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
                <Filter className="w-4 h-4 text-slate-400" />
                Filter:
              </div>
              <select 
                value={filterDuration}
                onChange={e => setFilterDuration(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              >
                <option value="All">All Durations</option>
                <option value="1">1 Minute</option>
                <option value="2">2 Minutes</option>
                <option value="3">3 Minutes</option>
                <option value="5">5 Minutes</option>
                <option value="10">10 Minutes</option>
              </select>

              <select 
                value={filterDifficulty}
                onChange={e => setFilterDifficulty(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-black tracking-widest">
                    <th className="p-4">Test Title</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Difficulty</th>
                    <th className="p-4">Language</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTests.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No matching typing tests found.</td></tr>
                  ) : (
                    filteredTests.map((test) => (
                      <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{test.title}</td>
                        <td className="p-4 text-slate-600">{test.duration} Min</td>
                        <td className="p-4 text-slate-600">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${test.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' : test.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                            {test.difficulty}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 text-sm font-semibold">{test.language}</td>
                        <td className="p-4">
                          {test.isActive ? 
                            <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 className="w-4 h-4" /> Active</span> : 
                            <span className="flex items-center gap-1 text-slate-400 text-xs font-bold"><XCircle className="w-4 h-4" /> Inactive</span>
                          }
                        </td>
                        <td className="p-4 flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(test)} className="p-2 text-indigo-500 hover:bg-indigo-55 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(test.id)} className="p-2 text-rose-500 hover:bg-rose-55 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'add' && (
        <form onSubmit={handleSaveTest} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Test Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500" placeholder="e.g. English Speed Test 1" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Paragraph Text</label>
              <textarea value={paragraph} onChange={(e) => setParagraph(e.target.value)} required rows={6} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 resize-none font-mono text-sm" placeholder="Paste the text for students to type here..."></textarea>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Duration (Minutes)</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
                <option value="1">1 Minute</option>
                <option value="2">2 Minutes</option>
                <option value="3">3 Minutes</option>
                <option value="5">5 Minutes</option>
                <option value="10">10 Minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
                <option value="English">English</option>
                <option value="Bengali">Bengali</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>
            <div className="flex items-center mt-8">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-5 h-5 rounded text-fuchsia-600 focus:ring-fuchsia-500" />
                <span className="font-bold text-slate-700">Active (Visible to Students)</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
             <button type="button" onClick={() => {resetForm(); setActiveTab('manage');}} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
             <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-700 transition-colors shadow-lg shadow-fuchsia-200">
               {saving ? 'Saving...' : editingId ? 'Update Test' : 'Save New Test'}
             </button>
          </div>
        </form>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Export Actions Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Reports Log ({groupedReports.length} students)</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl border border-slate-200 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
              </button>
              <button 
                onClick={exportToPDF}
                className="flex items-center gap-1.5 text-xs bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-700 font-bold px-3 py-2 rounded-xl border border-fuchsia-200 shadow-sm transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-fuchsia-500" /> Export PDF
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-black tracking-widest">
                    <th className="p-4 pl-6">Student</th>
                    <th className="p-4">Typing Test</th>
                    <th className="p-4 text-center">Attempts</th>
                    <th className="p-4 text-center">Best Speed</th>
                    <th className="p-4 text-center">Latest Accuracy</th>
                    <th className="p-4 pr-6 text-right font-black">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedReports.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No student reports found.</td></tr>
                  ) : (
                    groupedReports.map((grp) => {
                      const rowKey = `${grp.userId}_${grp.testId}`;
                      const isExpanded = expandedRow === rowKey;

                      return (
                        <React.Fragment key={rowKey}>
                          {/* Main Grouped Row */}
                          <tr className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 pl-6 font-bold text-slate-800">{grp.studentName}</td>
                            <td className="p-4 text-sm text-slate-600 font-medium">{grp.testTitle}</td>
                            <td className="p-4 text-center font-bold text-slate-700">
                              <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-xs">{grp.attempts} Runs</span>
                            </td>
                            <td className="p-4 text-center font-black text-indigo-600">
                              {grp.bestWpm} <span className="text-[10px] font-normal text-slate-400">WPM</span>
                            </td>
                            <td className="p-4 text-center font-bold text-emerald-600">
                              {grp.latestAccuracy}%
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <button
                                onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                                className="text-xs bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-700 font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1 ml-auto transition-colors"
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                {isExpanded ? "Hide Details" : "View Full Attempt History"}
                              </button>
                            </td>
                          </tr>

                          {/* Collapsible Attempts History */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="bg-slate-50/70 p-6 border-t border-b border-slate-100">
                                <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-inner max-w-4xl mx-auto">
                                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Keystroke Log History</span>
                                    <span className="text-xs font-semibold text-slate-600">{grp.studentName} &middot; {grp.testTitle}</span>
                                  </div>
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="text-slate-500 font-black border-b border-slate-100 bg-slate-50/50 uppercase tracking-widest text-[9px]">
                                        <th className="p-3 pl-4">Attempt #</th>
                                        <th className="p-3">WPM Speed</th>
                                        <th className="p-3">Accuracy</th>
                                        <th className="p-3 text-center">Keystroke Errors</th>
                                        <th className="p-3 pr-4">Date & Time</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {grp.allAttempts.map(attempt => (
                                        <tr key={attempt.id} className="hover:bg-slate-50/30 transition-colors">
                                          <td className="p-3 pl-4 font-extrabold text-slate-700">Attempt #{attempt.attemptNo}</td>
                                          <td className="p-3 font-extrabold text-indigo-600">{attempt.wpm} WPM</td>
                                          <td className="p-3 font-bold text-emerald-600">{attempt.accuracy}%</td>
                                          <td className="p-3 text-center text-rose-500 font-bold">{attempt.errors}</td>
                                          <td className="p-3 pr-4 text-slate-400 font-medium">{new Date(attempt.timestamp).toLocaleString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
