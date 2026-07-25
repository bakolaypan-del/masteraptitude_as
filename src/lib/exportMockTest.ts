/**
 * Utility for exporting Mock Test Question Papers, One Liners, Syllabus, PYQs, Notes,
 * Practice Sets, Current Affairs, and Custom Question Papers to PDF (A4 Print) and Word (.doc/.docx).
 * Formatted for clean, concise, 2-column justified A4 printing with Bengali text (UTF-8) support.
 * Guaranteed no right-column cutoff with strict box-sizing, page bounds, and responsive word wrapping.
 */

export interface ExportTestMeta {
  category?: string;
  topic?: string;
  subjectName?: string;
  duration?: number | string;
  marksPerCorrect?: number | string;
  negativeMarks?: number | string;
}

export interface GenericExportItem {
  id?: string;
  title: string;
  subject?: string;
  category?: string;
  examCategory?: string;
  content?: string;
  description?: string;
  imageUrl?: string;
  imageCaption?: string;
  pdfUrl?: string;
  pdfTitle?: string;
  createdAt?: any;
}

export interface PaperQuestion {
  id?: string;
  qNo: number;
  questionType?: string; // e.g. TYPE 01 - BASIC PROBLEMS
  questionEn: string;
  questionBn?: string;
  options: string[];
  correctAnswer: string;
  solution?: string;
  sourceExam?: string;
  sourceExamColor?: string;
  imageUrl?: string;
}

export interface QuestionPaperSettings {
  headerTitle: string;
  subHeader: string;
  footerText: string;
  category?: string;
  subject?: string;
  duration?: string | number;
  totalMarks?: string | number;
  negativeMarks?: string | number;
  showSolutions?: boolean;
}

