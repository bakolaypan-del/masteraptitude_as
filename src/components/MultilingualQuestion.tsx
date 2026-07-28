import React from 'react';
import { RenderQuestionHTML } from './RichTextEditor';

export type LanguageMode = 'both' | 'en' | 'bn';

/**
 * Strips all raw HTML tags (div, p, span, style attributes, &nbsp;) and decodes entities
 * to return clean, exact text for editing without any messy HTML markup.
 */
export function stripRawHTMLTags(htmlOrText: string): string {
  if (!htmlOrText) return '';

  let cleaned = htmlOrText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '');

  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const doc = new DOMParser().parseFromString(`<div>${cleaned}</div>`, 'text/html');
      cleaned = doc.body.textContent || cleaned;
    } catch {}
  }

  cleaned = cleaned
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  return cleaned
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Sanitizes and repairs HTML fragments to remove orphaned or dangling closing tags
 * like </FONT>, </SPAN>, </DIV>, </P> that appear when splitting dual language strings.
 */
export function cleanOrphanedHTMLTags(html: string): string {
  if (!html) return '';

  let cleaned = html
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/^(?:\s*<\/(?:p|b|i|u|strong|em|h[1-6])>\s*)+/gi, '')
    .replace(/(?:\s*<\/(?:p|b|i|u|strong|em|h[1-6])>\s*)+$/gi, '')
    .replace(/&lt;\/(?:font|span|div|p)&gt;/gi, '');

  return cleaned;
}

export function parseEnglishAndBengali(htmlOrText: string): { english: string; bengali: string } {
  if (!htmlOrText) return { english: '', bengali: '' };

  const raw = htmlOrText.trim();

  // 1. Explicit ' / ' slash separator split (e.g. "Option A / অপশন A" or "20 / ২০")
  if (raw.includes(' / ')) {
    const parts = raw.split(' / ');
    if (parts.length === 2) {
      const p0HasBn = /[\u0980-\u09FF]/.test(parts[0]);
      const p1HasBn = /[\u0980-\u09FF]/.test(parts[1]);
      if (!p0HasBn && p1HasBn) {
        return { english: cleanOrphanedHTMLTags(parts[0].trim()), bengali: cleanOrphanedHTMLTags(parts[1].trim()) };
      }
      if (p0HasBn && !p1HasBn) {
        return { english: cleanOrphanedHTMLTags(parts[1].trim()), bengali: cleanOrphanedHTMLTags(parts[0].trim()) };
      }
    }
  }

  // 2. Check if string contains ANY Bengali script characters (\u0980-\u09FF)
  const hasBengali = /[\u0980-\u09FF]/.test(raw);
  if (!hasBengali) {
    return { english: cleanOrphanedHTMLTags(raw), bengali: '' };
  }

  // 3. Check if there are English letters
  const textWithoutTags = raw.replace(/<[^>]*>/g, '').replace(/&[a-z0-9]+;/gi, '').trim();
  const hasEnglish = /[a-zA-Z]/.test(textWithoutTags);
  if (!hasEnglish) {
    return { english: '', bengali: cleanOrphanedHTMLTags(raw) };
  }

  let englishResult = '';
  let bengaliResult = '';

  // 4. Split by HTML paragraph tags <p>, <br>, or line breaks \n
  if (raw.includes('<p') || raw.includes('<br') || raw.includes('\n')) {
    const parts = raw
      .split(/(?:<\/p>|<br\s*\/?>|\n+)/gi)
      .map(s => s.trim())
      .filter(Boolean);

    const engParts: string[] = [];
    const benParts: string[] = [];

    parts.forEach(part => {
      const cleanPart = cleanOrphanedHTMLTags(part);
      const cleanText = cleanPart.replace(/<[^>]*>/g, '').trim();
      const partHasBn = /[\u0980-\u09FF]/.test(cleanText);
      const partHasEn = /[a-zA-Z]/.test(cleanText);

      if (partHasBn && !partHasEn) {
        benParts.push(cleanPart.startsWith('<p') ? cleanPart : `<p>${cleanPart}</p>`);
      } else if (!partHasBn && partHasEn) {
        engParts.push(cleanPart.startsWith('<p') ? cleanPart : `<p>${cleanPart}</p>`);
      } else if (partHasBn && partHasEn) {
        // Mixed line — check if Bengali starts after English
        const firstBnIndex = cleanText.search(/[\u0980-\u09FF]/);
        const firstEnIndex = cleanText.search(/[a-zA-Z]/);
        if (firstBnIndex > firstEnIndex && firstEnIndex !== -1) {
          const matchBn = cleanPart.match(/[\u0980-\u09FF].*/);
          if (matchBn) {
            const bnStr = matchBn[0].trim();
            const enStr = cleanPart.replace(bnStr, '').replace(/\s*[\/\-:]\s*$/, '').trim();
            if (enStr) engParts.push(enStr.startsWith('<p') ? enStr : `<p>${enStr}</p>`);
            if (bnStr) benParts.push(bnStr.startsWith('<p') ? bnStr : `<p>${bnStr}</p>`);
          } else {
            benParts.push(cleanPart.startsWith('<p') ? cleanPart : `<p>${cleanPart}</p>`);
          }
        } else {
          benParts.push(cleanPart.startsWith('<p') ? cleanPart : `<p>${cleanPart}</p>`);
        }
      } else if (cleanText.length > 0) {
        if (engParts.length > 0) engParts.push(cleanPart.startsWith('<p') ? cleanPart : `<p>${cleanPart}</p>`);
        else benParts.push(cleanPart.startsWith('<p') ? cleanPart : `<p>${cleanPart}</p>`);
      }
    });

    englishResult = engParts.join('');
    bengaliResult = benParts.join('');
  } else {
    // Fallback split for inline mixed string (English first, Bengali second)
    const firstBn = raw.search(/[\u0980-\u09FF]/);
    if (firstBn > 0) {
      englishResult = raw.substring(0, firstBn).replace(/\s*[\/\-:]\s*$/, '').trim();
      bengaliResult = raw.substring(firstBn).trim();
    } else {
      bengaliResult = raw;
    }
  }

  return {
    english: cleanOrphanedHTMLTags(englishResult),
    bengali: cleanOrphanedHTMLTags(bengaliResult)
  };
}

