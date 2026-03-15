<script lang="ts">
  import { Splitpanes, Pane } from 'svelte-splitpanes';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { open, save } from '@tauri-apps/plugin-dialog';
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import Editor from '$lib/components/Editor.svelte';
  import PdfViewer from '$lib/components/PdfViewer.svelte';
  import TabBar from '$lib/components/TabBar.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import { fileStore, buildStore, settingsStore, type BuildLogEntry, type Settings } from '$lib/stores';
  import { themes } from '$lib/themes';
  import type { Tab } from '$lib/tabs/definitions';
  import { snippets } from '$lib/snippets';
  import { toggleRawMode, isRawMode, refreshDecorations } from '$lib/latexDecorations';

  let themeCss = $state('');
  let darkMatcher: MediaQueryList | undefined;

  function updateTheme(settingsValue: Settings) {
    let themeName = settingsValue.theme;
    if (themeName === 'system') {
      themeName = darkMatcher?.matches ? 'dark' : 'light';
    }

    const theme = themes[themeName];
    if (theme) {
      const css = `
:root {
  --primary: ${theme.colors.primary};
  --secondary: ${theme.colors.secondary};
  --accent: ${theme.colors.accent};
  --background: ${theme.colors.background};
  --text: ${theme.colors.text};
  --editor-background: ${theme.colors.editor.background};
  --editor-text: ${theme.colors.editor.text};
  --editor-selection: ${theme.colors.editor.selection};
  --editor-cursor: ${theme.colors.editor.cursor};
}
      `;
      themeCss = css;
    }
  }

  settingsStore.subscribe(updateTheme);

  let editorComponent: Editor;
  let showLog = $state(false);
  let logContainer: HTMLDivElement;
  let rawMode = $state(false);
  let showSettings = $state(false);

  let fileState = $derived($fileStore);
  let buildState = $derived($buildStore);

  let unlisten: (() => void) | null = null;
  let themeUnsub: (() => void) | null = null;

  onMount(async () => {
    unlisten = await listen<{ line: string; stream: string }>('build-log', (event) => {
      buildStore.addLog(event.payload.line, event.payload.stream as 'stdout' | 'stderr');
    });

    darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');
    const onThemeChange = () => updateTheme(get(settingsStore));
    darkMatcher.addEventListener('change', onThemeChange);
    
    themeUnsub = () => {
      darkMatcher?.removeEventListener('change', onThemeChange);
    };

    updateTheme(get(settingsStore));
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    if (unlisten) unlisten();
    if (themeUnsub) themeUnsub();
    window.removeEventListener('keydown', handleKeydown);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveAs();
        } else {
          handleSave();
        }
      } else if (e.key === 'b') {
        e.preventDefault();
        handleBuild();
      } else if (e.key === 'n') {
        e.preventDefault();
        handleNew();
      } else if (e.key === 'o') {
        e.preventDefault();
        handleOpen();
      } else if (e.key === ',') {
        e.preventDefault();
        showSettings = true;
      }
    }
  }

  $effect(() => {
    if (buildState.logs.length && logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  });

  function handleNew() {
    fileStore.reset();
  }

  async function handleOpen() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'LaTeX', extensions: ['tex'] }]
    });
    if (selected) {
      const content = await invoke<string>('read_tex_file', { path: selected });
      fileStore.load(selected, content);
    }
  }

  async function handleSave() {
    let path = fileState.path;
    if (!path) {
      const selected = await save({
        filters: [{ name: 'LaTeX', extensions: ['tex'] }]
      });
      if (!selected) return;
      path = selected;
    }
    await invoke('write_tex_file', { path, content: fileState.content });
    fileStore.setPath(path);
  }

  async function handleSaveAs() {
    const selected = await save({
      filters: [{ name: 'LaTeX', extensions: ['tex'] }]
    });
    if (!selected) return;
    await invoke('write_tex_file', { path: selected, content: fileState.content });
    fileStore.setPath(selected);
  }

  async function handleBuild() {
    if (!fileState.path) {
      await handleSave();
      if (!fileState.path) return;
    }
    
    await buildStore.triggerBuild();
  }

  function handleToggleRawMode() {
    rawMode = toggleRawMode();
    refreshDecorations();
  }

  function handleContentChange(content: string) {
    fileStore.setContent(content);
  }

  function handleUndo() {
    if (editorComponent) editorComponent.undo();
  }

  function handleRedo() {
    if (editorComponent) editorComponent.redo();
  }

  async function handleCut() {
    if (!editorComponent) return;
    try {
      const selectedText = editorComponent.getSelectedText();
      await navigator.clipboard.writeText(selectedText);
      editorComponent.deleteSelectedText();
    } catch (err) {
      console.error('Failed to cut:', err);
    }
  }

  async function handleCopy() {
    if (!editorComponent) return;
    try {
      const selectedText = editorComponent.getSelectedText();
      await navigator.clipboard.writeText(selectedText);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  async function handlePaste() {
    if (!editorComponent) return;
    try {
      const text = await navigator.clipboard.readText();
      editorComponent.insertSnippet(text);
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  }

  const tabs: Tab[] = $derived([
    {
      id: 'file',
      label: 'File',
      actions: [
        { id: 'new', label: 'New', shortcut: 'Ctrl+N', action: handleNew },
        { id: 'open', label: 'Open', shortcut: 'Ctrl+O', action: handleOpen },
        { id: 'save', label: 'Save', shortcut: 'Ctrl+S', action: handleSave },
        { id: 'saveas', label: 'Save As', shortcut: 'Ctrl+Shift+S', action: handleSaveAs }
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      actions: [
        { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', action: handleUndo },
        { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', action: handleRedo },
        { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', action: handleCut },
        { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', action: handleCopy },
        { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', action: handlePaste }
      ]
    },
    {
      id: 'insert',
      label: 'Insert',
      actions: [
        { id: 'section', label: 'Section', action: () => editorComponent.insertSnippet(snippets.find(s => s.trigger === 'sec')!.expansion) },
        { id: 'subsection', label: 'Subsection', action: () => editorComponent.insertSnippet(snippets.find(s => s.trigger === 'ssec')!.expansion) },
        { id: 'figure', label: 'Figure', action: () => editorComponent.insertSnippet(snippets.find(s => s.trigger === 'fig')!.expansion) },
        { id: 'table', label: 'Table', action: () => editorComponent.insertSnippet(snippets.find(s => s.trigger === 'tab')!.expansion) },
        { id: 'reference', label: 'Reference', action: () => editorComponent.insertSnippet(snippets.find(s => s.trigger === 'ref')!.expansion) },
        { id: 'citation', label: 'Citation', action: () => editorComponent.insertSnippet(snippets.find(s => s.trigger === 'cite')!.expansion) },
        { id: 'itemize', label: 'Itemize', action: () => editorComponent.insertSnippet(snippets.find(s => s.trigger === '-')!.expansion) },
        { id: 'enumerate', label: 'Enumerate', action: () => editorComponent.insertSnippet(snippets.find(s => s.trigger === '1.')!.expansion) },
        { id: 'math', label: 'Math', action: () => editorComponent.insertSnippet(snippets.find(s => s.trigger === '$$')!.expansion) }
      ]
    },
    {
      id: 'build',
      label: 'Build',
      actions: [
        { id: 'build', label: buildState.status === 'building' ? 'Building...' : 'Build PDF', shortcut: 'Ctrl+B', action: handleBuild, disabled: buildState.status === 'building' },
        { id: 'log', label: showLog ? 'Hide Log' : 'Show Log', action: () => showLog = !showLog }
      ]
    }
  ]);
</script>

<svelte:head>
  <style>{themeCss}</style>
</svelte:head>

<div class="app">
  <TabBar {tabs} {fileState} {buildState} isRawMode={rawMode} onToggleRawMode={handleToggleRawMode} onOpenSettings={() => showSettings = true} />

  <main class="main">
    <Splitpanes horizontal={showLog}>
      <Pane size={showLog ? 70 : 100}>
        <Splitpanes>
          <Pane size={50}>
            <Editor 
              bind:this={editorComponent} 
              content={fileState.content} 
              onchange={handleContentChange} 
            />
          </Pane>
          <Pane size={50}>
            <PdfViewer pdfPath={buildState.pdfPath} />
          </Pane>
        </Splitpanes>
      </Pane>
      {#if showLog}
        <Pane size={30}>
          <div class="log-panel" bind:this={logContainer}>
            {#if buildState.logs.length === 0}
              <div class="log-empty">No build output</div>
            {:else}
              {#each buildState.logs as log}
                <div class="log-line" class:stderr={log.stream === 'stderr'}>
                  {log.line}
                </div>
              {/each}
            {/if}
            {#if buildState.error}
              <div class="log-error">{buildState.error}</div>
            {/if}
          </div>
        </Pane>
      {/if}
    </Splitpanes>
  </main>
  
  <SettingsModal open={showSettings} onClose={() => showSettings = false} />
</div>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
    background-color: var(--background);
    color: var(--text);
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--background);
  }

  .main {
    flex: 1;
    overflow: hidden;
  }

  .log-panel {
    height: 100%;
    max-height: 160px;
    overflow: auto;
    background: var(--editor-background);
    color: var(--editor-text);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    padding: 8px;
  }

  .log-empty {
    color: #666;
    text-align: center;
    padding: 20px;
  }

  .log-line {
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.4;
  }

  .log-line.stderr {
    color: #e74c3c;
  }

  .log-error {
    margin-top: 8px;
    padding: 8px;
    background: #c0392b;
    color: white;
    border-radius: 4px;
  }

  :global(.splitpanes__pane) {
    background: inherit;
  }

  :global(.splitpanes__splitter) {
    background: var(--secondary);
    position: relative;
  }

  :global(.splitpanes__splitter:before) {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    transition: opacity 0.4s;
    background-color: var(--accent);
    opacity: 0;
    z-index: 1;
  }

  :global(.splitpanes__splitter:hover:before) {
    opacity: 1;
  }

  :global(.splitpanes--vertical > .splitpanes__splitter:before) {
    left: -2px;
    right: -2px;
    height: 100%;
    width: auto;
  }

  :global(.splitpanes--horizontal > .splitpanes__splitter:before) {
    top: -2px;
    bottom: -2px;
    width: 100%;
    height: auto;
  }
</style>
