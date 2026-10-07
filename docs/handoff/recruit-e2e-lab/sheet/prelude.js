const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cp = (v) => `<button class="cp" type="button" data-copy="${esc(v)}" aria-label="copy">⧉</button>`;