// Clean HTML tags while preserving line breaks, Bengali text, and converting caret exponents (113^2 -> 113²)
function cleanText(input?: string): string {
  if (!input) return '';
  let str = input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  // Convert caret exponents e.g. 113^2 -> 113², (113)^2 -> (113)²
  str = str
    .replace(/([\w\d]+|\([^)]+\))\^2\b/g, '$1²')
    .replace(/([\w\d]+|\([^)]+\))\^3\b/g, '$1³')
    .replace(/([\w\d]+|\([^)]+\))\^([0-9a-zA-Z]+)/g, '$1<sup>$2</sup>')
    .replace(/\^2\b/g, '²')
    .replace(/\^3\b/g, '³')
    .replace(/\^1\b/g, '¹')
    .replace(/\^0\b/g, '⁰');

  return str;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MOCK TEST EXPORT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function generateMockTestHTML(testTitle: string, questions: any[], meta?: ExportTestMeta): string {
  const totalQuestions = questions.length;
  const marks = meta?.marksPerCorrect ? Number(meta.marksPerCorrect) : 1;
  const totalMarks = totalQuestions * marks;

  const questionsHTML = questions.map((q, idx) => {
    const qNo = idx + 1;
    const rawText = q.questionText || '';
    const qTextClean = cleanText(rawText) || rawText;
    const options: string[] = Array.isArray(q.options) ? q.options : ['', '', '', ''];
    const correctAnswer = q.correctAnswer || '';
    const solution = cleanText(q.solution || q.explanation || '');

    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const correctIdx = options.findIndex(opt => opt.trim() !== '' && opt.trim() === correctAnswer.trim());
    const correctLetter = correctIdx >= 0 ? optionLetters[correctIdx] : '';

    const optionsHTML = options.map((opt, i) => {
      const letter = optionLetters[i] || String(i + 1);
      const isCorrect = opt.trim() !== '' && opt.trim() === correctAnswer.trim();
      return `
        <div class="option-item ${isCorrect ? 'correct-option' : ''}">
          <span class="option-letter">(${letter})</span>
          <span class="option-text">${cleanText(opt) || opt}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="question-block">
        <div class="question-header">
          <span class="q-num">Q${qNo}.</span>
          <div class="q-text">${qTextClean}</div>
        </div>

        ${q.equationLatex ? `<div class="equation-box">LaTeX: ${q.equationLatex}</div>` : ''}
        ${q.imageUrl ? `<div class="q-img"><img src="${q.imageUrl}" alt="Question Image" /></div>` : ''}

        <div class="options-grid">
          ${optionsHTML}
        </div>

        <div class="ans-box">
          <strong>Ans:</strong> Option ${correctLetter ? `(${correctLetter})` : ''} ${correctAnswer ? `— ${cleanText(correctAnswer)}` : ''}
        </div>

        ${solution ? `
          <div class="solution-box">
            <strong>Solution:</strong> ${solution}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${testTitle} - Mock Test Paper</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    @page {
      size: A4 portrait;
      margin: 10mm 10mm 12mm 10mm;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        background: #fff !important;
        color: #000 !important;
        overflow: visible !important;
      }
      .no-print { display: none !important; }
      .question-block { page-break-inside: avoid; break-inside: avoid; -webkit-column-break-inside: avoid; }
    }
    html, body {
      font-family: 'SolaimanLipi', 'Noto Serif Bengali', 'Kalpurush', 'Hind Siliguri', 'Vrinda', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.35;
      color: #0f172a;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      width: 100%;
      max-width: 100%;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .paper-header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 10px;
      width: 100%;
      max-width: 100%;
      column-span: all;
      -webkit-column-span: all;
    }
    .paper-title {
      font-size: 14pt;
      font-weight: 900;
      margin: 0 0 3px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      word-break: break-word;
    }
    .paper-subtitle {
      font-size: 9.5pt;
      font-weight: 700;
      color: #475569;
      margin: 0 0 4px 0;
    }
    .paper-meta-table {
      width: 100%;
      margin-top: 4px;
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
      font-size: 8.5pt;
      font-weight: bold;
      color: #334155;
    }
    .paper-meta-table td { padding: 1px 4px; }
    
    .questions-container {
      width: 100%;
      max-width: 100%;
      column-count: 2;
      -webkit-column-count: 2;
      -moz-column-count: 2;
      column-gap: 12px;
      -webkit-column-gap: 12px;
      -moz-column-gap: 12px;
      column-rule: 1px solid #e2e8f0;
      -webkit-column-rule: 1px solid #e2e8f0;
      -moz-column-rule: 1px solid #e2e8f0;
    }

    .question-block {
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      page-break-inside: avoid;
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      width: 100%;
      max-width: 100%;
      word-break: break-word;
      overflow-wrap: break-word;
      text-align: justify;
      text-justify: inter-word;
    }
    .question-header {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      margin-bottom: 4px;
      width: 100%;
    }
    .q-num {
      font-weight: 900;
      font-size: 9pt;
      color: #0f172a;
      min-width: 22px;
      shrink: 0;
    }
    .q-text {
      font-weight: 700;
      font-size: 9pt;
      color: #1e293b;
      white-space: pre-line;
      flex: 1;
      min-width: 0;
      word-break: break-word;
      overflow-wrap: break-word;
      text-align: justify;
      text-justify: inter-word;
    }
    .equation-box {
      margin: 4px 0 6px 22px;
      padding: 3px 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-family: monospace;
      font-size: 8pt;
      word-break: break-word;
    }
    .q-img { margin: 4px 0 4px 22px; max-width: 100%; }
    .q-img img {
      max-width: 100% !important;
      max-height: 130px;
      height: auto;
      object-fit: contain;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      display: block;
    }
    .options-grid {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-left: 22px;
      margin-bottom: 4px;
      width: calc(100% - 22px);
    }
    .option-item {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      padding: 2px 4px;
      font-size: 8.5pt;
      border-radius: 3px;
      word-break: break-word;
      overflow-wrap: break-word;
      text-align: justify;
    }
    .correct-option { background-color: #f0fdf4; font-weight: bold; }
    .option-letter { font-weight: 800; color: #475569; min-width: 16px; shrink: 0; }
    .option-text { color: #334155; text-align: justify; word-break: break-word; flex: 1; min-width: 0; }
    .ans-box {
      margin-left: 22px;
      margin-top: 4px;
      padding: 2px 5px;
      background: #f1f5f9;
      border-left: 3px solid #10b981;
      font-size: 8pt;
      color: #065f46;
      text-align: justify;
      word-break: break-word;
    }
    .solution-box {
      margin-left: 22px;
      margin-top: 4px;
      padding: 3px 5px;
      background: #fefce8;
      border-left: 3px solid #f59e0b;
      font-size: 8pt;
      color: #78350f;
      text-align: justify;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .footer-note {
      column-span: all;
      -webkit-column-span: all;
      text-align: center;
      margin-top: 14px;
      padding-top: 6px;
      border-top: 2px solid #0f172a;
      font-size: 8pt;
      font-weight: bold;
      color: #64748b;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="paper-header">
    <h1 class="paper-title">${testTitle}</h1>
    ${meta?.topic ? `<div class="paper-subtitle">Topic: ${meta.topic}</div>` : ''}
    <table class="paper-meta-table">
      <tr>
        <td style="text-align: left;">Category: ${meta?.category || 'General'}</td>
        <td style="text-align: center;">Total Questions: ${totalQuestions}</td>
        <td style="text-align: right;">Full Marks: ${totalMarks}</td>
      </tr>
      <tr>
        <td style="text-align: left;">Duration: ${meta?.duration || 30} Minutes</td>
        <td style="text-align: center;">Correct: +${meta?.marksPerCorrect || 1}</td>
        <td style="text-align: right;">Negative: -${meta?.negativeMarks || 0.25}</td>
      </tr>
    </table>
  </div>

  <div class="questions-container">
    ${questionsHTML}
  </div>

  <div class="footer-note">
    MASTER APTITUDE BY SUMAN SIR • OFFICIAL QUESTION PAPER
  </div>
</body>
</html>`;
}

export function exportMockTestToWord(testTitle: string, questions: any[], meta?: ExportTestMeta) {
  if (!questions || questions.length === 0) {
    alert('This mock test has no questions to export.');
    return;
  }
  const htmlContent = generateMockTestHTML(testTitle, questions, meta);
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeFilename = `${testTitle.replace(/[^a-zA-Z0-9_\-]/g, '_')}_Mock_Test.doc`;
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportMockTestToPDF(testTitle: string, questions: any[], meta?: ExportTestMeta) {
  if (!questions || questions.length === 0) {
    alert('This mock test has no questions to export.');
    return;
  }
  const htmlContent = generateMockTestHTML(testTitle, questions, meta);
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Pop-up blocker prevented opening print window. Please allow pop-ups and try again.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GENERIC PORTION EXPORT FUNCTIONS (One Liners, Syllabus, PYQs, Notes, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export function generateGenericContentHTML(sectionTitle: string, items: GenericExportItem[]): string {
  const itemsHTML = items.map((item, idx) => {
    const itemNo = idx + 1;
    const bodyText = cleanText(item.content || item.description || '');
    const subjectTag = item.subject || item.examCategory || item.category || '';

    return `
      <div class="content-block">
        <div class="content-header">
          <span class="c-num">#${itemNo}</span>
          <div class="c-title">${cleanText(item.title) || item.title}</div>
        </div>

        ${subjectTag ? `<div class="c-badge">${subjectTag}</div>` : ''}

        ${bodyText ? `<div class="c-body">${bodyText}</div>` : ''}

        ${item.imageUrl ? `<div class="c-img"><img src="${item.imageUrl}" alt="Attachment Image" /></div>` : ''}
        ${item.pdfUrl ? `<div class="c-pdf">📄 Attachment PDF: ${item.pdfTitle || item.pdfUrl}</div>` : ''}
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${sectionTitle} - Master Aptitude</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    @page {
      size: A4 portrait;
      margin: 10mm 10mm 12mm 10mm;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        background: #fff !important;
        color: #000 !important;
        overflow: visible !important;
      }
      .no-print { display: none !important; }
      .content-block { page-break-inside: avoid; break-inside: avoid; -webkit-column-break-inside: avoid; }
    }
    html, body {
      font-family: 'SolaimanLipi', 'Noto Serif Bengali', 'Kalpurush', 'Hind Siliguri', 'Vrinda', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.35;
      color: #0f172a;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      width: 100%;
      max-width: 100%;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .section-header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 10px;
      width: 100%;
      column-span: all;
      -webkit-column-span: all;
    }
    .section-title {
      font-size: 14pt;
      font-weight: 900;
      margin: 0 0 3px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      word-break: break-word;
    }
    .section-subtitle {
      font-size: 9pt;
      font-weight: 700;
      color: #475569;
    }

    .contents-container {
      width: 100%;
      max-width: 100%;
      column-count: 2;
      -webkit-column-count: 2;
      -moz-column-count: 2;
      column-gap: 12px;
      -webkit-column-gap: 12px;
      -moz-column-gap: 12px;
      column-rule: 1px solid #e2e8f0;
      -webkit-column-rule: 1px solid #e2e8f0;
      -moz-column-rule: 1px solid #e2e8f0;
    }

    .content-block {
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      page-break-inside: avoid;
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      width: 100%;
      max-width: 100%;
      word-break: break-word;
      overflow-wrap: break-word;
      text-align: justify;
      text-justify: inter-word;
    }
    .content-header {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      margin-bottom: 4px;
      width: 100%;
    }
    .c-num {
      font-weight: 900;
      font-size: 9pt;
      color: #4338ca;
      min-width: 22px;
      shrink: 0;
    }
    .c-title {
      font-weight: 800;
      font-size: 9.5pt;
      color: #0f172a;
      flex: 1;
      min-width: 0;
      word-break: break-word;
      overflow-wrap: break-word;
      text-align: justify;
      text-justify: inter-word;
    }
    .c-badge {
      display: inline-block;
      margin-left: 22px;
      margin-bottom: 4px;
      padding: 1px 5px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      font-size: 7.5pt;
      font-weight: bold;
      color: #475569;
    }
    .c-body {
      margin-left: 22px;
      margin-bottom: 4px;
      font-size: 8.5pt;
      white-space: pre-line;
      color: #334155;
      word-break: break-word;
      overflow-wrap: break-word;
      text-align: justify;
      text-justify: inter-word;
    }
    .c-img { margin: 4px 0 4px 22px; max-width: 100%; }
    .c-img img {
      max-width: 100% !important;
      max-height: 140px;
      height: auto;
      object-fit: contain;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      display: block;
    }
    .c-pdf {
      margin-left: 22px;
      padding: 3px 6px;
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      font-size: 8pt;
      font-weight: bold;
      color: #1e40af;
      word-break: break-word;
    }
    .footer-note {
      column-span: all;
      -webkit-column-span: all;
      text-align: center;
      margin-top: 14px;
      padding-top: 6px;
      border-top: 2px solid #0f172a;
      font-size: 8pt;
      font-weight: bold;
      color: #64748b;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="section-header">
    <h1 class="section-title">${sectionTitle}</h1>
    <div class="section-subtitle">MASTER APTITUDE BY SUMAN SIR • OFFICIAL STUDY MATERIAL</div>
  </div>

  <div class="contents-container">
    ${itemsHTML}
  </div>

  <div class="footer-note">
    MASTER APTITUDE BY SUMAN SIR • OFFICIAL A4 STUDY MATERIAL
  </div>
</body>
</html>`;
}

export function exportGenericContentToWord(sectionTitle: string, items: GenericExportItem[]) {
  if (!items || items.length === 0) {
    alert('No items found to export.');
    return;
  }
  const htmlContent = generateGenericContentHTML(sectionTitle, items);
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeFilename = `${sectionTitle.replace(/[^a-zA-Z0-9_\-]/g, '_')}_MasterAptitude.doc`;
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportGenericContentToPDF(sectionTitle: string, items: GenericExportItem[]) {
  if (!items || items.length === 0) {
    alert('No items found to export.');
    return;
  }
  const htmlContent = generateGenericContentHTML(sectionTitle, items);
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Pop-up blocker prevented opening print window. Please allow pop-ups and try again.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. QUESTION PAPER MAKER EXPORT FUNCTIONS (English + Bengali, Custom Header/Footer, Colored Exam Tags, Answer Key Grid Table)
// ─────────────────────────────────────────────────────────────────────────────

export function generateCustomQuestionPaperHTML(settings: QuestionPaperSettings, questions: PaperQuestion[]): string {
  const totalQuestions = questions.length;
  const headerTitle = settings.headerTitle || 'MASTER APTITUDE BY SUMAN SIR';
  const subHeader = settings.subHeader || 'OFFICIAL EXAM PRACTICE QUESTION PAPER';
  const footerText = settings.footerText || 'MASTER APTITUDE • ALL RIGHTS RESERVED';
  const paperCategory = settings.category || 'All Competitive Exams';

  // Option letters mapping
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Answer Key mapping array for the summary table
  const answerKeyItems = questions.map((q, idx) => {
    const qNo = q.qNo || (idx + 1);
    const options = Array.isArray(q.options) ? q.options : [];
    const correctIdx = options.findIndex(opt => opt.trim() !== '' && opt.trim() === (q.correctAnswer || '').trim());
    const letter = correctIdx >= 0 ? optionLetters[correctIdx] : (q.correctAnswer ? q.correctAnswer.substring(0, 1).toUpperCase() : '-');
    return { qNo, letter, ans: q.correctAnswer };
  });

  const questionsHTML = questions.map((q, idx) => {
    const qNo = q.qNo || (idx + 1);
    const qEn = cleanText(q.questionEn);
    const qBn = cleanText(q.questionBn);
    const options: string[] = Array.isArray(q.options) ? q.options : ['', '', '', ''];
    const examBadge = q.sourceExam?.trim() || '';
    const badgeColor = q.sourceExamColor || 'purple';

    const qTypeHeader = q.questionType?.trim() || '';
    const prevType = idx > 0 ? questions[idx - 1]?.questionType?.trim() : '';
    const showTypeBanner = qTypeHeader !== '' && (idx === 0 || qTypeHeader.toLowerCase() !== prevType.toLowerCase());

    const optionsHTML = options.map((opt, i) => {
      const letter = optionLetters[i] || String(i + 1);
      return `
        <div class="paper-option-item">
          <span class="paper-option-letter">(${letter})</span>
          <span class="paper-option-text">${cleanText(opt) || opt}</span>
        </div>
      `;
    }).join('');

    return `
      ${showTypeBanner ? `
        <div class="question-type-banner">
          <span class="type-badge">${qTypeHeader.toUpperCase()}</span>
        </div>
      ` : ''}

      <div class="paper-q-block">
        <div class="paper-q-header">
          <span class="paper-q-num">Q${qNo}.</span>
          <div class="paper-q-body">
            ${qEn ? `<div class="q-lang-en">${qEn}</div>` : ''}
            ${qBn ? `<div class="q-lang-bn">${qBn}</div>` : ''}
          </div>
        </div>

        ${examBadge ? `
          <div class="exam-tag badge-${badgeColor}">
            Asked in: ${examBadge}
          </div>
        ` : ''}

        ${q.imageUrl ? `<div class="paper-q-img"><img src="${q.imageUrl}" alt="Diagram" /></div>` : ''}

        <div class="paper-options-list">
          ${optionsHTML}
        </div>
      </div>
    `;
  }).join('');

  // Generate Answer Key Table (5 columns per row)
  const rows: typeof answerKeyItems[] = [];
  for (let i = 0; i < answerKeyItems.length; i += 5) {
    rows.push(answerKeyItems.slice(i, i + 5));
  }

  const answerKeyTableHTML = rows.map(row => `
    <tr>
      ${row.map(item => `
        <td class="ak-cell">
          <span class="ak-qno">Q${item.qNo}.</span>
          <span class="ak-ans">(${item.letter})</span>
        </td>
      `).join('')}
      ${row.length < 5 ? Array(5 - row.length).fill('<td class="ak-cell-empty"></td>').join('') : ''}
    </tr>
  `).join('');

  // Detailed Solutions HTML (if enabled)
  const solutionsHTML = questions.filter(q => q.solution && q.solution.trim() !== '').map(q => `
    <div class="sol-item">
      <strong>Q${q.qNo || 1} Solution:</strong> ${cleanText(q.solution)}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${headerTitle} - Question Paper</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    @page {
      size: A4 portrait;
      margin: 10mm 10mm 12mm 10mm;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        background: #fff !important;
        color: #000 !important;
        overflow: visible !important;
      }
      .no-print { display: none !important; }
      .paper-q-block, .answer-key-wrapper, .question-type-banner { page-break-inside: avoid; break-inside: avoid; -webkit-column-break-inside: avoid; }
    }
    html, body {
      font-family: 'SolaimanLipi', 'Noto Serif Bengali', 'Kalpurush', 'Hind Siliguri', 'Vrinda', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.35;
      color: #0f172a;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      width: 100%;
      max-width: 100%;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .custom-paper-header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 10px;
      width: 100%;
      column-span: all;
      -webkit-column-span: all;
    }
    .main-h-title {
      font-size: 14pt;
      font-weight: 900;
      margin: 0 auto 4px auto;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      background: #fef08a;
      display: inline-block;
      padding: 3px 14px;
      border-radius: 6px;
      border: 1.5px solid #eab308;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
      word-break: break-word;
    }
    .sub-h-title {
      font-size: 10pt;
      font-weight: 800;
      color: #334155;
      margin: 0 0 4px 0;
    }
    .paper-meta-bar {
      width: 100%;
      margin-top: 4px;
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
      font-size: 8.5pt;
      font-weight: bold;
      color: #475569;
    }
    .paper-meta-bar td { padding: 1px 4px; }

    /* Centered Yellow Highlighted Type / Section Banner */
    .question-type-banner {
      width: 100%;
      text-align: center;
      margin: 10px auto 8px auto;
      column-span: all;
      -webkit-column-span: all;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .type-badge {
      display: inline-block;
      background: #fef08a;
      color: #854d0e;
      font-size: 9.5pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 16px;
      border: 1.5px solid #eab308;
      border-radius: 6px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      word-break: break-word;
      margin: 0 auto;
    }

    /* 2-Column Mode for Questions */
    .paper-questions-grid {
      width: 100%;
      max-width: 100%;
      column-count: 2;
      -webkit-column-count: 2;
      -moz-column-count: 2;
      column-gap: 12px;
      -webkit-column-gap: 12px;
      -moz-column-gap: 12px;
      column-rule: 1px solid #e2e8f0;
      -webkit-column-rule: 1px solid #e2e8f0;
      -moz-column-rule: 1px solid #e2e8f0;
    }

    .paper-q-block {
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      page-break-inside: avoid;
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      width: 100%;
      max-width: 100%;
      word-break: break-word;
      overflow-wrap: break-word;
      text-align: justify;
      text-justify: inter-word;
    }
    .paper-q-header {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      margin-bottom: 4px;
      width: 100%;
    }
    .paper-q-num {
      font-weight: 900;
      font-size: 9pt;
      color: #0f172a;
      min-width: 22px;
      shrink: 0;
    }
    .paper-q-body {
      flex: 1;
      min-width: 0;
      word-break: break-word;
    }
    .q-lang-en {
      font-family: 'Cambria', 'Georgia', serif;
      font-weight: 800;
      font-size: 14pt;
      color: #000000;
      margin-bottom: 2px;
      text-align: justify;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .q-lang-bn {
      font-weight: 800;
      font-size: 14pt;
      color: #dc2626;
      margin-bottom: 2px;
      text-align: justify;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    
    /* Exam Source Badges with Vibrant Colors */
    .exam-tag {
      display: inline-block;
      margin-left: 22px;
      margin-top: 2px;
      margin-bottom: 4px;
      padding: 1px 5px;
      font-size: 7.5pt;
      font-weight: 800;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      word-break: break-word;
    }
    .badge-purple { background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe; }
    .badge-blue { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
    .badge-emerald { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
    .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-rose { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }

    .paper-q-img { margin: 4px 0 4px 22px; max-width: 100%; }
    .paper-q-img img {
      max-width: 100% !important;
      max-height: 130px;
      height: auto;
      object-fit: contain;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      display: block;
    }
    .paper-options-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 3px 8px;
      margin-left: 22px;
      margin-top: 4px;
      width: calc(100% - 22px);
    }
    .paper-option-item {
      display: flex;
      align-items: flex-start;
      gap: 3px;
      font-family: 'Cambria', 'Georgia', serif;
      font-size: 14pt;
      text-align: justify;
      word-break: break-word;
      overflow-wrap: break-word;
      color: #047857;
      font-weight: 700;
    }
    .paper-option-letter { font-family: 'Cambria', 'Georgia', serif; font-weight: 900; font-size: 14pt; color: #047857; min-width: 20px; shrink: 0; }
    .paper-option-text { font-family: 'Cambria', 'Georgia', serif; font-size: 14pt; color: #047857; font-weight: 700; flex: 1; min-width: 0; word-break: break-word; }

    /* Answer Key Table Section */
    .answer-key-wrapper {
      column-span: all;
      -webkit-column-span: all;
      margin-top: 18px;
      padding-top: 10px;
      border-top: 2px solid #0f172a;
      page-break-inside: avoid;
      width: 100%;
    }
    .ak-header-title {
      text-align: center;
      font-size: 10.5pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .answer-key-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .ak-cell {
      border: 1px solid #cbd5e1;
      padding: 3px 5px;
      text-align: center;
      font-size: 8.5pt;
      background: #f8fafc;
    }
    .ak-cell-empty {
      border: 1px solid #cbd5e1;
      background: #ffffff;
    }
    .ak-qno { font-weight: 900; color: #0f172a; margin-right: 2px; }
    .ak-ans { font-weight: 800; color: #059669; }

    .solutions-container {
      margin-top: 8px;
      padding: 6px;
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 6px;
    }
    .sol-title {
      font-size: 8.5pt;
      font-weight: 900;
      color: #854d0e;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .sol-item {
      font-size: 8.5pt;
      color: #713f12;
      margin-bottom: 3px;
      text-align: justify;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .custom-paper-footer {
      column-span: all;
      -webkit-column-span: all;
      text-align: center;
      margin-top: 16px;
      padding-top: 6px;
      border-top: 2px solid #0f172a;
      font-size: 8pt;
      font-weight: bold;
      color: #64748b;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="custom-paper-header">
    <h1 class="main-h-title">${headerTitle}</h1>
    <div class="sub-h-title">${subHeader}</div>
    <table class="paper-meta-bar">
      <tr>
        <td style="text-align: left;">Category: ${paperCategory}</td>
        <td style="text-align: center;">Total Questions: ${totalQuestions}</td>
        <td style="text-align: right;">Full Marks: ${settings.totalMarks || totalQuestions}</td>
      </tr>
      ${settings.duration ? `
        <tr>
          <td style="text-align: left;">Time Allowed: ${settings.duration} Minutes</td>
          <td style="text-align: center;">Medium: English & Bengali</td>
          <td style="text-align: right;">Negative: -${settings.negativeMarks || 0.25}</td>
        </tr>
      ` : ''}
    </table>
  </div>

  <div class="paper-questions-grid">
    ${questionsHTML}
  </div>

  <!-- ANSWER KEY TABLE SECTION AT THE END -->
  <div class="answer-key-wrapper">
    <div class="ak-header-title">ANSWER KEY SHEET (উত্তরপত্র)</div>
    <table class="answer-key-table">
      ${answerKeyTableHTML}
    </table>

    ${settings.showSolutions && solutionsHTML ? `
      <div class="solutions-container">
        <div class="sol-title">DETAILED SOLUTIONS & EXPLANATIONS</div>
        ${solutionsHTML}
      </div>
    ` : ''}
  </div>

  <div class="custom-paper-footer">
    ${footerText}
  </div>
</body>
</html>`;
}

export function exportCustomQuestionPaperToWord(settings: QuestionPaperSettings, questions: PaperQuestion[]) {
  if (!questions || questions.length === 0) {
    alert('Please add at least one question to generate the paper.');
    return;
  }
  const htmlContent = generateCustomQuestionPaperHTML(settings, questions);
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeFilename = `${(settings.subHeader || 'Question_Paper').replace(/[^a-zA-Z0-9_\-]/g, '_')}.doc`;
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCustomQuestionPaperToPDF(settings: QuestionPaperSettings, questions: PaperQuestion[]) {
  if (!questions || questions.length === 0) {
    alert('Please add at least one question to generate the paper.');
    return;
  }
  const htmlContent = generateCustomQuestionPaperHTML(settings, questions);
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Pop-up blocker prevented opening print window. Please allow pop-ups and try again.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };
}
