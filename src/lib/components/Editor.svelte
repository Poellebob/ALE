<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine, Decoration, ViewPlugin, WidgetType, MatchDecorator } from '@codemirror/view';
  import { EditorState } from '@codemirror/state';
  import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
  import { syntaxHighlighting, HighlightStyle, StreamLanguage } from '@codemirror/language';
  import { tags as t } from '@lezer/highlight';
  import katex from 'katex';
  import 'katex/dist/katex.min.css';
  import { snippetKeymap } from '../snippetExpansion';
  import { createDecorationPlugin, setRefreshFn } from '../latexDecorations';

  export let content: string = '';
  export let onchange: ((content: string) => void) | undefined = undefined;

  let editorContainer: HTMLDivElement;
  let view: EditorView | null = null;

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

  class LatexMathWidget extends WidgetType {
    toDOM(): HTMLElement {
      const wrap = document.createElement('span');
      wrap.className = this.displayMode ? 'cm-math-display' : 'cm-math-inline';
      try {
        wrap.innerHTML = katex.renderToString(this.tex, {
          displayMode: this.displayMode,
          throwOnError: false,
          output: 'html'
        });
      } catch {
        wrap.textContent = this.displayMode ? '$$' + this.tex + '$$' : '$' + this.tex + '$';
        wrap.style.color = 'red';
      }
      return wrap;
    }
    tex = '';
    displayMode = false;
  }

  function createMathInlinePlugin() {
    const mathMatcher = new MatchDecorator({
      regexp: /\$([^\n$]+)\$/g,
      decoration: (match: RegExpExecArray): any => {
        const widget = new LatexMathWidget();
        widget.tex = match[1];
        widget.displayMode = false;
        return Decoration.widget({ widget, side: 1 });
      }
    });
    
    return ViewPlugin.fromClass(class {
      decorations: any;
      constructor(view: EditorView) {
        this.decorations = mathMatcher.createDeco(view);
      }
      update(update: any) {
        this.decorations = mathMatcher.updateDeco(update, this.decorations);
      }
    }, {
      decorations: (v: any) => v.decorations
    });
  }

  function createMathDisplayPlugin() {
    const mathMatcher = new MatchDecorator({
      regexp: /\$\$([^\n$]+)\$\$/g,
      decoration: (match: RegExpExecArray): any => {
        const widget = new LatexMathWidget();
        widget.tex = match[1];
        widget.displayMode = true;
        return Decoration.widget({ widget, side: 1 });
      }
    });
    
    return ViewPlugin.fromClass(class {
      decorations: any;
      constructor(view: EditorView) {
        this.decorations = mathMatcher.createDeco(view);
      }
      update(update: any) {
        this.decorations = mathMatcher.updateDeco(update, this.decorations);
      }
    }, {
      decorations: (v: any) => v.decorations
    });
  }

  const editorTheme = EditorView.theme({
    '&': { height: '100%', fontSize: '14px', fontFamily: '"JetBrains Mono", monospace' },
    '.cm-scroller': { overflow: 'auto' },
    '.cm-content': { caretColor: '#000' },
    '.cm-enumerate-item, .cm-itemize-item': { marginRight: '4px' },
    '.cm-math-inline': { margin: '0 2px', verticalAlign: 'middle' },
    '.cm-math-display': { display: 'block', margin: '8px 0', textAlign: 'center' },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#000' },
    '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: '#c8e0ff' },
    '.cm-gutters': { backgroundColor: '#f7f7f7', color: '#999', borderRight: '1px solid #ddd' },
    '.cm-activeLineGutter': { backgroundColor: '#e8f0ff' },
    '.cm-activeLine': { backgroundColor: '#f0f7ff' }
  });

  onMount(() => {
    const startState = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        snippetKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        latexLanguage,
        syntaxHighlighting(latexHighlight),
        editorTheme,
        createDecorationPlugin(),
        createMathInlinePlugin(),
        createMathDisplayPlugin(),
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
  });

  onDestroy(() => { view?.destroy(); });

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

  export function insertText(text: string) {
    if (view) {
      const pos = view.state.selection.main.head;
      view.dispatch({ 
        changes: { from: pos, to: pos, insert: text },
        selection: { anchor: pos + text.length }
      });
    }
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
