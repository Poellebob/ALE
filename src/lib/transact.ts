import { EditorView } from '@codemirror/view';
import type { TransactionSpec } from '@codemirror/state';

interface Change {
  from:   number;
  to:     number;
  insert: string;
}

export class Tx {
  private view:    EditorView;
  private changes: Change[] = [];
  private _cursor: number | null = null;
  private offset   = 0;

  constructor(view: EditorView) {
    this.view = view;
  }

  private rawInsert(origPos: number, text: string): this {
    this.changes.push({ from: origPos, to: origPos, insert: text });
    this.offset += text.length;
    return this;
  }

  private rawDelete(origFrom: number, origTo: number): this {
    this.changes.push({ from: origFrom, to: origTo, insert: '' });
    this.offset -= origTo - origFrom;
    return this;
  }

  private rawReplace(origFrom: number, origTo: number, text: string): this {
    this.changes.push({ from: origFrom, to: origTo, insert: text });
    this.offset += text.length - (origTo - origFrom);
    return this;
  }

  private orig(currentPos: number): number {
    return currentPos - this.offset;
  }

  /** Convert an original-doc position to a new-doc position. */
  mapPos(origPos: number): number {
    return origPos + this.offset;
  }

  delete(from: number, to: number): this {
    return this.rawDelete(this.orig(from), this.orig(to));
  }

  deleteLine(line: { from: number; to: number }): this {
    const hasNl = line.to < this.view.state.doc.length;
    return this.rawDelete(
      this.orig(line.from),
      this.orig(line.to + (hasNl ? 1 : 0))
    );
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

  /** Pass a new-doc coordinate. Use mapPos() for original-doc line positions. */
  cursor(newDocPos: number): this {
    this._cursor = newDocPos;
    return this;
  }

  commit(userEvent?: string): void {
    if (this.changes.length === 0) return;
    const spec: TransactionSpec = { changes: this.changes };
    if (this._cursor !== null) spec.selection = { anchor: this._cursor };
    if (userEvent) spec.userEvent = userEvent;
    this.view.dispatch(spec);
  }
}

export function tx(view: EditorView): Tx {
  return new Tx(view);
}
