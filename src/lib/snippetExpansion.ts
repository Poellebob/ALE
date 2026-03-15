// src/lib/snippetExpansion.ts
//
// Provides a CodeMirror keymap extension that handles Tab-based snippet
// expansion and placeholder navigation.
//
// Tab key priority order:
//   1. If $N placeholders exist in the document → jump to the next one
//   2. If the current line is an exact trigger → expand it
//   3. Consume the event (no browser focus jump)
//
// See docs/07-snippets.md for design rationale.

import { keymap, EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { snippets } from './snippets';

// ---------------------------------------------------------------------------
// Trigger detection
// ---------------------------------------------------------------------------

/**
 * Returns the trigger and its line start if the cursor is at the end of a
 * line whose entire text equals a known snippet trigger. Returns null otherwise.
 */
function findTrigger(
  state: EditorState
): { trigger: string; lineFrom: number } | null {
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);

  // Only fire when cursor is at the very end of the line (no trailing chars)
  if (pos !== line.from + line.length) return null;

  for (const snippet of snippets) {
    if (line.text === snippet.trigger) {
      return { trigger: snippet.trigger, lineFrom: line.from };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Expansion
// ---------------------------------------------------------------------------

/**
 * Replaces the trigger line with the expanded text, positioning the cursor at
 * the $0 tab stop (or end of text if no $0 is present).
 */
function expandSnippet(
  view: EditorView,
  triggerInfo: { trigger: string; lineFrom: number }
): boolean {
  const snippet = snippets.find((s) => s.trigger === triggerInfo.trigger);
  if (!snippet) return false;

  // Parse the expansion string into plain text + tab stop positions
  const tabStops: { pos: number; index: number }[] = [];
  let expandedText = '';

  for (let i = 0; i < snippet.expansion.length; i++) {
    if (
      snippet.expansion[i] === '$' &&
      i + 1 < snippet.expansion.length &&
      snippet.expansion[i + 1] >= '0' &&
      snippet.expansion[i + 1] <= '9'
    ) {
      tabStops.push({
        pos: expandedText.length,
        index: parseInt(snippet.expansion[i + 1], 10),
      });
      i += 1; // skip the digit
      continue;
    }
    expandedText += snippet.expansion[i];
  }

  tabStops.sort((a, b) => a.index - b.index);

  // $1 is the first edit point. $0 is where the cursor ends up after all jumps.
  const firstStop = tabStops.find((t) => t.index === 1) ?? tabStops.find((t) => t.index === 0);
  const cursorPos = triggerInfo.lineFrom + (firstStop?.pos ?? expandedText.length);

  const line = view.state.doc.lineAt(triggerInfo.lineFrom);

  view.dispatch({
    changes: {
      from: triggerInfo.lineFrom,
      to: line.from + line.length,
      insert: expandedText,
    },
    selection: { anchor: cursorPos },
    userEvent: 'input.snippet',
  });

  return true;
}

// ---------------------------------------------------------------------------
// Placeholder navigation
// ---------------------------------------------------------------------------

/** Returns true if the document contains any un-visited $N (N ≥ 1) markers. */
function hasPlaceholders(state: EditorState): boolean {
  return /\$[1-9]/.test(state.doc.toString());
}

/**
 * Moves the cursor to the next $N placeholder after the current position.
 * Wraps around to the beginning of the document if nothing is found ahead.
 */
function jumpToNextPlaceholder(view: EditorView): boolean {
  const pos = view.state.selection.main.head;
  const doc = view.state.doc.toString();

  // Search forward from current position
  for (let i = pos; i < doc.length - 1; i++) {
    if (doc[i] === '$' && doc[i + 1] >= '1' && doc[i + 1] <= '9') {
      view.dispatch({ selection: { anchor: i }, userEvent: 'move.placeholder' });
      return true;
    }
  }

  // Wrap: search from beginning
  for (let i = 0; i < pos; i++) {
    if (doc[i] === '$' && doc[i + 1] >= '1' && doc[i + 1] <= '9') {
      view.dispatch({ selection: { anchor: i }, userEvent: 'move.placeholder' });
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Tab handler
// ---------------------------------------------------------------------------

function handleTab(view: EditorView): boolean {
  if (hasPlaceholders(view.state)) {
    jumpToNextPlaceholder(view);
    return true;
  }

  const triggerInfo = findTrigger(view.state);
  if (triggerInfo) {
    return expandSnippet(view, triggerInfo);
  }

  // Consume Tab so it does not shift browser focus to the next element
  return true;
}

export const snippetKeymap = keymap.of([
  { key: 'Tab', run: handleTab },
]);
