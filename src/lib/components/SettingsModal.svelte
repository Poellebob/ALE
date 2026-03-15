<script lang="ts">
  import { settingsStore, type Settings } from '$lib/stores';
  import { get } from 'svelte/store';
  import { themes } from '$lib/themes';
  
  interface Props {
    open: boolean;
    onClose: () => void;
  }
  
  let { open, onClose }: Props = $props();
  
  let settings: Settings = $derived(get(settingsStore));
  
  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    settingsStore.patch({ [key]: value });
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={onClose} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }} role="presentation">
    <div class="modal-window" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="close-btn" onclick={onClose}>&times;</button>
      </div>
      
      <div class="modal-content">
        <section class="settings-section">
          <h3>Appearance</h3>
          <div class="setting-row">
            <label for="theme">Theme</label>
            <select
              id="theme"
              value={settings.theme}
              onchange={(e) => updateSetting('theme', e.currentTarget.value)}
            >
              <option value="system">System</option>
              {#each Object.keys(themes) as themeName}
                <option value={themeName}>{themeName}</option>
              {/each}
            </select>
          </div>
        </section>

        <section class="settings-section">
          <h3>Editor</h3>
          
          <div class="setting-row">
            <label for="fontSize">Font Size</label>
            <div class="stepper">
              <button onclick={() => updateSetting('fontSize', Math.max(10, settings.fontSize - 1))}>-</button>
              <span>{settings.fontSize}</span>
              <button onclick={() => updateSetting('fontSize', Math.min(24, settings.fontSize + 1))}>+</button>
            </div>
          </div>
          
          <div class="setting-row">
            <label for="fontFamily">Font Family</label>
            <select 
              id="fontFamily" 
              value={settings.fontFamily}
              onchange={(e) => updateSetting('fontFamily', e.currentTarget.value)}
            >
              <option value="JetBrains Mono">JetBrains Mono</option>
              <option value="Fira Code">Fira Code</option>
              <option value="Monaco">Monaco</option>
              <option value="Consolas">Consolas</option>
            </select>
          </div>
          
          <div class="setting-row">
            <label for="lineNumbers">Line Numbers</label>
            <input 
              type="checkbox" 
              id="lineNumbers"
              checked={settings.lineNumbers}
              onchange={(e) => updateSetting('lineNumbers', e.currentTarget.checked)}
            />
          </div>
          
          <div class="setting-row">
            <label for="wordWrap">Word Wrap</label>
            <input 
              type="checkbox" 
              id="wordWrap"
              checked={settings.wordWrap}
              onchange={(e) => updateSetting('wordWrap', e.currentTarget.checked)}
            />
          </div>
        </section>
        
        <section class="settings-section">
          <h3>Rendering</h3>
          
          <div class="setting-row">
            <label for="renderMath">Math</label>
            <input 
              type="checkbox" 
              id="renderMath"
              checked={settings.renderMath}
              onchange={(e) => updateSetting('renderMath', e.currentTarget.checked)}
            />
          </div>
          
          <div class="setting-row">
            <label for="renderFormatting">Bold/Italic</label>
            <input 
              type="checkbox" 
              id="renderFormatting"
              checked={settings.renderFormatting}
              onchange={(e) => updateSetting('renderFormatting', e.currentTarget.checked)}
            />
          </div>
          
          <div class="setting-row">
            <label for="renderHeadings">Headings</label>
            <input 
              type="checkbox" 
              id="renderHeadings"
              checked={settings.renderHeadings}
              onchange={(e) => updateSetting('renderHeadings', e.currentTarget.checked)}
            />
          </div>
        </section>
        
        <section class="settings-section">
          <h3>Build</h3>
          
          <div class="setting-row">
            <label for="autoSave">Auto-save</label>
            <input 
              type="checkbox" 
              id="autoSave"
              checked={settings.autoSave}
              onchange={(e) => updateSetting('autoSave', e.currentTarget.checked)}
            />
          </div>
          
          <div class="setting-row">
            <label for="buildOnSave">Build on Save</label>
            <input 
              type="checkbox" 
              id="buildOnSave"
              checked={settings.buildOnSave}
              onchange={(e) => updateSetting('buildOnSave', e.currentTarget.checked)}
            />
          </div>
        </section>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal-window {
    width: 400px;
    max-height: 80vh;
    background: var(--primary);
    color: var(--text);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--secondary);
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--text);
    padding: 0;
    line-height: 1;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }
  
  .close-btn:hover {
    background: var(--secondary);
  }
  
  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  
  .settings-section {
    margin-bottom: 24px;
  }
  
  .settings-section:last-child {
    margin-bottom: 0;
  }
  
  .settings-section h3 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    opacity: 0.7;
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }
  
  .setting-row label {
    font-size: 14px;
    color: var(--text);
  }
  
  .stepper {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .stepper button {
    width: 28px;
    height: 28px;
    border: 1px solid var(--secondary);
    background: var(--primary);
    color: var(--text);
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .stepper button:hover {
    background: var(--secondary);
  }
  
  .stepper span {
    min-width: 24px;
    text-align: center;
    font-size: 14px;
  }
  
  select {
    padding: 4px 8px;
    border: 1px solid var(--secondary);
    background: var(--primary);
    color: var(--text);
    border-radius: 4px;
    font-size: 14px;
  }
  
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
</style>
