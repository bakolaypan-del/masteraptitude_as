import React, { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const BENGALI_FONTS = [
  { name: 'Hind Siliguri', label: 'হিন্দ', desc: 'Clean & readable' },
  { name: 'Baloo Da 2',    label: 'বালু',  desc: 'Stylish & bold' },
  { name: 'Noto Sans Bengali', label: 'নোটো', desc: 'Universal' },
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
];

const MATH_SYMBOLS = ['²', '³', '½', '¼', '√', '∛', '∞', '≠', '≈', '≤', '≥', '±', '÷', '×', '∑', 'π', 'θ', '°', '→', '←', '↑', '↓'];

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 120 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const emittedRef = useRef('');
  const [bengaliMode, setBengaliMode] = useState(false);
  const [selectedBengaliFont, setSelectedBengaliFont] = useState(BENGALI_FONTS[0].name);
  const [showFontMenu, setShowFontMenu] = useState(false);

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
        {([['1', 'XS', 10], ['2', 'S', 11], ['3', 'M', 13], ['4', 'L', 15], ['5', 'XL', 17]] as [string, string, number][]).map(([sz, lbl, fs]) => (
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
            className="w-5 h-5 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform shrink-0"
            style={{ background: c }}
          />
        ))}

        <Sep />

        {/* Highlight colors */}
        {BG_COLORS.map(({ c, label }) => (
          <button
            key={c} title={`${label} highlight`}
            onClick={() => exec('hiliteColor', c)}
            className="w-5 h-5 rounded border-2 border-slate-300 shadow-sm hover:scale-110 transition-transform flex items-center justify-center shrink-0"
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

        <Sep />

        {/* Math symbols */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {MATH_SYMBOLS.map(sym => (
            <button
              key={sym}
              onClick={() => insertSym(sym)}
              title={sym}
              className="w-6 h-6 rounded text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors text-xs font-medium"
            >
              {sym}
            </button>
          ))}
        </div>

        <Sep />

        {/* ── Bengali Font Section ── */}
        <div className="flex items-center gap-1" onMouseDown={noBlur}>
          {/* Bengali mode toggle */}
          <button
            type="button"
            onClick={toggleBengaliMode}
            title={bengaliMode ? 'Exit Bengali Mode' : 'Enable Bengali Mode (whole editor)'}
            className={`px-2 h-7 rounded-lg text-xs font-black transition-all shrink-0 ${
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
              title="Choose Bengali Font"
              className="h-7 px-2 rounded-lg text-[10px] font-black text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1 shrink-0"
            >
              <span style={{ fontFamily: `'${selectedBengaliFont}', sans-serif`, fontSize: 12 }}>অ</span>
              ▾
            </button>
            {showFontMenu && (
              <div className="absolute top-8 left-0 z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[160px]">
                {BENGALI_FONTS.map(f => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => selectBengaliFont(f.name)}
                    className={`w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors flex flex-col gap-0.5 ${selectedBengaliFont === f.name ? 'bg-indigo-50' : ''}`}
                  >
                    <span className="font-black text-sm text-slate-800" style={{ fontFamily: `'${f.name}', sans-serif` }}>
                      {f.label} — {f.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{f.desc}</span>
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
            className="h-7 px-2 rounded-lg text-[10px] font-black text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors shrink-0"
          >
            Apply
          </button>
        </div>

        <Sep />

        {/* Clear formatting */}
        <ToolBtn onClick={() => exec('removeFormat')} title="Clear Formatting">
          <span className="text-rose-500 font-black text-xs">✕</span>
        </ToolBtn>
      </div>

      {/* ── Editable area ── */}
      <div className="relative" onClick={() => setShowFontMenu(false)}>
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
            {placeholder || 'Write the question here...'}
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
      className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-slate-300 mx-0.5 shrink-0" />;
}

// Safe HTML renderer for question text — supports both plain text and HTML
export function RenderQuestionHTML({ html, className = '' }: { html: string; className?: string }) {
  if (!html) return null;
  // If it looks like plain text (no HTML tags), render as-is preserving line breaks
  const hasHTML = /<[a-z][\s\S]*>/i.test(html);
  if (!hasHTML) {
    return (
      <span className={className} style={{ whiteSpace: 'pre-wrap' }}>{html}</span>
    );
  }
  // Inject Bengali font @font-face so <font face="Hind Siliguri"> renders correctly
  const needsBengali = /font-family|Hind Siliguri|Baloo Da 2|Noto Sans Bengali/i.test(html);
  return (
    <>
      {needsBengali && (
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600&family=Baloo+Da+2:wght@400;600&family=Noto+Sans+Bengali:wght@400;600&display=swap');`}</style>
      )}
      <span
        className={className}
        style={{ whiteSpace: 'pre-wrap' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
