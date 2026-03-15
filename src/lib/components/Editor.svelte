<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine } from '@codemirror/view';
  import { EditorState, Compartment } from '@codemirror/state';
  import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
  import { syntaxHighlighting, HighlightStyle, StreamLanguage } from '@codemirror/language';
  import { tags as t } from '@lezer/highlight';
  import { snippetKeymap } from '../snippetExpansion';
  import { createDecorationPlugin, setRefreshFn, decorationKeymap, setRenderSettings } from '../latexDecorations';
  import { settingsStore, type Settings } from '$lib/stores';

  export let content: string = '';
  export let onchange: ((content: string) => void) | undefined = undefined;

  let editorContainer: HTMLDivElement;
  let view: EditorView | null = null;

  const themeCompartment = new Compartment();
  const lineNumCompartment = new Compartment();
  const wordWrapCompartment = new Compartment();

  const latexLanguage = StreamLanguage.define({
    token(stream: any) {
      if (stream.match(/\\(begin|end)\{enumerate\}/)) return 'keyword';
      if (stream.match(/\\(begin|end)\{itemize\}/)) return 'keyword';
      if (stream.match(/\\item/)) return 'keyword';
      if (stream.match(/\$\$/)) return 'string';
      if (stream.match(/\$/)) return 'string';
      if (stream.match(/\\[a-zA-Z]+/)) return 'attributeName';
      stream.next();
      return null;
    }
  });

  const latexHighlight = HighlightStyle.define([
    { tag: t.keyword, color: '#708' },
    { tag: t.string, color: '#219' },
  ]);

  function getTheme(settings: Settings) {
    return EditorView.theme({
      '&': { 
        height: '100%', 
        fontSize: `${settings.fontSize}px`, 
        fontFamily: `"${settings.fontFamily}", monospace`,
        backgroundColor: 'var(--editor-background)',
        color: 'var(--editor-text)'
      },
      '.cm-scroller': { overflow: 'auto' },
      '.cm-content': { caretColor: 'var(--editor-cursor)' },
      '.cm-list-item': { marginRight: '4px' },
      '.cm-math-inline': { margin: '0 2px', verticalAlign: 'middle' },
      '.cm-math-display': { display: 'block', margin: '8px 0', textAlign: 'center' },
      '.cm-bold': { fontWeight: 'bold' },
      '.cm-italic': { fontStyle: 'italic' },
      '.cm-heading': { fontWeight: 'bold' },
      '.cm-section': { fontSize: '1.4em', marginTop: '1em' },
      '.cm-subsection': { fontSize: '1.2em', marginTop: '0.8em' },
      '.cm-subsubsection': { fontSize: '1.1em', marginTop: '0.6em' },
      '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--editor-cursor)' },
      '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--editor-selection)' },
      '.cm-gutters': { 
        backgroundColor: 'var(--editor-background)', 
        color: 'var(--editor-text)', 
        opacity: 0.7,
        borderRight: '1px solid var(--secondary)' 
      },
      '.cm-activeLineGutter': { backgroundColor: 'var(--secondary)' },
      '.cm-activeLine': { backgroundColor: 'var(--secondary)' }
    });
  }

  let unsubSettings: (() => void) | null = null;

  onMount(() => {
    const settings = get(settingsStore);
    
    setRenderSettings(settings.renderMath, settings.renderFormatting, settings.renderHeadings);

    const startState = EditorState.create({
      doc: content,
      extensions: [
        themeCompartment.of(getTheme(settings)),
        lineNumCompartment.of(settings.lineNumbers ? lineNumbers() : []),
        wordWrapCompartment.of(settings.wordWrap ? EditorView.lineWrapping : []),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        snippetKeymap,
        decorationKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        latexLanguage,
        syntaxHighlighting(latexHighlight),
        createDecorationPlugin(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onchange) {
            onchange(update.state.doc.toString());
          }
        })
      ]
    });

    view = new EditorView({ state: startState, parent: editorContainer });
    
    setRefreshFn(() => {
      if (view) {
        view.dispatch({ effects: [] });
      }
    });

    unsubSettings = settingsStore.subscribe((settings) => {
      if (!view) return;
      
      setRenderSettings(settings.renderMath, settings.renderFormatting, settings.renderHeadings);
      
      view.dispatch({
        effects: [
          themeCompartment.reconfigure(getTheme(settings)),
          lineNumCompartment.reconfigure(settings.lineNumbers ? lineNumbers() : []),
          wordWrapCompartment.reconfigure(settings.wordWrap ? EditorView.lineWrapping : [])
        ]
      });
    });
  });

  onDestroy(() => { 
    view?.destroy(); 
    if (unsubSettings) unsubSettings();
  });

  export function setContent(newContent: string) {
    if (view) {
      const currentContent = view.state.doc.toString();
      if (currentContent !== newContent) {
        view.dispatch({ changes: { from: 0, to: currentContent.length, insert: newContent } });
      }
    }
  }

  export function getContent(): string {
    return view ? view.state.doc.toString() : content;
  }

  export function getSelectedText(): string {
    if (!view) return '';
    const selection = view.state.selection.main;
    return view.state.sliceDoc(selection.from, selection.to);
  }

  export function deleteSelectedText() {
    if (!view) return;
    const selection = view.state.selection.main;
    if (!selection.empty) {
      view.dispatch({ changes: { from: selection.from, to: selection.to, insert: '' } });
    }
  }

  export function insertSnippet(expansion: string) {
    if (!view) return;

    const tabStops: { pos: number; index: number }[] = [];
    let expandedText = '';
    let cursorAnchor: number | undefined;

    for (let i = 0; i < expansion.length; i++) {
      const char = expansion[i];
      if (char === '$' && i + 1 < expansion.length) {
        const nextChar = expansion[i + 1];
        if (nextChar >= '0' && nextChar <= '9') {
          const num = parseInt(nextChar, 10);
          
          if (num === 0) {
            cursorAnchor = expandedText.length;
          }
          tabStops.push({ pos: expandedText.length, index: num });
          i += 1;
          continue;
        }
      }
      expandedText += char;
    }

    const currentSelection = view.state.selection.main;
    const from = currentSelection.from;
    const to = currentSelection.to;

    let changes = { from: from, to: to, insert: expandedText };
    let selectionAnchor = cursorAnchor !== undefined ? from + cursorAnchor : from + expandedText.length;

    view.dispatch({
      changes: changes,
      selection: { anchor: selectionAnchor },
      userEvent: 'input.insertSnippet'
    });
  }

  export function undo() {
    if (view) {
      view.dispatch({ userEvent: 'undo' });
    }
  }

  export function redo() {
    if (view) {
      view.dispatch({ userEvent: 'redo' });
    }
  }
</script>

<div class="editor-wrapper" bind:this={editorContainer}></div>

<style>
  .editor-wrapper { width: 100%; height: 100%; overflow: hidden; }
  .editor-wrapper :global(.cm-editor) { height: 100%; }
  .editor-wrapper :global(.cm-scroller) { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
</style>
