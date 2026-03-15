<!--
  src/lib/components/LogPanel.svelte

  Displays streaming build output from latexmk.
  stderr lines are highlighted in the error colour.
  The panel auto-scrolls to the bottom as new lines arrive.

  See docs/09-log-panel.md for details.
-->
<script lang="ts">
  import type { BuildLogEntry } from '$lib/stores/buildStore';
  import { tick } from 'svelte';

  interface Props {
    logs: BuildLogEntry[];
    error: string | null;
    status: string;
  }

  let { logs, error, status }: Props = $props();

  let scroller: HTMLDivElement;

  // Scroll to bottom whenever logs change
  $effect(() => {
    void logs.length; // reactive dependency
    tick().then(() => {
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    });
  });
</script>

<div class="log-panel" bind:this={scroller}>
  {#if logs.length === 0 && !error}
    <div class="log-empty">
      {status === 'building' ? 'Build running…' : 'No build output'}
    </div>
  {:else}
    <div class="log-lines">
      {#each logs as entry}
        <div
          class="log-line"
          class:log-line--stderr={entry.stream === 'stderr'}
        >
          {entry.line}
        </div>
      {/each}
    </div>
  {/if}

  {#if error}
    <div class="log-error">
      <span class="log-error__label">Error</span>
      {error}
    </div>
  {/if}
</div>

<style>
  /* ── Panel shell ─────────────────────────────────────────────────────── */
  .log-panel {
    height: 100%;
    overflow-y: auto;
    background: var(--log-bg);
    color: var(--log-text);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
    padding: var(--space-2) var(--space-3);

    /* Thin custom scrollbar */
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }

  .log-panel::-webkit-scrollbar       { width: 6px; }
  .log-panel::-webkit-scrollbar-track { background: transparent; }
  .log-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  /* ── Empty / building state ──────────────────────────────────────────── */
  .log-empty {
    color: var(--log-meta);
    padding: var(--space-4) 0;
    text-align: center;
    font-size: var(--font-size-sm);
  }

  /* ── Log lines ───────────────────────────────────────────────────────── */
  .log-lines {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .log-line {
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--log-text);
    padding: 1px 0;
  }

  .log-line--stderr {
    color: var(--log-stderr);
  }

  /* ── Error banner ────────────────────────────────────────────────────── */
  .log-error {
    margin-top: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: var(--error-subtle);
    color: var(--error);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
  }

  .log-error__label {
    font-weight: 700;
    text-transform: uppercase;
    font-size: var(--font-size-xs);
    letter-spacing: 0.05em;
    margin-right: var(--space-2);
  }
</style>
