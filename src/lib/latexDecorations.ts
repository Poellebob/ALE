import { EditorView, Decoration, WidgetType, ViewPlugin, keymap } from '@codemirror/view';
import { EditorState, RangeSetBuilder, type RangeSet } from '@codemirror/state';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export type DecorationClass = 'A' | 'B';

export abstract class LatexDecoration {
  abstract class: DecorationClass;
  abstract pattern: RegExp;
  abstract getRawText(match: RegExpExecArray): string;
  abstract render(match: RegExpExecArray): HTMLElement;
  
  isCollapsed(_state: EditorState, _from: number, _to: number): boolean {
    return false;
  }
  
  handleBackspace?(view: EditorView, pos: number): boolean;
  
  enabled?(): boolean;
}

let rawMode = false;

export function toggleRawMode(): boolean {
  rawMode = !rawMode;
  return rawMode;
}

export function isRawMode(): boolean {
  return rawMode;
}

let renderSettings = { math: true, formatting: true, headings: true };

export function setRenderSettings(math: boolean, formatting: boolean, headings: boolean) {
  renderSettings = { math, formatting, headings };
}

export class InlineMathDecoration extends LatexDecoration {
  class: DecorationClass = 'A';
  pattern = /\$([^$\n]+)\$/g;
  
  enabled(): boolean { return renderSettings.math; }
  
  getRawText(match: RegExpExecArray): string { return match[0]; }
  
  render(match: RegExpExecArray): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-math-inline';
    const tex = match[1];
    try {
      wrap.innerHTML = '$' + katex.renderToString(tex, { displayMode: false, throwOnError: true, output: 'html' }) + '$';
    } catch (error) {
      console.error('KaTeX inline math parsing error:', error, 'for:', tex);
      wrap.textContent = match[0];
    }
    return wrap;
  }
  
  isCollapsed(state: EditorState, from: number, to: number): boolean {
    return state.selection.main.head > from && state.selection.main.head < to;
  }
}

export class DisplayMathDecoration extends LatexDecoration {
  class: DecorationClass = 'A';
  pattern = /\$\$([^$]+)\$\$/g;
  
  enabled(): boolean { return renderSettings.math; }
  
  getRawText(match: RegExpExecArray): string { return match[0]; }
  
  render(match: RegExpExecArray): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cm-math-display';
    const tex = match[1];
    try {
      wrap.innerHTML = '$$' + katex.renderToString(tex, { displayMode: true, throwOnError: true, output: 'html' }) + '$$';
    } catch (error) {
      console.error('KaTeX display math parsing error:', error, 'for:', tex);
      wrap.textContent = match[0];
    }
    return wrap;
  }
  
  isCollapsed(state: EditorState, from: number, to: number): boolean {
    return state.selection.main.head > from && state.selection.main.head < to;
  }
}

export class BoldDecoration extends LatexDecoration {
  class: DecorationClass = 'A';
  pattern = /\\textbf\{([^}]+)\}/g;
  
  enabled(): boolean { return renderSettings.formatting; }
  
  getRawText(match: RegExpExecArray): string { return match[0]; }
  
  render(match: RegExpExecArray): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-bold';
    wrap.textContent = match[1];
    wrap.style.fontWeight = 'bold';
    return wrap;
  }
  
  isCollapsed(state: EditorState, from: number, to: number): boolean {
    return state.selection.main.head > from && state.selection.main.head < to;
  }
}

export class ItalicDecoration extends LatexDecoration {
  class: DecorationClass = 'A';
  pattern = /\\textit\{([^}]+)\}|\\emph\{([^}]+)\}/g;
  
  enabled(): boolean { return renderSettings.formatting; }
  
  getRawText(match: RegExpExecArray): string { return match[0]; }
  
  render(match: RegExpExecArray): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-italic';
    wrap.textContent = match[1] || match[2];
    wrap.style.fontStyle = 'italic';
    return wrap;
  }
  
  isCollapsed(state: EditorState, from: number, to: number): boolean {
    return state.selection.main.head > from && state.selection.main.head < to;
  }
}

export class SectionDecoration extends LatexDecoration {
  class: DecorationClass = 'A';
  pattern = /\\section\{([^}]+)\}/g;
  
  enabled(): boolean { return renderSettings.headings; }
  
  getRawText(match: RegExpExecArray): string { return match[0]; }
  
  render(match: RegExpExecArray): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cm-heading cm-section';
    wrap.textContent = match[1];
    wrap.style.fontSize = '1.4em';
    wrap.style.fontWeight = 'bold';
    wrap.style.marginTop = '1em';
    return wrap;
  }
  
  isCollapsed(state: EditorState, from: number, to: number): boolean {
    return state.selection.main.head > from && state.selection.main.head < to;
  }
}

export class SubsectionDecoration extends LatexDecoration {
  class: DecorationClass = 'A';
  pattern = /\\subsection\{([^}]+)\}/g;
  
  enabled(): boolean { return renderSettings.headings; }
  
  getRawText(match: RegExpExecArray): string { return match[0]; }
  
  render(match: RegExpExecArray): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cm-heading cm-subsection';
    wrap.textContent = match[1];
    wrap.style.fontSize = '1.2em';
    wrap.style.fontWeight = 'bold';
    wrap.style.marginTop = '0.8em';
    return wrap;
  }
  
  isCollapsed(state: EditorState, from: number, to: number): boolean {
    return state.selection.main.head > from && state.selection.main.head < to;
  }
}

