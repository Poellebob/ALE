// src/lib/transact.ts
//
// A fluent transaction builder for CodeMirror 6.
//
// The core problem it solves
// ──────────────────────────
// When you dispatch multiple changes in one CodeMirror transaction, every
// position must be expressed in the ORIGINAL document coordinate space —
// even positions that logically come "after" an earlier change. This means
// you have to manually subtract/add offsets, which is error-prone.
//
// This builder tracks a running offset as you add operations, so you can
// express every position in the "current" (already-edited) coordinates and
// it converts them for you automatically.
//
// Usage
// ─────
//   import { tx } from '$lib/transact';
//
//   tx(view)
//     .deleteLine(line)          // delete a whole line including its \n
//     .insertAfter(otherLine, '\n')
//     .cursor(somePos)
//     .commit('input.newline');
//
// All positional arguments are plain numbers from the CodeMirror document
// (line.from, line.to, state.selection.main.head, etc.). You can mix
// "original" and "already-shifted" positions freely — just pass them in
// the order you want them applied and the builder handles the rest.

import { EditorView } from '@codemirror/view';
import type { TransactionSpec } from '@codemirror/state';


interface Change {
  from: number;
  to:   number;
  insert: string;
}


export class Tx {
  private view:    EditorView;
  private changes: Change[] = [];
  private _cursor: number | null = null;
  private offset = 0;

  constructor(view: EditorView) {
    this.view = view;
  }

  private rawInsert(pos: number, text: string): this {
    this.changes.push({ from: pos, to: pos, insert: text });
    this.offset += text.length;
    return this;
  }

  private rawDelete(from: number, to: number): this {
    this.changes.push({ from, to, insert: '' });
    this.offset -= (to - from);
    return this;
  }

  private rawReplace(from: number, to: number, text: string): this {
    this.changes.push({ from, to, insert: text });
    this.offset += text.length - (to - from);
    return this;
  }

  private orig(currentPos: number): number {
    return currentPos - this.offset;
  }

  delete(from: number, to: number): this {
    return this.rawDelete(this.orig(from), this.orig(to));
  }

  deleteLine(line: { from: number; to: number }): this {
    const from   = this.orig(line.from);
    // line.to is before the \n; +1 includes it (if not at end of document)
    const hasNl  = line.to < this.view.state.doc.length;
    const to     = this.orig(line.to + (hasNl ? 1 : 0));
    return this.rawDelete(from, to);
  }

  insert(pos: number, text: string): this {
    return this.rawInsert(this.orig(pos), text);
  }

  insertAfter(line: { to: number }, text: string): this {
    return this.rawInsert(this.orig(line.to), text);
  }

  insertBefore(line: { from: number }, text: string): this {
    return this.rawInsert(this.orig(line.from), text);
  }

  replace(from: number, to: number, text: string): this {
    return this.rawReplace(this.orig(from), this.orig(to), text);
  }

  replaceLine(line: { from: number; to: number }, text: string): this {
    return this.rawReplace(this.orig(line.from), this.orig(line.to), text);
  }

  cursor(currentPos: number): this {
    this._cursor = this.orig(currentPos);
    return this;
  }

  commit(userEvent?: string): void {
    if (this.changes.length === 0) return;

    const spec: TransactionSpec = {
      changes: this.changes,
    };

    if (this._cursor !== null) {
      spec.selection = { anchor: this._cursor };
    }

    if (userEvent) {
      spec.userEvent = userEvent;
    }

    this.view.dispatch(spec);
  }
}

/**
 * Create a new transaction builder for `view`.
 *
 * @example
 * // Delete an empty \item line, move \end up, add blank line below, cursor there
 * tx(view)
 *   .deleteLine(itemLine)
 *   .insertAfter(endLine, '\n')
 *   .cursor(endLine.to + 1)   // end of \end text + 1 for the \n we just added
 *   .commit('input.newline');
 */
export function tx(view: EditorView): Tx {
  return new Tx(view);
}
