import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { collection, query, getDocs, orderBy, doc, deleteDoc, where, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { LogOut, ArrowLeft, Plus, Edit2, Trash2, FileText, BookOpen, Play, CheckCircle, Clock } from 'lucide-react';
import { signOut } from 'firebase/auth';

type AdminTab = 'mock' | 'notes' | 'video' | 'pyq' | 'pattern' | 'carousel';

function AdminHome() {
  const [tests, setTests] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [pyqs, setPyqs] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [carousels, setCarousels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('mock');
  
  // Test Form
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('30');
  const [testType, setTestType] = useState('topic');
  
  // Note Form
  const [noteTitle, setNoteTitle] = useState('');
  const [noteLink, setNoteLink] = useState('');
  const [noteSubject, setNoteSubject] = useState('');

  // Pyq Form
  const [pyqTitle, setPyqTitle] = useState('');
  const [pyqLink, setPyqLink] = useState('');
  const [pyqSubject, setPyqSubject] = useState('');

  // Pattern Form
  const [patternTitle, setPatternTitle] = useState('');
  const [patternLink, setPatternLink] = useState('');
  const [patternSubject, setPatternSubject] = useState('');

  // Video Form
  const [videoTitle, setVideoTitle] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [videoSubject, setVideoSubject] = useState('');

  // Carousel Form
  const [carouselFile, setCarouselFile] = useState<File | null>(null);
  const [uploadingCarousel, setUploadingCarousel] = useState(false);

  const user = useAuth().user;

  useEffect(() => {
    setLoading(true);
    const qTests = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
    const qNotes = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const qVideos = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const qPyqs = query(collection(db, 'pyqs'), orderBy('createdAt', 'desc'));
    const qPatterns = query(collection(db, 'patterns'), orderBy('createdAt', 'desc'));
    const qCarousels = query(collection(db, 'carousel'), orderBy('createdAt', 'desc'));

    const unsubTests = onSnapshot(qTests, (snap) => {
      setTests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubNotes = onSnapshot(qNotes, (snap) => {
      setNotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubVideos = onSnapshot(qVideos, (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPyqs = onSnapshot(qPyqs, (snap) => {
      setPyqs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPatterns = onSnapshot(qPatterns, (snap) => {
      setPatterns(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCarousels = onSnapshot(qCarousels, (snap) => {
      setCarousels(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTests();
      unsubNotes();
      unsubVideos();
      unsubPyqs();
      unsubPatterns();
      unsubCarousels();
    };
  }, []);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !topic || !user) return;
    
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/create-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title, 
          topic, 
          testType,
          duration: parseInt(duration) || 30,
          isActive: true 
        })
      });
      if (res.ok) {
        setTitle('');
        setTopic('');
        setDuration('30');
      } else alert(await res.text());
    } catch (err) {
      console.error(err);
      alert('Error creating test');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteLink || !user) return;
    try {
      await addDoc(collection(db, 'notes'), {
        title: noteTitle,
        link: noteLink,
        subject: noteSubject || 'General',
        createdAt: serverTimestamp(),
        authorId: user.uid
      });
      setNoteTitle('');
      setNoteLink('');
      setNoteSubject('');
    } catch (err) {
      console.error(err);
      alert('Error adding note');
    }
  };

  const handleAddPyq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pyqTitle || !pyqLink || !user) return;
    try {
      await addDoc(collection(db, 'pyqs'), {
        title: pyqTitle,
        link: pyqLink,
        subject: pyqSubject || 'General',
        createdAt: serverTimestamp(),
        authorId: user.uid
      });
      setPyqTitle('');
      setPyqLink('');
      setPyqSubject('');
    } catch (err) {
      console.error(err);
      alert('Error adding PYQ');
    }
  };

  const handleAddPattern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patternTitle || !patternLink || !user) return;
    try {
      await addDoc(collection(db, 'patterns'), {
        title: patternTitle,
        link: patternLink,
        subject: patternSubject || 'General',
        createdAt: serverTimestamp(),
        authorId: user.uid
      });
      setPatternTitle('');
      setPatternLink('');
      setPatternSubject('');
    } catch (err) {
      console.error(err);
      alert('Error adding Pattern');
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle || !videoLink || !user) return;
    try {
      await addDoc(collection(db, 'videos'), {
        title: videoTitle,
        link: videoLink,
        subject: videoSubject || 'General',
        createdAt: serverTimestamp(),
        authorId: user.uid
      });
      setVideoTitle('');
      setVideoLink('');
      setVideoSubject('');
    } catch (err) {
      console.error(err);
      alert('Error adding video');
    }
  };

  const handleAddCarousel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carouselFile || !user) return;
    try {
      if (carousels.length >= 3) {
        alert('You can only have up to 3 carousel pictures.');
        return;
      }
      setUploadingCarousel(true);
      
      const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1200;
              const MAX_HEIGHT = 800;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = (err) => reject(err);
          };
          reader.onerror = (err) => reject(err);
        });
      };

      const link = await compressImage(carouselFile);

      await addDoc(collection(db, 'carousel'), {
        link: link,
        createdAt: serverTimestamp(),
        authorId: user.uid
      });
      setCarouselFile(null);
      // Reset input type="file" manually
      const fileInput = document.getElementById('carousel-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error(err);
      alert('Error adding carousel picture. Make sure it is a valid image.');
    } finally {
      setUploadingCarousel(false);
    }
  };

  const handleDeleteContent = async (coll: string, id: string) => {
    if (!confirm('Are you sure you want to delete this permanently?')) return;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      // Map matching collection names to API paths
      const pathMap: Record<string, string> = {
        'tests': 'tests',
        'notes': 'notes',
        'videos': 'videos',
        'pyqs': 'materials/pyqs',
        'patterns': 'materials/patterns',
        'carousel': 'materials/carousel'
      };
      
      const apiPath = pathMap[coll] || coll;
      console.log(`Attempting to delete ${coll} with ID ${id} at path /api/admin/${apiPath}/${id}`);
      const res = await fetch(`/api/admin/${apiPath}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        console.log(`${coll} delete successfully initiated`);
        alert('Deleted successfully!');
      } else {
        const errText = await res.text();
        console.error(`${coll} delete failed:`, errText);
        alert(`Delete failed: ${errText}`);
      }
    } catch (err) {
      console.error(`${coll} delete execution error:`, err);
      alert('Network error while deleting. Please check your connection.');
    }
  };

  const toggleActive = async (test: any) => {
    try {
      if(!user) return;
      const token = await user.getIdToken();
      await fetch(`/api/admin/tests/${test.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: test.title, 
          topic: test.topic, 
          testType: test.testType,
          duration: test.duration || 30,
          isActive: !test.isActive 
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const updateDuration = async (test: any) => {
    const newDur = prompt('Enter new duration in minutes:', test.duration || '30');
    if (newDur === null) return;
    const durNum = parseInt(newDur);
    if (isNaN(durNum)) return alert('Invalid number');

    try {
      if(!user) return;
      const token = await user.getIdToken();
      await fetch(`/api/admin/tests/${test.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: test.title, 
          topic: test.topic, 
          testType: test.testType,
          duration: durNum,
          isActive: test.isActive 
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Tab Navigation */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit flex-wrap gap-1">
        <button 
          onClick={() => setActiveTab('mock')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'mock' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
        >
          <FileText className="w-4 h-4" />
          Mock Tests
        </button>
        <button 
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'notes' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
        >
          <BookOpen className="w-4 h-4" />
          Study Notes
        </button>
        <button 
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'video' ? 'bg-rose-600 text-white shadow-md shadow-rose-100' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'}`}
        >
          <Play className="w-4 h-4" />
          Recorded Videos
        </button>
        <button 
          onClick={() => setActiveTab('pyq')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'pyq' ? 'bg-amber-600 text-white shadow-md shadow-amber-100' : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'}`}
        >
          <FileText className="w-4 h-4" />
          Py Qs
        </button>
        <button 
          onClick={() => setActiveTab('pattern')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'pattern' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
        >
          <FileText className="w-4 h-4" />
          Exam Pattern
        </button>
        <button 
          onClick={() => setActiveTab('carousel')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'carousel' ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-100' : 'text-slate-500 hover:text-fuchsia-600 hover:bg-fuchsia-50'}`}
        >
          <Plus className="w-4 h-4" />
          Carousel
        </button>
      </div>

      {activeTab === 'mock' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
            Mock Test Management
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Create New Mock Test</h3>
            <form onSubmit={handleCreateTest} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Test Title</label>
                <input 
                  type="text" 
                  required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={title} onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. Physics Section A"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Topic / Subject</label>
                <input 
                  type="text" 
                  required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={topic} onChange={e => setTopic(e.target.value)} 
                  placeholder="e.g. Mechanics"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Test Type</label>
                <select
                  required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={testType} onChange={e => setTestType(e.target.value)}
                >
                  <option value="topic">Topic Wise Mock Test</option>
                  <option value="sectional">Sectional Mock Test</option>
                  <option value="full">Full Mock Test</option>
                </select>
              </div>
              <div className="w-full">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Duration (Mins)</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={duration} onChange={e => setDuration(e.target.value)} 
                />
              </div>
              <button type="submit" className="bg-indigo-600 text-white px-6 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-indigo-50 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                Build Test
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Test Name</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Topic</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Time</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50 relative">
                {loading && <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-bold">Fetching Tests...</td></tr>}
                {!loading && tests.map(test => (
                  <tr key={test.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-bold text-slate-800">{test.title}</td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-medium text-slate-500">
                      <div className="flex flex-col gap-1">
                        <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-600 inline-block w-fit">{test.topic}</span>
                        <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">
                          {test.testType === 'topic' ? 'Topic Wise' : test.testType === 'sectional' ? 'Sectional' : 'Full Mock'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm text-slate-500">
                      <button onClick={() => updateDuration(test)} className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg hover:bg-indigo-100 transition-colors">
                        {test.duration || 30}m
                      </button>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm">
                      <button 
                        onClick={() => toggleActive(test)}
                        className={`px-4 py-1.5 inline-flex text-xs font-black uppercase tracking-widest rounded-full transition-all ${test.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {test.isActive ? 'Active' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right text-sm font-bold">
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/test/${test.id}`} className="text-indigo-600 hover:bg-indigo-600 hover:text-white p-2 rounded-xl transition-all border border-indigo-100">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDeleteContent('tests', test.id)} className="text-rose-500 hover:bg-rose-500 hover:text-white p-2 rounded-xl transition-all border border-rose-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && tests.length === 0 && <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-bold">No tests created yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-emerald-600 rounded-full"></span>
            Study Notes Repository
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Upload / Link New Study Material</h3>
            <form onSubmit={handleAddNote} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Note Title</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={noteTitle} onChange={e => setNoteTitle(e.target.value)} 
                  placeholder="e.g. Organic Chemistry Guide"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject / Category</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={noteSubject} onChange={e => setNoteSubject(e.target.value)} 
                  placeholder="e.g. Chemistry"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Resource Link (PDF/Drive)</label>
                <input 
                  type="url" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={noteLink} onChange={e => setNoteLink(e.target.value)} 
                  placeholder="https://..."
                />
              </div>
              <button type="submit" className="bg-emerald-600 text-white px-6 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-emerald-50 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                Add Note
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map(note => (
              <div key={note.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all">
                <button 
                  onClick={() => handleDeleteContent('notes', note.id)} 
                  className="absolute top-4 right-4 text-rose-500 hover:bg-rose-50 p-2 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 mb-1">{note.title}</h4>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{note.subject}</p>
                <a 
                  href={note.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  View Resource
                </a>
              </div>
            ))}
            {notes.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 font-bold">No study notes uploaded yet.</div>}
          </div>
        </div>
      )}

      {activeTab === 'video' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-rose-600 rounded-full"></span>
            Video Library Management
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Submit New Educational Video</h3>
            <form onSubmit={handleAddVideo} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Video Title</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={videoTitle} onChange={e => setVideoTitle(e.target.value)} 
                  placeholder="e.g. Newton's Laws Explained"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={videoSubject} onChange={e => setVideoSubject(e.target.value)} 
                  placeholder="e.g. Physics"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Video Link (YouTube/Vimeo)</label>
                <input 
                  type="url" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={videoLink} onChange={e => setVideoLink(e.target.value)} 
                  placeholder="https://youtube.com/..."
                />
              </div>
              <button type="submit" className="bg-rose-600 text-white px-6 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-rose-50 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                Add Video
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(video => (
              <div key={video.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all">
                <button 
                  onClick={() => handleDeleteContent('videos', video.id)} 
                  className="absolute top-4 right-4 text-rose-500 hover:bg-rose-50 p-2 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 group-hover:bg-rose-600 group-hover:text-white transition-all">
                  <Play className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 mb-1">{video.title}</h4>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{video.subject}</p>
                <a 
                  href={video.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center text-rose-600 font-bold text-sm bg-rose-50 px-4 py-2 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  Watch Now
                </a>
              </div>
            ))}
            {videos.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 font-bold">No videos linked yet.</div>}
          </div>
        </div>
      )}

      {activeTab === 'pyq' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-amber-600 rounded-full"></span>
            Previous Year Questions
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Upload New PYQ</h3>
            <form onSubmit={handleAddPyq} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={pyqTitle} onChange={e => setPyqTitle(e.target.value)} 
                  placeholder="e.g. 2023 Paper"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={pyqSubject} onChange={e => setPyqSubject(e.target.value)} 
                  placeholder="e.g. Maths"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Resource Link (PDF/Drive)</label>
                <input 
                  type="url" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={pyqLink} onChange={e => setPyqLink(e.target.value)} 
                  placeholder="https://..."
                />
              </div>
              <button type="submit" className="bg-amber-600 text-white px-6 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-amber-50 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                Add PYQ
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pyqs.map(pyq => (
              <div key={pyq.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all">
                <button 
                  onClick={() => handleDeleteContent('pyqs', pyq.id)} 
                  className="absolute top-4 right-4 text-rose-500 hover:bg-rose-50 p-2 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 mb-1">{pyq.title}</h4>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{pyq.subject}</p>
                <a 
                  href={pyq.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center text-amber-600 font-bold text-sm bg-amber-50 px-4 py-2 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  View Resource
                </a>
              </div>
            ))}
            {pyqs.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 font-bold">No Pyqs uploaded yet.</div>}
          </div>
        </div>
      )}

      {activeTab === 'pattern' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
            Exam Pattern & Syllabus
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Upload Exam Pattern</h3>
            <form onSubmit={handleAddPattern} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={patternTitle} onChange={e => setPatternTitle(e.target.value)} 
                  placeholder="e.g. 2024 Pattern"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={patternSubject} onChange={e => setPatternSubject(e.target.value)} 
                  placeholder="e.g. SSC CGL"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Resource Link (PDF/Drive)</label>
                <input 
                  type="url" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={patternLink} onChange={e => setPatternLink(e.target.value)} 
                  placeholder="https://..."
                />
              </div>
              <button type="submit" className="bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-blue-50 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                Add Pattern
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {patterns.map(pattern => (
              <div key={pattern.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all">
                <button 
                  onClick={() => handleDeleteContent('patterns', pattern.id)} 
                  className="absolute top-4 right-4 text-rose-500 hover:bg-rose-50 p-2 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 mb-1">{pattern.title}</h4>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{pattern.subject}</p>
                <a 
                  href={pattern.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  View Resource
                </a>
              </div>
            ))}
            {patterns.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 font-bold">No Pattern uploaded yet.</div>}
          </div>
        </div>
      )}

      {activeTab === 'carousel' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-fuchsia-600 rounded-full"></span>
            Carousel Management (Max 3)
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Upload Carousel Image</h3>
            <form onSubmit={handleAddCarousel} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Image File</label>
                <input 
                  id="carousel-file-input"
                  type="file" accept="image/*" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-fuchsia-50 file:text-fuchsia-700 hover:file:bg-fuchsia-100" 
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setCarouselFile(e.target.files[0]);
                    }
                  }} 
                />
              </div>
              <button disabled={uploadingCarousel} type="submit" className="bg-fuchsia-600 disabled:opacity-50 text-white px-6 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-fuchsia-50 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                {uploadingCarousel ? 'Uploading...' : 'Add Image'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {carousels.map(carousel => (
              <div key={carousel.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all overflow-hidden flex flex-col">
                <button 
                  onClick={() => handleDeleteContent('carousel', carousel.id)} 
                  className="absolute top-4 right-4 text-rose-500 hover:bg-rose-50 p-2 rounded-xl z-10 bg-white shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-full h-32 bg-slate-100 rounded-2xl mb-4 overflow-hidden relative">
                   <img src={carousel.link} alt="Carousel slide" className="w-full h-full object-cover" />
                </div>
                <a 
                  href={carousel.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center text-fuchsia-600 font-bold text-sm bg-fuchsia-50 px-4 py-2 rounded-xl hover:bg-fuchsia-100 transition-colors mt-auto w-fit"
                >
                  View Image
                </a>
              </div>
            ))}
            {carousels.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 font-bold">No carousel images uploaded yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionManager() {
  const { testId } = useParams();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuth().user;

  // Form states
  const [qText, setQText] = useState('');
  const [qTopic, setQTopic] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState('');

  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    const q = query(collection(db, 'questions'), where('testId', '==', testId));
    const unsub = onSnapshot(q, (snap) => {
      let qs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      qs.sort((a, b) => (a.qNo || 0) - (b.qNo || 0));
      setQuestions(qs);
      setLoading(false);
    });
    return () => unsub();
  }, [testId]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText || !user) return;
    if (!qOptions.every(opt => opt.trim() !== '')) return alert('All 4 options must be filled');
    const uniqueOptions = new Set(qOptions.map(o => o.trim()));
    if (uniqueOptions.size < 4) return alert('All 4 options must be unique. Duplicate options are not allowed.');
    if (!qCorrect) return alert('Select a correct answer');

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          testId, 
          topic: qTopic, 
          qNo: questions.length + 1, 
          questionText: qText, 
          options: qOptions, 
          correctAnswer: qCorrect 
        })
      });
      if (res.ok) {
        setQText(''); setQTopic(''); setQOptions(['', '', '', '']); setQCorrect('');
      } else alert(await res.text());
    } catch (error) {
      console.error(error);
      alert('Failed to add question');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      console.log(`Attempting to delete question ${qId}`);
      const res = await fetch(`/api/admin/questions/${qId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        console.log('Question delete initiated');
        alert('Question deleted!');
      } else {
        const errText = await res.text();
        console.error('Question delete failed:', errText);
        alert(`Failed to delete question: ${errText}`);
      }
    } catch(err) {
      console.error('Question delete execution error:', err);
      alert('Network error while deleting question.');
    }
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <Link to="/admin" className="mr-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition group">
          <ArrowLeft className="w-5 h-5 text-indigo-600 group-hover:-translate-x-1 transition-transform" />
        </Link>
        <h2 className="text-2xl font-black text-slate-800">Manage Test Questions</h2>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
         <h3 className="text-lg font-bold text-slate-800 mb-6">Add New Question</h3>
         <form onSubmit={handleAddQuestion} className="space-y-6">
           <div>
             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Question Description</label>
             <textarea 
               className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-medium"
               rows={3} value={qText} onChange={e => setQText(e.target.value)} required 
               placeholder="Write the question here..."
             />
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {qOptions.map((opt, i) => (
               <div key={i}>
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Option {i+1}</label>
                 <input 
                   type="text" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                   value={opt} onChange={e => {
                     const newOpts = [...qOptions];
                     newOpts[i] = e.target.value;
                     setQOptions(newOpts);
                   }} required 
                   placeholder={`Possibility ${i+1}`}
                 />
               </div>
             ))}
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Correct Answer</label>
               <select 
                 className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-bold text-indigo-600"
                 value={qCorrect} onChange={e => setQCorrect(e.target.value)} required
               >
                 <option value="">Select correct option...</option>
                 {qOptions.filter(o => o.trim() !== '').map((opt, i) => (
                   <option key={i} value={opt}>{opt}</option>
                 ))}
               </select>
             </div>
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Topic</label>
               <input 
                 type="text" className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium"
                 value={qTopic} onChange={e => setQTopic(e.target.value)}
                 placeholder="e.g. Quantum Physics" 
               />
             </div>
           </div>

           <div className="flex justify-end pt-4">
             <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-indigo-50 flex items-center gap-2">
               <Plus className="w-5 h-5" /> Add Question to Test
             </button>
           </div>
         </form>
      </div>

      <div className="space-y-4">
        {loading ? <p className="text-slate-400 font-bold text-center py-10">Fetching questions...</p> : 
         questions.map((q, i) => (
           <div key={q.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 relative group transition-all hover:shadow-md">
             <button onClick={() => handleDeleteQuestion(q.id)} className="absolute top-6 right-6 text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition">
               <Trash2 className="w-5 h-5" />
             </button>
             <div className="flex items-start mb-6">
                <span className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black mr-4 shrink-0">
                  {i+1}
                </span>
                <h4 className="font-bold text-slate-800 text-lg pr-12 leading-tight">{q.questionText}</h4>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {q.options.map((opt: string, j: number) => (
                 <div key={j} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between
                   ${opt === q.correctAnswer 
                     ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm' 
                     : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                   <span className="font-bold">{opt}</span>
                   {opt === q.correctAnswer && (
                     <div className="bg-emerald-500 text-white p-1 rounded-full">
                       <Plus className="w-3 h-3 rotate-45" /> 
                     </div>
                   )}
                 </div>
               ))}
             </div>
           </div>
         ))
        }
        {questions.length === 0 && !loading && <p className="text-slate-400 font-bold text-center py-10">No questions added yet.</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-slate-900 flex items-center tracking-tighter leading-none">
                <span className="bg-indigo-600 text-white text-[8px] px-2 py-1 uppercase rounded-md mr-3 tracking-[0.2em] font-black shadow-lg shadow-indigo-100">ADMIN</span>
                MASTER APTITUDE
              </h1>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1 ml-[64px]">By Suman Sir</p>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors">Student View</Link>
              <button 
                onClick={() => signOut(auth)}
                className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full animate-in fade-in duration-700">
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/test/:testId" element={<QuestionManager />} />
        </Routes>
      </main>
    </div>
  );
}

