<script lang="ts">
  import { Splitpanes, Pane } from 'svelte-splitpanes';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { open, save } from '@tauri-apps/plugin-dialog';
  import { onMount, onDestroy } from 'svelte';

  import { Editor, PdfViewer, TabBar, LogPanel, StatusBar } from '$lib/components';
  import { fileStore, buildStore, themeStore } from '$lib/stores';
  import type { BuildLogEntry } from '$lib/stores';
  import type { Tab } from '$lib/tabs/definitions';
  import { snippets } from '$lib/snippets';
  import { toggleRawMode, isRawMode, refreshDecorations } from '$lib/latexDecorations';

  let editorRef: Editor;

  let showLog  = $state(false);
  let rawMode  = $state(false);

  let fileState  = $state({ path: null as string | null, content: '', dirty: false });
  let buildState = $state({
    status: 'idle' as string,
    logs: [] as BuildLogEntry[],
    pdfPath: null as string | null,
    error: null as string | null,
  });
  let currentTheme = $state('light');

  let cursorLine = $state(1);
  let cursorCol  = $state(1);

  const unsubFile  = fileStore.subscribe((s) => { fileState = s; });
  const unsubBuild = buildStore.subscribe((s) => { buildState = s; });
  const unsubTheme = themeStore.subscribe((t) => { currentTheme = t; });

  let unlistenBuildLog: (() => void) | null = null;

  onMount(async () => {
    // Stream build log lines into the store
    unlistenBuildLog = await listen<{ line: string; stream: string }>(
      'build-log',
      (event) => {
        buildStore.addLog(
          event.payload.line,
          event.payload.stream as 'stdout' | 'stderr'
        );
      }
    );

    window.addEventListener('keydown', handleGlobalKeydown);
  });

  onDestroy(() => {
    unlistenBuildLog?.();
    unsubFile();
    unsubBuild();
    unsubTheme();
    window.removeEventListener('keydown', handleGlobalKeydown);
  });

  function handleGlobalKeydown(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;

    switch (e.key.toLowerCase()) {
      case 'n': e.preventDefault(); handleNew();    break;
      case 'o': e.preventDefault(); handleOpen();   break;
      case 's':
        e.preventDefault();
        e.shiftKey ? handleSaveAs() : handleSave();
        break;
      case 'b': e.preventDefault(); handleBuild();  break;
      case 'z':
        e.preventDefault();
        e.shiftKey ? editorRef?.redo() : editorRef?.undo();
        break;
    }
  }

  function handleNew() {
    fileStore.reset();
  }

  async function handleOpen() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'LaTeX', extensions: ['tex'] }],
    });
    if (!selected) return;
    const content = await invoke<string>('read_tex_file', { path: selected });
    fileStore.load(selected, content);
  }

  async function handleSave() {
    if (fileState.path) {
      await invoke('write_tex_file', { path: fileState.path, content: fileState.content });
      fileStore.markClean();
    } else {
      await handleSaveAs();
    }
  }

  async function handleSaveAs() {
    const selected = await save({
      filters: [{ name: 'LaTeX', extensions: ['tex'] }],
    });
    if (!selected) return;
    await invoke('write_tex_file', { path: selected, content: fileState.content });
    fileStore.setPath(selected);
  }

  async function handleBuild() {
    if (fileState.dirty || !fileState.path) {
      await handleSave();
      if (!fileState.path) return;    }
    await buildStore.triggerBuild();
    if (!showLog) showLog = true;
  }

  function handleContentChange(content: string) {
    fileStore.setContent(content);
  }

  function handleInsert(trigger: string) {
    const snippet = snippets.find((s) => s.trigger === trigger);
    if (!snippet || !editorRef) return;

    // Strip tab stop markers before inserting via the menu
    const text = snippet.expansion
      .replace(/\$[0-9]/g, '');

    editorRef.insertText(text);
  }

  function handleToggleRawMode() {
    rawMode = toggleRawMode();
    refreshDecorations();
  }

  function handleToggleTheme() {
    themeStore.toggle();
  }

  const tabs: Tab[] = $derived([
    {
      id: 'file',
      label: 'File',
      actions: [
        { id: 'new',    label: 'New',     shortcut: 'Ctrl+N', action: handleNew },
        { id: 'open',   label: 'Open…',   shortcut: 'Ctrl+O', action: handleOpen },
        { id: 'save',   label: 'Save',    shortcut: 'Ctrl+S', action: handleSave,   separator: true },
        { id: 'saveas', label: 'Save As…',shortcut: 'Ctrl+Shift+S', action: handleSaveAs },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      actions: [
        { id: 'undo',  label: 'Undo',  shortcut: 'Ctrl+Z',       action: () => editorRef?.undo() },
        { id: 'redo',  label: 'Redo',  shortcut: 'Ctrl+Shift+Z', action: () => editorRef?.redo(), separator: true },
        { id: 'cut',   label: 'Cut',   shortcut: 'Ctrl+X',       action: () => document.execCommand('cut') },
        { id: 'copy',  label: 'Copy',  shortcut: 'Ctrl+C',       action: () => document.execCommand('copy') },
        { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V',       action: () => document.execCommand('paste') },
      ],
    },
    {
      id: 'insert',
      label: 'Insert',
      actions: [
        { id: 'doc',     label: 'Document scaffold', action: () => handleInsert('doc') },
        { id: 'sec',     label: 'Section',    action: () => handleInsert('sec'),  separator: true },
        { id: 'ssec',    label: 'Subsection', action: () => handleInsert('ssec') },
        { id: 'sssec',   label: 'Subsubsection', action: () => handleInsert('sssec') },
        { id: 'fig',     label: 'Figure',     action: () => handleInsert('fig'),  separator: true },
        { id: 'tab',     label: 'Table',      action: () => handleInsert('tab') },
        { id: 'itemize', label: 'Bullet list',    action: () => handleInsert('-'),   separator: true },
        { id: 'enum',    label: 'Numbered list',  action: () => handleInsert('1.') },
        { id: 'math',    label: 'Display math',   action: () => handleInsert('$$'),  separator: true },
        { id: 'eq',      label: 'Equation',       action: () => handleInsert('eq') },
        { id: 'align',   label: 'Align',          action: () => handleInsert('align') },
      ],
    },
    {
      id: 'build',
      label: 'Build',
      actions: [
        {
          id: 'build',
          label: buildState.status === 'building' ? 'Building…' : 'Build PDF',
          shortcut: 'Ctrl+B',
          action: handleBuild,
          disabled: buildState.status === 'building',
        },
        {
          id: 'log',
          label: showLog ? 'Hide Log' : 'Show Log',
          action: () => { showLog = !showLog; },
          separator: true,
        },
        {
          id: 'reset',
          label: 'Clear Log',
          action: () => buildStore.reset(),
        },
      ],
    },
  ]);
</script>

<div class="app">
  <TabBar
    {tabs}
    fileState={{ path: fileState.path, dirty: fileState.dirty }}
    buildState={{ status: buildState.status }}
    isRawMode={rawMode}
    isDarkTheme={currentTheme === 'dark'}
    onToggleRawMode={handleToggleRawMode}
    onToggleTheme={handleToggleTheme}
  />

  <div class="workspace">
    <Splitpanes horizontal={showLog} class="main-split">
      <Pane size={showLog ? 68 : 100} minSize={30}>
        <Splitpanes class="editor-split">
          <Pane size={50} minSize={20}>
            <Editor
              bind:this={editorRef}
              content={fileState.content}
              onchange={handleContentChange}
            />
          </Pane>
          <Pane size={50} minSize={20}>
            <PdfViewer pdfPath={buildState.pdfPath} />
          </Pane>
        </Splitpanes>
      </Pane>

      {#if showLog}
        <Pane size={32} minSize={10}>
          <LogPanel
            logs={buildState.logs}
            error={buildState.error}
            status={buildState.status}
          />
        </Pane>
      {/if}
    </Splitpanes>
  </div>

  <!-- ── Status bar ─────────────────────────────────────────────────── -->
  <StatusBar
    line={cursorLine}
    col={cursorCol}
    charCount={fileState.content.length}
    buildStatus={buildState.status}
    {showLog}
    onToggleLog={() => { showLog = !showLog; }}
  />
</div>

<style>
  /* ── App shell ──────────────────────────────────────────────────────── */
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg);
    overflow: hidden;
  }

  .workspace {
    flex: 1;
    overflow: hidden;
    min-height: 0; /* required for flex children to shrink below content */
  }

  /* ── Splitpanes overrides ───────────────────────────────────────────── */
  :global(.splitpanes__pane) {
    background: inherit;
    overflow: hidden;
  }

  :global(.splitpanes__splitter) {
    background: var(--border) !important;
    position: relative;
    z-index: 10;
    transition: background var(--transition-fast);
  }

  :global(.splitpanes__splitter:hover) {
    background: var(--accent) !important;
  }

  /* Vertical splitter sizing */
  :global(.splitpanes--vertical > .splitpanes__splitter) {
    width: 4px !important;
    cursor: col-resize;
  }

  /* Horizontal splitter sizing */
  :global(.splitpanes--horizontal > .splitpanes__splitter) {
    height: 4px !important;
    cursor: row-resize;
  }
</style>
