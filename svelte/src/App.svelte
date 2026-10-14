<script>
  import Upload from './lib/Upload.svelte';
  import Download from './lib/Download.svelte';
  import { parseHash, isCurrentKey } from './lib/format.js';

  const hash = parseHash(window.location.hash);
  const isDownload = !!hash.u;

  // A link from the original client carries a key this client cannot read, and
  // fetching the file first would use up a view for nothing. The server serves the
  // original client at "/?", so send those links there before any fetch.
  const legacyKey = isDownload && !!hash.p && !isCurrentKey(hash.p);
  const alreadyAtLegacyUrl = window.location.href.includes('?');
  if (legacyKey && !alreadyAtLegacyUrl) {
    window.location.replace('/?' + window.location.hash);
  }
</script>

<main>
  <div class="title">
    <div class="intro-line"></div>
    <h1>Welcome to <a href="/">Securesha.re</a></h1>
    <p class="tagline">
      Self-destructing, single-use file sharing. No logging. Even we can't access
      your data.
    </p>
    <div class="intro-line"></div>
  </div>

  {#if legacyKey}
    <section class="panel">
      <h2>Link from an older version</h2>
      <div class="alert warn">
        This link was made by the previous version of Securesha.re and cannot be opened
        here. Nothing was downloaded, so it has not used up a view.
      </div>
    </section>
  {:else if isDownload}
    <Download url={hash.u} keyFromHash={hash.p || ''} />
  {:else}
    <Upload />
  {/if}
</main>

<footer>
  <div class="footer-inner">
    <article>
      <h2>Why Use SecureShare?</h2>
      <ul>
        <li>256-bit <b>client-side</b> AES-GCM encryption</li>
        <li>Sitewide SSL encryption</li>
        <li>Very long, randomly generated URLs so your data cannot be found</li>
        <li>Auto-generated strong keys make brute-forcing infeasible</li>
        <li>Your data is automatically and securely deleted when you choose</li>
        <li>Works in modern Chrome, Firefox, Safari, and Edge</li>
        <li>
          <a href="https://github.com/STRML/securesha.re-client">Open Source</a>
        </li>
      </ul>
    </article>
    <article>
      <h2>How It Works</h2>
      <ul>
        <li>Your browser encrypts the file before handing it to us.</li>
        <li>You choose how many times it can be opened, or how long it lasts.</li>
        <li>We give you a link to share with only the parties you want.</li>
        <li>They request the file and decrypt it in their browser.</li>
        <li>We delete the file once it reaches your chosen limits.</li>
        <li>We are never sent the key — we cannot decrypt your data.</li>
        <li>No logs are kept.</li>
        <li><b>All files are automatically deleted after 7 days.</b></li>
      </ul>
    </article>
  </div>
</footer>
