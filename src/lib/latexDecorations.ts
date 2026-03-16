import {
  EditorView,
  Decoration,
  WidgetType,
  ViewPlugin,
  type DecorationSet,
} from '@codemirror/view';
import { EditorState, RangeSetBuilder } from '@codemirror/state';
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

abstract class LatexWidget extends WidgetType {
  abstract renderDOM(): HTMLElement;

  toDOM(): HTMLElement {
    return this.renderDOM();
  }

  eq(other: LatexWidget): boolean {
    return this.renderDOM().textContent === other.renderDOM().textContent;
  }
}


class InlineMathWidget extends LatexWidget {
  constructor(private readonly tex: string) {
    super();
  }

  renderDOM(): HTMLElement {
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

  eq(other: LatexWidget): boolean {
    return other instanceof InlineMathWidget && other.tex === this.tex;
  }
}

class DisplayMathWidget extends LatexWidget {
  constructor(private readonly tex: string) {
    super();
  }

  renderDOM(): HTMLElement {
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

  eq(other: LatexWidget): boolean {
    return other instanceof DisplayMathWidget && other.tex === this.tex;
  }
}

class HideWidget extends LatexWidget {
  renderDOM(): HTMLElement {
    const span = document.createElement('span');
  }
}

class BulletWidget extends LatexWidget {
  renderDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-itemize-bullet';
    span.textContent = '• ';
    return span;
  }
}

class EnumerateWidget extends LatexWidget {
  constructor(private readonly number: number) {
    super();
  }

  renderDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-enumerate-number';
    span.textContent = `${this.number}. `;
    return span;
  }

  eq(other: LatexWidget): boolean {
    return other instanceof EnumerateWidget && other.number === this.number;
  }
}

function isCursorInRange(
  state: EditorState,
  from: number,
  to: number
): boolean {
  for (const range of state.selection.ranges) {
    if (range.head >= from && range.head <= to) return true;
    if (range.anchor >= from && range.anchor <= to) return true;
  }
  return false;
}

function itemNumber(text: string, index: number): number {
  const before = text.slice(0, index);
  return (before.match(/\\item\b/g) ?? []).length + 1;
}

function insideEnumerate(text: string, index: number): boolean {
  const before = text.slice(0, index);
  const lastBeginItemize   = before.lastIndexOf('\\begin{itemize}');
  const lastBeginEnumerate = before.lastIndexOf('\\begin{enumerate}');
  return lastBeginEnumerate > lastBeginItemize;
}

// ---------------------------------------------------------------------------
// ViewPlugin
// ---------------------------------------------------------------------------

export function createDecorationPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }

      update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.build(update.view);
        }
      }

      build(view: EditorView): DecorationSet {
        if (rawMode) return Decoration.none;

        const builder = new RangeSetBuilder<Decoration>();
        const doc = view.state.doc.toString();

        // --- Display math ($$...$$)  — must be matched BEFORE inline math ---
        const displayMathRe = /\$\$([\s\S]+?)\$\$/g;
        for (const match of doc.matchAll(displayMathRe)) {
          const from = match.index!;
          const to = from + match[0].length;
          if (!isCursorInRange(view.state, from, to)) {
            builder.add(
              from,
              to,
              Decoration.replace({ widget: new DisplayMathWidget(match[1]) })
            );
          }
        }

        // --- Inline math ($...$) ---
        // Negative lookbehind so we skip $$
        const inlineMathRe = /(?<!\$)\$(?!\$)([^\n$]+?)(?<!\$)\$(?!\$)/g;
        for (const match of doc.matchAll(inlineMathRe)) {
          const from = match.index!;
          const to = from + match[0].length;
          if (!isCursorInRange(view.state, from, to)) {
            builder.add(
              from,
              to,
              Decoration.replace({ widget: new InlineMathWidget(match[1]) })
            );
          }
        }

        // --- \item markers ---
        const itemRe = /\\item(?:\s)/g;
        for (const match of doc.matchAll(itemRe)) {
          const from = match.index!;
          const to = from + match[0].length;
          if (!isCursorInRange(view.state, from, to)) {
            const widget = insideEnumerate(doc, from)
              ? new EnumerateWidget(itemNumber(doc, from))
              : new BulletWidget();
            builder.add(from, to, Decoration.replace({ widget }));
          }
        }

        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations }
  );
}
