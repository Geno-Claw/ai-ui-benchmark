"use client";

interface SourceViewProps {
  html: string;
}

/** Code viewer for generated HTML source. */
export default function SourceView({ html }: SourceViewProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <span className="text-sm font-medium text-gray-300">Source Code</span>
        <button
          onClick={() => navigator.clipboard.writeText(html)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Copy
        </button>
      </div>
      <pre className="p-4 text-xs text-gray-300 overflow-auto max-h-[600px]">
        <code>{html}</code>
      </pre>
    </div>
  );
}
