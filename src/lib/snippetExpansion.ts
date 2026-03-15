import { keymap, EditorView } from '@codemirror/view';
import { EditorState, type Transaction } from '@codemirror/state';
import { snippets } from './snippets';

interface TabStop {
  pos: number;
  index: number;
}

function findTrigger(state: EditorState): { trigger: string; start: number } | null {
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const text = line.text.slice(0, pos - line.from); // Text from line start to cursor

  for (const snippet of snippets) {
    // Check if the snippet trigger exists at the end of the current line's text before the cursor
    const triggerRegex = new RegExp(`(^|\\s)${snippet.trigger}$`);
    const match = text.match(triggerRegex);

    if (match) {
      const start = line.from + text.lastIndexOf(snippet.trigger);
      return { trigger: snippet.trigger, start: start };
    }
  }
  
  return null;
}

function expandSnippet(view: EditorView, triggerInfo: { trigger: string; start: number }): boolean {
  const snippet = snippets.find(s => s.trigger === triggerInfo.trigger);
  if (!snippet) return false;
  
  const expansion = snippet.expansion;
  
  const tabStops: TabStop[] = [];
  let expandedText = '';
  
  for (let i = 0; i < expansion.length; i++) {
    const char = expansion[i];
    if (char === '$' && i + 1 < expansion.length) {
      const nextChar = expansion[i + 1];
      if (nextChar >= '0' && nextChar <= '9') {
        const num = parseInt(nextChar, 10);
        
        if (num === 0) {
          tabStops.push({ pos: expandedText.length, index: 0 });
        } else {
          tabStops.push({ pos: expandedText.length, index: num });
        }
        
        i += 1;
        continue;
      }
    }
    expandedText += char;
  }
  
  tabStops.sort((a, b) => a.index - b.index);
  
  const from = triggerInfo.start;
  const line = view.state.doc.lineAt(from);
  const to = line.from + line.length;
  
  let cursorPos = from;
  
  const firstTabStop = tabStops.find(t => t.index === 0);
  if (firstTabStop) {
    cursorPos = from + firstTabStop.pos;
  }
  
  view.dispatch({
    changes: { from, to, insert: expandedText },
    selection: { anchor: cursorPos },
    userEvent: 'input'
  });
  
  return true;
}

function findNextTabStop(view: EditorView): boolean {
  const pos = view.state.selection.main.head;
  const doc = view.state.doc.toString();
  
  let bestPos = -1;
  let dollarPos = doc.indexOf('$', pos);
  
  while (dollarPos !== -1) {
    if (dollarPos + 1 < doc.length) {
      const nextChar = doc[dollarPos + 1];
      if (nextChar >= '1' && nextChar <= '9') {
        if (bestPos === -1 || dollarPos < bestPos) {
          bestPos = dollarPos;
        }
      }
    }
    dollarPos = doc.indexOf('$', dollarPos + 1);
  }
  
  if (bestPos !== -1) {
    view.dispatch({
      selection: { anchor: bestPos },
      userEvent: 'move'
    });
    return true;
  }
  
  return false;
}

function removeRemainingDollarPlaceholders(view: EditorView): boolean {
  const pos = view.state.selection.main.head;
  const doc = view.state.doc.toString();
  
  let dollarPos = doc.indexOf('$', pos);
  
  while (dollarPos !== -1) {
    if (dollarPos + 1 < doc.length) {
      const nextChar = doc[dollarPos + 1];
      if (nextChar >= '0' && nextChar <= '9') {
        const endPos = dollarPos + 2;
        
        view.dispatch({
          changes: { from: dollarPos, to: endPos, insert: '' },
          userEvent: 'input'
        });
        
        return true;
      }
    }
    dollarPos = doc.indexOf('$', dollarPos + 1);
  }
  
  return false;
}

function hasUnprocessedPlaceholders(state: EditorState): boolean {
  const doc = state.doc.toString();
  return /\$[1-9]/.test(doc);
}

function handleTab(view: EditorView): boolean {
  const state = view.state;
  const hasPlaceholder = hasUnprocessedPlaceholders(state);
  
  if (hasPlaceholder) {
    const found = findNextTabStop(view);
    if (found) return true;
    
    const removed = removeRemainingDollarPlaceholders(view);
    if (removed) return true;
    
    return true;
  }
  
  const triggerInfo = findTrigger(state);
  if (triggerInfo) {
    return expandSnippet(view, triggerInfo);
  }
  
  return true;
}

export const snippetKeymap = keymap.of([
  { key: 'Tab', run: handleTab, shift: handleTab }
]);
