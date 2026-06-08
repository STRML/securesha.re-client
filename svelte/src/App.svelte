<script>
  import Upload from './lib/Upload.svelte';
  import Download from './lib/Download.svelte';
  import { parseHash } from './lib/format.js';

  const hash = parseHash(window.location.hash);
  const isDownload = !!hash.u;
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

  {#if isDownload}
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
