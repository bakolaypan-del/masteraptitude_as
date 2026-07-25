/**
 * Utility for exporting Mock Test Question Papers to PDF and Word (.doc/.docx)
 * Formatted for clean A4 printing with Bengali text (UTF-8) support.
 */

interface ExportTestMeta {
  category?: string;
  topic?: string;
  subjectName?: string;
  duration?: number | string;
  marksPerCorrect?: number | string;
  negativeMarks?: number | string;
}

// Clean HTML tags while preserving line breaks and Bengali text
function cleanText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

// Generate standard HTML string formatted for A4 document print/export
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

    // Option labels
    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

    // Find correct option letter
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
          <strong>Correct Answer:</strong> Option ${correctLetter ? `(${correctLetter})` : ''} ${correctAnswer ? `— ${cleanText(correctAnswer)}` : ''}
        </div>

        ${solution ? `
          <div class="solution-box">
            <strong>Solution / Explanation:</strong><br/>
            ${solution}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${testTitle} - Mock Test</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 20mm 15mm;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: #fff !important;
        color: #000 !important;
      }
      .no-print {
        display: none !important;
      }
      .question-block {
        page-break-inside: avoid;
      }
    }
    body {
      font-family: 'SolaimanLipi', 'Noto Serif Bengali', 'Kalpurush', 'Hind Siliguri', 'Vrinda', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #111827;
      background-color: #ffffff;
      margin: 0 auto;
      padding: 20px;
      max-width: 800px;
    }
    .paper-header {
      text-align: center;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .paper-title {
      font-size: 18pt;
      font-weight: 900;
      margin: 0 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
    }
    .paper-subtitle {
      font-size: 12pt;
      font-weight: 700;
      color: #475569;
      margin: 0 0 8px 0;
    }
    .paper-meta-table {
      width: 100%;
      margin-top: 10px;
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      font-size: 9.5pt;
      font-weight: bold;
      color: #334155;
    }
    .paper-meta-table td {
      padding: 2px 4px;
    }
    .question-block {
      margin-bottom: 22px;
      padding-bottom: 14px;
      border-bottom: 1px id #e2e8f0;
      page-break-inside: avoid;
    }
    .question-header {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 8px;
    }
    .q-num {
      font-weight: 900;
      font-size: 11pt;
      color: #0f172a;
      min-width: 32px;
    }
    .q-text {
      font-weight: 700;
      font-size: 11pt;
      color: #1e293b;
      white-space: pre-line;
      flex: 1;
    }
    .equation-box {
      margin: 6px 0 10px 32px;
      padding: 6px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-family: monospace;
      font-size: 10pt;
    }
    .q-img {
      margin: 8px 0 10px 32px;
    }
    .q-img img {
      max-width: 320px;
      max-height: 200px;
      object-fit: contain;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
      margin-left: 32px;
      margin-bottom: 10px;
    }
    @media (max-width: 600px) {
      .options-grid {
        grid-template-columns: 1fr;
      }
    }
    .option-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 4px 8px;
      font-size: 10.5pt;
      border-radius: 4px;
    }
    .correct-option {
      background-color: #ecfdf5;
      font-weight: bold;
    }
    .option-letter {
      font-weight: 800;
      color: #475569;
      min-width: 22px;
    }
    .option-text {
      color: #334155;
    }
    .ans-box {
      margin-left: 32px;
      margin-top: 6px;
      padding: 4px 8px;
      background: #f1f5f9;
      border-left: 3px solid #10b981;
      font-size: 9.5pt;
      color: #065f46;
    }
    .solution-box {
      margin-left: 32px;
      margin-top: 6px;
      padding: 6px 10px;
      background: #fefce8;
      border-left: 3px solid #f59e0b;
      font-size: 9.5pt;
      color: #78350f;
    }
    .footer-note {
      text-align: center;
      margin-top: 30px;
      padding-top: 12px;
      border-top: 2px solid #1e293b;
      font-size: 9pt;
      font-weight: bold;
      color: #64748b;
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
    MASTER APTITUDE BY SUMAN SIR • OFFICIAL MOCK TEST QUESTION PAPER
  </div>
</body>
</html>`;
}

/**
 * Export Mock Test as Word Document (.doc / .docx compatible)
 */
export function exportMockTestToWord(testTitle: string, questions: any[], meta?: ExportTestMeta) {
  if (!questions || questions.length === 0) {
    alert('This mock test has no questions to export.');
    return;
  }

  const htmlContent = generateMockTestHTML(testTitle, questions, meta);
  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });

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

/**
 * Export Mock Test as A4 Printable PDF
 */
export function exportMockTestToPDF(testTitle: string, questions: any[], meta?: ExportTestMeta) {
  if (!questions || questions.length === 0) {
    alert('This mock test has no questions to export.');
    return;
  }

  const htmlContent = generateMockTestHTML(testTitle, questions, meta);

  // Open printable window with clean A4 print styles
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
