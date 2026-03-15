import { EditorView, Decoration, WidgetType, MatchDecorator, ViewPlugin, type DecorationSet } from '@codemirror/view';
import { EditorState, RangeSetBuilder, type RangeSet } from '@codemirror/state';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export type DecorationClass = 'A' | 'B';

export interface DecorationConfig {
  class: DecorationClass;
  pattern: RegExp;
}

export abstract class LatexDecoration {
  abstract class: DecorationClass;
  abstract pattern: RegExp;
  abstract getRawText(match: RegExpExecArray): string;
  abstract render(match: RegExpExecArray): HTMLElement;
  
  isCollapsed(_state: EditorState, _from: number, _to: number): boolean {
    return false;
  }
  
  handleBackspace?(view: EditorView, pos: number): boolean;
}

export class ItemizeDecoration extends LatexDecoration {
  class: DecorationClass = 'B';
  pattern = /\\item\s+/g;
  
  getRawText(match: RegExpExecArray): string {
    return match[0];
  }
  
  render(match: RegExpExecArray): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-itemize';
    wrap.textContent = '• ';
    wrap.style.color = '#dc2626';
    wrap.style.fontWeight = '600';
    return wrap;
  }
  
  handleBackspace(view: EditorView, pos: number): boolean {
    const line = view.state.doc.lineAt(pos);
    const lineText = line.text;
    
    if (lineText.match(/^(\s*)•/)) {
      const match = lineText.match(/^(\s*)•\s*(.*)$/);
      if (match) {
        const [, indent, content] = match;
        const newText = indent + (content || '');
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: newText }
        });
        return true;
      }
    }
    return false;
  }
}

export class EnumerateDecoration extends LatexDecoration {
  class: DecorationClass = 'B';
  pattern = /\\item\s+/g;
  
  private getItemNumber(match: RegExpExecArray): number {
    const beforeMatch = match.input.slice(0, match.index);
    const itemCount = (beforeMatch.match(/\\item\s+/g) || []).length;
    return itemCount + 1;
  }
  
  getRawText(match: RegExpExecArray): string {
    return match[0];
  }
  
  render(match: RegExpExecArray): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-enumerate';
    const num = this.getItemNumber(match);
    wrap.textContent = `${num}. `;
    wrap.style.color = '#2563eb';
    wrap.style.fontWeight = '600';
    return wrap;
  }
  
  handleBackspace(view: EditorView, pos: number): boolean {
    const line = view.state.doc.lineAt(pos);
    const lineText = line.text;
    
    if (lineText.match(/^(\s*)\d+\./)) {
      const match = lineText.match(/^(\s*)(\d+)\.\s*(.*)$/);
      if (match) {
        const [, indent, num, content] = match;
        const newText = indent + (content || '');
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: newText }
        });
        return true;
      }
    }
    return false;
  }
}

export class InlineMathDecoration extends LatexDecoration {
  class: DecorationClass = 'A';
  pattern = /\$([^\n$]+)\$/g;
  
  getRawText(match: RegExpExecArray): string {
    return match[0];
  }
  
  render(match: RegExpExecArray): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-math-inline';
    const tex = match[1];
    try {
      wrap.innerHTML = '$' + katex.renderToString(tex, {
        displayMode: false,
        throwOnError: false,
        output: 'html'
      }) + '$';
    } catch {
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
  pattern = /\$\$([^\n$]+)\$\$/g;
  
  getRawText(match: RegExpExecArray): string {
    return match[0];
  }
  
  render(match: RegExpExecArray): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cm-math-display';
    const tex = match[1];
    try {
      wrap.innerHTML = '$$' + katex.renderToString(tex, {
        displayMode: true,
        throwOnError: false,
        output: 'html'
      }) + '$$';
    } catch {
      wrap.textContent = match[0];
    }
    return wrap;
  }
  
  isCollapsed(state: EditorState, from: number, to: number): boolean {
    return state.selection.main.head > from && state.selection.main.head < to;
  }
}

let rawMode = false;

export function setRawMode(enabled: boolean) {
  rawMode = enabled;
}

export function isRawMode(): boolean {
  return rawMode;
}

export function toggleRawMode(): boolean {
  rawMode = !rawMode;
  return rawMode;
}

export const decorations: LatexDecoration[] = [
  new ItemizeDecoration(),
  new EnumerateDecoration(),
  new InlineMathDecoration(),
  new DisplayMathDecoration(),
];

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
      
      for (const deco of decorations) {
        const regex = new RegExp(deco.pattern.source, 'g');
        let match;
        
        while ((match = regex.exec(doc)) !== null) {
          const from = match.index;
          const to = from + match[0].length;
          
          const shouldShowRaw = rawMode || 
            (deco.class === 'A' && deco.isCollapsed(view.state, from, to));
          
          if (!shouldShowRaw) {
            const widget = new class extends WidgetType {
              toDOM(): HTMLElement {
                return deco.render(match);
              }
            };
            builder.add(from, to, Decoration.widget({ widget: new widget(), side: 1 }));
          }
        }
      }
      
      return builder.finish();
    }
  }, {
    decorations: (v: any) => v.decorations
  });
}

export function createDecorationKeymap() {
  return import('@codemirror/view').then(({ keymap }) => {
    return keymap.of([{
      key: 'Backspace',
      run: (view: EditorView) => {
        if (rawMode) return false;
        
        const pos = view.state.selection.main.head;
        
        for (const deco of decorations) {
          if (deco.class === 'B' && deco.handleBackspace) {
            if (deco.handleBackspace(view, pos)) {
              return true;
            }
          }
        }
        return false;
      }
    }]);
  });
}

let refreshFn: (() => void) | null = null;

export function setRefreshFn(fn: () => void) {
  refreshFn = fn;
}

export function refreshDecorations() {
  if (refreshFn) {
    refreshFn();
  }
}
