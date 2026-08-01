import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trophy, Copy, Check, Trash2, Download, Search, ExternalLink, Power, RefreshCw, Eye, Edit, Shield, Save, X, Phone, MapPin, User, FileText, CheckCircle, AlertCircle, CreditCard, Image as ImageIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface TeamRecord {
  id: string;
  teamName: string;
  ownerName: string;
  coOwnerName?: string;
  address: string;
  teamLogoUrl?: string;
  createdAt?: any;
}

export interface PlayerRecord {
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

export default function AdminVillageLeague() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'players' | 'teams'>('players');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Admin View / Edit Modal State
  const [editingTeam, setEditingTeam] = useState<TeamRecord | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<PlayerRecord | null>(null);
  const [viewingPlayerProfile, setViewingPlayerProfile] = useState<PlayerRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const publicLink = `${window.location.origin}/village-league`;

  const getLocalTeams = (): TeamRecord[] => {
    try {
      const data = localStorage.getItem('jsl_local_teams');
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  };

  const getLocalPlayers = (): PlayerRecord[] => {
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
      const remoteTeams = snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamRecord));
      const localTeams = getLocalTeams();
      const combined = [...remoteTeams];
      localTeams.forEach(lt => {
        if (!combined.some(rt => rt.id === lt.id || (rt.teamName || '').toLowerCase() === (lt.teamName || '').toLowerCase())) {
          combined.push(lt);
        }
      });
      setTeams(combined);
    }, (err) => console.error('Teams fetch error:', err));

    const qPlayers = query(collection(db, 'village_league_players'), orderBy('createdAt', 'asc'));
    const unsubPlayers = onSnapshot(qPlayers, (snap) => {
      const remotePlayers = snap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerRecord));
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
      console.error('Players fetch error:', err);
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubTeams();
      unsubPlayers();
    };
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleToggleRegistrationStatus = async () => {
    setUpdatingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'village_league'), {
        isOpen: !isRegistrationOpen,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update registration status.');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    if (!confirm(`Delete Team "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'village_league_teams', id));
      setTeams(prev => prev.filter(t => t.id !== id));
      alert('Team deleted successfully.');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete team.');
    }
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    if (!confirm(`Delete Player "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'village_league_players', id));
      setPlayers(prev => prev.filter(p => p.id !== id));
      alert('Player deleted successfully.');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete player.');
    }
  };

  // Admin Verification Toggle Function (Accept / Verify Player Payment)
  const handleTogglePlayerPaymentStatus = async (player: PlayerRecord) => {
    const newStatus: 'pending' | 'verified' = player.paymentStatus === 'verified' ? 'pending' : 'verified';
    const actionText = newStatus === 'verified' ? 'ACCEPT & VERIFY' : 'MARK PENDING';

    if (!confirm(`Are you sure you want to ${actionText} payment for ${player.fullName}?`)) return;

    try {
      if (!player.id.startsWith('local_')) {
        await updateDoc(doc(db, 'village_league_players', player.id), {
          paymentStatus: newStatus
        });
      }

      // Update state
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, paymentStatus: newStatus } : p));
      
      // Update LocalStorage
      const locals = getLocalPlayers().map(p => p.id === player.id ? { ...p, paymentStatus: newStatus } : p);
      localStorage.setItem('jsl_local_players', JSON.stringify(locals));

      if (viewingPlayerProfile?.id === player.id) {
        setViewingPlayerProfile({ ...viewingPlayerProfile, paymentStatus: newStatus });
      }

      alert(`Player "${player.fullName}" status updated to ${newStatus.toUpperCase()}!`);
    } catch (err) {
      console.error('Verification status update error:', err);
      alert('Failed to update player verification status.');
    }
  };

  // Save Team Edits
  const handleSaveTeamEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    setSavingEdit(true);

    try {
      if (!editingTeam.id.startsWith('local_')) {
        await updateDoc(doc(db, 'village_league_teams', editingTeam.id), {
          teamName: editingTeam.teamName,
          ownerName: editingTeam.ownerName,
          coOwnerName: editingTeam.coOwnerName || '',
          address: editingTeam.address,
          teamLogoUrl: editingTeam.teamLogoUrl || ''
        });
      }

      setTeams(prev => prev.map(t => t.id === editingTeam.id ? editingTeam : t));
      const locals = getLocalTeams().map(t => t.id === editingTeam.id ? editingTeam : t);
      localStorage.setItem('jsl_local_teams', JSON.stringify(locals));

      alert('Team details updated successfully!');
      setEditingTeam(null);
    } catch (err) {
      console.error('Save edit error:', err);
      alert('Failed to save team edits.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Save Player Edits
  const handleSavePlayerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    setSavingEdit(true);

    try {
      if (!editingPlayer.id.startsWith('local_')) {
        await updateDoc(doc(db, 'village_league_players', editingPlayer.id), {
          fullName: editingPlayer.fullName,
          phoneNumber: editingPlayer.phoneNumber,
          address: editingPlayer.address,
          playerCategory: editingPlayer.playerCategory || 'Right Hand Batsman',
          paymentStatus: editingPlayer.paymentStatus || 'pending',
          utrNumber: editingPlayer.utrNumber || '',
          photoUrl: editingPlayer.photoUrl || '',
          aadharBackUrl: editingPlayer.aadharBackUrl || ''
        });
      }

      setPlayers(prev => prev.map(p => p.id === editingPlayer.id ? editingPlayer : p));
      const locals = getLocalPlayers().map(p => p.id === editingPlayer.id ? editingPlayer : p);
      localStorage.setItem('jsl_local_players', JSON.stringify(locals));

      alert('Player details updated successfully!');
      setEditingPlayer(null);
    } catch (err) {
      console.error('Save edit error:', err);
      alert('Failed to save player edits.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const docPdf = new jsPDF();
      
      docPdf.setFillColor(225, 29, 72);
      docPdf.rect(0, 0, 210, 28, 'F');
      
      docPdf.setTextColor(255, 255, 255);
      docPdf.setFontSize(16);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text('JHANKRA SUPER LEAGUE 2026', 14, 15);
      
      docPdf.setFontSize(10);
      docPdf.setFont('helvetica', 'normal');
      docPdf.text(`Official Master Registration Report | Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 23);

      docPdf.setTextColor(15, 23, 42);
      docPdf.setFontSize(12);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text(`Registered Teams (${teams.length})`, 14, 38);

      const teamRows = teams.map((t, i) => [
        i + 1,
        t.teamName || '-',
        t.ownerName || '-',
        t.coOwnerName || '-',
        t.address || '-'
      ]);

      autoTable(docPdf, {
        startY: 42,
        head: [['Sl No', 'Team Name', 'Owner Name', 'Co-Owner Name', 'Address']],
        body: teamRows,
        theme: 'grid',
        headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3 }
      });

      const finalY = (docPdf as any).lastAutoTable?.finalY || 100;

      docPdf.setFontSize(12);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text(`Registered Players (${players.length})`, 14, finalY + 12);

      const playerRows = players.map((p, i) => [
        i + 1,
        p.fullName || '-',
        p.playerCategory || 'General',
        p.phoneNumber || '-',
        p.paymentStatus === 'verified' ? 'VERIFIED (Rs 200)' : 'PENDING',
        p.address || '-'
      ]);

      autoTable(docPdf, {
        startY: finalY + 16,
        head: [['Sl No', 'Player Name', 'Category', 'Phone Number', 'Payment Status', 'Address']],
        body: playerRows,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3 }
      });

      docPdf.save(`Jhankra_Super_League_Master_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
      alert('Failed to download PDF master sheet.');
    }
  };

  const filteredPlayers = players.filter(p => {
    const q = searchQuery.toLowerCase();
    return (p.fullName || '').toLowerCase().includes(q) ||
           (p.playerCategory || '').toLowerCase().includes(q) ||
           (p.phoneNumber || '').includes(q) ||
           (p.utrNumber || '').includes(q) ||
           (p.address || '').toLowerCase().includes(q);
  });

  const filteredTeams = teams.filter(t => {
    const q = searchQuery.toLowerCase();
    return (t.teamName || '').toLowerCase().includes(q) ||
           (t.ownerName || '').toLowerCase().includes(q) ||
           (t.coOwnerName || '').toLowerCase().includes(q) ||
           (t.address || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Box */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-red-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                JHANKRA SUPER LEAGUE 2026
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isRegistrationOpen ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30' : 'bg-rose-500/30 text-rose-200 border border-rose-400/30'}`}>
                <Power className="w-3 h-3" />
                {isRegistrationOpen ? 'Registration OPEN' : 'Registration CLOSED'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase">
              JHANKRA SUPER LEAGUE
            </h2>
            <p className="text-xs sm:text-sm text-red-200/80 mt-1 max-w-2xl font-bold uppercase tracking-wider">
              8 Team League Cricket Tournament | Admin Data &amp; Payment Manager
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleRegistrationStatus}
              disabled={updatingSettings}
              className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer ${
                isRegistrationOpen
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/30'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-900/30'
              }`}
            >
              <Power className="w-4 h-4" />
              {isRegistrationOpen ? 'Close Registration' : 'Open Registration'}
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-5 py-3 bg-white text-slate-900 hover:bg-red-50 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-red-600" />
              Download PDF Master Sheet
            </button>
          </div>
        </div>

        {/* Shareable Link Box */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-300 flex items-center justify-center shrink-0 border border-red-400/20">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-red-300 uppercase tracking-widest">Shareable Public Registration Link</p>
              <p className="text-xs sm:text-sm font-mono font-bold text-white truncate">{publicLink}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Share Link
                </>
              )}
            </button>

            <a
              href="/village-league"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              Preview Page
            </a>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-black text-xl shrink-0 border border-red-100">
            🛡️
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Registered Teams</p>
            <h3 className="text-2xl font-black text-slate-900">{teams.length} <span className="text-xs font-bold text-slate-400">/ 8 Teams</span></h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl shrink-0 border border-emerald-100">
            🏏
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Verified Players (🟢)</p>
            <h3 className="text-2xl font-black text-slate-900">{players.filter(p => p.paymentStatus === 'verified').length} <span className="text-xs font-bold text-slate-400">/ {players.length}</span></h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xl shrink-0 border border-amber-100">
            🔴
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Pending Verification (🔴)</p>
            <h3 className="text-2xl font-black text-slate-900">{players.filter(p => p.paymentStatus !== 'verified').length} <span className="text-xs font-bold text-slate-400">Players</span></h3>
          </div>
        </div>
      </div>

      {/* Main Data View Section */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('players')}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'players'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🏏 Registered Players ({players.length})
            </button>

            <button
              onClick={() => setActiveTab('teams')}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'teams'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🛡️ Registered Teams ({teams.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition-all"
            />
          </div>
        </div>

        {/* VIEW 1: PLAYERS TABLE WITH PAYMENT VERIFICATION */}
        {activeTab === 'players' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="p-4">Sl No</th>
                  <th className="p-4">Player Photo &amp; Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4">UTR / Phone</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
                      Loading players...
                    </td>
                  </tr>
                ) : filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      No player registrations found.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((player, idx) => (
                    <tr key={player.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-slate-900 font-black text-xs">Sl No: #{idx + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {player.photoUrl ? (
                            <img
                              src={player.photoUrl}
                              alt={player.fullName}
                              className="w-10 h-10 rounded-lg object-cover border-2 border-red-500/20 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 font-black text-sm flex items-center justify-center shrink-0 border border-slate-200">
                              {player.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <p className="font-extrabold text-slate-900 text-sm">{player.fullName}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-black uppercase tracking-wider">
                          {player.playerCategory || 'General Player'}
                        </span>
                      </td>

                      {/* Payment Status Column (🔴 Red Circle vs 🟢 Green Circle) */}
                      <td className="p-4">
                        {player.paymentStatus === 'verified' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-black uppercase">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            🟢 Verified &amp; Accepted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-xs font-black uppercase">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                            🔴 Pending Verification
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <p className="font-mono font-bold text-slate-800">{player.phoneNumber || '-'}</p>
                        {player.utrNumber && (
                          <p className="text-[10px] font-mono text-indigo-600 font-bold">UTR: {player.utrNumber}</p>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Admin Accept / Verify Button */}
                          <button
                            onClick={() => handleTogglePlayerPaymentStatus(player)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer shadow-xs ${
                              player.paymentStatus === 'verified'
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20'
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {player.paymentStatus === 'verified' ? 'Mark Pending 🔴' : 'Accept & Verify 🟢'}
                          </button>

                          <button
                            onClick={() => setViewingPlayerProfile(player)}
                            className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            title="View Profile & Screenshot"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </button>

                          <button
                            onClick={() => setEditingPlayer(player)}
                            className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all cursor-pointer border border-indigo-200"
                            title="Edit Player"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeletePlayer(player.id, player.fullName)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Delete Player"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: TEAMS TABLE */}
        {activeTab === 'teams' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="p-4">Sl No</th>
                  <th className="p-4">Team Logo &amp; Name</th>
                  <th className="p-4">Owner Name</th>
                  <th className="p-4">Co-Owner Name</th>
                  <th className="p-4">Address</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      No team registrations found.
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team, idx) => (
                    <tr key={team.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-slate-900 font-black text-xs">Sl No: #{idx + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {team.teamLogoUrl ? (
                            <img
                              src={team.teamLogoUrl}
                              alt={team.teamName}
                              className="w-10 h-10 rounded-xl object-cover border-2 border-red-500/20 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 font-black text-sm flex items-center justify-center shrink-0 border border-red-100">
                              🛡️
                            </div>
                          )}
                          <p className="font-extrabold text-slate-900 text-sm">{team.teamName}</p>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        {team.ownerName || '-'}
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {team.coOwnerName || 'N/A'}
                      </td>
                      <td className="p-4 text-slate-600 font-semibold">
                        {team.address || '-'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingTeam(team)}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border border-indigo-200"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>

                          <button
                            onClick={() => handleDeleteTeam(team.id, team.teamName)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADMIN EDIT TEAM MODAL */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-600" /> Edit Team Details
              </h3>
              <button onClick={() => setEditingTeam(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeamEdit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={editingTeam.teamName}
                  onChange={(e) => setEditingTeam({ ...editingTeam, teamName: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  value={editingTeam.ownerName}
                  onChange={(e) => setEditingTeam({ ...editingTeam, ownerName: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Co-Owner Name</label>
                <input
                  type="text"
                  value={editingTeam.coOwnerName || ''}
                  onChange={(e) => setEditingTeam({ ...editingTeam, coOwnerName: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={editingTeam.address}
                  onChange={(e) => setEditingTeam({ ...editingTeam, address: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingTeam(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5">
                  <Save className="w-4 h-4" /> Save Team Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN EDIT PLAYER MODAL */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-600" /> Edit Player Details
              </h3>
              <button onClick={() => setEditingPlayer(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlayerEdit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingPlayer.fullName}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, fullName: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Player Category</label>
                <select
                  value={editingPlayer.playerCategory || 'Right Hand Batsman'}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, playerCategory: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-amber-700 font-extrabold"
                >
                  <option value="Right Hand Batsman">Right Hand Batsman</option>
                  <option value="Left Hand Batsman">Left Hand Batsman</option>
                  <option value="All Rounder">All Rounder</option>
                  <option value="Wicketkeeper">Wicketkeeper</option>
                  <option value="Left Hand Bowler Only">Left Hand Bowler Only</option>
                  <option value="Right Hand Bowler Only">Right Hand Bowler Only</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Payment Verification Status</label>
                <select
                  value={editingPlayer.paymentStatus || 'pending'}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, paymentStatus: e.target.value as any })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 font-bold"
                >
                  <option value="pending">🔴 Pending Verification</option>
                  <option value="verified">🟢 Verified &amp; Accepted</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">UPI UTR / Transaction ID</label>
                <input
                  type="text"
                  value={editingPlayer.utrNumber || ''}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, utrNumber: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-mono text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={editingPlayer.phoneNumber}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, phoneNumber: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={editingPlayer.address}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, address: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingPlayer(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5">
                  <Save className="w-4 h-4" /> Save Player Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN PLAYER PROFILE & PAYMENT SCREENSHOT MODAL */}
      {viewingPlayerProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Player Profile &amp; Payment Details</span>
                {viewingPlayerProfile.paymentStatus === 'verified' ? (
                  <span className="text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black">🟢 VERIFIED</span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full font-black">🔴 PENDING</span>
                )}
              </h3>
              <button
                onClick={() => setViewingPlayerProfile(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-2">
              {viewingPlayerProfile.photoUrl ? (
                <img
                  src={viewingPlayerProfile.photoUrl}
                  alt={viewingPlayerProfile.fullName}
                  className="w-24 h-24 rounded-2xl object-cover mx-auto border-4 border-red-500 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-slate-100 text-slate-600 font-black text-3xl flex items-center justify-center mx-auto border-2 border-slate-200">
                  {viewingPlayerProfile.fullName.charAt(0).toUpperCase()}
                </div>
              )}

              <h4 className="text-xl font-black text-slate-900">{viewingPlayerProfile.fullName}</h4>
              <span className="inline-block px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-black uppercase">
                {viewingPlayerProfile.playerCategory || 'General Player'}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700 font-medium">
              <p><strong className="text-slate-900">Phone:</strong> {viewingPlayerProfile.phoneNumber || '-'}</p>
              <p><strong className="text-slate-900">Address:</strong> {viewingPlayerProfile.address || '-'}</p>
              <p><strong className="text-slate-900">UPI UTR / Trans ID:</strong> <span className="font-mono font-bold text-indigo-700">{viewingPlayerProfile.utrNumber || 'N/A'}</span></p>
            </div>

            {/* Payment Screenshot View */}
            {viewingPlayerProfile.paymentScreenshotUrl && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> ₹200 Payment Screenshot:
                </p>
                <img src={viewingPlayerProfile.paymentScreenshotUrl} alt="Payment Screenshot" className="w-full max-h-60 object-contain rounded-xl border border-slate-200 bg-slate-950 p-1" />
              </div>
            )}

            {/* Aadhaar Back View */}
            {viewingPlayerProfile.aadharBackUrl && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">Aadhaar Card (Back Side):</p>
                <img src={viewingPlayerProfile.aadharBackUrl} alt="Aadhaar Back" className="w-full max-h-48 object-contain rounded-xl border border-slate-200 bg-slate-50" />
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => handleTogglePlayerPaymentStatus(viewingPlayerProfile)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md ${
                  viewingPlayerProfile.paymentStatus === 'verified'
                    ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {viewingPlayerProfile.paymentStatus === 'verified' ? 'Mark Pending 🔴' : 'Accept & Verify Payment 🟢'}
              </button>

              <button
                onClick={() => setViewingPlayerProfile(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
