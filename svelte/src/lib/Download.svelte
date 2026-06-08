<script>
  import { importKeyB64, decryptPayload, TransportError, DecryptError } from './crypto.js';
  import { getFile } from './api.js';

  let { url, keyFromHash = '' } = $props();

  let phase = $state('downloading'); // downloading | needkey | decrypting | ready | error
  let progress = $state(0);
  let errorMsg = $state('');
  let meta = $state(null);
  let keyInput = $state('');
  let downloadUrl = $state('');
  let downloadName = $state('');

  // Encrypted bytes kept here (plain, non-reactive — up to ~20MB). Holding it lets
  // a wrong-key retry re-decrypt locally WITHOUT re-requesting (which burns a view).
  let body = null;

  const remaining = $derived(meta && meta.maxViews != null ? meta.maxViews - meta.views : null);
  const lastView = $derived(remaining != null && remaining <= 1);

  async function start() {
    try {
      phase = 'downloading';
      const res = await getFile(url, (p) => (progress = p));
      body = res.body;
      meta = res.meta;
      if (keyFromHash) {
        await doDecrypt(keyFromHash);
      } else {
        phase = 'needkey';
      }
    } catch (e) {
      phase = 'error';
      errorMsg = e?.message || 'Download failed.';
    }
  }

  async function doDecrypt(keyB64) {
    phase = 'decrypting';
    errorMsg = '';
    try {
      const key = await importKeyB64(keyB64);
      const { fileBytes, meta: fileMeta } = await decryptPayload(key, body);
      const type = fileMeta.contentType || 'application/octet-stream';
      const safeType = /^text\/html/i.test(type) ? 'application/octet-stream' : type;
      const blob = new Blob([fileBytes], { type: safeType });
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      downloadUrl = URL.createObjectURL(blob);
      downloadName = fileMeta.fileName || 'download';
      phase = 'ready';
    } catch (e) {
      phase = 'needkey';
      if (e instanceof TransportError) {
        errorMsg = 'The download was incomplete — the file may no longer be available.';
      } else if (e instanceof DecryptError) {
        errorMsg = 'Incorrect key. Check the link, or paste the key below and try again.';
      } else if (e && (e.name === 'RangeError' || e.name === 'DataError' || e.name === 'QuotaExceededError')) {
        errorMsg = 'This file is too large to process in this browser.';
      } else {
        errorMsg = e?.message || 'Could not decrypt the file.';
      }
    }
  }

  function submitKey() {
    if (keyInput.trim()) doDecrypt(keyInput);
  }

  start();
</script>

<section class="panel">
  <h2>Secured File</h2>

  {#if phase === 'downloading'}
    <p>Downloading the encrypted file…</p>
    <progress value={progress} max="1"></progress>
    <p class="muted" style="margin:8px 0 0">{Math.round(progress * 100)}%</p>
  {:else}
    {#if meta}
      {#if lastView}
        <div class="alert warn">
          <strong>This is the last view.</strong> Do not close this tab until your
          download finishes — once consumed, the file is permanently deleted and
          cannot be recovered.
        </div>
      {:else if remaining != null}
        <div class="alert info">
          {remaining} view{remaining === 1 ? '' : 's'} remaining.
          {#if meta.expiration}Expires {new Date(meta.expiration).toLocaleString()}.{/if}
        </div>
      {/if}
    {/if}

    {#if phase === 'needkey'}
      <div class="field" style="margin-top:16px">
        <label for="key">File Password / Key</label>
        <input
          id="key"
          type="text"
          placeholder="Paste the key from the sender"
          bind:value={keyInput}
          onkeydown={(e) => e.key === 'Enter' && submitKey()}
        />
      </div>
      <div class="actions">
        <button class="btn btn-success" onclick={submitKey} disabled={!keyInput.trim()}>
          Decrypt &amp; Download
        </button>
      </div>
    {:else if phase === 'decrypting'}
      <p>Decrypting in your browser…</p>
    {:else if phase === 'ready'}
      <p>Decrypted in your browser. Your file is ready.</p>
      <div class="actions">
        <a class="btn btn-success" href={downloadUrl} download={downloadName}>
          Download {downloadName}
        </a>
      </div>
    {/if}

    {#if errorMsg}
      <div class="alert error">{errorMsg}</div>
    {/if}
  {/if}
</section>
