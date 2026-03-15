<!--
  src/lib/components/TabBar.svelte

  The application toolbar. Acts as both the window drag region (because
  decorations are disabled in tauri.conf.json) and the primary menu bar.

  Props:
    tabs          – array of Tab objects built reactively in +page.svelte
    fileState     – { path, dirty } from fileStore
    buildState    – { status } from buildStore
    onToggleRawMode  – callback to flip the decoration raw-mode flag
    onToggleTheme    – callback to flip light/dark
    isRawMode     – current raw-mode flag (reflected onto the button)
    isDarkTheme   – current dark-mode flag (reflected onto the button)
-->
<script lang="ts">
  import type { Tab } from '$lib/tabs/definitions';
  import { onMount } from 'svelte';

  interface Props {
    tabs: Tab[];
    fileState: { path: string | null; dirty: boolean };
    buildState: { status: string };
    onToggleRawMode?: () => void;
    onToggleTheme?: () => void;
    isRawMode?: boolean;
    isDarkTheme?: boolean;
  }

  let {
    tabs,
    fileState,
    buildState,
    onToggleRawMode,
    onToggleTheme,
    isRawMode = false,
    isDarkTheme = false,
  }: Props = $props();

  // Which tab dropdown is currently open (null = all closed)
  let activeTab: string | null = $state(null);

  // The toolbar element itself — used to detect outside clicks
  let toolbar: HTMLDivElement;

  function handleTabClick(tabId: string) {
    activeTab = activeTab === tabId ? null : tabId;
  }

  function handleActionClick(action: () => void) {
    action();
    activeTab = null;
  }

  function handleOutsideClick(e: MouseEvent) {
    if (toolbar && !toolbar.contains(e.target as Node)) {
      activeTab = null;
    }
  }

  onMount(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  });

  // Derive a short filename for the title centre
  const filename = $derived(
    fileState.path
      ? fileState.path.split('/').pop() ?? 'Untitled'
      : 'Untitled'
  );
</script>

<div
  class="toolbar"
  bind:this={toolbar}
  data-tauri-drag-region
