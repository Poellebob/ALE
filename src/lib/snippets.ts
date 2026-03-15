export interface Snippet {
  trigger: string;
  expansion: string;
}

export const snippets: Snippet[] = [
  { trigger: '-',   expansion: '\\begin{itemize}\n  \\item $0\n\\end{itemize}' },
  { trigger: '1.',  expansion: '\\begin{enumerate}\n  \\item $0\n\\end{enumerate}' },
  { trigger: 'sec', expansion: '\\section{$0}\n$1' },
  { trigger: 'ssec', expansion: '\\subsection{$0}\n$1' },
  { trigger: 'fig', expansion: '\\begin{figure}[htbp]\n  \\centering\n  \\includegraphics{$1}\n  \\caption{$2}\n  \\label{fig:$3}\n\\end{figure}\n$0' },
  { trigger: 'tab', expansion: '\\begin{table}[htbp]\n  \\centering\n  \\begin{tabular}{$1}\n    \\hline\n    $2\n    \\hline\n  \\end{tabular}\n  \\caption{$3}\n  \\label{tab:$4}\n\\end{table}\n$0' },
  { trigger: 'ref', expansion: '\\ref{$1}$0' },
  { trigger: 'cite', expansion: '\\cite{$1}$0' },
  { trigger: 'em', expansion: '\\emph{$1}$0' },
  { trigger: 'bf', expansion: '\\textbf{$1}$0' },
  { trigger: 'it', expansion: '\\textit{$1}$0' },
  { trigger: '$$', expansion: '$$\n$1\n$$' },
];
