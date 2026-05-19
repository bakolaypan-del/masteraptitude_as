import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  key?: any;
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export default function MathRenderer({ latex, displayMode = false, className = '' }: MathRendererProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current || !latex.trim()) return;
    try {
      katex.render(latex, ref.current, {
        displayMode,
        throwOnError: false,
        trust: false,
      });
    } catch {
      if (ref.current) ref.current.textContent = latex;
    }
  }, [latex, displayMode]);

  return <span ref={ref} className={className} />;
}

// Renders a question string that may contain LaTeX blocks wrapped in $...$ or $$...$$
// Plain text outside delimiters is rendered as-is.
export function RenderMathText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;

  // Split on $$ (display) then $ (inline)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const displayStart = remaining.indexOf('$$');
    const inlineStart = remaining.indexOf('$');

    // No more LaTeX
    if (inlineStart === -1) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    // Display math $$...$$
    if (displayStart !== -1 && displayStart === inlineStart) {
      const endIdx = remaining.indexOf('$$', displayStart + 2);
      if (endIdx !== -1) {
        if (displayStart > 0) parts.push(<span key={key++}>{remaining.slice(0, displayStart)}</span>);
        const latex = remaining.slice(displayStart + 2, endIdx);
        parts.push(<MathRenderer key={key++} latex={latex} displayMode className="block my-2" />);
        remaining = remaining.slice(endIdx + 2);
        continue;
      }
    }

    // Inline math $...$
    const endInline = remaining.indexOf('$', inlineStart + 1);
    if (endInline !== -1) {
      if (inlineStart > 0) parts.push(<span key={key++}>{remaining.slice(0, inlineStart)}</span>);
      const latex = remaining.slice(inlineStart + 1, endInline);
      parts.push(<MathRenderer key={key++} latex={latex} displayMode={false} />);
      remaining = remaining.slice(endInline + 1);
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }

  return <span className={className}>{parts}</span>;
}