>
  <!-- ── Left: tab buttons ─────────────────────────────────────────── -->
  <div class="tab-list" role="menubar">
    {#each tabs as tab}
      <div class="tab-wrapper">
        <button
          class="tab-btn"
          class:tab-btn--active={activeTab === tab.id}
          role="menuitem"
          aria-haspopup="true"
          aria-expanded={activeTab === tab.id}
          onmousedown={(e) => { e.stopPropagation(); }}
          onclick={(e) => { e.stopPropagation(); handleTabClick(tab.id); }}
        >
          {tab.label}
        </button>

        {#if activeTab === tab.id}
          <div
            class="dropdown"
            role="menu"
            onmousedown={(e) => e.stopPropagation()}
          >
            {#each tab.actions as action}
              {#if action.separator}
                <div class="dropdown-separator" role="separator"></div>
              {/if}
              <button
                class="dropdown-item"
                class:dropdown-item--disabled={action.disabled}
                role="menuitem"
                disabled={action.disabled}
                onclick={() => handleActionClick(action.action)}
                title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
              >
                <span class="dropdown-item__label">{action.label}</span>
                {#if action.shortcut}
                  <kbd class="dropdown-item__kbd">{action.shortcut}</kbd>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- ── Centre: filename + dirty indicator ────────────────────────── -->
  <div class="title" aria-label="Current file" data-tauri-drag-region>
    <span class="title__name" class:title__name--dirty={fileState.dirty}>
      {filename}{fileState.dirty ? ' ●' : ''}
    </span>
    {#if buildState.status === 'building'}
      <span class="title__badge title__badge--building">building…</span>
    {:else if buildState.status === 'success'}
      <span class="title__badge title__badge--success">built</span>
    {:else if buildState.status === 'error'}
      <span class="title__badge title__badge--error">error</span>
    {/if}
  </div>

  <!-- ── Right: icon buttons ───────────────────────────────────────── -->
  <div class="toolbar-end">
    <!-- RAW mode toggle — shows plain LaTeX instead of decorations -->
    <button
      class="icon-btn"
      class:icon-btn--active={isRawMode}
      title="Toggle raw LaTeX mode"
      onclick={onToggleRawMode}
    >
      RAW
    </button>

    <!-- Light / Dark theme toggle -->
    <button
      class="icon-btn icon-btn--theme"
      title={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
      onclick={onToggleTheme}
      aria-label="Toggle theme"
    >
      {isDarkTheme ? '☀' : '☾'}
    </button>
  </div>
</div>

<style>
  /* ── Toolbar shell ─────────────────────────────────────────────────── */
  .toolbar {
    display: flex;
    align-items: center;
    height: var(--toolbar-height);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 0 var(--space-2);
    position: relative;
    user-select: none;        /* drag region should not select text */
    -webkit-app-region: drag; /* WebKit drag-to-move the window */
  }

  /* Make interactive children non-draggable so clicks still work */
  .tab-list,
  .toolbar-end {
    -webkit-app-region: no-drag;
  }

  /* ── Tab buttons ───────────────────────────────────────────────────── */
  .tab-list {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  .tab-wrapper {
    position: relative;
  }

  .tab-btn {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-base);
    color: var(--text-muted);
    transition: background var(--transition-fast), color var(--transition-fast);
    white-space: nowrap;
  }

  .tab-btn:hover {
    background: var(--bg-secondary);
    color: var(--text);
  }

  .tab-btn--active {
    background: var(--bg-secondary);
    color: var(--text);
    font-weight: 500;
  }

  /* ── Dropdown ──────────────────────────────────────────────────────── */
  .dropdown {
    position: absolute;
    top: calc(100% + var(--space-1));
    left: 0;
    z-index: 200;
    min-width: 200px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-popup);
    padding: var(--space-1);
    animation: dropdown-in var(--transition-fast) ease;
  }

  @keyframes dropdown-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .dropdown-separator {
    height: 1px;
    background: var(--border-subtle);
    margin: var(--space-1) 0;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-base);
    color: var(--text);
    text-align: left;
    transition: background var(--transition-fast);
  }

  .dropdown-item:hover:not(:disabled) {
    background: var(--bg-secondary);
  }

  .dropdown-item--disabled {
    color: var(--text-subtle);
  }

  .dropdown-item__label {
    flex: 1;
  }

  .dropdown-item__kbd {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-subtle);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 1px var(--space-1);
    margin-left: var(--space-4);
    white-space: nowrap;
  }

  /* ── Centre title ──────────────────────────────────────────────────── */
  .title {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    pointer-events: none;
  }

  .title__name {
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    color: var(--text-muted);
    transition: color var(--transition-fast);
  }

  .title__name--dirty {
    color: var(--warning);
  }

  .title__badge {
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 1px var(--space-2);
    border-radius: var(--radius-full);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .title__badge--building {
    background: var(--accent-subtle);
    color: var(--accent);
    animation: pulse 1.2s ease-in-out infinite;
  }

  .title__badge--success {
    background: var(--success-subtle);
    color: var(--success);
  }

  .title__badge--error {
    background: var(--error-subtle);
    color: var(--error);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }

  /* ── Toolbar end ───────────────────────────────────────────────────── */
  .toolbar-end {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .icon-btn {
    padding: 2px var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 700;
    color: var(--text-muted);
    background: var(--surface);
    letter-spacing: 0.05em;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast);
  }

  .icon-btn:hover {
    background: var(--bg-secondary);
    color: var(--text);
    border-color: var(--border-strong);
  }

  .icon-btn--active {
    background: var(--error);
    color: var(--text-inverse);
    border-color: var(--error);
  }

  .icon-btn--theme {
    font-size: var(--font-size-sm);
  }
</style>