export class SubsubsectionDecoration extends LatexDecoration {
  class: DecorationClass = 'A';
  pattern = /\\subsubsection\{([^}]+)\}/g;
  
  enabled(): boolean { return renderSettings.headings; }
  
  getRawText(match: RegExpExecArray): string { return match[0]; }
  
  render(match: RegExpExecArray): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cm-heading cm-subsubsection';
    wrap.textContent = match[1];
    wrap.style.fontSize = '1.1em';
    wrap.style.fontWeight = 'bold';
    wrap.style.marginTop = '0.6em';
    return wrap;
  }
  
  isCollapsed(state: EditorState, from: number, to: number): boolean {
    return state.selection.main.head > from && state.selection.main.head < to;
  }
}

function findListType(doc: string, itemPos: number): 'itemize' | 'enumerate' | null {
  const before = doc.slice(0, itemPos);
  const itemizeMatch = before.match(/\\begin\{itemize\}/);
  const enumerateMatch = before.match(/\\begin\{enumerate\}/);
  
  if (!itemizeMatch && !enumerateMatch) return null;
  if (!itemizeMatch) return 'enumerate';
  if (!enumerateMatch) return 'itemize';
  
  return itemizeMatch.index! > enumerateMatch.index! ? 'itemize' : 'enumerate';
}

export class ListItemDecoration extends LatexDecoration {
  class: DecorationClass = 'B';
  pattern = /\\item\s+/g;
  
  getRawText(match: RegExpExecArray): string { return match[0]; }
  
  render(match: RegExpExecArray): HTMLElement {
    const doc = match.input;
    const itemPos = match.index!;
    const listType = findListType(doc, itemPos);
    
    const wrap = document.createElement('span');
    wrap.className = 'cm-list-item';
    
    if (listType === 'enumerate') {
      const beforeMatch = doc.slice(0, itemPos);
      const itemCount = (beforeMatch.match(/\\item\s+/g) || []).length;
      wrap.textContent = `${itemCount + 1}. `;
      wrap.style.color = '#2563eb';
    } else {
      wrap.textContent = '• ';
      wrap.style.color = '#dc2626';
    }
    wrap.style.fontWeight = '600';
    return wrap;
  }
  
  handleBackspace(view: EditorView, pos: number): boolean {
    const line = view.state.doc.lineAt(pos);
    const lineText = line.text;
    
    if (lineText.match(/^(\s*)(•|\d+\.)\s*/)) {
      const match = lineText.match(/^(\s*)(•|\d+\.)\s*(.*)$/);
      if (match) {
        const [, indent, , content] = match;
        const newText = indent + (content || '');
        view.dispatch({ changes: { from: line.from, to: line.to, insert: newText } });
        return true;
      }
    }
    return false;
  }
}

export const decorations: LatexDecoration[] = [
  new InlineMathDecoration(),
  new DisplayMathDecoration(),
  new BoldDecoration(),
  new ItalicDecoration(),
  new SectionDecoration(),
  new SubsectionDecoration(),
  new SubsubsectionDecoration(),
  new ListItemDecoration(),
];

interface DecorationRange {
  from: number;
  to: number;
  deco: LatexDecoration;
  match: RegExpExecArray;
}

export function createDecorationPlugin() {
  return ViewPlugin.fromClass(class {
    decorations: RangeSet<Decoration>;
    
    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }
    
    update(update: any) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }
    
    buildDecorations(view: EditorView): RangeSet<Decoration> {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc.toString();
      
      const ranges: DecorationRange[] = [];
      
              for (const deco of decorations) {
                if (deco.enabled && !deco.enabled()) continue;
                
                deco.pattern.lastIndex = 0; // Reset regex for consistent iteration
                let match;
                
                while ((match = deco.pattern.exec(doc)) !== null) {
                  const from = match.index;
                  const to = from + match[0].length;          
          const shouldShowRaw = rawMode || 
            (deco.class === 'A' && deco.isCollapsed(view.state, from, to));
          
          if (!shouldShowRaw) {
            ranges.push({ from, to, deco, match });
          }
        }
      }
      
      ranges.sort((a, b) => a.from - b.from);
      
      for (const range of ranges) {
        const widget = new class extends WidgetType {
          toDOM(): HTMLElement { return range.deco.render(range.match); }
        };
        
        const deco = Decoration.replace({ widget });
        
        if (range.deco.class === 'B') {
          builder.add(range.from, range.from + 1, deco);
        } else {
          builder.add(range.from, range.to, deco);
        }
      }
      
      return builder.finish();
    }
  }, {
    decorations: (v: any) => v.decorations
  });
}

export const decorationKeymap = keymap.of([{
  key: 'Backspace',
  run: (view: EditorView) => {
    if (rawMode) return false;
    const pos = view.state.selection.main.head;
    for (const deco of decorations) {
      if (deco.class === 'B' && deco.handleBackspace) {
        if (deco.handleBackspace(view, pos)) return true;
      }
    }
    return false;
  }
}]);

let refreshFn: (() => void) | null = null;

export function setRefreshFn(fn: () => void) {
  refreshFn = fn;
}

export function refreshDecorations() {
  if (refreshFn) refreshFn();
}
