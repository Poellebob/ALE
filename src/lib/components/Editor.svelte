<!--
  src/lib/components/Editor.svelte

  Mounts a full CodeMirror 6 instance and wires it to the store and
  decoration system. Exposes insertText / undo / redo as imperative methods
  so the parent page can call them from toolbar actions.

  See docs/05-editor.md for the full extension stack.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    EditorView,
    keymap,
    lineNumbers,
    highlightActiveLineGutter,
    highlightSpecialChars,
    drawSelection,
    highlightActiveLine,
  } from '@codemirror/view';
  import { EditorState } from '@codemirror/state';
  import {
    defaultKeymap,
    history,
    historyKeymap,
    undo as cmUndo,
    redo as cmRedo,
  } from '@codemirror/commands';
  import {
    syntaxHighlighting,
    HighlightStyle,
    StreamLanguage,
  } from '@codemirror/language';
  import { tags as t } from '@lezer/highlight';

  import { snippetKeymap } from '$lib/snippetExpansion';
  import { itemEnterKeymap } from '$lib/itemEnter';
  import { createDecorationPlugin, setRefreshFn } from '$lib/latexDecorations';

  interface Props {
    content: string;
    onchange?: (content: string) => void;
  }

  let { content, onchange }: Props = $props();

  let container: HTMLDivElement;
  let view: EditorView | null = null;

  // -------------------------------------------------------------------------
  // Language — minimal LaTeX stream tokenizer
  // -------------------------------------------------------------------------
  // StreamLanguage lets us assign CSS class names to token types without
  // building a full Lezer grammar. The class names map onto the CSS variables
  // defined in editor.css.
  const latexLang = StreamLanguage.define({
    token(stream: { match: (r: RegExp | string) => boolean; next: () => void }) {
      if (stream.match(/\\(begin|end)\{(enumerate|itemize|document|figure|table|equation|align)\}/))
        return 'keyword';
      if (stream.match(/\\(item|maketitle|tableofcontents|newpage|clearpage)\b/))
        return 'keyword';
      if (stream.match(/\$\$/)) return 'string';
      if (stream.match(/\$/)) return 'string';
      if (stream.match(/%[^\n]*/)) return 'comment';
      if (stream.match(/\\[a-zA-Z]+/)) return 'attributeName';
      if (stream.match(/\{|\}/)) return 'bracket';
      stream.next();
      return null;
    },
  });

  const latexHighlight = HighlightStyle.define([
    { tag: t.keyword,       class: 'cm-keyword' },
    { tag: t.string,        class: 'cm-string' },
    { tag: t.comment,       class: 'cm-comment' },
    { tag: t.attributeName, class: 'cm-attributeName' },
  ]);

  // -------------------------------------------------------------------------
  // Structural theme (layout / sizing, no colours — those are in editor.css)
  // -------------------------------------------------------------------------
  const structuralTheme = EditorView.theme({
    '&': {
      height: '100%',
    },
    '.cm-scroller': {
      overflow: 'auto',
      // font-family set in editor.css via .cm-scroller
    },
  });

  // -------------------------------------------------------------------------
  // Mount
  // -------------------------------------------------------------------------
  onMount(() => {
    const state = EditorState.create({
      doc: content,
      extensions: [
        // Core UX
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        drawSelection(),
        highlightActiveLine(),
        history(),

        // Keymaps (priority order: snippets → item-enter → default)
        snippetKeymap,
        itemEnterKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap]),

        // Language & highlighting
        latexLang,
        syntaxHighlighting(latexHighlight),

        // Decoration widgets
        createDecorationPlugin(),

        // Structural theme
        structuralTheme,

        // Change listener → propagate to fileStore via onchange prop
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onchange) {
            onchange(update.state.doc.toString());
          }
        }),
      ],
    });

    view = new EditorView({ state, parent: container });

    // Give the decoration module a handle to force a redraw when raw mode
    // is toggled — dispatching an empty effects transaction is the
    // idiomatic way to trigger the ViewPlugin update() hook.
    setRefreshFn(() => {
      view?.dispatch({ effects: [] });
    });
  });

  onDestroy(() => {
    view?.destroy();
  });

  // -------------------------------------------------------------------------
  // Content sync: when the parent loads a new file, replace the document
  // without creating an undo history entry.
  // -------------------------------------------------------------------------
  $effect(() => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
        // Not a user event — avoids polluting undo history on file open
      });
    }
  });

  // -------------------------------------------------------------------------
  // Public API (called via bind:this from +page.svelte)
  // -------------------------------------------------------------------------

  /** Insert text at the current cursor position. */
  export function insertText(text: string) {
    if (!view) return;
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, to: pos, insert: text },
      selection: { anchor: pos + text.length },
      userEvent: 'input.insert',
    });
    view.focus();
  }

  /** Undo the last edit. Uses the proper CodeMirror command — not a fake event. */
  export function undo() {
    if (view) cmUndo(view);
  }

  /** Redo the last undone edit. */
  export function redo() {
    if (view) cmRedo(view);
  }
</script>

<div class="editor-shell" bind:this={container}></div>

<style>
  .editor-shell {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* Make the CodeMirror root fill the container */
  .editor-shell :global(.cm-editor) {
    height: 100%;
  }
</style>
