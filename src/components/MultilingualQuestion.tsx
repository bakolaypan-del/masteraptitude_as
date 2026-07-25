import React from 'react';
import { RenderQuestionHTML } from './RichTextEditor';

export type LanguageMode = 'both' | 'en' | 'bn';

/**
 * Sanitizes and repairs HTML fragments to remove orphaned or dangling closing tags
 * like </FONT>, </SPAN>, </DIV>, </P> that appear when splitting dual language strings.
 */
export function cleanOrphanedHTMLTags(html: string): string {
  if (!html) return '';

  // 1. Remove raw text occurrences of orphan closing tags
  let cleaned = html
    .replace(/^(?:\s*<\/(?:font|span|div|p|b|i|u|strong|em|h[1-6])>\s*)+/gi, '')
    .replace(/(?:\s*<\/(?:font|span|div|p|b|i|u|strong|em|h[1-6])>\s*)+$/gi, '')
    .replace(/<\/(?:font|span|div|p)>/gi, '')
    .replace(/<(?:font|span|div|p)[^>]*>\s*<\/(?:font|span|div|p)>/gi, '');

  // 2. Remove literal string tag leaks like "</FONT>" or "</SPAN>" in text
  cleaned = cleaned.replace(/&lt;\/(?:font|span|div|p)&gt;/gi, '');

  // 3. Use DOMParser when available for safe structural cleanup
  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${cleaned}</div>`, 'text/html');
      
      // Clean text nodes of raw tag leaks
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
      let currentNode = walker.nextNode();
      while (currentNode) {
        if (currentNode.nodeValue) {
          currentNode.nodeValue = currentNode.nodeValue
            .replace(/<\/?(?:font|span|div|p|b|i|u|strong|em)[^>]*>/gi, '')
            .trim();
        }
        currentNode = walker.nextNode();
      }

      return doc.body.firstElementChild?.innerHTML || cleaned;
    } catch {
      return cleaned;
    }
  }

  return cleaned;
}

export function parseEnglishAndBengali(htmlOrText: string): { english: string; bengali: string } {
  if (!htmlOrText) return { english: '', bengali: '' };

  const sanitizedInput = cleanOrphanedHTMLTags(htmlOrText);

  const hasBengali = /[\u0980-\u09FF]/.test(sanitizedInput);
  if (!hasBengali) {
    return { english: cleanOrphanedHTMLTags(sanitizedInput), bengali: '' };
  }

  const hasEnglish = /[a-zA-Z]/.test(sanitizedInput.replace(/<[^>]*>/g, ''));
  if (!hasEnglish) {
    return { english: '', bengali: cleanOrphanedHTMLTags(sanitizedInput) };
  }

  let englishResult = '';
  let bengaliResult = '';

  // Check if separated by paragraph tags, break tags, or line breaks
  if (sanitizedInput.includes('<p') || sanitizedInput.includes('<br') || sanitizedInput.includes('\n')) {
    const parts = sanitizedInput
      .split(/(?:<\/p>|<br\s*\/?>|\n)/gi)
      .map(s => s.trim())
      .filter(Boolean);

    const engParts: string[] = [];
    const benParts: string[] = [];

    parts.forEach(part => {
      const cleanPart = cleanOrphanedHTMLTags(part);
      const cleanText = cleanPart.replace(/<[^>]*>/g, '').trim();
      if (/[\u0980-\u09FF]/.test(cleanText)) {
        benParts.push(cleanPart.startsWith('<p') ? cleanPart : `<p>${cleanPart}</p>`);
      } else if (cleanText.length > 0) {
        engParts.push(cleanPart.startsWith('<p') ? cleanPart : `<p>${cleanPart}</p>`);
      }
    });

    englishResult = engParts.join('');
    bengaliResult = benParts.join('');
  } else {
    // Fallback split for inline mixed strings
    const matchBengali = sanitizedInput.match(/[\u0980-\u09FF].*/s);
    if (matchBengali) {
      bengaliResult = matchBengali[0];
      englishResult = sanitizedInput.replace(bengaliResult, '').trim();
    } else {
      englishResult = sanitizedInput;
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

  // Mode: English Only
  if (langMode === 'en') {
    return (
      <div
        className={className}
        style={{ fontFamily: 'Cambria, Georgia, serif', fontWeight: 700, color: '#000000' }}
      >
        <RenderQuestionHTML html={english || questionText} />
      </div>
    );
  }

  // Mode: Bengali Only
  if (langMode === 'bn') {
    return (
      <div
        className={className}
        style={{ fontFamily: "'Tiro Bangla', 'Noto Sans Bengali', 'Hind Siliguri', sans-serif", color: '#dc2626', fontWeight: 600 }}
      >
        <RenderQuestionHTML html={bengali || questionText} />
      </div>
    );
  }

  // Mode: Both (Bilingual)
  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* English Question - Cambria Bold Black */}
      {english && (
        <div style={{ fontFamily: 'Cambria, Georgia, serif', fontWeight: 700, color: '#000000' }} className="text-base md:text-xl leading-relaxed">
          <RenderQuestionHTML html={english} />
        </div>
      )}
      {/* Bengali Question - Stylish Red */}
      {bengali && (
        <div style={{ fontFamily: "'Tiro Bangla', 'Noto Sans Bengali', 'Hind Siliguri', sans-serif", color: '#dc2626', fontWeight: 600 }} className={`text-base md:text-xl leading-relaxed ${english ? 'pt-2.5 border-t border-slate-100' : ''}`}>
          <RenderQuestionHTML html={bengali} />
        </div>
      )}
      {!english && !bengali && (
        <div style={{ fontFamily: 'Cambria, Georgia, serif', fontWeight: 700, color: '#000000' }}>
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

  let textToDisplay = optionText;
  if (langMode === 'en' && english) textToDisplay = english;
  else if (langMode === 'bn' && bengali) textToDisplay = bengali;

  return (
    <span
      className={className}
      style={{ fontFamily: 'Cambria, Georgia, serif', color: '#000000', fontWeight: 600 }}
    >
      <RenderQuestionHTML html={cleanOrphanedHTMLTags(textToDisplay)} />
    </span>
  );
}
