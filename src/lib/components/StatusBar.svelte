<!--
  src/lib/components/StatusBar.svelte

  The thin bar along the very bottom of the window.
  Shows:
    – Current cursor line + column
    – Character count
    – Build status
    – A "Show / Hide log" toggle button

  See docs/10-statusbar.md for details.
-->
<script lang="ts">
  interface Props {
    line: number;
    col: number;
    charCount: number;
    buildStatus: string;
    showLog: boolean;
    onToggleLog?: () => void;
  }

  let { line, col, charCount, buildStatus, showLog, onToggleLog }: Props = $props();
</script>

<footer class="statusbar">
  <!-- Left: cursor position + character count -->
  <div class="statusbar-left">
    <span class="statusbar-item" title="Cursor position">
      Ln {line}, Col {col}
    </span>
    <span class="statusbar-sep" aria-hidden="true">·</span>
    <span class="statusbar-item" title="Character count">
      {charCount.toLocaleString()} chars
    </span>
  </div>

  <!-- Right: build status + log toggle -->
  <div class="statusbar-right">
    <span
      class="statusbar-status"
      class:statusbar-status--building={buildStatus === 'building'}
      class:statusbar-status--success={buildStatus === 'success'}
      class:statusbar-status--error={buildStatus === 'error'}
    >
      {#if buildStatus === 'building'}
        ⟳ Building…
      {:else if buildStatus === 'success'}
        ✓ Build OK
      {:else if buildStatus === 'error'}
        ✕ Build Error
      {:else}
        ● Idle
      {/if}
    </span>

    <button
      class="statusbar-btn"
      class:statusbar-btn--active={showLog}
      onclick={onToggleLog}
      title={showLog ? 'Hide log panel' : 'Show log panel'}
    >
      Log
    </button>
  </div>
</footer>

<style>
  /* ── Shell ──────────────────────────────────────────────────────────── */
  .statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--statusbar-height);
    background: var(--accent);
    color: var(--text-on-accent);
    padding: 0 var(--space-3);
    font-size: var(--font-size-xs);
    user-select: none;
    flex-shrink: 0;
  }

  /* ── Left / Right groups ────────────────────────────────────────────── */
  .statusbar-left,
  .statusbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .statusbar-item {
    opacity: 0.85;
  }

  .statusbar-sep {
    opacity: 0.5;
  }

  /* ── Build status chip ──────────────────────────────────────────────── */
  .statusbar-status {
    font-weight: 600;
    opacity: 0.9;
    transition: opacity var(--transition-fast);
  }

  .statusbar-status--building {
    opacity: 1;
    animation: pulse 1.2s ease-in-out infinite;
  }

  .statusbar-status--error {
    color: #fca5a5; /* light red readable on accent background */
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.55; }
  }

  /* ── Log toggle button ──────────────────────────────────────────────── */
  .statusbar-btn {
    padding: 0 var(--space-2);
    height: 16px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--text-on-accent);
    background: transparent;
    letter-spacing: 0.04em;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);
  }

  .statusbar-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.6);
  }

  .statusbar-btn--active {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.7);
  }
</style>
