import { keymap, EditorView } from '@codemirror/view';
import { tx } from '$lib/transact';

const ITEM_WITH_CONTENT = /^(\s*)\\item\s+\S/;
const ITEM_EMPTY        = /^(\s*)\\item\s*$/;
const IS_END            = /^\s*\\end\{[^}]+\}/;

function handleEnter(view: EditorView): boolean {
  const state = view.state;
  const pos   = state.selection.main.head;
  if (!state.selection.main.empty) return false;

  const line = state.doc.lineAt(pos);

  if (ITEM_WITH_CONTENT.test(line.text)) {
    const indent   = line.text.match(/^(\s*)/)?.[1] ?? '';
    const inserted = '\n' + indent + '\\item ';

    tx(view)
      .insert(pos, inserted)
      .cursor(pos + inserted.length)
      .commit('input.newline');

    return true;
  }

  if (ITEM_EMPTY.test(line.text)) {
    if (line.number >= state.doc.lines) return false;

    const nextLine = state.doc.line(line.number + 1);

    if (IS_END.test(nextLine.text)) {
      const t = tx(view).deleteLine(line);
      const endTo = t.mapPos(nextLine.to);
      t.insertAfter({ to: endTo }, '\n');
      t.cursor(endTo + 1).commit('input.newline');    } else {
      const t = tx(view).deleteLine(line);
      t.cursor(t.mapPos(nextLine.to)).commit('input.newline');
    }

    return true;
  }

  return false;
}

export const itemEnterKeymap = keymap.of([
  { key: 'Enter', run: handleEnter },
]);
