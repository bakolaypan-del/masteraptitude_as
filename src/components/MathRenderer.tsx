import React, { useEffect, useRef } from 'react';

interface MathRendererProps {
  text: string;
  className?: string;
  displayMode?: boolean;
}

export function MathRenderer({ text, className = '', displayMode = false }: MathRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current || !text) return;

    try {
      // Check if katex is loaded from CDN
      // @ts-ignore
      if (window.katex) {
        // @ts-ignore
        window.katex.render(text, containerRef.current, {
          throwOnError: false,
          displayMode: displayMode || text.includes('\\int') || text.includes('\\sum') || text.includes('\\frac')
        });
      } else {
        containerRef.current.textContent = text;
      }
    } catch (e) {
      console.error('[MathRenderer] Failed to render LaTeX:', e);
      containerRef.current.textContent = text;
    }
  }, [text, displayMode]);

  return <span ref={containerRef} className={`inline-block ${className}`} />;
}
