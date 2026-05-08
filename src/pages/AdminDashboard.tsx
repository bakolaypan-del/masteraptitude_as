import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { collection, query, getDocs, orderBy, doc, deleteDoc, where, addDoc, serverTimestamp, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { LogOut, ArrowLeft, Plus, Pencil, Trash2, FileText, BookOpen, Play, CheckCircle, Clock, X, User as UserIcon, Download, ShieldAlert, ShieldCheck, Key } from 'lucide-react';
import { signOut } from 'firebase/auth';

type AdminTab = 'students' | 'mock' | 'notes' | 'video' | 'pyq' | 'pattern' | 'carousel' | 'social';

function AdminHome() {
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState('all'); // all, active, blocked
  const [stats, setStats] = useState({ total: 0, active: 0, blocked: 0, today: 0 });
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [tests, setTests] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [pyqs, setPyqs] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [carousels, setCarousels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('mock');
  
  // Test Form
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [category, setCategory] = useState('GK');
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
  const [patternExamName, setPatternExamName] = useState('');
  const [patternFiles, setPatternFiles] = useState<File[]>([]);
  const [uploadingPattern, setUploadingPattern] = useState(false);

  // Video Form
  const [videoTitle, setVideoTitle] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [videoSubject, setVideoSubject] = useState('');

  // Carousel Form
  const [carouselFile, setCarouselFile] = useState<File | null>(null);
  const [uploadingCarousel, setUploadingCarousel] = useState(false);

  // Social Links Form
  const [socialYoutube, setSocialYoutube] = useState('');
  const [socialTelegram, setSocialTelegram] = useState('');
  const [socialWhatsapp, setSocialWhatsapp] = useState('');
  const [savingSocials, setSavingSocials] = useState(false);
  const [isBulkCreating, setIsBulkCreating] = useState(false);

  const { user, profile } = useAuth();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleBulkCreateComputerTests = async () => {
    if (!confirm('This will create 180 Computer Mock Tests (20 for each of the 9 topics). Continue?') || !user) return;
    
    setIsBulkCreating(true);
    try {
      const token = await user.getIdToken();
      const topics = [
        "Basics of Computers",
        "Computer Hardware",
        "Computer Software",
        "Operating Systems",
        "MS Office",
        "Internet and Networking",
        "Computer Abbreviations and Terminology",
        "Computer Security",
        "Computer History and Generations"
      ];

      const allTests: any[] = [];
      topics.forEach(topicName => {
        for (let i = 1; i <= 20; i++) {
          const testNum = i.toString().padStart(2, '0');
          allTests.push({
            title: `${topicName} Mock Test ${testNum}`,
            topic: topicName,
            subjectName: "Computer",
            category: "Computer",
            testType: "topic",
            duration: 15,
            isActive: true
          });
        }
      });

      // Split into chunks of 30 tests (each test adds 10 questions, total 11 docs per test)
      // Max firestore batch limit is 500. 30 * 11 = 330 docs.
      const chunkSize = 30;
      for (let i = 0; i < allTests.length; i += chunkSize) {
        const chunk = allTests.slice(i, i + chunkSize);
        const res = await fetch('/api/admin/bulk-create-tests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ tests: chunk })
        });
        if (!res.ok) throw new Error(await res.text());
        console.log(`Uploaded chunk ${Math.floor(i/chunkSize) + 1}`);
      }

      alert('Successfully created 180 Computer Mock Tests!');
    } catch (err: any) {
      console.error(err);
      alert('Error bulk creating tests: ' + err.message);
    } finally {
      setIsBulkCreating(false);
    }
  };

  useEffect(() => {
    if (editingStudent?.focusPassword && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [editingStudent]);

  if (!user || (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'bakolaypan@gmail.com')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-black text-rose-600 mb-2">Access Denied</h2>
        <p className="text-slate-500 font-bold">You do not have permission to access the admin panel.</p>
        <Link to="/dashboard" className="mt-6 text-indigo-600 font-bold px-6 py-3 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-all">
          Go to Student Dashboard
        </Link>
      </div>
    );
  }

  useEffect(() => {
    setLoading(true);
    const qTests = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
    const qNotes = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const qVideos = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const qPyqs = query(collection(db, 'pyqs'), orderBy('createdAt', 'desc'));
    const qPatterns = query(collection(db, 'patterns'), orderBy('createdAt', 'desc'));
    const qCarousels = query(collection(db, 'carousel'), orderBy('createdAt', 'desc'));
    const qStudents = query(collection(db, 'profiles'), where('role', 'in', ['user', 'student']));

    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubTests = onSnapshot(qTests, (snap) => {
      setTests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => console.error(err));

    const unsubNotes = onSnapshot(qNotes, (snap) => {
      setNotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubVideos = onSnapshot(qVideos, (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubPyqs = onSnapshot(qPyqs, (snap) => {
      setPyqs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubPatterns = onSnapshot(qPatterns, (snap) => {
      setPatterns(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubCarousels = onSnapshot(qCarousels, (snap) => {
      setCarousels(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubSocials = onSnapshot(doc(db, 'settings', 'social_links'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSocialYoutube(data.youtube || '');
        setSocialTelegram(data.telegram || '');
        setSocialWhatsapp(data.whatsapp || '');
      }
    }, (err) => console.error(err));

    const fetchStats = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setStats(await res.json());
      } catch (err) {
        console.error('Stats fetch failed:', err);
      }
    };
    fetchStats();
    const statsInterval = setInterval(fetchStats, 60000); // Update stats every minute

    return () => {
      unsubStudents();
      unsubTests();
      unsubNotes();
      unsubVideos();
      unsubPyqs();
      unsubPatterns();
      unsubCarousels();
      unsubSocials();
      clearInterval(statsInterval);
    };
  }, []);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const token = await user.getIdToken();
      const method = editingTestId ? 'PUT' : 'POST';
      const url = editingTestId ? `/api/admin/tests/${editingTestId}` : '/api/admin/create-test';
      
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title, 
          topic, 
          subjectName,
          category,
          testType,
          duration: parseInt(duration) || 30,
          isActive: true 
        })
      });
      if (res.ok) {
        setTitle('');
        setTopic('');
        setSubjectName('');
        setCategory('GK');
        setDuration('30');
        setEditingTestId(null);
        alert(editingTestId ? 'Test updated successfully!' : 'Test created successfully!');
      } else alert(await res.text());
    } catch (err) {
      console.error(err);
      alert('Error processing test');
    }
  };

  const handleEditTest = (test: any) => {
    setEditingTestId(test.id);
    setTitle(test.title || '');
    setTopic(test.topic || '');
    setSubjectName(test.subjectName || '');
    setCategory(test.category || 'GK');
    setTestType(test.testType || 'topic');
    setDuration(test.duration?.toString() || '30');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (!patternExamName || patternFiles.length === 0 || !user) {
      console.log("Validation failed:", { patternExamName, filesCount: patternFiles.length, user: !!user });
      alert("Please enter an Exam Name and select at least one file.");
      return;
    }
    
    // Admin check from email as backup
    if (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'bakolaypan@gmail.com') {
      alert("You don't have permission to perform this action.");
      return;
    }
    
    // Size limit check (20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    const oversizedFiles = patternFiles.filter(f => f.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`Some files are too large (max 20MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setUploadingPattern(true);
    console.log("Starting pattern upload for:", patternExamName);
    
    try {
      const uploadPromises = patternFiles.map(async (file) => {
        // Add random suffix to avoid collisions if multiple files are named same or uploaded same time
        const randomID = Math.random().toString(36).substring(2, 8);
        const fileName = `${Date.now()}_${randomID}_${file.name}`;
        const fileRef = ref(storage, `patterns/${fileName}`);
        
        console.log("Uploading file:", file.name, "as", fileName);
        const snapshot = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(snapshot.ref);
        console.log("File uploaded successfully:", file.name, "URL:", url);
        
        return { name: file.name, url, type: file.type };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      console.log("All files uploaded to storage, saving to Firestore...");

      await addDoc(collection(db, 'patterns'), {
        title: patternExamName,
        files: uploadedFiles,
        createdAt: serverTimestamp(),
        authorId: user.uid
      });
      
      console.log("Pattern saved to Firestore successfully.");

      setPatternExamName('');
      setPatternFiles([]);
      const fileInput = document.getElementById('pattern-files-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      alert('Exam Pattern & Syllabus added successfully!');
    } catch (err) {
      console.error("Error in handleAddPattern:", err);
      if (err instanceof Error && err.message.includes('permission-denied')) {
        alert('Permission Denied: Your account does not have admin privileges in the database.');
      } else {
        alert('Error adding Pattern. Please check your connection and try again.');
      }
    } finally {
      setUploadingPattern(false);
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
    console.log('handleAddCarousel started');
    if (!carouselFile || !user) {
      console.warn('handleAddCarousel: Missing file or user');
      return;
    }
    try {
      if (carousels.length >= 3) {
        console.warn('Carousel limit reached (3)');
        alert('You can only have up to 3 carousel pictures.');
        return;
      }
      setUploadingCarousel(true);
      console.log('Compressing image...');
      
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
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              console.log(`Image compressed. Size: ${Math.round(dataUrl.length / 1024)} KB`);
              resolve(dataUrl);
            };
            img.onerror = (err) => {
              console.error('Image load error:', err);
              reject(err);
            };
          };
          reader.onerror = (err) => {
            console.error('FileReader error:', err);
            reject(err);
          };
        });
      };

      const link = await compressImage(carouselFile);

      console.log('Attempting addDoc to carousel collection...');
      const docRef = await addDoc(collection(db, 'carousel'), {
        link: link,
        createdAt: serverTimestamp(),
        authorId: user.uid
      });
      console.log(`Carousel item added successfully with ID: ${docRef.id}`);
      setCarouselFile(null);
      // Reset input type="file" manually
      const fileInput = document.getElementById('carousel-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      console.error('Error in handleAddCarousel:', err);
      // Construct a better error message
      let msg = 'Error adding carousel picture.';
      if (err.message && err.message.includes('quota')) msg += ' Storage quota exceeded.';
      else if (err.message) msg += ' ' + err.message;
      alert(msg);
    } finally {
      setUploadingCarousel(false);
    }
  };

  const handleSaveSocials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingSocials(true);
    try {
      await setDoc(doc(db, 'settings', 'social_links'), {
        youtube: socialYoutube,
        telegram: socialTelegram,
        whatsapp: socialWhatsapp,
        updatedAt: serverTimestamp(),
        authorId: user.uid
      });
      alert('Social links updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Error updating social links. Make sure you have the correct permissions.');
    } finally {
      setSavingSocials(false);
    }
  };

  const handleDeleteContent = async (coll: string, id: string) => {
    console.log(`handleDeleteContent called for ${coll} with ID ${id}`);
    if (!confirm('Are you sure you want to delete this permanently?')) {
      console.log('Delete cancelled by user');
      return;
    }
    if (!user) {
      console.error('No authenticated user found during delete attempt');
      return;
    }
    try {
      const token = await user.getIdToken();
      console.log('Got auth token for delete request');
      
      // Map matching collection names to API paths
      const pathMap: Record<string, string> = {
        'tests': 'tests',
        'notes': 'notes',
        'videos': 'videos',
        'pyqs': 'pyqs',
        'patterns': 'patterns',
        'carousel': 'carousel'
      };
      
      const apiPath = pathMap[coll] || coll;
      const url = `/api/admin/${apiPath}/${encodeURIComponent(id)}`;
      console.log(`Sending DELETE request to: ${url}`);
      
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`Server responded with status: ${res.status}`);
      if (res.ok) {
        console.log(`${coll} delete successfully acknowledged by server`);
        alert('Deleted successfully!');
      } else {
        const bodyText = await res.text();
        let errorMsg = bodyText;
        try {
          const errJson = JSON.parse(bodyText);
          errorMsg = errJson.message || errJson.error || bodyText;
        } catch {
          // Fallback to raw text
        }
        console.error(`${coll} delete failed on server (Status ${res.status}):`, errorMsg);
        alert(`Delete failed: ${errorMsg}`);
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
          subjectName: test.subjectName,
          category: test.category,
          testType: test.testType,
          duration: test.duration || 30,
          isActive: !test.isActive 
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingStudent) return;
    setSavingStudent(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingStudent.name,
          phoneNumber: editingStudent.phoneNumber,
          status: editingStudent.status,
          password: editingStudent.newPassword // Optional
        })
      });
      if (res.ok) {
        setEditingStudent(null);
        alert('Student updated successfully!');
      } else {
        alert(await res.text());
      }
    } catch (err) {
      alert('Failed to update student');
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure? This will PERMANENTLY delete student account and auth credentials.') || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) alert('Student account deleted');
      else alert('Failed to delete student');
    } catch (err) {
      alert('Network error');
    }
  };

  const handleBlockStudent = async (student: any) => {
    const newStatus = student.status === 'blocked' ? 'active' : 'blocked';
    if (!confirm(`Are you sure you want to ${newStatus === 'blocked' ? 'BLOCK' : 'UNBLOCK'} this student?`) || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: student.name,
          phoneNumber: student.phoneNumber,
          status: newStatus
        })
      });
      if (res.ok) alert(`Student ${newStatus === 'blocked' ? 'blocked' : 'unblocked'}`);
      else alert('Failed to change student status');
    } catch (err) {
      alert('Network error');
    }
  };

  const handleExportStudents = () => {
    if (students.length === 0) return;
    const headers = ['Name', 'Mobile', 'Registration Date', 'Tests Taken', 'Score', 'Status'];
    const csvContent = students.map(s => [
      s.name,
      s.phoneNumber,
      s.registrationDate ? new Date(s.registrationDate).toLocaleDateString() : 'N/A',
      s.totalTestsTaken || 0,
      s.cumulativeScore || 0,
      s.status || 'active'
    ].join(',')).join('\n');
    
    const blob = new Blob([[headers.join(','), csvContent].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_database_${new Date().toLocaleDateString()}.csv`;
    a.click();
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
          subjectName: test.subjectName,
          category: test.category,
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
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
        >
          <UserIcon className="w-4 h-4" />
          Students
        </button>
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
          Exam Pattern & Syllabus
        </button>
        <button 
          onClick={() => setActiveTab('carousel')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'carousel' ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-100' : 'text-slate-500 hover:text-fuchsia-600 hover:bg-fuchsia-50'}`}
        >
          <Plus className="w-4 h-4" />
          Carousel
        </button>
        <button 
          onClick={() => setActiveTab('social')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
            ${activeTab === 'social' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-100' : 'text-slate-500 hover:text-cyan-600 hover:bg-cyan-50'}`}
        >
          <Plus className="w-4 h-4" />
          Social Links
        </button>
      </div>

      {activeTab === 'mock' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
            Mock Test Management
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{editingTestId ? 'Edit Mock Test' : 'Create New Mock Test'}</h3>
            <form onSubmit={handleCreateTest} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Test Title</label>
                <input 
                  type="text" 
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={title} onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. Physics Section A"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Topic Name</label>
                <input 
                  type="text" 
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={topic} onChange={e => setTopic(e.target.value)} 
                  placeholder="e.g. Mechanics"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject Name</label>
                <input 
                  type="text" 
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={subjectName} onChange={e => setSubjectName(e.target.value)} 
                  placeholder="e.g. Physics"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                <select
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={category} onChange={e => setCategory(e.target.value)}
                >
                  <option value="GK">GK</option>
                  <option value="English">English</option>
                  <option value="Math">Math</option>
                  <option value="Reasoning">Reasoning</option>
                  <option value="Computer">Computer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Test Type</label>
                <select
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
                  min="1"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-medium" 
                  value={duration} onChange={e => setDuration(e.target.value)} 
                />
              </div>
              <div className="md:col-span-4 flex gap-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-indigo-50 flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  {editingTestId ? 'Update Test' : 'Build Test'}
                </button>
                {editingTestId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingTestId(null);
                      setTitle('');
                      setTopic('');
                      setDuration('30');
                    }}
                    className="flex-1 bg-slate-100 text-slate-600 px-6 py-4 rounded-xl hover:bg-slate-200 font-bold transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {!editingTestId && (
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[40px] p-10 mb-12 text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                    <CheckCircle className="w-6 h-6 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">System Bulk Configurator</h3>
                    <p className="text-indigo-200/60 text-xs font-bold uppercase tracking-widest">Rapid Database Seeding</p>
                  </div>
                </div>
                <p className="text-slate-300 text-sm font-medium mb-8 max-w-xl leading-relaxed">
                  Automatically initialize the <span className="text-indigo-300 font-bold">"Computer" Topic Wise Mock Test</span> architecture with all 180 required tests. Each test will be pre-configured with 15-minute timing, correctly categorized subjects, and hierarchical topic mapping.
                </p>
                <button 
                  disabled={isBulkCreating}
                  onClick={handleBulkCreateComputerTests}
                  className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:bg-slate-700 disabled:text-slate-300 shadow-xl shadow-black/20"
                >
                  {isBulkCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                      Processing 180 Batches...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Initialize 180 Computer Tests
                    </>
                  )}
                </button>
              </div>
              <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
            </div>
          )}

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
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-bold text-slate-800">{test.title || 'Untitled'}</td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-medium text-slate-500">
                      <div className="flex flex-col gap-1">
                        <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-600 inline-block w-fit">{test.topic || 'No Topic'}</span>
                        {test.subjectName && <span className="text-xs text-slate-400 font-bold">{test.subjectName}</span>}
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">
                            {test.testType === 'topic' ? 'Topic Wise' : test.testType === 'sectional' ? 'Sectional' : 'Full Mock'}
                          </span>
                          {test.category && <span className="text-[10px] uppercase font-black text-emerald-500 bg-emerald-50 px-2 rounded">{test.category}</span>}
                        </div>
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
                        <button 
                          onClick={() => handleEditTest(test)}
                          className="text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all border border-amber-100 font-bold text-xs"
                          title="Edit Test Settings (Title, Time)"
                        >
                          Settings
                        </button>
                        <Link 
                          to={`/admin/test/${test.id}`} 
                          className="text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all border border-indigo-100 font-bold text-xs"
                          title="Modify Questions & Solutions"
                        >
                          Modify
                        </Link>
                        <button 
                          onClick={() => handleDeleteContent('tests', test.id)} 
                          className="text-rose-500 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-all border border-rose-100 font-bold text-xs"
                          title="Delete Test"
                        >
                          Delete
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
            <h3 className="text-lg font-bold text-slate-800 mb-6">Upload Exam Pattern & Syllabus</h3>
            <form onSubmit={handleAddPattern} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Exam Name</label>
                <input 
                  type="text" required
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={patternExamName} onChange={e => setPatternExamName(e.target.value)} 
                  placeholder="e.g. SSC CGL 2024"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Syllabus Files (PDF/Images)</label>
                <input 
                  id="pattern-files-input"
                  type="file" required multiple
                  accept="image/*,.pdf"
                  className="w-full rounded-xl border-slate-200 border-2 p-2.5 outline-hidden font-medium text-sm file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                  onChange={e => setPatternFiles(Array.from(e.target.files || []))} 
                />
              </div>
              <button 
                type="submit" 
                disabled={uploadingPattern}
                className="bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-blue-50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploadingPattern ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {uploadingPattern ? 'Uploading...' : 'Add Pattern'}
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
                <h4 className="font-bold text-slate-800 mb-4">{pattern.title}</h4>
                <div className="flex flex-wrap gap-2">
                  {pattern.files ? pattern.files.map((file: any, idx: number) => (
                    <a 
                      key={idx}
                      href={file.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 font-bold text-[10px] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors uppercase tracking-tight"
                    >
                      {file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                    </a>
                  )) : (
                    <a 
                      href={pattern.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      View Resource
                    </a>
                  )}
                </div>
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
            Carousel Management
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Upload Carousel Image</h3>
            <p className="text-sm text-slate-500 mb-6">
              You can have up to <span className="font-bold text-fuchsia-600">3 images</span> in the home carousel. 
              To <span className="font-bold text-slate-700">replace</span> an image, delete an existing one first and then add a new one.
            </p>
            
            <form onSubmit={handleAddCarousel} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Select New Image</label>
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
              <button disabled={uploadingCarousel || carousels.length >= 3} type="submit" className="bg-fuchsia-600 disabled:opacity-50 disabled:bg-slate-300 text-white px-6 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-fuchsia-50 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                {uploadingCarousel ? 'Uploading...' : 'Add Image'}
              </button>
            </form>
            {carousels.length >= 3 && (
              <p className="mt-4 text-xs text-rose-500 font-bold bg-rose-50 p-3 rounded-lg border border-rose-100 flex items-center gap-2">
                <X className="w-4 h-4" />
                Limit reached! Delete one image below to add a new one.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {carousels.map((carousel, index) => (
              <div key={carousel.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Image {index + 1}</span>
                  <button 
                    onClick={() => handleDeleteContent('carousel', carousel.id)} 
                    className="text-white bg-rose-500 hover:bg-rose-600 p-2 rounded-lg shadow-sm flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    DELETE
                  </button>
                </div>
                <div className="w-full h-40 bg-slate-100 rounded-2xl mb-4 overflow-hidden relative">
                   <img src={carousel.link} alt="Carousel slide" className="w-full h-full object-cover" />
                </div>
                <a 
                  href={carousel.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center text-fuchsia-600 font-bold text-sm bg-fuchsia-50 px-4 py-2 rounded-xl hover:bg-fuchsia-100 transition-colors mt-auto w-fit"
                >
                  View Large
                </a>
              </div>
            ))}
            {carousels.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 font-bold">No carousel images uploaded yet.</div>}
          </div>
        </div>
      )}

      {activeTab === 'social' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-cyan-600 rounded-full"></span>
            Social Links Management
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Update Links</h3>
            <form onSubmit={handleSaveSocials} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">YouTube Channel URL</label>
                <input 
                  type="url"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={socialYoutube} onChange={e => setSocialYoutube(e.target.value)} 
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Telegram Channel URL</label>
                <input 
                  type="url"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={socialTelegram} onChange={e => setSocialTelegram(e.target.value)} 
                  placeholder="https://t.me/..."
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp Group URL</label>
                <input 
                  type="url"
                  className="w-full rounded-xl border-slate-200 border-2 p-3 outline-hidden font-medium" 
                  value={socialWhatsapp} onChange={e => setSocialWhatsapp(e.target.value)} 
                  placeholder="https://chat.whatsapp.com/..."
                />
              </div>
              <button disabled={savingSocials} type="submit" className="w-full md:w-auto bg-cyan-600 disabled:opacity-50 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-cyan-50 flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {savingSocials ? 'Saving...' : 'Save Links'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Students</span>
              <span className="text-3xl font-black text-slate-900">{stats.total}</span>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Active Now</span>
              <span className="text-3xl font-black text-emerald-700">{stats.active}</span>
            </div>
            <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 shadow-sm">
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-1">Blocked Accounts</span>
              <span className="text-3xl font-black text-rose-700">{stats.blocked}</span>
            </div>
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 shadow-sm">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">Today's Reg.</span>
              <span className="text-3xl font-black text-indigo-700">{stats.today}</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
              Student Database
            </h2>
            <div className="flex flex-wrap gap-4 items-center">
              <select 
                value={studentFilter}
                onChange={e => setStudentFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-600 outline-hidden font-bold text-sm bg-white"
              >
                <option value="all">All Students</option>
                <option value="active">Active Only</option>
                <option value="blocked">Blocked Only</option>
              </select>
              
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Search name or ID..."
                  className="pl-11 pr-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-600 outline-hidden w-full md:w-64 font-medium text-sm"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                />
              </div>

              <button 
                onClick={handleExportStudents}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Mobile Number</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Registration Date</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Last Login</th>
                  <th className="px-8 py-5 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {students
                  .filter(s => {
                    const matchesSearch = (s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) || 
                                        (s.phoneNumber || '').includes(studentSearch) ||
                                        (s.id || '').includes(studentSearch);
                    const matchesFilter = studentFilter === 'all' ? true : 
                                       studentFilter === 'blocked' ? s.status === 'blocked' : 
                                       s.status !== 'blocked';
                    return matchesSearch && matchesFilter;
                  })
                  .map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 ${student.status === 'blocked' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600'} rounded-full flex items-center justify-center font-black mr-4 uppercase`}>
                          {(student.name || 'S').charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-slate-800">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-600">{student.phoneNumber}</span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="text-sm text-slate-500 font-medium">
                        {student.registrationDate ? new Date(student.registrationDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase w-fit tracking-widest ${student.status === 'blocked' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {student.status === 'blocked' ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="text-sm text-slate-500 font-medium">
                        {student.lastTestAt ? new Date(student.lastTestAt).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingStudent({ ...student, focusPassword: false, newPassword: '' })}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                          title="Edit Name/Mobile"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingStudent({ ...student, focusPassword: true, newPassword: '' })}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleBlockStudent(student)}
                          className={`p-2 rounded-xl transition-all ${student.status === 'blocked' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'}`}
                          title={student.status === 'blocked' ? 'Unblock Student' : 'Block Student'}
                        >
                          {student.status === 'blocked' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleDeleteStudent(student.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete Student Forever"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-black text-xl uppercase tracking-widest italic">Database Empty</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 relative animate-in zoom-in duration-300">
            <button onClick={() => setEditingStudent(null)} className="absolute top-8 right-8 p-3 hover:bg-slate-100 rounded-2xl transition-all">
              <X className="w-5 h-5 text-slate-400" />
            </button>
            
            <h3 className="text-2xl font-black text-slate-800 mb-2">
              {editingStudent.focusPassword ? 'Reset Account Password' : 'Edit Student Profile'}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">System ID: {editingStudent.id}</p>
            
            <form onSubmit={handleUpdateStudent} className="space-y-6">
              <div className={editingStudent.focusPassword ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  type="text" required
                  className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-medium focus:border-indigo-600"
                  value={editingStudent.name}
                  onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                />
              </div>
              <div className={editingStudent.focusPassword ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mobile Number</label>
                <input 
                  type="tel" required
                  className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-medium focus:border-indigo-600"
                  value={editingStudent.phoneNumber}
                  onChange={e => setEditingStudent({...editingStudent, phoneNumber: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className={editingStudent.focusPassword ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Account Status</label>
                  <select 
                    className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-bold focus:border-indigo-600"
                    value={editingStudent.status || 'active'}
                    onChange={e => setEditingStudent({...editingStudent, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">
                    {editingStudent.focusPassword ? 'Set New Password' : 'New Password (Optional)'}
                  </label>
                  <input 
                    ref={passwordInputRef}
                    type="password"
                    placeholder="••••••••"
                    className={`w-full rounded-2xl border-2 p-4 outline-hidden font-medium focus:border-indigo-600 ${editingStudent.focusPassword ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200'}`}
                    value={editingStudent.newPassword}
                    onChange={e => setEditingStudent({...editingStudent, newPassword: e.target.value})}
                  />
                </div>
              </div>
              
              <button 
                disabled={savingStudent}
                type="submit" 
                className="w-full bg-indigo-600 py-5 text-white font-black text-sm uppercase tracking-[0.2em] rounded-3xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 disabled:bg-slate-300"
              >
                {savingStudent ? 'Saving Changes...' : editingStudent.focusPassword ? 'Update Password' : 'Update Records'}
              </button>
            </form>
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
  const { user, profile } = useAuth();
  
  if (!user || (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'bakolaypan@gmail.com')) {
    return null;
  }

  // Form states
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState('');
  const [qTopic, setQTopic] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState('');
  const [qSolution, setQSolution] = useState('');

  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    const q = query(collection(db, 'questions'), where('testId', '==', testId));
    const unsub = onSnapshot(q, (snap) => {
      let qs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      qs.sort((a, b) => (a.qNo || 0) - (b.qNo || 0));
      setQuestions(qs);
      setLoading(false);
    }, (err) => console.error(err));
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
      const method = editingQuestionId ? 'PUT' : 'POST';
      const url = editingQuestionId ? `/api/admin/questions/${editingQuestionId}` : '/api/admin/questions';
      
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          testId, 
          topic: qTopic, 
          qNo: editingQuestionId ? undefined : questions.length + 1, 
          questionText: qText, 
          options: qOptions, 
          correctAnswer: qCorrect,
          solution: qSolution
        })
      });
      if (res.ok) {
        setQText(''); setQTopic(''); setQOptions(['', '', '', '']); setQCorrect(''); setQSolution('');
        setEditingQuestionId(null);
        alert(editingQuestionId ? 'Question updated!' : 'Question added!');
      } else alert(await res.text());
    } catch (error) {
      console.error(error);
      alert('Failed to process question');
    }
  };

  const handleEditQuestion = (q: any) => {
    setEditingQuestionId(q.id);
    setQText(q.questionText);
    setQTopic(q.topic || '');
    setQOptions([...q.options]);
    setQCorrect(q.correctAnswer);
    setQSolution(q.solution || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        const bodyText = await res.text();
        let errorMsg = bodyText;
        try {
          const errJson = JSON.parse(bodyText);
          errorMsg = errJson.message || errJson.error || bodyText;
        } catch {
          // Fallback to raw text
        }
        console.error('Question delete failed:', errorMsg);
        alert(`Failed to delete question: ${errorMsg}`);
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
         <h3 className="text-lg font-bold text-slate-800 mb-6">{editingQuestionId ? 'Edit Question' : 'Add New Question'}</h3>
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

           <div>
             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Solution / More Details</label>
             <textarea 
               className="w-full rounded-2xl border-slate-200 border-2 p-4 outline-hidden font-medium"
               rows={3} value={qSolution} onChange={e => setQSolution(e.target.value)}
               placeholder="Explain the logic or provide the step-by-step solution..."
             />
           </div>

           <div className="flex justify-end gap-4 pt-4">
             {editingQuestionId && (
               <button 
                 type="button" 
                 onClick={() => {
                   setEditingQuestionId(null);
                   setQText(''); setQTopic(''); setQOptions(['', '', '', '']); setQCorrect(''); setQSolution('');
                 }}
                 className="bg-slate-100 text-slate-600 px-8 py-4 rounded-xl hover:bg-slate-200 font-bold transition-all"
               >
                 Cancel
               </button>
             )}
             <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-slate-900 font-bold transition-all shadow-lg shadow-indigo-50 flex items-center gap-2">
               <Plus className="w-5 h-5" /> {editingQuestionId ? 'Update Question' : 'Add Question to Test'}
             </button>
           </div>
         </form>
      </div>

       <div className="space-y-4">
        {loading ? <p className="text-slate-400 font-bold text-center py-10">Fetching questions...</p> : 
         questions.map((q, i) => (
           <div key={q.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 relative group transition-all hover:shadow-md">
             <div className="absolute top-6 right-6 flex gap-2">
               <button 
                 onClick={() => handleEditQuestion(q)} 
                 className="text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all border border-indigo-100 font-bold text-xs"
                 title="Edit Question"
               >
                 Edit
               </button>
               <button 
                 onClick={() => handleDeleteQuestion(q.id)} 
                 className="text-rose-500 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-all border border-rose-100 font-bold text-xs"
                 title="Delete Question"
               >
                 Delete
               </button>
             </div>
             <div className="flex items-start mb-6">
                <span className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black mr-4 shrink-0">
                  {i+1}
                </span>
                <h4 className="font-bold text-slate-800 text-lg pr-20 leading-tight">{q.questionText}</h4>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
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
             {q.solution && (
                <div className="mt-4 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Solution / Explanation</p>
                  <p className="text-sm text-slate-600">{q.solution}</p>
                </div>
              )}
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

