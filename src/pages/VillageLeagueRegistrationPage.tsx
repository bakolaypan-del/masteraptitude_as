import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trophy, Download, Camera, CheckCircle2, Search, RefreshCw, AlertCircle, Phone, MapPin, User, ChevronRight, Calendar, FileCheck, Shield, Eye, X, CreditCard, QrCode, CheckCircle, Info, ExternalLink, Zap } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PublicTeamRecord {
  id: string;
  teamName: string;
  ownerName: string;
  coOwnerName?: string;
  address: string;
  teamLogoUrl?: string;
  createdAt?: any;
}

export interface PublicPlayerRecord {
  id: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  playerCategory?: string;
  photoUrl?: string;
  aadharBackUrl?: string;
  paymentStatus?: 'pending' | 'verified';
  utrNumber?: string;
  paymentScreenshotUrl?: string;
  createdAt?: any;
}

export default function VillageLeagueRegistrationPage() {
  const [teams, setTeams] = useState<PublicTeamRecord[]>([]);
  const [players, setPlayers] = useState<PublicPlayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePortion, setActivePortion] = useState<'teams' | 'players' | 'register'>('register');
  const [registerMode, setRegisterMode] = useState<'team' | 'player'>('team');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);

  // Form 1: Team Registration State
  const [teamName, setTeamName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [coOwnerName, setCoOwnerName] = useState('');
  const [teamAddress, setTeamAddress] = useState('');
  const [teamLogoBase64, setTeamLogoBase64] = useState('');
  const [teamLogoPreview, setTeamLogoPreview] = useState('');

  // Form 2: Player Registration State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [playerAddress, setPlayerAddress] = useState('');
  const [playerCategory, setPlayerCategory] = useState('Right Hand Batsman');
  const [playerPhotoBase64, setPlayerPhotoBase64] = useState('');
  const [playerPhotoPreview, setPlayerPhotoPreview] = useState('');
  const [aadharBackBase64, setAadharBackBase64] = useState('');
  const [aadharBackPreview, setAadharBackPreview] = useState('');

  // Payment Verification State
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentScreenshotBase64, setPaymentScreenshotBase64] = useState('');
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Profile Modal State
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<PublicPlayerRecord | null>(null);

  // Search filters
  const [searchTeamsQuery, setSearchTeamsQuery] = useState('');
  const [searchPlayersQuery, setSearchPlayersQuery] = useState('');

  // UPI Deep Link Details
  const upiId = 'pintusantra4166@nyes';
  const payeeName = 'Pintu Santra';
  const paymentAmount = 200;
  const upiDeepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${paymentAmount}&cu=INR&tn=${encodeURIComponent('Jhankra Super League Player Registration Fee')}`;

  const getLocalTeams = (): PublicTeamRecord[] => {
    try {
      const data = localStorage.getItem('jsl_local_teams');
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  };

  const getLocalPlayers = (): PublicPlayerRecord[] => {
    try {
      const data = localStorage.getItem('jsl_local_players');
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  };

  useEffect(() => {
    setTeams(getLocalTeams());
    setPlayers(getLocalPlayers());

    const unsubSettings = onSnapshot(doc(db, 'settings', 'village_league'), (docSnap) => {
      if (docSnap.exists()) {
        setIsRegistrationOpen(docSnap.data().isOpen !== false);
      }
    });

    const qTeams = query(collection(db, 'village_league_teams'), orderBy('createdAt', 'asc'));
    const unsubTeams = onSnapshot(qTeams, (snap) => {
      const remoteTeams = snap.docs.map(d => ({ id: d.id, ...d.data() } as PublicTeamRecord));
      const localTeams = getLocalTeams();
      const combined = [...remoteTeams];
      localTeams.forEach(lt => {
        if (!combined.some(rt => rt.id === lt.id || (rt.teamName || '').toLowerCase() === (lt.teamName || '').toLowerCase())) {
          combined.push(lt);
        }
      });
      setTeams(combined);
    }, (err) => console.error('Firestore teams error:', err));

    const qPlayers = query(collection(db, 'village_league_players'), orderBy('createdAt', 'asc'));
    const unsubPlayers = onSnapshot(qPlayers, (snap) => {
      const remotePlayers = snap.docs.map(d => ({ id: d.id, ...d.data() } as PublicPlayerRecord));
      const localPlayers = getLocalPlayers();
      const combined = [...remotePlayers];
      localPlayers.forEach(lp => {
        if (!combined.some(rp => rp.id === lp.id || (rp.fullName || '').toLowerCase() === (lp.fullName || '').toLowerCase())) {
          combined.push(lp);
        }
      });
      setPlayers(combined);
      setLoading(false);
    }, (err) => {
      console.error('Firestore players error:', err);
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubTeams();
      unsubPlayers();
    };
  }, []);

  const compressAndCropFaceImage = (file: File, callback: (base64: string) => void) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const SQUARE_SIZE = 400;
        canvas.width = SQUARE_SIZE;
        canvas.height = SQUARE_SIZE;
        const ctx = canvas.getContext('2d');

        let sx = 0;
        let sy = 0;
        let cropSize = Math.min(img.width, img.height);

        if (img.height > img.width) {
          sx = 0;
          sy = Math.max(0, (img.height - cropSize) * 0.2);
        } else {
          sx = (img.width - cropSize) / 2;
          sy = 0;
        }

        ctx?.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, SQUARE_SIZE, SQUARE_SIZE);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        callback(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) { alert('Please enter Team Name.'); return; }
    if (!ownerName.trim()) { alert('Please enter Owner Name.'); return; }
    if (!teamAddress.trim()) { alert('Please enter Address.'); return; }

    if (!teamLogoBase64) {
      alert('⚠️ Team Logo is mandatory! Please upload your Team Logo to proceed with registration.');
      return;
    }

    setSubmitting(true);
    setSubmitSuccess(false);

    const newTeamRecord: PublicTeamRecord = {
      id: `local_team_${Date.now()}`,
      teamName: teamName.trim(),
      ownerName: ownerName.trim(),
      coOwnerName: coOwnerName.trim() || '',
      address: teamAddress.trim(),
      teamLogoUrl: teamLogoBase64,
      createdAt: new Date().toISOString()
    };

    const currentLocals = getLocalTeams();
    currentLocals.push(newTeamRecord);
    try { localStorage.setItem('jsl_local_teams', JSON.stringify(currentLocals)); } catch {}

    setTeams(prev => [...prev, newTeamRecord]);

    try {
      await addDoc(collection(db, 'village_league_teams'), {
        teamName: teamName.trim(),
        ownerName: ownerName.trim(),
        coOwnerName: coOwnerName.trim() || '',
        address: teamAddress.trim(),
        teamLogoUrl: teamLogoBase64,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Firestore team upload note:', err);
    }

    setSuccessMessage(`Team "${teamName}" registered successfully!`);
    setSubmitSuccess(true);
    setSubmitting(false);

    setTeamName('');
    setOwnerName('');
    setCoOwnerName('');
    setTeamAddress('');
    setTeamLogoBase64('');
    setTeamLogoPreview('');

    setTimeout(() => {
      setSubmitSuccess(false);
      setActivePortion('teams');
    }, 1500);
  };

  const handleSubmitPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { alert('Please enter Full Name.'); return; }
    if (!phoneNumber.trim() || phoneNumber.length < 10) { alert('Please enter a valid 10-digit Phone Number.'); return; }
    if (!playerAddress.trim()) { alert('Please enter Address.'); return; }

    if (!playerPhotoBase64) {
      alert('⚠️ Player Photo is mandatory! Please upload your photo to proceed.');
      return;
    }

    if (!aadharBackBase64) {
      alert('⚠️ Aadhaar Card (Back Side) is mandatory! Please upload your Aadhaar Back image.');
      return;
    }

    // MANDATORY ₹200 PAYMENT CHECK
    if (!utrNumber.trim() || utrNumber.length < 6) {
      alert('⚠️ Please enter a valid UPI Transaction / UTR ID for your ₹200 payment.');
      return;
    }

    if (!paymentScreenshotBase64) {
      alert('⚠️ Payment Screenshot is mandatory! Please upload your ₹200 Payment Screenshot.');
      return;
    }

    setSubmitting(true);
    setSubmitSuccess(false);

    const newPlayerRecord: PublicPlayerRecord = {
      id: `local_player_${Date.now()}`,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      address: playerAddress.trim(),
      playerCategory: playerCategory,
      photoUrl: playerPhotoBase64,
      aadharBackUrl: aadharBackBase64,
      paymentStatus: 'pending', // Starts RED 🔴 until Admin verifies & accepts
      utrNumber: utrNumber.trim(),
      paymentScreenshotUrl: paymentScreenshotBase64,
      createdAt: new Date().toISOString()
    };

    const currentLocals = getLocalPlayers();
    currentLocals.push(newPlayerRecord);
    try { localStorage.setItem('jsl_local_players', JSON.stringify(currentLocals)); } catch {}

    setPlayers(prev => [...prev, newPlayerRecord]);

    try {
      await addDoc(collection(db, 'village_league_players'), {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: playerAddress.trim(),
        playerCategory: playerCategory,
        photoUrl: playerPhotoBase64,
        aadharBackUrl: aadharBackBase64,
        paymentStatus: 'pending',
        utrNumber: utrNumber.trim(),
        paymentScreenshotUrl: paymentScreenshotBase64,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Firestore player upload note:', err);
    }

    setSuccessMessage(`Player "${fullName}" registered! Status: Pending Admin Verification 🔴`);
    setSubmitSuccess(true);
    setSubmitting(false);

    setFullName('');
    setPhoneNumber('');
    setPlayerAddress('');
    setPlayerPhotoBase64('');
    setPlayerPhotoPreview('');
    setAadharBackBase64('');
    setAadharBackPreview('');
    setUtrNumber('');
    setPaymentScreenshotBase64('');
    setPaymentScreenshotPreview('');

    setTimeout(() => {
      setSubmitSuccess(false);
      setActivePortion('players');
    }, 1500);
  };

  const handleDownloadTeamsPDF = () => {
    if (teams.length === 0) { alert('No teams registered yet to download.'); return; }
    try {
      const docPdf = new jsPDF();
      docPdf.setFillColor(225, 29, 72);
      docPdf.rect(0, 0, 210, 28, 'F');
      docPdf.setTextColor(255, 255, 255);
      docPdf.setFontSize(16);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text('JHANKRA SUPER LEAGUE - REGISTERED TEAMS LIST', 14, 15);
      docPdf.setFontSize(9);
      docPdf.setFont('helvetica', 'normal');
      docPdf.text(`Total Registered Teams: ${teams.length} | Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);

      const rows = filteredTeams.map((t, i) => [i + 1, t.teamName || '-', t.ownerName || '-', t.coOwnerName || '-', t.address || '-']);
      
      autoTable(docPdf, {
        startY: 32,
        head: [['Sl No', 'Team Name', 'Owner Name', 'Co-Owner', 'Address']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3 }
      });
      
      docPdf.save(`Jhankra_Super_League_Teams_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Teams PDF download error:', err);
      alert('Failed to generate Teams PDF.');
    }
  };

  const handleDownloadPlayersPDF = () => {
    if (players.length === 0) { alert('No players registered yet to download.'); return; }
    try {
      const docPdf = new jsPDF();
      docPdf.setFillColor(15, 23, 42);
      docPdf.rect(0, 0, 210, 28, 'F');
      docPdf.setTextColor(255, 255, 255);
      docPdf.setFontSize(16);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text('JHANKRA SUPER LEAGUE - REGISTERED PLAYERS LIST', 14, 15);
      docPdf.setFontSize(9);
      docPdf.setFont('helvetica', 'normal');
      docPdf.text(`Total Registered Players: ${players.length} | Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);

      const rows = filteredPlayers.map((p, i) => [
        i + 1,
        p.fullName || '-',
        p.playerCategory || 'General',
        p.phoneNumber || '-',
        p.paymentStatus === 'verified' ? 'VERIFIED (🟢)' : 'PENDING (🔴)',
        p.address || '-'
      ]);

      autoTable(docPdf, {
        startY: 32,
        head: [['Sl No', 'Player Name', 'Category', 'Phone Number', 'Verification Status', 'Address']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3 }
      });

      docPdf.save(`Jhankra_Super_League_Players_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Players PDF download error:', err);
      alert('Failed to generate Players PDF.');
    }
  };

  const filteredTeams = teams.filter(t => {
    const q = searchTeamsQuery.toLowerCase();
    return (t.teamName || '').toLowerCase().includes(q) ||
           (t.ownerName || '').toLowerCase().includes(q) ||
           (t.address || '').toLowerCase().includes(q);
  });

  const filteredPlayers = players.filter(p => {
    const q = searchPlayersQuery.toLowerCase();
    return (p.fullName || '').toLowerCase().includes(q) ||
           (p.playerCategory || '').toLowerCase().includes(q) ||
           (p.phoneNumber || '').includes(q) ||
           (p.address || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 selection:bg-red-600 selection:text-white">
      {/* ── TOP HERO HEADER BANNER (PREMIUM DARK MODE) ───────────────────── */}
      <header className="relative bg-gradient-to-b from-red-950 via-slate-950 to-slate-950 border-b border-red-900/40 pt-6 pb-8 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="bg-gradient-to-r from-slate-900 via-red-950 to-slate-900 border-2 border-red-500/40 rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[11px] font-black uppercase tracking-widest">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              OFFICIAL LEAGUE TOURNAMENT 2026
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-white uppercase italic drop-shadow-md">
                <span className="text-red-500">JHANKRA</span> SUPER LEAGUE
              </h1>
              <p className="text-xs sm:text-base font-black text-amber-400 tracking-wider uppercase mt-1">
                ⚡ 8 TEAM LEAGUE CRICKET TOURNAMENT
              </p>
            </div>

            {/* Compact Prize Badges */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto">
              <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-2.5 sm:p-3 text-center">
                <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">🏆 WINNER</p>
                <h3 className="text-lg sm:text-2xl font-black text-white">35K <span className="text-[10px] text-amber-400">Rs</span></h3>
              </div>

              <div className="bg-slate-950/90 border border-blue-500/40 rounded-2xl p-2.5 sm:p-3 text-center">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">🥈 RUNNERS</p>
                <h3 className="text-lg sm:text-2xl font-black text-white">25K <span className="text-[10px] text-blue-400">Rs</span></h3>
              </div>

              <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-2.5 sm:p-3 text-center">
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">REGISTRATION FEE</p>
                <h3 className="text-lg sm:text-2xl font-black text-white">200 <span className="text-[10px] text-emerald-400">Rs</span></h3>
              </div>
            </div>

            {/* Rules Bar */}
            <div className="bg-red-950/70 border border-red-500/30 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-slate-200">
              <p className="text-red-200 font-black text-center sm:text-left">
                ⚠️ RULES: ONLY CHANDRAKONA TOWN PS PLAYERS ALLOWED.
              </p>
              <div className="flex items-center gap-3 font-black text-[11px]">
                <span className="text-amber-300 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> 29-31 AUG 2026</span>
                <span className="text-slate-200 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-red-400" /> JHANKRA GROUND</span>
              </div>
            </div>

            <div className="text-center text-xs font-black uppercase tracking-widest text-slate-300 pt-1">
              ENTRY CONTACT &amp; UPI PAYMENT: <span className="text-emerald-400 text-sm font-black ml-1">📞 PINTU SANTRA - 89722144166</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── 3 MAIN PORTION CARDS ────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Portion 1: Total Team Registered */}
          <button
            type="button"
            onClick={() => setActivePortion('teams')}
            className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              activePortion === 'teams'
                ? 'bg-gradient-to-br from-indigo-900/90 to-slate-900 border-indigo-500 shadow-xl ring-2 ring-indigo-500/50'
                : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-lg">
                🛡️
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full">
                Option 1
              </span>
            </div>

            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Total Teams Registered</p>
            <h3 className="text-2xl font-black text-white mt-0.5">
              {teams.length} <span className="text-xs font-bold text-slate-400">/ 8 Teams</span>
            </h3>
            <p className="text-xs text-indigo-400 font-semibold mt-2 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              View Teams &amp; Download PDF <ChevronRight className="w-3.5 h-3.5" />
            </p>
          </button>

          {/* Portion 2: How Many Players Registered */}
          <button
            type="button"
            onClick={() => setActivePortion('players')}
            className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              activePortion === 'players'
                ? 'bg-gradient-to-br from-emerald-900/90 to-slate-900 border-emerald-500 shadow-xl ring-2 ring-emerald-500/50'
                : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-lg">
                🏏
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                Option 2
              </span>
            </div>

            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Total Players Registered</p>
            <h3 className="text-2xl font-black text-white mt-0.5">
              {players.length} <span className="text-xs font-bold text-slate-400">Players</span>
            </h3>
            <p className="text-xs text-emerald-400 font-semibold mt-2 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              View Players &amp; Download PDF <ChevronRight className="w-3.5 h-3.5" />
            </p>
          </button>

          {/* Portion 3: Registration Option */}
          <button
            type="button"
            onClick={() => setActivePortion('register')}
            className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              activePortion === 'register'
                ? 'bg-gradient-to-br from-red-900/90 to-slate-900 border-red-500 shadow-xl ring-2 ring-red-500/50'
                : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center font-black text-lg">
                📝
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-red-500/20 text-red-300 rounded-full">
                Option 3
              </span>
            </div>

            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Tournament Registration</p>
            <h3 className="text-lg font-black text-white mt-0.5">
              Register Team / Player
            </h3>
            <p className="text-xs text-red-400 font-semibold mt-2 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Fill Form &amp; Submit <ChevronRight className="w-3.5 h-3.5" />
            </p>
          </button>
        </div>

        {/* ─── OPTION 1 CONTENT: REGISTERED TEAMS ──────────────────────────── */}
        {activePortion === 'teams' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🛡️ Registered Teams List</span>
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded-full font-bold border border-indigo-500/30">
                    {teams.length} Teams
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Official directory of teams registered for Jhankra Super League.</p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTeamsPDF}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Teams List (PDF)
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search registered team name, owner..."
                value={searchTeamsQuery}
                onChange={(e) => setSearchTeamsQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {filteredTeams.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/50 rounded-2xl border border-slate-800">
                <p className="text-slate-400 font-bold text-xs">No registered teams found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredTeams.map((team, idx) => (
                  <div key={team.id} className="bg-slate-950 border border-slate-800/90 rounded-2xl p-3 space-y-2.5 relative flex flex-col items-center text-center hover:border-indigo-500/50 transition-all">
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900 border border-slate-700 text-indigo-400 font-black text-[10px] rounded-md shadow-md z-10">
                      Sl No: #{idx + 1}
                    </span>

                    <div className="w-full aspect-square rounded-xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-md flex items-center justify-center">
                      {team.teamLogoUrl ? (
                        <img
                          src={team.teamLogoUrl}
                          alt={team.teamName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-indigo-400 font-black text-3xl bg-indigo-500/20">
                          🛡️
                        </div>
                      )}
                    </div>

                    <div className="w-full space-y-0.5">
                      <h4 className="text-sm font-black text-white truncate">{team.teamName}</h4>
                      <p className="text-xs text-amber-400 font-bold truncate">Owner: {team.ownerName}</p>
                      {team.coOwnerName && <p className="text-[10px] text-slate-400 font-semibold truncate">Co-Owner: {team.coOwnerName}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── OPTION 2 CONTENT: REGISTERED PLAYERS (🔴 RED vs 🟢 GREEN STATUS INDICATOR) ─── */}
        {activePortion === 'players' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🏏 Registered Players List</span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-full font-bold border border-emerald-500/30">
                    {players.length} Players
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  🔴 Red Circle = Payment Pending Admin Verification | 🟢 Green Circle = Accepted &amp; Verified
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadPlayersPDF}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Players List (PDF)
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search registered player name, category, phone..."
                value={searchPlayersQuery}
                onChange={(e) => setSearchPlayersQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 font-bold">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                Loading registered players...
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/50 rounded-2xl border border-slate-800">
                <p className="text-slate-400 font-bold text-xs">No registered players found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredPlayers.map((player, idx) => {
                  const isVerified = player.paymentStatus === 'verified';
                  return (
                    <div key={player.id} className={`bg-slate-950 border rounded-2xl p-3 space-y-3 relative flex flex-col items-center text-center transition-all ${isVerified ? 'border-emerald-500/60 shadow-lg shadow-emerald-950/20' : 'border-rose-900/60 shadow-lg shadow-rose-950/20'}`}>
                      
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/90 border border-slate-700 text-emerald-400 font-black text-[10px] rounded-md z-10 shadow-md">
                        Sl No: #{idx + 1}
                      </span>

                      <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full font-black text-[10px] flex items-center gap-1 z-10 border shadow-md ${
                        isVerified
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                          : 'bg-rose-950 text-rose-300 border-rose-500/50'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isVerified ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
                        {isVerified ? '🟢 Verified' : '🔴 Pending'}
                      </span>

                      <div className="w-full aspect-square rounded-xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-md">
                        {player.photoUrl ? (
                          <img
                            src={player.photoUrl}
                            alt={player.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-emerald-400 font-black text-3xl bg-slate-900">
                            {player.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="w-full">
                        <h4 className="text-sm font-black text-white truncate">{player.fullName}</h4>
                        <p className="text-[10px] text-amber-300 font-bold truncate">{player.playerCategory || 'Player'}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedPlayerForModal(player)}
                        className={`w-full py-2 border rounded-xl text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-auto ${
                          isVerified
                            ? 'bg-slate-900 hover:bg-emerald-600 text-slate-200 hover:text-white border-emerald-500/40'
                            : 'bg-slate-900 hover:bg-rose-600 text-slate-300 hover:text-white border-slate-800'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        See Profile
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── OPTION 3 CONTENT: EXCLUSIVE REGISTRATION FORM ──────────────── */}
        {activePortion === 'register' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>📝 Jhankra Super League Registration</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Select option below to register Team or Player.</p>
              </div>

              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setRegisterMode('team')}
                  className={`px-5 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    registerMode === 'team'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🛡️ Team Register
                </button>

                <button
                  type="button"
                  onClick={() => setRegisterMode('player')}
                  className={`px-5 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    registerMode === 'player'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🏏 Player Register
                </button>
              </div>
            </div>

            {!isRegistrationOpen ? (
              <div className="p-6 bg-rose-950/40 border border-rose-800/50 rounded-2xl text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <h4 className="text-base font-black text-rose-200">Registration Currently Closed</h4>
                <p className="text-xs text-rose-300/80">Registration is closed by the admin.</p>
              </div>
            ) : submitSuccess ? (
              <div className="p-8 bg-emerald-950/60 border border-emerald-500/50 rounded-3xl text-center space-y-4 animate-in zoom-in-95">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-2xl font-black text-white">{successMessage} 🎉</h3>
                <p className="text-xs text-emerald-200 font-medium">
                  Your registration has been submitted successfully! Status will turn Green 🟢 once Admin verifies your ₹200 payment.
                </p>
              </div>
            ) : registerMode === 'team' ? (
              /* FORM A: TEAM REGISTRATION (MANDATORY LOGO UPLOAD) */
              <form onSubmit={handleSubmitTeam} className="space-y-5">
                <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs font-bold text-red-300">
                  🛡️ Team Registration (Name of Team, Owner, Co-Owner, Address &amp; Mandatory Team Logo)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Name of the Team *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jhankra Strikers"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Owner Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Owner Full Name"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Co-Owner Name (If Any)
                    </label>
                    <input
                      type="text"
                      placeholder="Co-Owner Full Name"
                      value={coOwnerName}
                      onChange={(e) => setCoOwnerName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Address / Locality"
                      value={teamAddress}
                      onChange={(e) => setTeamAddress(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-amber-400">
                      Upload Team Logo * (Mandatory)
                    </label>
                    <div className="flex items-center gap-4 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                      {teamLogoPreview ? (
                        <img src={teamLogoPreview} alt="Logo" className="w-14 h-14 rounded-xl object-cover border-2 border-red-500 shrink-0 shadow-md" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                          <Shield className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="team-logo-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) compressAndCropFaceImage(file, (b64) => { setTeamLogoBase64(b64); setTeamLogoPreview(b64); });
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="team-logo-upload"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all border border-slate-700"
                      >
                        <Camera className="w-3.5 h-3.5 inline mr-1 text-red-400" />
                        {teamLogoPreview ? 'Change Logo' : 'Upload Team Logo *'}
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Submit Team Registration
                </button>
              </form>
            ) : (
              /* FORM B: PLAYER REGISTRATION (WITH UPLOADED QR CODE & DIRECT PAY NOW BUTTON) */
              <form onSubmit={handleSubmitPlayer} className="space-y-6">
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300">
                  🏏 Player Registration (Full Name, Phone, Address, Player Category, Photo, Aadhaar &amp; ₹200 Direct Payment)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Player Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit Phone Number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Player Category *
                    </label>
                    <select
                      required
                      value={playerCategory}
                      onChange={(e) => setPlayerCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-extrabold text-amber-400 outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value="Right Hand Batsman">🏏 Right Hand Batsman</option>
                      <option value="Left Hand Batsman">🏏 Left Hand Batsman</option>
                      <option value="All Rounder">🔥 All Rounder</option>
                      <option value="Wicketkeeper">🧤 Wicketkeeper</option>
                      <option value="Left Hand Bowler Only">⚡ Left Hand Bowler Only</option>
                      <option value="Right Hand Bowler Only">⚡ Right Hand Bowler Only</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Address / Locality (Chandrakona Town PS)"
                      value={playerAddress}
                      onChange={(e) => setPlayerAddress(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Upload Photo */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-amber-400">
                      Upload Photo * (Mandatory)
                    </label>
                    <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      {playerPhotoPreview ? (
                        <img src={playerPhotoPreview} alt="Photo" className="w-12 h-12 rounded-xl object-cover border-2 border-red-500 shrink-0 shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-slate-600" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="player-photo-input-2"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) compressAndCropFaceImage(file, (b64) => { setPlayerPhotoBase64(b64); setPlayerPhotoPreview(b64); });
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="player-photo-input-2"
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer border border-slate-700 transition-all"
                      >
                        <Camera className="w-3.5 h-3.5 inline mr-1 text-red-400" />
                        {playerPhotoPreview ? 'Change' : 'Upload Photo *'}
                      </label>
                    </div>
                  </div>

                  {/* Upload Aadhaar Card (Back Side) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-amber-400">
                      Upload Aadhaar Card (Back Side Only) * (Mandatory)
                    </label>
                    <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      {aadharBackPreview ? (
                        <img src={aadharBackPreview} alt="Aadhaar" className="w-12 h-12 rounded-xl object-cover border-2 border-indigo-500 shrink-0 shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                          <FileCheck className="w-5 h-5 text-indigo-400" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="aadhar-back-input-2"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) compressAndCropFaceImage(file, (b64) => { setAadharBackBase64(b64); setAadharBackPreview(b64); });
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="aadhar-back-input-2"
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer border border-slate-700 transition-all"
                      >
                        <FileCheck className="w-3.5 h-3.5 inline mr-1 text-indigo-400" />
                        {aadharBackPreview ? 'Change' : 'Upload Back Side *'}
                      </label>
                    </div>
                  </div>
                </div>

                {/* ─── ₹200 OFFICIAL NAVI QR CODE & DIRECT PAY NOW BUTTON ────────── */}
                <div className="bg-gradient-to-r from-slate-950 via-emerald-950/40 to-slate-950 border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-base font-black text-white uppercase tracking-wider">
                        Player Registration Fee Payment (₹200)
                      </h3>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black">
                      ₹200 MANDATORY
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Official Uploaded QR Code Image Display */}
                    <div className="bg-white p-3 rounded-2xl border-4 border-emerald-400 text-center shrink-0 shadow-2xl text-slate-900 space-y-2 max-w-[220px]">
                      <img
                        src="/jsl_payment_qr.jpg"
                        alt="Jhankra Super League Navi Payment QR Code"
                        className="w-full h-auto rounded-xl shadow-md border border-slate-200"
                      />
                      <div className="pt-1">
                        <p className="text-xs font-black text-slate-900">{payeeName}</p>
                        <p className="text-[11px] font-mono font-bold text-emerald-700">{upiId}</p>
                      </div>
                    </div>

                    <div className="space-y-4 text-xs font-medium text-slate-200 flex-1 w-full">
                      {/* Direct Click PAY NOW Button */}
                      <div className="bg-slate-950/90 p-4 rounded-2xl border border-emerald-500/40 space-y-3">
                        <p className="font-extrabold text-white text-xs flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                          Tap below to open GPay / PhonePe / Paytm directly:
                        </p>

                        <a
                          href={upiDeepLink}
                          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer border border-emerald-300 hover:scale-[1.01] transition-transform"
                        >
                          <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                          PAY ₹200 NOW (Open PhonePe / GPay / Paytm)
                        </a>

                        <p className="text-[10px] text-slate-400 text-center font-bold">
                          Supported UPI Apps: Google Pay, PhonePe, Paytm, Navi, BHIM
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 12-Digit UTR ID Input */}
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-amber-300 mb-1">
                            UPI Transaction / UTR ID *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="12-digit UTR No (e.g. 4219XXXXXXXX)"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-300 outline-none focus:border-amber-400"
                          />
                        </div>

                        {/* Upload Payment Screenshot */}
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-amber-300 mb-1">
                            Upload Payment Screenshot *
                          </label>
                          <div className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                            {paymentScreenshotPreview ? (
                              <img src={paymentScreenshotPreview} alt="Screenshot" className="w-8 h-8 rounded-lg object-cover border border-emerald-500 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                                <CreditCard className="w-4 h-4 text-slate-500" />
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              id="payment-ss-input"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) compressAndCropFaceImage(file, (b64) => { setPaymentScreenshotBase64(b64); setPaymentScreenshotPreview(b64); });
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor="payment-ss-input"
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] rounded-lg cursor-pointer transition-all shrink-0"
                            >
                              {paymentScreenshotPreview ? 'Change' : 'Upload SS *'}
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Submit Player Registration (₹200 Fee)
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* PUBLIC PLAYER PROFILE MODAL */}
      {selectedPlayerForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center relative overflow-hidden">
            <button
              type="button"
              onClick={() => setSelectedPlayerForModal(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Medium Square Face Photo */}
            <div className="w-36 h-36 rounded-2xl mx-auto overflow-hidden border-4 border-red-500 shadow-xl bg-slate-950">
              {selectedPlayerForModal.photoUrl ? (
                <img
                  src={selectedPlayerForModal.photoUrl}
                  alt={selectedPlayerForModal.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-red-500 font-black text-4xl">
                  {selectedPlayerForModal.fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xl font-black text-white">{selectedPlayerForModal.fullName}</h3>
              <span className="inline-block mt-1 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-black uppercase tracking-wider">
                {selectedPlayerForModal.playerCategory || 'General Player'}
              </span>
            </div>

            {/* Payment Verification Badge inside Modal */}
            <div className="pt-1">
              {selectedPlayerForModal.paymentStatus === 'verified' ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  🟢 Payment Verified &amp; Accepted
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-rose-950 text-rose-300 border border-rose-500/40 rounded-full text-xs font-black uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  🔴 Payment Pending Verification
                </span>
              )}
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs font-medium text-slate-300">
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="font-bold text-white">Phone:</span> {selectedPlayerForModal.phoneNumber || '-'}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="font-bold text-white">Address:</span> {selectedPlayerForModal.address || '-'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPlayerForModal(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider cursor-pointer"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
