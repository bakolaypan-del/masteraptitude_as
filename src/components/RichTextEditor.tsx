import React, { useRef, useEffect, useState, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const BENGALI_FONTS = [
  { name: 'Hind Siliguri', label: 'হিন্দ (Hind Siliguri)', desc: 'Clean & readable' },
  { name: 'Baloo Da 2',    label: 'বালু (Baloo Da 2)',  desc: 'Stylish & bold' },
  { name: 'Noto Sans Bengali', label: 'নোটো (Noto Sans)', desc: 'Universal' },
  { name: 'Tiro Bengali', label: 'তিরো (Tiro Bengali)', desc: 'Classic Serif' },
];

const ENGLISH_FONTS = [
  { name: 'sans-serif', label: 'Sans-Serif (Standard)' },
  { name: 'serif', label: 'Classic Serif' },
  { name: 'monospace', label: 'Code Monospace' },
  { name: 'Caveat', label: 'Stylish Cursive' },
];

const TEXT_COLORS = [
  { c: '#dc2626', label: 'Red' },
  { c: '#d97706', label: 'Orange' },
  { c: '#16a34a', label: 'Green' },
  { c: '#2563eb', label: 'Blue' },
  { c: '#9333ea', label: 'Purple' },
  { c: '#db2777', label: 'Pink' },
  { c: '#0f172a', label: 'Black' },
];

const BG_COLORS = [
  { c: '#fef08a', label: 'Yellow' },
  { c: '#bbf7d0', label: 'Green' },
  { c: '#bfdbfe', label: 'Blue' },
  { c: '#fce7f3', label: 'Pink' },
  { c: '#fed7aa', label: 'Orange' },
  { c: '#e2e8f0', label: 'Grey' },
];

const STYLISH_ICONS = ['📌', '💡', '🔥', '⭐', '🎯', '🚀', '✍️', '📝', '🧠', '⚡', '🔔', '🏆', '💎', '📢', '📖', '🏷️', '🔑', '🎓', '🚩', '💬', '✅', '❌', '❓', '❗', '🇧🇩', '🇮🇳'];
const MATH_SYMBOLS = ['²', '³', '½', '¼', '√', '∛', '∞', '≠', '≈', '≤', '≥', '±', '÷', '×', '∑', 'π', 'θ', '°', '→', '←', '↑', '↓'];

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 120 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const emittedRef = useRef('');
  const [bengaliMode, setBengaliMode] = useState(false);
  const [selectedBengaliFont, setSelectedBengaliFont] = useState(BENGALI_FONTS[0].name);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showIconMenu, setShowIconMenu] = useState(false);
  const [showEqPopup, setShowEqPopup] = useState(false);
  const [eqInput, setEqInput] = useState('');
  const [eqDisplay, setEqDisplay] = useState(false);
  const savedRangeRef = useRef<Range | null>(null);

  // Sync DOM when value changes from outside (edit load / form reset)
  useEffect(() => {
    if (!editorRef.current) return;
    if (value === emittedRef.current) return; // our own update, skip
    editorRef.current.innerHTML = value;
    emittedRef.current = value;
  }, [value]);

  const emit = () => {
    const html = editorRef.current?.innerHTML || '';
    emittedRef.current = html;
    onChange(html);
  };

  // Prevent toolbar buttons from stealing focus from the editor
  const noBlur = (e: React.MouseEvent) => e.preventDefault();

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emit();
  };

  const insertSym = (sym: string) => {
    editorRef.current?.focus();
    document.execCommand('insertText', false, sym);
    emit();
  };

  const openEqPopup = () => {
    // Save cursor position before popup steals focus
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    setEqInput('');
    setEqDisplay(false);
    setShowEqPopup(true);
  };

  const insertInlineEquation = useCallback(() => {
    const latex = eqInput.trim();
    if (!latex) { setShowEqPopup(false); return; }
    let rendered = '';
    try {
      rendered = katex.renderToString(latex, { throwOnError: false, displayMode: eqDisplay, trust: false });
    } catch {
      rendered = latex;
    }
    const safeLatex = latex.replace(/"/g, '&quot;');
    const wrapStyle = eqDisplay
      ? 'display:block;text-align:center;margin:6px 0;'
      : 'display:inline-block;vertical-align:middle;margin:0 1px;';
    const html = `<span class="katex-inline-eq" data-latex="${safeLatex}" data-display="${eqDisplay}" contenteditable="false" style="${wrapStyle}">${rendered}</span>`;
    editorRef.current?.focus();
    // Restore saved cursor position
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    document.execCommand('insertHTML', false, html);
    emit();
    setShowEqPopup(false);
    setEqInput('');
  }, [eqInput, eqDisplay]);

  const applyBengaliFont = (fontName = selectedBengaliFont) => {
    editorRef.current?.focus();
    document.execCommand('fontName', false, fontName);
    emit();
  };

  const toggleBengaliMode = () => {
    const next = !bengaliMode;
    setBengaliMode(next);
    if (editorRef.current) {
      editorRef.current.style.fontFamily = next ? `'${selectedBengaliFont}', sans-serif` : 'inherit';
    }
  };

  const selectBengaliFont = (fontName: string) => {
    setSelectedBengaliFont(fontName);
    setShowFontMenu(false);
    if (bengaliMode && editorRef.current) {
      editorRef.current.style.fontFamily = `'${fontName}', sans-serif`;
    }
  };

  const isEmpty = !value || value === '<br>' || value === '<div><br></div>' || value.replace(/<[^>]*>/g, '').trim() === '';

  return (
    <div className="rounded-2xl border-2 border-slate-200 overflow-hidden focus-within:border-indigo-500 transition-colors">
      {/* ── Toolbar ── */}
      <div
        className="flex items-center gap-0.5 px-2 py-2 bg-slate-50 border-b border-slate-200 flex-wrap"
        onMouseDown={noBlur}
      >
        {/* Basic */}
        <ToolBtn onClick={() => exec('bold')} title="Bold"><strong>B</strong></ToolBtn>
        <ToolBtn onClick={() => exec('italic')} title="Italic"><em>I</em></ToolBtn>
        <ToolBtn onClick={() => exec('underline')} title="Underline"><span className="underline">U</span></ToolBtn>
        <ToolBtn onClick={() => exec('strikeThrough')} title="Strikethrough"><span className="line-through">S</span></ToolBtn>

        <Sep />

        {/* Sub / Super */}
        <ToolBtn onClick={() => exec('subscript')} title="Subscript">
          <span className="text-[10px]">X<sub>2</sub></span>
        </ToolBtn>
        <ToolBtn onClick={() => exec('superscript')} title="Superscript">
          <span className="text-[10px]">X<sup>2</sup></span>
        </ToolBtn>

        <Sep />

        {/* Font sizes */}
        {([['1', 'XS', 10], ['2', 'S', 11], ['3', 'M', 13], ['4', 'L', 15], ['5', 'XL', 17], ['6', 'XXL', 20]] as [string, string, number][]).map(([sz, lbl, fs]) => (
          <React.Fragment key={sz}>
            <ToolBtn onClick={() => exec('fontSize', sz)} title={`Size ${lbl}`}>
              <span style={{ fontSize: fs, fontWeight: 700 }}>A</span>
            </ToolBtn>
          </React.Fragment>
        ))}

        <Sep />

        {/* Text colors */}
        {TEXT_COLORS.map(({ c, label }) => (
          <button
            key={c} title={`${label} text`}
            onClick={() => exec('foreColor', c)}
            className="w-5 h-5 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform shrink-0 cursor-pointer"
            style={{ background: c }}
          />
        ))}

        <Sep />

        {/* Highlight colors */}
        {BG_COLORS.map(({ c, label }) => (
          <button
            key={c} title={`${label} highlight`}
            onClick={() => exec('hiliteColor', c)}
            className="w-5 h-5 rounded border-2 border-slate-300 shadow-sm hover:scale-110 transition-transform flex items-center justify-center shrink-0 cursor-pointer"
            style={{ background: c }}
          >
            <span className="text-[7px] font-black text-slate-600">H</span>
          </button>
        ))}

        <Sep />

        {/* Alignment */}
        <ToolBtn onClick={() => exec('justifyLeft')} title="Align Left">
          <svg viewBox="0 0 14 10" className="w-3.5 h-3.5 fill-current"><rect x="0" y="0" width="14" height="1.5"/><rect x="0" y="4" width="10" height="1.5"/><rect x="0" y="8" width="12" height="1.5"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => exec('justifyCenter')} title="Center">
          <svg viewBox="0 0 14 10" className="w-3.5 h-3.5 fill-current"><rect x="0" y="0" width="14" height="1.5"/><rect x="2" y="4" width="10" height="1.5"/><rect x="1" y="8" width="12" height="1.5"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => exec('justifyRight')} title="Align Right">
          <svg viewBox="0 0 14 10" className="w-3.5 h-3.5 fill-current"><rect x="0" y="0" width="14" height="1.5"/><rect x="4" y="4" width="10" height="1.5"/><rect x="2" y="8" width="12" height="1.5"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => exec('justifyFull')} title="Justify">
          <svg viewBox="0 0 14 10" className="w-3.5 h-3.5 fill-current"><rect x="0" y="0" width="14" height="1.5"/><rect x="0" y="4" width="14" height="1.5"/><rect x="0" y="8" width="14" height="1.5"/></svg>
        </ToolBtn>

        <Sep />

        {/* Stylish Icons Picker */}
        <div className="relative" onMouseDown={noBlur}>
          <button
            type="button"
            onClick={() => setShowIconMenu(p => !p)}
            title="Insert Stylish Emojis & Icons"
            className="h-7 px-2 rounded-lg text-xs font-black text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>📌</span> Icons ▾
          </button>
          {showIconMenu && (
            <div className="absolute top-8 left-0 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 grid grid-cols-6 gap-1 min-w-[200px]">
              {STYLISH_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => { insertSym(icon); setShowIconMenu(false); }}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-sm transition-transform hover:scale-125 cursor-pointer"
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* Math symbols */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {MATH_SYMBOLS.map(sym => (
            <button
              key={sym}
              onClick={() => insertSym(sym)}
              title={sym}
              className="w-6 h-6 rounded text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors text-xs font-medium cursor-pointer"
            >
              {sym}
            </button>
          ))}
        </div>

        <Sep />

        {/* Inline Equation Button */}
        <button
          type="button"
          onMouseDown={noBlur}
          onClick={openEqPopup}
          title="Insert Inline Equation (LaTeX)"
          className="h-7 px-2.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all shrink-0 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm cursor-pointer"
        >
          <span style={{ fontSize: 13 }}>∑</span>
          <span style={{ fontSize: 10 }}>Equation</span>
        </button>

        <Sep />

        {/* ── Bengali & English Font Section ── */}
        <div className="flex items-center gap-1" onMouseDown={noBlur}>
          {/* Bengali mode toggle */}
          <button
            type="button"
            onClick={toggleBengaliMode}
            title={bengaliMode ? 'Exit Bengali Mode' : 'Enable Bengali Mode (whole editor)'}
            className={`px-2 h-7 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer ${
              bengaliMode
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
            }`}
            style={{ fontFamily: `'Hind Siliguri', sans-serif`, fontSize: 13 }}
          >
            বাং
          </button>

          {/* Font picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFontMenu(p => !p)}
              title="Choose Bengali / Stylish Font"
              className="h-7 px-2 rounded-lg text-[10px] font-black text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span style={{ fontFamily: `'${selectedBengaliFont}', sans-serif`, fontSize: 12 }}>অ</span>
              ▾
            </button>
            {showFontMenu && (
              <div className="absolute top-8 left-0 z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[180px]">
                <div className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Bengali Fonts</div>
                {BENGALI_FONTS.map(f => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => selectBengaliFont(f.name)}
                    className={`w-full text-left px-3 py-1.5 hover:bg-indigo-50 transition-colors flex flex-col gap-0.5 cursor-pointer ${selectedBengaliFont === f.name ? 'bg-indigo-50' : ''}`}
                  >
                    <span className="font-black text-xs text-slate-800" style={{ fontFamily: `'${f.name}', sans-serif` }}>
                      {f.label}
                    </span>
                    <span className="text-[9px] text-slate-400">{f.desc}</span>
                  </button>
                ))}

                <div className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 mt-1">English / Stylish Fonts</div>
                {ENGLISH_FONTS.map(ef => (
                  <button
                    key={ef.name}
                    type="button"
                    onClick={() => {
                      exec('fontName', ef.name);
                      setShowFontMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 transition-colors flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-black text-xs text-slate-800" style={{ fontFamily: ef.name }}>
                      {ef.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Apply Bengali font to selection */}
          <button
            type="button"
            onClick={() => applyBengaliFont()}
            title={`Apply ${selectedBengaliFont} to selected text`}
            className="h-7 px-2 rounded-lg text-[10px] font-black text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors shrink-0 cursor-pointer"
          >
            Apply
          </button>
        </div>

        <Sep />

        {/* Clear formatting */}
        <ToolBtn onClick={() => exec('removeFormat')} title="Clear Formatting">
          <span className="text-rose-500 font-black text-xs">✕ Clear</span>
        </ToolBtn>
      </div>

      {/* ── Inline Equation Popup ── */}
      {showEqPopup && (
        <div className="border-b border-indigo-100 bg-indigo-50 p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">Insert Inline Equation</span>
            <button type="button" onClick={() => setShowEqPopup(false)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none px-1">✕</button>
          </div>

          {/* LaTeX input */}
          <input
            autoFocus
            type="text"
            value={eqInput}
            onChange={e => setEqInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insertInlineEquation(); } if (e.key === 'Escape') setShowEqPopup(false); }}
            placeholder="\frac{a}{b}   or   x^2 + y^2 = r^2   or   \sqrt{x}"
            className="w-full rounded-xl border-2 border-indigo-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500 transition-colors"
          />

          {/* Quick templates */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: 'Fraction', t: '\\frac{a}{b}' },
              { label: '√x', t: '\\sqrt{x}' },
              { label: 'x²', t: 'x^{2}' },
              { label: 'xₙ', t: 'x_{n}' },
              { label: '∑', t: '\\sum_{i=1}^{n} x_i' },
              { label: '∫', t: '\\int_{a}^{b} f(x)\\,dx' },
              { label: 'π', t: '\\pi' },
              { label: 'α β γ', t: '\\alpha \\beta \\gamma' },
              { label: 'θ', t: '\\theta' },
              { label: '≤ ≥', t: '\\leq \\geq' },
              { label: '±', t: '\\pm' },
              { label: '×', t: '\\times' },
            ].map(({ label, t }) => (
              <button key={label} type="button"
                onClick={() => setEqInput(p => p ? `${p} ${t}` : t)}
                className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200 transition-all cursor-pointer">
                {label}
              </button>
            ))}
          </div>

          {/* Display mode toggle + live preview */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={eqDisplay} onChange={e => setEqDisplay(e.target.checked)}
                className="rounded accent-indigo-600" />
              <span className="text-[11px] font-bold text-slate-600">Display mode (centred, large)</span>
            </label>
            {eqInput.trim() && (
              <div className="flex-1 min-w-0 bg-white rounded-xl border border-indigo-200 px-3 py-1.5 text-center overflow-x-auto">
                {(() => {
                  try {
                    return <span dangerouslySetInnerHTML={{ __html: katex.renderToString(eqInput, { throwOnError: false, displayMode: eqDisplay }) }} />;
                  } catch {
                    return <span className="text-rose-500 text-xs">{eqInput}</span>;
                  }
                })()}
              </div>
            )}
          </div>

          {/* Insert button */}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowEqPopup(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all cursor-pointer">
              Cancel
            </button>
            <button type="button" onClick={insertInlineEquation}
              disabled={!eqInput.trim()}
              className="px-4 py-1.5 text-xs font-black text-white rounded-lg transition-all disabled:opacity-40 cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              Insert Equation
            </button>
          </div>
        </div>
      )}

      {/* ── Editable area ── */}
      <div className="relative" onClick={() => { setShowFontMenu(false); setShowIconMenu(false); }}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onKeyDown={e => {
            if (e.key === 'Tab') { e.preventDefault(); exec('insertText', '    '); }
          }}
          className="w-full p-4 outline-none text-slate-800 leading-relaxed"
          style={{
            minHeight,
            fontFamily: bengaliMode ? `'${selectedBengaliFont}', sans-serif` : 'inherit',
            fontSize: 14,
          }}
        />
        {isEmpty && (
          <div
            className="absolute top-4 left-4 text-slate-400 pointer-events-none select-none text-sm"
            style={{ fontFamily: bengaliMode ? `'${selectedBengaliFont}', sans-serif` : 'inherit' }}
          >
            {placeholder || 'Write content here...'}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-slate-300 mx-0.5 shrink-0" />;
}

// Safe HTML renderer for formatted content — supports both plain text and HTML
export function RenderQuestionHTML({ html, className = '' }: { html: string; className?: string }) {
  if (!html) return null;
  // If it looks like plain text (no HTML tags), render as-is preserving line breaks
  const hasHTML = /<[a-z][\s\S]*>/i.test(html);
  if (!hasHTML) {
    return (
      <span className={className} style={{ whiteSpace: 'pre-wrap' }}>{html}</span>
    );
  }
  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Baloo+Da+2:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&family=Tiro+Bengali&family=Caveat:wght@600;700&display=swap');`}</style>
      <span
        className={className}
        style={{ whiteSpace: 'pre-wrap' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
