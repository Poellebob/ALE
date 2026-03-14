<script lang="ts">
  import { Splitpanes, Pane } from 'svelte-splitpanes';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { open, save } from '@tauri-apps/plugin-dialog';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { onMount, onDestroy } from 'svelte';
  import Editor from '$lib/components/Editor.svelte';
  import PdfViewer from '$lib/components/PdfViewer.svelte';
  import { fileStore, buildStore, type BuildLogEntry } from '$lib/stores';

  let editorComponent: Editor;
  let pdfPath: string | null = null;
  let showLog = $state(false);
  let logContainer: HTMLDivElement;

  let fileState = $state({ path: null as string | null, content: '', dirty: false });
  let buildState = $state({ status: 'idle' as 'idle' | 'building' | 'success' | 'error', logs: [] as BuildLogEntry[], pdfPath: null as string | null, error: null as string | null });

  const unsubFile = fileStore.subscribe(s => { fileState = s; });
  const unsubBuild = buildStore.subscribe(s => { buildState = s; });

  let unlisten: (() => void) | null = null;

  onMount(async () => {
    unlisten = await listen<{ line: string; stream: string }>('build-log', (event) => {
      buildStore.addLog(event.payload.line, event.payload.stream as 'stdout' | 'stderr');
    });
  });

  onDestroy(() => {
    if (unlisten) unlisten();
    unsubFile();
    unsubBuild();
  });

  $effect(() => {
    if (buildState.logs.length && logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  });

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

  async function handleBuild() {
    if (!fileState.path) {
      await handleSave();
      if (!fileState.path) return;
    }
    
    buildStore.start();
    
    const result = await invoke<{ success: boolean; pdf_path: string | null; error: string | null }>('build_latex', { path: fileState.path });
    
    if (result.success && result.pdf_path) {
      buildStore.success(result.pdf_path);
      pdfPath = result.pdf_path;
    } else {
      buildStore.error(result.error || 'Build failed');
    }
  }

  function handleContentChange(content: string) {
    fileStore.setContent(content);
  }

  async function minimizeWindow() {
    await getCurrentWindow().minimize();
  }

  async function toggleMaximize() {
    const win = getCurrentWindow();
    if (await win.isMaximized()) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
  }

  async function closeWindow() {
    await getCurrentWindow().close();
  }
</script>

<div class="app">
  <header class="titlebar" data-tauri-drag-region>
    <div class="titlebar-left">
      <div class="toolbar-buttons">
        <button onclick={handleOpen}>Open</button>
        <button onclick={handleSave} disabled={!fileState.dirty}>Save</button>
        <button onclick={handleBuild} disabled={buildState.status === 'building'}>
          {buildState.status === 'building' ? 'Building...' : 'Build'}
        </button>
        <button onclick={() => showLog = !showLog} class:active={showLog}>Log</button>
      </div>
    </div>
    <div class="titlebar-center">
      {#if fileState.path}
        <span class="filename" class:dirty={fileState.dirty}>
          {fileState.path.split('/').pop()}
          {fileState.dirty ? ' •' : ''}
        </span>
      {:else}
        <span class="filename">Untitled</span>
      {/if}
    </div>
    <div class="titlebar-right">
      <span class="status" class:building={buildState.status === 'building'} class:success={buildState.status === 'success'} class:error={buildState.status === 'error'}>
        {buildState.status === 'idle' ? '' : buildState.status === 'building' ? 'Building...' : buildState.status === 'success' ? 'Built' : 'Error'}
      </span>
      <button class="window-btn" onclick={minimizeWindow} aria-label="Minimize">
        <svg width="12" height="fill" viewBox="0 0 12 12"><rect y="5" width="12" height="2" fill="currentColor"/></svg>
      </button>
      <button class="window-btn" onclick={toggleMaximize} aria-label="Maximize">
        <svg width="12" height="fill" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none"/></svg>
      </button>
      <button class="window-btn close" onclick={closeWindow} aria-label="Close">
        <svg width="12" height="fill" viewBox="0 0 12 12"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="2"/></svg>
      </button>
    </div>
  </header>

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
          <divALE, a latex editor class="log-panel" bind:this={logContainer}>
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
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #fff;
  }

  .titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    background: #323233;
    color: #fff;
    padding: 0 8px;
    -webkit-app-region: drag;
    user-select: none;
  }

  .titlebar-left {
    display: flex;
    align-items: center;
    gap: 16px;
    -webkit-app-region: no-drag;
  }

  .app-title {
    font-weight: 600;
    font-size: 13px;
    padding-left: 4px;
  }

  .toolbar-buttons {
    display: flex;
    gap: 4px;
  }

  .titlebar-center {
    flex: 1;
    text-align: center;
    -webkit-app-region: drag;
  }

  .filename {
    font-size: 13px;
    opacity: 0.9;
  }

  .filename.dirty {
    color: #e67e22;
  }

  .titlebar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    -webkit-app-region: no-drag;
  }

  .status {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    background: #555;
  }

  .status.building { background: #f39c12; }
  .status.success { background: #27ae60; }
  .status.error { background: #e74c3c; }

  .titlebar button {
    padding: 4px 10px;
    border: none;
    background: transparent;
    color: #ccc;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
  }

  .titlebar button:hover:not(:disabled) {
    background: #454545;
    color: #fff;
  }

  .titlebar button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .titlebar button.active {
    background: #0078d4;
    color: white;
  }

  .window-btn {
    width: 32px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none !important;
    background: transparent !important;
    color: #ccc !important;
    border-radius: 0 !important;
    padding: 0 !important;
  }

  .window-btn:hover {
    background: #454545 !important;
    color: #fff !important;
  }

  .window-btn.close:hover {
    background: #e81123 !important;
    color: #fff !important;
  }

  .main {
    flex: 1;
    overflow: hidden;
  }

  .log-panel {
    height: 100%;
    overflow: auto;
    background: #1e1e1e;
    color: #d4d4d4;
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
    background: #ddd;
    position: relative;
  }

  :global(.splitpanes__splitter:before) {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    transition: opacity 0.4s;
    background-color: #3498db;
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
