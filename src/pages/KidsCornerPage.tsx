import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, Sparkles, Trophy, Play, RefreshCw, Star, Heart, CheckCircle2, Music, Tv, Gamepad2, BookOpen } from 'lucide-react';

interface AlphabetItem {
  letter: string;
  word: string;
  emoji: string;
  gradient: string;
  sentence: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
}

const ALPHABET_DATA: AlphabetItem[] = [
  { letter: 'A', word: 'Apple', emoji: '🍎', gradient: 'from-rose-500 to-red-500', sentence: 'A is for Apple! Crisp, red and sweet!', bgLight: 'bg-rose-50', borderColor: 'border-rose-200', textColor: 'text-rose-600' },
  { letter: 'B', word: 'Ball', emoji: '⚽', gradient: 'from-blue-500 to-indigo-500', sentence: 'B is for Ball! Bouncing high and low!', bgLight: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-600' },
  { letter: 'C', word: 'Cat', emoji: '🐱', gradient: 'from-amber-500 to-orange-500', sentence: 'C is for Cat! Soft, cute and purring!', bgLight: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-600' },
  { letter: 'D', word: 'Dog', emoji: '🐶', gradient: 'from-emerald-500 to-teal-500', sentence: 'D is for Dog! Happy wagging tail!', bgLight: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-600' },
  { letter: 'E', word: 'Elephant', emoji: '🐘', gradient: 'from-purple-500 to-violet-500', sentence: 'E is for Elephant! Big ears and long trunk!', bgLight: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-600' },
  { letter: 'F', word: 'Fish', emoji: '🐟', gradient: 'from-cyan-500 to-blue-500', sentence: 'F is for Fish! Swimming in the sea!', bgLight: 'bg-cyan-50', borderColor: 'border-cyan-200', textColor: 'text-cyan-600' },
  { letter: 'G', word: 'Giraffe', emoji: '🦒', gradient: 'from-yellow-500 to-amber-500', sentence: 'G is for Giraffe! Tall neck in the safari!', bgLight: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-yellow-600' },
  { letter: 'H', word: 'House', emoji: '🏠', gradient: 'from-pink-500 to-rose-500', sentence: 'H is for House! Cozy home sweet home!', bgLight: 'bg-pink-50', borderColor: 'border-pink-200', textColor: 'text-pink-600' },
  { letter: 'I', word: 'Ice Cream', emoji: '🍦', gradient: 'from-fuchsia-500 to-pink-500', sentence: 'I is for Ice Cream! Cold and delicious treat!', bgLight: 'bg-fuchsia-50', borderColor: 'border-fuchsia-200', textColor: 'text-fuchsia-600' },
  { letter: 'J', word: 'Juice', emoji: '🧃', gradient: 'from-orange-400 to-amber-500', sentence: 'J is for Juice! Refreshing fruit drink!', bgLight: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-600' },
  { letter: 'K', word: 'Kite', emoji: '🪁', gradient: 'from-sky-400 to-indigo-500', sentence: 'K is for Kite! Flying high in the sky!', bgLight: 'bg-sky-50', borderColor: 'border-sky-200', textColor: 'text-sky-600' },
  { letter: 'L', word: 'Lion', emoji: '🦁', gradient: 'from-amber-600 to-yellow-500', sentence: 'L is for Lion! Brave king of the jungle!', bgLight: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-700' },
  { letter: 'M', word: 'Monkey', emoji: '🐒', gradient: 'from-orange-500 to-red-500', sentence: 'M is for Monkey! Swinging on trees!', bgLight: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-600' },
  { letter: 'N', word: 'Nest', emoji: '🪹', gradient: 'from-teal-500 to-emerald-600', sentence: 'N is for Nest! Warm home for baby birds!', bgLight: 'bg-teal-50', borderColor: 'border-teal-200', textColor: 'text-teal-600' },
  { letter: 'O', word: 'Owl', emoji: '🦉', gradient: 'from-indigo-600 to-violet-600', sentence: 'O is for Owl! Wise bird in the night!', bgLight: 'bg-indigo-50', borderColor: 'border-indigo-200', textColor: 'text-indigo-600' },
  { letter: 'P', word: 'Penguin', emoji: '🐧', gradient: 'from-blue-600 to-sky-600', sentence: 'P is for Penguin! Waddling on the ice!', bgLight: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-600' },
  { letter: 'Q', word: 'Queen', emoji: '👑', gradient: 'from-purple-600 to-pink-500', sentence: 'Q is for Queen! Wearing a shiny golden crown!', bgLight: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-600' },
  { letter: 'R', word: 'Rabbit', emoji: '🐰', gradient: 'from-rose-400 to-pink-500', sentence: 'R is for Rabbit! Hopping with long ears!', bgLight: 'bg-rose-50', borderColor: 'border-rose-200', textColor: 'text-rose-500' },
  { letter: 'S', word: 'Sun', emoji: '☀️', gradient: 'from-amber-400 to-yellow-500', sentence: 'S is for Sun! Shining warm and bright!', bgLight: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-amber-500' },
  { letter: 'T', word: 'Tiger', emoji: '🐯', gradient: 'from-orange-600 to-amber-600', sentence: 'T is for Tiger! Fast and striped wild cat!', bgLight: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700' },
  { letter: 'U', word: 'Umbrella', emoji: '☂️', gradient: 'from-indigo-500 to-purple-500', sentence: 'U is for Umbrella! Keeping us dry in the rain!', bgLight: 'bg-indigo-50', borderColor: 'border-indigo-200', textColor: 'text-indigo-600' },
  { letter: 'V', word: 'Violin', emoji: '🎻', gradient: 'from-violet-500 to-purple-600', sentence: 'V is for Violin! Playing sweet melodies!', bgLight: 'bg-violet-50', borderColor: 'border-violet-200', textColor: 'text-violet-600' },
  { letter: 'W', word: 'Watermelon', emoji: '🍉', gradient: 'from-emerald-500 to-green-600', sentence: 'W is for Watermelon! Juicy summer fruit!', bgLight: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-600' },
  { letter: 'X', word: 'Xylophone', emoji: '🎼', gradient: 'from-pink-500 to-rose-500', sentence: 'X is for Xylophone! Making musical sounds!', bgLight: 'bg-pink-50', borderColor: 'border-pink-200', textColor: 'text-pink-600' },
  { letter: 'Y', word: 'Yacht', emoji: '⛵', gradient: 'from-cyan-500 to-sky-600', sentence: 'Y is for Yacht! Sailing on blue ocean waves!', bgLight: 'bg-cyan-50', borderColor: 'border-cyan-200', textColor: 'text-cyan-600' },
  { letter: 'Z', word: 'Zebra', emoji: '🦓', gradient: 'from-slate-700 to-slate-900', sentence: 'Z is for Zebra! Beautiful black and white stripes!', bgLight: 'bg-slate-100', borderColor: 'border-slate-300', textColor: 'text-slate-800' }
];

const CARTOON_VIDEOS = [
  { id: 'v1', title: 'Phonics Song with Two Words - A to Z', youtubeId: 'BELlZKpi1Zs', category: 'Phonics' },
  { id: 'v2', title: 'ABC Alphabet Songs for Toddlers', youtubeId: '75p-N9YKqNo', category: 'Songs' },
  { id: 'v3', title: 'Learn A to Z Animals for Kids', youtubeId: 'hq3yfQnllfQ', category: 'Animals' },
  { id: 'v4', title: 'Number Song 1 to 20 Counting', youtubeId: 'D0Ajq682yrA', category: 'Numbers' }
];

// Helper to play synthesized audio beep sound effect
function playChimeEffect(type: 'pop' | 'star' | 'win') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'pop') {
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'star') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    // Audio Context optional fallback
  }
}

export default function KidsCornerPage() {
  const [activeTab, setActiveTab] = useState<'learn' | 'balloon' | 'match' | 'videos'>('learn');
  const [selectedLetter, setSelectedLetter] = useState<AlphabetItem>(ALPHABET_DATA[0]);
  const [stars, setStars] = useState<number>(() => {
    return parseInt(localStorage.getItem('kids_corner_stars') || '5', 10);
  });
  const [speaking, setSpeaking] = useState(false);

  // Game States
  // 1. Balloon Pop Game State
  const [targetLetter, setTargetLetter] = useState<AlphabetItem>(ALPHABET_DATA[0]);
  const [balloons, setBalloons] = useState<{ id: number; item: AlphabetItem; color: string; left: number; speed: number }[]>([]);
  const [balloonScore, setBalloonScore] = useState(0);

  // 2. Matching Game State
  const [matchQuestions, setMatchQuestions] = useState<AlphabetItem[]>([]);
  const [selectedMatchLetter, setSelectedMatchLetter] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState(0);
  const [completedMatches, setCompletedMatches] = useState<string[]>([]);

  // Speech Helper
  const speakText = (text: string, onEndCallback?: () => void) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.82; // Slower for clear kid comprehension
    utterance.pitch = 1.25; // Higher cheerful pitch

    // Try finding English female voice
    const voices = window.speechSynthesis.getVoices();
    const kidVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (kidVoice) utterance.voice = kidVoice;

    setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      if (onEndCallback) onEndCallback();
    };
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Add stars reward
  const addStars = (count: number) => {
    const updated = stars + count;
    setStars(updated);
    localStorage.setItem('kids_corner_stars', updated.toString());
    playChimeEffect('star');
  };

  // Speak initial letter on load/select
  const handleSelectLetter = (item: AlphabetItem) => {
    setSelectedLetter(item);
    playChimeEffect('pop');
    speakText(`${item.letter}. ${item.word}. ${item.sentence}`);
  };

  // --- Balloon Game Logic ---
  const initBalloonGame = () => {
    const randomTarget = ALPHABET_DATA[Math.floor(Math.random() * ALPHABET_DATA.length)];
    setTargetLetter(randomTarget);

    const colors = ['bg-rose-400', 'bg-sky-400', 'bg-amber-400', 'bg-emerald-400', 'bg-purple-400', 'bg-pink-400'];
    const newBalloons: any[] = [];
    
    // Create 6 balloons including target
    const pool = [randomTarget];
    while (pool.length < 6) {
      const rand = ALPHABET_DATA[Math.floor(Math.random() * ALPHABET_DATA.length)];
      if (!pool.find(p => p.letter === rand.letter)) pool.push(rand);
    }
    // Shuffle pool
    pool.sort(() => Math.random() - 0.5);

    pool.forEach((item, idx) => {
      newBalloons.push({
        id: Date.now() + idx,
        item,
        color: colors[idx % colors.length],
        left: 10 + idx * 14,
        speed: 3 + Math.random() * 2
      });
    });

    setBalloons(newBalloons);
    speakText(`Can you pop the balloon with the letter ${randomTarget.letter}?`);
  };

  const handlePopBalloon = (balloonId: number, item: AlphabetItem) => {
    if (item.letter === targetLetter.letter) {
      playChimeEffect('win');
      setBalloonScore(prev => prev + 10);
      addStars(2);
      speakText(`Yay! Great job! ${item.letter} is for ${item.word}!`);
      setTimeout(() => initBalloonGame(), 1500);
    } else {
      playChimeEffect('pop');
      speakText(`Oops! That is ${item.letter}. Try to find ${targetLetter.letter}!`);
    }
  };

  // --- Match Game Logic ---
  const initMatchGame = () => {
    const randoms = [...ALPHABET_DATA].sort(() => Math.random() - 0.5).slice(0, 4);
    setMatchQuestions(randoms);
    setSelectedMatchLetter(null);
    setCompletedMatches([]);
    speakText("Match each letter to the correct picture!");
  };

  const handleMatchClick = (pictureItem: AlphabetItem) => {
    if (!selectedMatchLetter) return;
    if (selectedMatchLetter === pictureItem.letter) {
      playChimeEffect('win');
      const updated = [...completedMatches, pictureItem.letter];
      setCompletedMatches(updated);
      setSelectedMatchLetter(null);
      addStars(1);
      speakText(`Correct! ${pictureItem.letter} for ${pictureItem.word}!`);

      if (updated.length === 4) {
        setMatchScore(prev => prev + 20);
        speakText("Hooray! You matched all letters! Super Star!");
      }
    } else {
      playChimeEffect('pop');
      speakText("Try again!");
      setSelectedMatchLetter(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'balloon') initBalloonGame();
    if (activeTab === 'match') initMatchGame();
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-amber-50 to-pink-100 font-sans pb-16 selection:bg-pink-300">
      
      {/* Top Banner & Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b-4 border-amber-300 shadow-md px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          
          <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-full font-black text-xs md:text-sm transition-all shadow-xs active:scale-95">
            <ArrowLeft className="w-4 h-4" /> Back Home
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-2xl md:text-3xl animate-bounce">🎈</span>
            <h1 className="text-lg md:text-2xl font-black bg-gradient-to-r from-rose-500 via-purple-600 to-sky-500 bg-clip-text text-transparent tracking-wide">
              Kids Learning Corner
            </h1>
          </div>

          {/* Stars Counter Badge */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 font-black px-4 py-1.5 rounded-full shadow-md text-xs md:text-sm">
            <Star className="w-4 h-4 fill-amber-950 animate-spin" style={{ animationDuration: '6s' }} />
            <span>{stars} Stars</span>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">

        {/* Mascot Banner Greeting */}
        <div className="bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border-4 border-white">
          <div className="flex items-center gap-4 z-10">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-lg border-4 border-amber-300 animate-pulse">
              🐶
            </div>
            <div>
              <div className="inline-block bg-white/20 backdrop-blur-sm text-xs font-extrabold uppercase px-3 py-1 rounded-full mb-1">
                Hi Little Learner! 👋
              </div>
              <h2 className="text-xl md:text-3xl font-black tracking-tight drop-shadow-sm">
                Let's Learn A to Z &amp; Play Fun Games!
              </h2>
              <p className="text-white/90 text-xs md:text-sm font-semibold mt-1">
                Tap any letter to hear its sound, or play balloon popping games!
              </p>
            </div>
          </div>

          <button
            onClick={() => speakText("Welcome to Kids Corner! Tap any letter to learn A to Z!")}
            disabled={speaking}
            className="z-10 px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-amber-950 font-black rounded-2xl shadow-lg transition-all flex items-center gap-2 text-sm shrink-0 active:scale-95 border-2 border-white"
          >
            <Volume2 className={`w-5 h-5 ${speaking ? 'animate-bounce text-rose-600' : ''}`} />
            {speaking ? 'Speaking...' : 'Listen Mascot'}
          </button>

          {/* Background Decorative Circles */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/15 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Category Navigation Tabs */}
        <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap bg-white/80 p-2 rounded-2xl border-2 border-amber-200 shadow-sm">
          {[
            { id: 'learn', label: '🅰️ Learn A-Z', color: 'bg-rose-500 hover:bg-rose-600' },
            { id: 'balloon', label: '🎈 Balloon Pop Game', color: 'bg-sky-500 hover:bg-sky-600' },
            { id: 'match', label: '🧩 Match Letter Game', color: 'bg-emerald-500 hover:bg-emerald-600' },
            { id: 'videos', label: '📺 Cartoon Rhymes', color: 'bg-purple-500 hover:bg-purple-600' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all shadow-sm active:scale-95 cursor-pointer ${
                activeTab === tab.id
                  ? `${tab.color} text-white shadow-md scale-105 border-2 border-white`
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: LEARN A TO Z ALPHABET */}
        {activeTab === 'learn' && (
          <div className="space-y-6">

            {/* Main Featured Letter Card & Cartoon Dialogue */}
            <div className={`rounded-3xl p-6 md:p-8 border-4 ${selectedLetter.borderColor} ${selectedLetter.bgLight} shadow-lg transition-all duration-300 flex flex-col md:flex-row items-center justify-around gap-6 relative overflow-hidden`}>
              
              <div className="text-center md:text-left space-y-2">
                <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-white rounded-full shadow-xs text-slate-600 border border-slate-200">
                  Featured Letter
                </span>
                <div className="flex items-baseline justify-center md:justify-start gap-3">
                  <h3 className={`text-6xl md:text-8xl font-black tracking-tighter ${selectedLetter.textColor}`}>
                    {selectedLetter.letter}
                  </h3>
                  <span className="text-2xl md:text-4xl font-extrabold text-slate-700">
                    for {selectedLetter.word}
                  </span>
                </div>
                <p className="text-base md:text-xl font-bold text-slate-700 bg-white/80 p-4 rounded-2xl border border-white shadow-xs max-w-lg">
                  🗣️ "{selectedLetter.sentence}"
                </p>
              </div>

              {/* Huge Cartoon Emoji Illustration */}
              <div
                onClick={() => handleSelectLetter(selectedLetter)}
                className="w-36 h-36 md:w-48 md:h-48 rounded-3xl bg-white shadow-xl border-4 border-amber-300 flex items-center justify-center text-7xl md:text-9xl cursor-pointer hover:scale-110 active:scale-95 transition-all duration-300 relative group"
                title="Tap to speak out loud!"
              >
                <span className="group-hover:animate-bounce">{selectedLetter.emoji}</span>
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white shadow-md">
                  <Volume2 className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* 26 Alphabet Cards Grid (A to Z) */}
            <div className="bg-white/90 rounded-3xl p-6 border-4 border-amber-200 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" /> Tap Any Letter to Hear &amp; Learn (A - Z):
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3.5">
                {ALPHABET_DATA.map(item => {
                  const isSelected = selectedLetter.letter === item.letter;
                  return (
                    <button
                      key={item.letter}
                      onClick={() => handleSelectLetter(item)}
                      className={`p-3.5 rounded-2xl border-3 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer relative group active:scale-90 ${
                        isSelected
                          ? `bg-gradient-to-b ${item.gradient} text-white border-white shadow-lg scale-105 ring-4 ring-amber-300`
                          : 'bg-slate-50 hover:bg-white text-slate-800 border-slate-200 hover:border-amber-300 hover:shadow-md'
                      }`}
                    >
                      <span className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {item.letter}
                      </span>
                      <span className="text-3xl group-hover:scale-125 transition-transform">
                        {item.emoji}
                      </span>
                      <span className={`text-[11px] font-extrabold truncate max-w-full ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                        {item.word}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: BALLOON POP MINI GAME */}
        {activeTab === 'balloon' && (
          <div className="bg-gradient-to-b from-sky-200 via-sky-100 to-amber-100 rounded-3xl p-6 border-4 border-sky-300 shadow-xl space-y-6 relative overflow-hidden">
            
            <div className="flex items-center justify-between bg-white/90 p-4 rounded-2xl shadow-sm border border-sky-200">
              <div>
                <span className="text-xs font-black text-sky-600 uppercase tracking-widest">Find Target Letter:</span>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black text-rose-600">{targetLetter.letter}</span>
                  <span className="text-sm font-bold text-slate-600">({targetLetter.word} {targetLetter.emoji})</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400">Score</span>
                  <p className="text-2xl font-black text-amber-600">{balloonScore}</p>
                </div>
                <button
                  onClick={initBalloonGame}
                  className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset Game
                </button>
              </div>
            </div>

            {/* Floating Balloons Arena */}
            <div className="min-h-[360px] relative bg-gradient-to-b from-sky-300/40 to-blue-200/50 rounded-2xl border-2 border-white/80 overflow-hidden flex items-center justify-center">
              
              <div className="absolute top-4 left-4 z-10 bg-white/80 px-3 py-1 rounded-full text-xs font-extrabold text-sky-900 border border-sky-200">
                🎈 Tap the balloon with letter <strong>{targetLetter.letter}</strong>!
              </div>

              <div className="w-full h-full min-h-[320px] flex items-center justify-around flex-wrap gap-6 p-6">
                {balloons.map(b => (
                  <div
                    key={b.id}
                    onClick={() => handlePopBalloon(b.id, b.item)}
                    className={`w-24 h-32 ${b.color} rounded-[50%_50%_50%_50%/40%_40%_60%_60%] shadow-lg cursor-pointer hover:scale-110 active:scale-90 transition-all flex flex-col items-center justify-center text-white relative animate-bounce`}
                    style={{ animationDuration: `${b.speed}s` }}
                  >
                    <span className="text-3xl font-black drop-shadow-md">{b.item.letter}</span>
                    <span className="text-xl mt-1">{b.item.emoji}</span>
                    {/* Balloon String */}
                    <div className="w-0.5 h-6 bg-slate-400/80 absolute -bottom-6 left-1/2 -translate-x-1/2" />
                  </div>
                ))}
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: MATCH LETTER MINI GAME */}
        {activeTab === 'match' && (
          <div className="bg-gradient-to-b from-emerald-100 via-teal-50 to-amber-50 rounded-3xl p-6 border-4 border-emerald-300 shadow-xl space-y-6">
            
            <div className="flex items-center justify-between bg-white/90 p-4 rounded-2xl shadow-sm border border-emerald-200">
              <div>
                <h3 className="text-base font-black text-emerald-800">🧩 Match Letter to Picture</h3>
                <p className="text-xs font-semibold text-slate-500">Tap a Letter on left, then tap its picture on right!</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400">Match Score</span>
                  <p className="text-2xl font-black text-emerald-600">{matchScore}</p>
                </div>
                <button
                  onClick={initMatchGame}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Shuffle Match
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Letters */}
              <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 mb-2">1. Select Letter:</h4>
                {matchQuestions.map(item => {
                  const isDone = completedMatches.includes(item.letter);
                  const isSelected = selectedMatchLetter === item.letter;
                  return (
                    <button
                      key={item.letter}
                      disabled={isDone}
                      onClick={() => {
                        setSelectedMatchLetter(item.letter);
                        speakText(`Letter ${item.letter}`);
                      }}
                      className={`w-full p-4 rounded-xl font-black text-xl flex items-center justify-between border-2 transition-all cursor-pointer ${
                        isDone
                          ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-md scale-102 ring-4 ring-emerald-200'
                          : 'bg-slate-50 hover:bg-emerald-50 text-slate-800 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <span>Letter {item.letter}</span>
                      {isDone ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <span className="text-xs font-bold text-emerald-600">Tap</span>}
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Pictures */}
              <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 mb-2">2. Tap Matching Picture:</h4>
                {[...matchQuestions].sort(() => Math.random() - 0.5).map(item => {
                  const isDone = completedMatches.includes(item.letter);
                  return (
                    <button
                      key={item.letter}
                      disabled={isDone}
                      onClick={() => handleMatchClick(item)}
                      className={`w-full p-3.5 rounded-xl font-bold text-base flex items-center justify-between border-2 transition-all cursor-pointer ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 opacity-60 cursor-not-allowed'
                          : 'bg-slate-50 hover:bg-amber-50 text-slate-800 border-slate-200 hover:border-amber-400 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{item.emoji}</span>
                        <span className="text-slate-800">{item.word}</span>
                      </div>
                      {isDone && <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Matched!</span>}
                    </button>
                  );
                })}
              </div>

            </div>

          </div>
        )}

        {/* TAB 4: CARTOON RHYMES & VIDEOS */}
        {activeTab === 'videos' && (
          <div className="bg-gradient-to-b from-purple-100 via-indigo-50 to-pink-50 rounded-3xl p-6 border-4 border-purple-300 shadow-xl space-y-6">
            
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-purple-200 shadow-sm">
              <div>
                <h3 className="text-base font-black text-purple-900 flex items-center gap-2">
                  <Tv className="w-5 h-5 text-purple-600" /> Cartoon Rhymes &amp; Educational Videos
                </h3>
                <p className="text-xs text-slate-500 font-medium">Safe educational videos to learn A to Z phonics and rhymes!</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CARTOON_VIDEOS.map(vid => (
                <div key={vid.id} className="bg-white rounded-2xl border-2 border-purple-200 shadow-md overflow-hidden hover:shadow-lg transition-all">
                  <div className="aspect-video w-full bg-slate-900">
                    <iframe
                      src={`https://www.youtube.com/embed/${vid.youtubeId}`}
                      title={vid.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md">
                        {vid.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">{vid.title}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
