// src/lib/snippets.ts
// Trigger/expansion pairs for the Tab-based snippet system.
//
// Syntax:  $0 = final cursor position after all tab stops are visited
//          $1, $2, ... = ordered tab stop positions
//
// See docs/07-snippets.md for the full expansion algorithm.

export interface Snippet {
  trigger: string;
  expansion: string;
  description?: string;
}

export const snippets: Snippet[] = [
  // --- Lists ---
  {
    trigger: '-',
    expansion: '\\begin{itemize}\n  \\item $0\n\\end{itemize}',
    description: 'Bullet list',
  },
  {
    trigger: '1.',
    expansion: '\\begin{enumerate}\n  \\item $0\n\\end{enumerate}',
    description: 'Numbered list',
  },

  // --- Structure ---
  {
    trigger: 'sec',
    expansion: '\\section{$1}\n\n$0',
    description: 'Section',
  },
  {
    trigger: 'ssec',
    expansion: '\\subsection{$1}\n\n$0',
    description: 'Subsection',
  },
  {
    trigger: 'sssec',
    expansion: '\\subsubsection{$1}\n\n$0',
    description: 'Subsubsection',
  },

  // --- Floats ---
  {
    trigger: 'fig',
    expansion:
      '\\begin{figure}[htbp]\n  \\centering\n  \\includegraphics[width=\\textwidth]{$1}\n  \\caption{$2}\n  \\label{fig:$3}\n\\end{figure}\n\n$0',
    description: 'Figure environment',
  },
  {
    trigger: 'tab',
    expansion:
      '\\begin{table}[htbp]\n  \\centering\n  \\begin{tabular}{$1}\n    \\hline\n    $2\n    \\hline\n  \\end{tabular}\n  \\caption{$3}\n  \\label{tab:$4}\n\\end{table}\n\n$0',
    description: 'Table environment',
  },

  // --- References ---
  { trigger: 'ref',  expansion: '\\ref{$1}$0',   description: 'Reference' },
  { trigger: 'cite', expansion: '\\cite{$1}$0',  description: 'Citation' },

  // --- Text formatting ---
  { trigger: 'em',   expansion: '\\emph{$1}$0',     description: 'Emphasis' },
  { trigger: 'bf',   expansion: '\\textbf{$1}$0',   description: 'Bold' },
  { trigger: 'it',   expansion: '\\textit{$1}$0',   description: 'Italic' },
  { trigger: 'tt',   expansion: '\\texttt{$1}$0',   description: 'Typewriter' },

  // --- Math ---
  {
    trigger: '$$',
    expansion: '$$\n$1\n$$\n$0',
    description: 'Display math',
  },
  {
    trigger: 'eq',
    expansion:
      '\\begin{equation}\n  $1\n  \\label{eq:$2}\n\\end{equation}\n\n$0',
    description: 'Numbered equation',
  },
  {
    trigger: 'align',
    expansion:
      '\\begin{align}\n  $1 &= $2 \\\\\n  $3 &= $4\n\\end{align}\n\n$0',
    description: 'Aligned equations',
  },

  // --- Document template ---
  {
    trigger: 'doc',
    expansion:
      '\\documentclass{article}\n\n\\title{$1}\n\\author{$2}\n\\date{\\today}\n\n\\begin{document}\n\n\\maketitle\n\n$0\n\n\\end{document}',
    description: 'Full document scaffold',
  },
];
