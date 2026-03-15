<script lang="ts">
  import type { Tab } from '$lib/tabs/definitions';
  import { onMount } from 'svelte';

  interface FileState {
    path: string | null;
    dirty: boolean;
  }

  interface BuildState {
    status: 'idle' | 'building' | 'success' | 'error';
  }

  interface Props {
    tabs: Tab[];
    fileState: FileState;
    buildState: BuildState;
    onToggleRawMode?: () => void;
    isRawMode?: boolean;
  }

  let { tabs, fileState, buildState, onToggleRawMode, isRawMode = false }: Props = $props();

  let activeTab: string | null = $state(null);
  let popupRef: HTMLDivElement;

  function handleTabClick(tabId: string) {
    activeTab = activeTab === tabId ? null : tabId;
  }

  function handleActionClick(action: () => void) {
    action();
    activeTab = null;
  }

  function handleClickOutside(event: MouseEvent) {
    if (popupRef && !popupRef.contains(event.target as Node)) {
      activeTab = null;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="toolbar" bind:this={popupRef}>
  <div class="tab-list">
    {#each tabs as tab}
      <div class="tab-wrapper">
        <button
          class="tab"
          class:active={activeTab === tab.id}
          onclick={(e) => { e.stopPropagation(); handleTabClick(tab.id); }}
        >
          {tab.label}
        </button>

        {#if activeTab === tab.id}
          <div class="popup" role="menu" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
            <div class="action-grid">
              {#each tab.actions as action}
                <button
                  class="action-btn"
                  class:disabled={action.disabled}
                  disabled={action.disabled}
                  onclick={() => handleActionClick(action.action)}
                  title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
                >
                  <span class="action-label">{action.label}</span>
                  {#if action.shortcut}
                    <span class="action-shortcut">{action.shortcut}</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="title-center">
    {#if fileState.path}
      <span class="filename" class:dirty={fileState.dirty}>
        {fileState.path.split('/').pop()}
        {fileState.dirty ? ' •' : ''}
      </span>
    {:else}
      <span class="filename">Untitled</span>
    {/if}
  </div>

  <div class="toolbar-right">
    {#if buildState.status === 'error'}
      <span class="error-badge">Error</span>
    {/if}
    <button 
      class="raw-toggle" 
      class:active={isRawMode}
      onclick={onToggleRawMode}
      title="Toggle raw LaTeX mode"
    >
      RAW
    </button>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    background: #f0f0f0;
    border-bottom: 1px solid #ccc;
    padding: 0 12px;
    height: 38px;
    position: relative;
  }

  .tab-list {
    display: flex;
    gap: 2px;
  }

  .tab-wrapper {
    position: relative;
  }

  .tab {
    padding: 8px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    color: #333;
  }

  .tab:hover {
    background: #e8e8e8;
  }

  .tab.active {
    background: #fff;
    font-weight: 500;
  }

  .title-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  .filename {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: #333;
  }

  .filename.dirty {
    color: #e67e22;
  }

  .toolbar-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .error-badge {
    padding: 2px 8px;
    border-radius: 10px;
    background: #e74c3c;
    color: white;
    font-size: 11px;
    font-weight: 500;
  }

  .raw-toggle {
    padding: 2px 6px;
    border: 1px solid #ccc;
    border-radius: 3px;
    background: #fff;
    color: #666;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
  }

  .raw-toggle:hover {
    background: #e8e8e8;
  }

  .raw-toggle.active {
    background: #e74c3c;
    color: white;
    border-color: #e74c3c;
  }

  .popup {
    position: absolute;
    top: 100%;
    left: 0;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 8px;
    z-index: 100;
    min-width: 180px;
  }

  .action-grid {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 3px;
    text-align: left;
  }

  .action-btn:hover:not(:disabled) {
    background: #e8e8e8;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-label {
    font-size: 12px;
    color: #333;
  }

  .action-shortcut {
    font-size: 10px;
    color: #888;
    margin-left: 16px;
  }
</style>
