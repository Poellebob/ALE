<!--
  src/lib/components/PdfViewer.svelte

  Renders the compiled PDF in an <iframe> using Tauri's convertFileSrc()
  to translate the native file-system path into a URL that WebKit can load.

  A cache-busting query parameter (?t=<timestamp>) is appended each time
  pdfPath changes so the iframe reloads even when the path is the same.

  See docs/08-pdf-viewer.md for details.
-->
<script lang="ts">
  import { convertFileSrc } from '@tauri-apps/api/core';

  interface Props {
    pdfPath: string | null;
  }

  let { pdfPath }: Props = $props();

  // Derive the iframe src.  The timestamp busts the browser cache.
  let src = $derived(
    pdfPath ? convertFileSrc(pdfPath) + '?t=' + Date.now() : ''
  );
</script>

<div class="pdf-shell">
  {#if pdfPath && src}
    <iframe
      {src}
      title="PDF Preview"
      class="pdf-frame"
    ></iframe>
  {:else}
    <div class="pdf-placeholder">
      <div class="pdf-placeholder__icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="4" width="28" height="36" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M28 4v10h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="14" y1="20" x2="30" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="14" y1="25" x2="30" y2="25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="14" y1="30" x2="24" y2="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="pdf-placeholder__heading">No PDF yet</p>
      <p class="pdf-placeholder__sub">Press <kbd>Ctrl+B</kbd> to compile</p>
    </div>
  {/if}
</div>

<style>
  /* ── Shell ──────────────────────────────────────────────────────────── */
  .pdf-shell {
    width: 100%;
    height: 100%;
    background: var(--pdf-bg);
    display: flex;
    flex-direction: column;
  }

  /* ── Live PDF iframe ─────────────────────────────────────────────────── */
  .pdf-frame {
    flex: 1;
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
  }

  /* ── Empty state ─────────────────────────────────────────────────────── */
  .pdf-placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    color: var(--pdf-placeholder-text);
  }

  .pdf-placeholder__icon {
    opacity: 0.35;
    margin-bottom: var(--space-2);
  }

  .pdf-placeholder__heading {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--text-muted);
  }

  .pdf-placeholder__sub {
    font-size: var(--font-size-sm);
    color: var(--text-subtle);
  }

  .pdf-placeholder__sub kbd {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 1px var(--space-1);
  }
</style>
