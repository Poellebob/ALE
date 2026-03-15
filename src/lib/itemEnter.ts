import { keymap, EditorView } from '@codemirror/view';
import { tx } from '$lib/transact';
 
const ITEM_WITH_CONTENT = /^(\s*)\\item\s+\S/;
const ITEM_EMPTY        = /^(\s*)\\item\s*$/;
const END_LIST          = /\\end\{(itemize|enumerate|description)\}/;
 
function handleEnter(view: EditorView): boolean {
  const state = view.state;
  const pos   = state.selection.main.head;
  if (!state.selection.main.empty) return false;
 
  const line = state.doc.lineAt(pos);
 
  if (ITEM_WITH_CONTENT.test(line.text)) {
    const indent = line.text.match(/^(\s*)/)?.[1] ?? '';
 
    tx(view)
      .insert(pos, '\n' + indent + '\\item ')
      .cursor(pos + 1 + indent.length + 6)
      .commit('input.newline');
 
    return true;
  }
 
  if (ITEM_EMPTY.test(line.text)) {
    let endLine = null;
    for (let ln = line.number + 1; ln <= state.doc.lines; ln++) {
      if (END_LIST.test(state.doc.line(ln).text)) {
        endLine = state.doc.line(ln);
        break;
      }
    }
    if (!endLine) return false;
 
    const cursorAfter = endLine.to + 1;
 
    tx(view)
      .deleteLine(line)
      .insertAfter(endLine, '\n')
      .cursor(cursorAfter)
      .commit('input.newline');
 
    return true;
  }
 
  return false;
}
 
export const itemEnterKeymap = keymap.of([
  { key: 'Enter', run: handleEnter },
]);
