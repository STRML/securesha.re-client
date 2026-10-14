<script>
  import { generateKey, exportKeyB64, encryptPayload } from './crypto.js';
  import { putFile } from './api.js';
  import { fileSize } from './format.js';

  // Server enforces a 20MB maxFileSize on the encrypted Content-Length. Leave
  // headroom for crypto overhead plus the encrypted metadata.
  const MAX_FILE = 20 * 1024 * 1024 - 1024;

  let file = $state(null);
  let days = $state(7);
  let views = $state(1);
  let showAdvanced = $state(false);

  let phase = $state('idle'); // idle | encrypting | uploading | done | error
  let progress = $state(0);
  let errorMsg = $state('');
  let shareLink = $state('');
  let shareLinkNoKey = $state('');
  let copied = $state('');
  let dragging = $state(false);

  const expiry = $derived(new Date(Date.now() + days * 86400000));
  const busy = $derived(phase === 'encrypting' || phase === 'uploading');

  function acceptFile(f) {
    errorMsg = '';
    shareLink = '';
    phase = 'idle';
    if (!f) {
      file = null;
      return;
    }
    if (f.size > MAX_FILE) {
      file = null;
      errorMsg = `That file is too big. The limit is ${fileSize(MAX_FILE)}.`;
      return;
    }
    file = f;
  }

  const onPick = (e) => acceptFile(e.target.files[0]);

  // Only react to drags that carry files, and only while a new file can be chosen.
  const canDrop = (e) => !busy && phase !== 'done' && e.dataTransfer?.types.includes('Files');

  function onDragOver(e) {
    e.preventDefault(); // also stops the browser from navigating to a dropped file
    dragging = canDrop(e);
  }

  function onDrop(e) {
    e.preventDefault();
    dragging = false;
    if (!canDrop(e)) return;
    const { files, items } = e.dataTransfer;
    // A dropped folder shows up as a File too; only the entry API tells them apart.
    if (items[0]?.webkitGetAsEntry?.()?.isDirectory) {
      acceptFile(null);
      errorMsg = 'Folders cannot be shared. Zip it first, then drop the zip.';
      return;
    }
    acceptFile(files[0]);
    if (file && files.length > 1) errorMsg = 'Only one file at a time. Selected the first.';
  }

  async function share() {
    if (!file) {
      errorMsg = 'Please choose a file first.';
      return;
    }
    errorMsg = '';
    copied = '';
    try {
      phase = 'encrypting';
      progress = 0;
      const key = await generateKey();
      const buf = await file.arrayBuffer();
      const payload = await encryptPayload(key, new Uint8Array(buf), {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
      });

      phase = 'uploading';
      const { url } = await putFile(
        payload,
        { expirationDays: days, maxViews: views },
        (p) => (progress = p),
      );

      const keyB64 = await exportKeyB64(key);
      const origin = window.location.origin;
      shareLink = `${origin}/#u=${url}&p=${keyB64}`;
      shareLinkNoKey = `${origin}/#u=${url}`;
      phase = 'done';
      history.replaceState(null, '', window.location.pathname);
    } catch (e) {
      phase = 'error';
      errorMsg = e?.message || 'Something went wrong.';
    }
  }

  async function copy(text, which) {
    try {
      await navigator.clipboard.writeText(text);
      copied = which;
      setTimeout(() => (copied = ''), 1500);
    } catch (e) {
      /* clipboard blocked — user can select manually */
    }
  }

  function reset() {
    file = null;
    shareLink = '';
    phase = 'idle';
    errorMsg = '';
  }
</script>

<svelte:window
  ondragover={onDragOver}
  ondragleave={(e) => !e.relatedTarget && (dragging = false)}
  ondrop={onDrop}
/>

<section class="panel" class:dragging>
  {#if phase === 'done'}
    <h2>Your secure link is ready</h2>
    <div class="alert info">Encrypted in your browser and uploaded. Share the link below.</div>

    <div class="field" style="margin-top:16px">
      <label for="link-full">Link with key — anyone with this can open the file</label>
      <textarea id="link-full" rows="2" readonly>{shareLink}</textarea>
      <div class="spacer"></div>
      <button class="btn btn-success" onclick={() => copy(shareLink, 'full')}>
        {copied === 'full' ? 'Copied!' : 'Copy link'}
      </button>
    </div>

    <div class="field">
      <label for="link-nokey">Link without key — send the key separately, out of band</label>
      <textarea id="link-nokey" rows="2" readonly>{shareLinkNoKey}</textarea>
      <div class="actions">
        <button class="btn btn-success" onclick={() => copy(shareLinkNoKey, 'nokey')}>
          {copied === 'nokey' ? 'Copied!' : 'Copy link'}
        </button>
        <button class="btn btn-primary" onclick={reset}>Share another file</button>
      </div>
    </div>

    <p class="muted">
      The key lives in the <code>#</code> fragment and is never sent to the server.
      It is stored in your browser history and visible in the address bar — treat
      the link as the secret.
    </p>
  {:else}
    <h2>Upload a File</h2>

    <div class="field">
      <span class="btn btn-success file-pick">
        + {file ? 'Change file' : 'Choose Your File…'}
        <input type="file" onchange={onPick} disabled={busy} />
      </span>
      <p class="muted" style="margin:10px 0 0">
        {dragging ? 'Drop to select' : 'or drag a file (a .zip works) anywhere on this page'}
      </p>
      {#if file}
        <p class="muted" style="margin:10px 0 0">
          {file.name} · {fileSize(file.size)}
        </p>
      {/if}
    </div>

    <button class="toggle" onclick={() => (showAdvanced = !showAdvanced)}>
      {showAdvanced ? '▾' : '▸'} Advanced Options
    </button>

    {#if showAdvanced}
      <div class="advanced">
        <div class="row">
          <div class="field">
            <label for="views">Max views</label>
            <div class="input-group">
              <input id="views" type="number" min="1" max="10" bind:value={views} disabled={busy} />
              <span class="addon">{views === 1 ? 'View' : 'Views'}</span>
            </div>
          </div>
          <div class="field">
            <label for="days">Delete after</label>
            <div class="input-group">
              <input id="days" type="number" min="1" max="7" bind:value={days} disabled={busy} />
              <span class="addon">{days === 1 ? 'Day' : 'Days'}</span>
            </div>
          </div>
        </div>
        <p class="explain">
          Your file will expire on {expiry.toLocaleString()} or after {views}
          view{views === 1 ? '' : 's'}, whichever comes first.
        </p>
      </div>
    {/if}

    <div class="actions">
      <button class="btn btn-primary" onclick={share} disabled={busy || !file}>
        🔒 {#if phase === 'encrypting'}Encrypting…{:else if phase === 'uploading'}Uploading…{:else}Get Secure Link{/if}
      </button>
    </div>

    {#if busy}
      <progress value={phase === 'uploading' ? progress : null} max="1"></progress>
      <p class="muted" style="margin:8px 0 0">
        {#if phase === 'encrypting'}Encrypting in your browser…{:else}Uploading {Math.round(progress * 100)}%{/if}
      </p>
    {/if}

    {#if errorMsg}
      <div class="alert error">{errorMsg}</div>
    {/if}
  {/if}
</section>
