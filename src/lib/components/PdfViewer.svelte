<script lang="ts">
  import { convertFileSrc } from '@tauri-apps/api/core';
  import { onMount, onDestroy } from 'svelte';

  export let pdfPath: string | null = null;

  let iframe: HTMLIFrameElement;
  let currentPdfSrc: string = '';

  $: if (pdfPath && iframe) {
    loadPdf(pdfPath);
  }

  function loadPdf(path: string) {
    try {
      currentPdfSrc = convertFileSrc(path);
      if (iframe) {
        iframe.src = currentPdfSrc;
      }
    } catch (e) {
      console.error('Failed to load PDF:', e);
    }
  }

  onMount(() => {
    if (pdfPath) {
      loadPdf(pdfPath);
    }
  });
</script>

<div class="pdf-viewer">
  {#if pdfPath && currentPdfSrc}
    <iframe 
      bind:this={iframe}
      src={currentPdfSrc}
      title="PDF Preview"
    ></iframe>
  {:else}
    <div class="placeholder">
      <p>No PDF yet — hit Build PDF to compile.</p>
    </div>
  {/if}
</div>

<style>
  .pdf-viewer {
    width: 100%;
    height: 100%;
    background: #f5f5f5;
    display: flex;
    flex-direction: column;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
    background: white;
  }

  .placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #666;
  }

  .placeholder p {
    margin: 8px 0;
  }
</style>