export function RenderMultilingualQuestion({
  questionText,
  langMode = 'both',
  className = '',
}: {
  questionText: string;
  langMode?: LanguageMode;
  className?: string;
}) {
  const { english, bengali } = parseEnglishAndBengali(questionText);

  // English font family & style
  const enStyle: React.CSSProperties = {
    fontFamily: 'Cambria, Georgia, serif',
    fontWeight: 700,
    color: '#000000'
  };

  // Bengali font family & style (Stylish Red Font)
  const bnStyle: React.CSSProperties = {
    fontFamily: "'Baloo Da 2', 'Hind Siliguri', 'Tiro Bangla', 'Noto Sans Bengali', sans-serif",
    fontWeight: 700,
    color: '#dc2626'
  };

  // Mode: English Only
  if (langMode === 'en') {
    return (
      <div className={className} style={enStyle}>
        <RenderQuestionHTML html={english || questionText} />
      </div>
    );
  }

  // Mode: Bengali Only
  if (langMode === 'bn') {
    return (
      <div className={className} style={bnStyle}>
        <RenderQuestionHTML html={bengali || questionText} />
      </div>
    );
  }

  // Mode: Both (Bilingual)
  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* English Question - Cambria Bold Black */}
      {english && (
        <div style={enStyle} className="text-base md:text-xl leading-relaxed">
          <RenderQuestionHTML html={english} />
        </div>
      )}
      {/* Bengali Question - Stylish Red */}
      {bengali && (
        <div style={bnStyle} className={`text-base md:text-xl leading-relaxed ${english ? 'pt-2.5 border-t border-slate-100' : ''}`}>
          <RenderQuestionHTML html={bengali} />
        </div>
      )}
      {!english && !bengali && (
        <div style={enStyle}>
          <RenderQuestionHTML html={questionText} />
        </div>
      )}
    </div>
  );
}

export function RenderMultilingualOption({
  optionText,
  langMode = 'both',
  className = '',
}: {
  optionText: string;
  langMode?: LanguageMode;
  className?: string;
}) {
  const { english, bengali } = parseEnglishAndBengali(optionText);

  const enStyle: React.CSSProperties = {
    fontFamily: 'Cambria, Georgia, serif',
    color: '#1b5e20',
    fontWeight: 600
  };

  const bnStyle: React.CSSProperties = {
    fontFamily: "'Baloo Da 2', 'Hind Siliguri', 'Tiro Bangla', 'Noto Sans Bengali', sans-serif",
    color: '#1b5e20',
    fontWeight: 600
  };

  // Mode: English Only
  if (langMode === 'en') {
    return (
      <span className={className} style={enStyle}>
        <RenderQuestionHTML html={cleanOrphanedHTMLTags(english || optionText)} />
      </span>
    );
  }

  // Mode: Bengali Only
  if (langMode === 'bn') {
    return (
      <span className={className} style={bnStyle}>
        <RenderQuestionHTML html={cleanOrphanedHTMLTags(bengali || optionText)} />
      </span>
    );
  }

  // Mode: Both (Bilingual)
  if (english && bengali) {
    return (
      <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
        <span style={enStyle}>
          <RenderQuestionHTML html={english} />
        </span>
        <span className="text-slate-300 font-bold">/</span>
        <span style={bnStyle}>
          <RenderQuestionHTML html={bengali} />
        </span>
      </span>
    );
  }

  // Single option (either English or Bengali)
  const isBn = /[\u0980-\u09FF]/.test(optionText);
  return (
    <span className={className} style={isBn ? bnStyle : enStyle}>
      <RenderQuestionHTML html={cleanOrphanedHTMLTags(optionText)} />
    </span>
  );
}
