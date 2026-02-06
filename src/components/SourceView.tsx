"use client";

import { useState, useMemo } from "react";

interface SourceViewProps {
  html: string;
}

function highlightHTML(code: string): { lineNumber: number; html: string }[] {
  const lines = code.split("\n");
  return lines.map((line, i) => {
    let highlighted = line
      // Escape HTML entities first
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    // Highlight comments
    highlighted = highlighted.replace(
      /(&lt;!--.*?--&gt;)/g,
      '<span class="text-gray-500 italic">$1</span>'
    );
    // Highlight tags
    highlighted = highlighted.replace(
      /(&lt;\/?)([\w-]+)/g,
      '$1<span class="text-blue-400">$2</span>'
    );
    // Highlight attributes
    highlighted = highlighted.replace(
      /\s([\w-]+)(=)/g,
      ' <span class="text-green-400">$1</span>$2'
    );
    // Highlight strings
    highlighted = highlighted.replace(
      /(&quot;[^&]*?&quot;)/g,
      '<span class="text-amber-300">$1</span>'
    );

    return { lineNumber: i + 1, html: highlighted };
  });
}

/** Code viewer for generated HTML source with line numbers and syntax highlighting. */
export default function SourceView({ html }: SourceViewProps) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => highlightHTML(html), [html]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = html;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="h-full flex flex-col rounded-lg border border-gray-800 bg-gray-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
        <span className="text-sm font-medium text-gray-300">Source Code</span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="text-xs leading-5 p-0 m-0">
          <code>
            {lines.map((line) => (
              <div key={line.lineNumber} className="flex hover:bg-gray-900/50">
                <span className="sticky left-0 w-12 shrink-0 text-right pr-4 text-gray-600 select-none bg-gray-950">
                  {line.lineNumber}
                </span>
                <span
                  className="flex-1 pl-4 pr-4 text-gray-300"
                  dangerouslySetInnerHTML={{ __html: line.html }}
                />
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
