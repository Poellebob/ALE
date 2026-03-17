import {
  EditorView,
  Decoration,
  WidgetType,
  ViewPlugin,
  type ViewUpdate,
  type DecorationSet,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import katex from 'katex';

let rawMode = false;

export function setRawMode(enabled: boolean): void {
  rawMode = enabled;
}
export function toggleRawMode(): boolean {
  rawMode = !rawMode;
  return rawMode;
}
export function isRawMode(): boolean {
  return rawMode;
}

let _refresh: (() => void) | null = null;

export function setRefreshFn(fn: () => void): void {
  _refresh = fn;
}
export function refreshDecorations(): void {
  _refresh?.();
}

class InlineMathWidget extends WidgetType {
  constructor(readonly tex: string) {
    super();
  }

  eq(other: InlineMathWidget): boolean {
    return other.tex === this.tex;
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-math-inline';
    try {
      wrap.innerHTML = katex.renderToString(this.tex, {
        displayMode: false,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      wrap.textContent = `$${this.tex}$`;
      wrap.style.color = 'var(--error)';
    }
    return wrap;
  }
}

class DisplayMathWidget extends WidgetType {
  constructor(readonly tex: string) {
    super();
  }

  eq(other: DisplayMathWidget): boolean {
    return other.tex === this.tex;
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cm-math-display';
    try {
      wrap.innerHTML = katex.renderToString(this.tex, {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      wrap.textContent = `$$${this.tex}$$`;
      wrap.style.color = 'var(--error)';
    }
    return wrap;
  }
}

class BulletWidget extends WidgetType {
  eq(): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-itemize-bullet';
    span.textContent = '• ';
    return span;
  }
}

class EnumerateWidget extends WidgetType {
  constructor(readonly number: number) {
    super();
  }

  eq(other: EnumerateWidget): boolean {
    return other.number === this.number;
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-enumerate-number';
    span.textContent = `${this.number}. `;
    return span;
  }
}

function insideEnumerate(text: string, index: number): boolean {
  const before = text.slice(0, index);
  return before.lastIndexOf('\\begin{enumerate}') > before.lastIndexOf('\\begin{itemize}');
}

function itemNumber(text: string, index: number): number {
  const before = text.slice(0, index);
  const afterBegin = text.slice(before.lastIndexOf('\\begin{enumerate}'), index);
  return (afterBegin.match(/\\item\b/g) ?? []).length + 1;
}

function cursorOverlaps(
  view: EditorView,
  from: number,
  to: number,
): boolean {
  for (const range of view.state.selection.ranges) {
    if (range.from <= to && range.to >= from) return true;
  }
  return false;
}

type Candidate = {
  from: number;
  to: number;
  decoration: Decoration;
  priority: number;
};

function build(view: EditorView): DecorationSet {
  if (rawMode) return Decoration.none;

  const doc = view.state.doc;
  const text = doc.toString();
  const candidates: Candidate[] = [];

  const inlineRe = /(?<!\$)\$(?!\$)([^\n$]+?)(?<!\$)\$(?!\$)/g;
  for (const match of text.matchAll(inlineRe)) {
    const from = match.index!;
    const to   = from + match[0].length;

    if (cursorOverlaps(view, from, to)) continue;

    candidates.push({
      from,
      to,
      decoration: Decoration.replace({ widget: new InlineMathWidget(match[1]) }),
      priority: 1,
    });
  }

  const displayRe = /\$\$([\s\S]+?)\$\$/g;
  for (const match of text.matchAll(displayRe)) {
    const matchEnd = match.index! + match[0].length;
    const line = doc.lineAt(matchEnd);

    if (cursorOverlaps(view, match.index!, matchEnd)) continue;

    candidates.push({
      from: line.to,
      to: line.to,
      decoration: Decoration.widget({
        widget: new DisplayMathWidget(match[1]),
        block: true,
        side: 1,
      }),
      priority: 0,
    });
  }

  const itemRe = /\\item(?:\s)/g;
  for (const match of text.matchAll(itemRe)) {
    const from = match.index!;
    const to   = from + match[0].length;
    const widget = insideEnumerate(text, from)
      ? new EnumerateWidget(itemNumber(text, from))
      : new BulletWidget();

    candidates.push({
      from,
      to,
      decoration: Decoration.replace({ widget }),
      priority: 2,
    });
  }

  candidates.sort((a, b) => a.from - b.from || a.priority - b.priority);

  const builder = new RangeSetBuilder<Decoration>();
  let committed = -1;

  for (const { from, to, decoration } of candidates) {
    if (from < committed) continue;
    builder.add(from, to, decoration);
    committed = to;
  }

  return builder.finish();
}

export function createDecorationPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = build(view);
        setRefreshFn(() => {
          this.decorations = build(view);
          view.update([]);
        });
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = build(update.view);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}
