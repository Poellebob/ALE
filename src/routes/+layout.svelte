<script lang="ts">
  import '$lib/theme.css';
  import '$lib/editor.css';
  import 'katex/dist/katex.min.css';
  import { themeStore } from '$lib/stores';
  import { onMount } from 'svelte';

  // Keep the <html data-theme> attribute in sync with the store
  onMount(() => {
    return themeStore.subscribe((t) => {
      document.documentElement.setAttribute('data-theme', t);
    });
  });
</script>

<slot />
