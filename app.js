/*
 * Portal WiXa. SPA estática sin dependencias:
 *  - Landing (#)            → hero + grilla de productos (de apps.json).
 *  - Producto (#<id>)       → versiones y descargas (de los Releases del hub).
 * Los releases se leen una vez de la API pública de GitHub y se agrupan por
 * `tagPrefix`. Agregar una app = entrada en apps.json + releases con ese prefijo.
 */
const HUB = 'WixaDevelop/wixa-hub';
const view = document.getElementById('view');

let CONFIG = null;
let RELEASES = [];

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

function fmtDate(iso) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' });
}
function fmtSize(n) {
  if (n == null) return '';
  const mb = n / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}
function initial(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase();
}
function badge(app, cls) {
  if (app.logo) return `<div class="${cls} logo"><img src="${esc(app.logo)}" alt="" /></div>`;
  return `<div class="${cls}" style="background:${esc(app.accent || '#5ee68f')}">${esc(initial(app.name))}</div>`;
}
function versionOf(rel, app) {
  const t = rel.tag_name || '';
  return t.startsWith(app.tagPrefix) ? t.slice(app.tagPrefix.length) : t;
}
function pickAssets(rel) {
  const a = rel.assets || [];
  const exe = a.find((x) => /\.exe$/i.test(x.name));
  const msi = a.find((x) => /\.msi$/i.test(x.name));
  const shaFor = (x) => (x ? a.find((y) => y.name === x.name + '.sha256') : null);
  return { exe, msi, exeSha: shaFor(exe), msiSha: shaFor(msi) };
}
function releasesFor(app) {
  if (!app.tagPrefix) return [];
  return RELEASES.filter((r) => !r.draft && (r.tag_name || '').startsWith(app.tagPrefix)).sort(
    (a, b) => new Date(b.published_at) - new Date(a.published_at),
  );
}

/* ---------- Landing ---------- */
function landing() {
  const c = CONFIG.company || {};
  const cards = (CONFIG.apps || [])
    .map((app) => {
      const avail = app.status !== 'comingSoon';
      const rels = avail ? releasesFor(app) : [];
      const latest = rels[0];
      const chips = (app.features || [])
        .slice(0, 3)
        .map((f) => `<span class="chip">${esc(f)}</span>`)
        .join('');
      const foot = avail
        ? `<span class="pill ok">${latest ? 'v' + esc(versionOf(latest, app)) : 'Disponible'}</span>
           <span class="card-cta">Ver y descargar →</span>`
        : `<span class="pill soon">Próximamente</span>`;
      return `
        <article class="card ${avail ? 'available' : 'soon'}" ${avail ? `data-app="${esc(app.id)}"` : ''}>
          ${badge(app, 'card-badge')}
          <h3>${esc(app.name)}</h3>
          <p class="tag">${esc(app.tagline || '')}</p>
          ${chips ? `<div class="chips">${chips}</div>` : ''}
          <div class="card-foot">${foot}</div>
        </article>`;
    })
    .join('');

  view.innerHTML = `
    <section class="hero">
      <img class="hero-logo" src="assets/wixa-logo.svg" alt="WiXa" width="104" height="104" />
      <span class="eyebrow">${esc(c.name || 'WiXa')}</span>
      <h1>${esc(c.tagline || 'Herramientas de análisis y forense digital')}</h1>
      <p>${esc(c.intro || '')}</p>
    </section>
    <section class="section wrap" id="productos">
      <h2 class="section-title">Productos</h2>
      <div class="grid">${cards}</div>
    </section>`;

  view.querySelectorAll('.card.available').forEach((el) => {
    el.addEventListener('click', () => {
      location.hash = '#' + el.getAttribute('data-app');
    });
  });
}

/* ---------- Página de producto ---------- */
function productPage(app) {
  const rels = releasesFor(app);
  const head = `
    <a class="back" href="#">← Productos</a>
    <div class="prod-head">
      ${badge(app, 'prod-badge')}
      <div>
        <h1>${esc(app.name)}</h1>
        <p class="tag">${esc(app.tagline || '')}</p>
      </div>
    </div>
    ${app.description ? `<p class="prod-desc">${esc(app.description)}</p>` : ''}`;

  let body;
  if (rels.length === 0) {
    body = `<p class="empty">Aún no hay versiones publicadas. Próximamente.</p>`;
  } else {
    const latest = rels[0];
    const { exe, msi, exeSha, msiSha } = pickAssets(latest);
    const dl = [
      exe
        ? `<a class="btn primary" href="${esc(exe.browser_download_url)}">⬇ Instalador (.exe) <small>${fmtSize(exe.size)}</small></a>`
        : '',
      msi
        ? `<a class="btn" href="${esc(msi.browser_download_url)}">⬇ MSI <small>${fmtSize(msi.size)}</small></a>`
        : '',
    ].join('');
    const sha = [
      exeSha
        ? `<p class="hash-row"><b>.exe</b> · <a href="${esc(exeSha.browser_download_url)}">${esc(exeSha.name)}</a></p>`
        : '',
      msiSha
        ? `<p class="hash-row"><b>.msi</b> · <a href="${esc(msiSha.browser_download_url)}">${esc(msiSha.name)}</a></p>`
        : '',
    ].join('');
    const older = rels.slice(1);
    const olderHtml = older.length
      ? `<details class="older"><summary>Versiones anteriores (${older.length})</summary>${older
          .map((r) => {
            const p = pickAssets(r);
            const links = [
              p.exe ? `<a href="${esc(p.exe.browser_download_url)}">.exe</a>` : '',
              p.msi ? `<a href="${esc(p.msi.browser_download_url)}">.msi</a>` : '',
            ].join('');
            return `<div class="older-item"><span class="ver" style="font-size:14px">v${esc(versionOf(r, app))}</span><span class="meta">${esc(fmtDate(r.published_at))}</span><span class="older-links">${links}</span></div>`;
          })
          .join('')}</details>`
      : '';

    body = `
      <div class="panel">
        <div class="latest-top">
          <span class="ver">v${esc(versionOf(latest, app))}</span>
          <span class="pill ok">Última</span>
          ${app.platform ? `<span class="meta">${esc(app.platform)}${app.webview2 ? ' · requiere WebView2' : ''} · ${esc(fmtDate(latest.published_at))}</span>` : `<span class="meta">${esc(fmtDate(latest.published_at))}</span>`}
        </div>
        <div class="downloads">${dl || '<span class="meta">Sin instaladores en este release.</span>'}</div>
        ${sha ? `<details class="hashes"><summary>Verificación SHA-256</summary>${sha}</details>` : ''}
        ${latest.body ? `<div class="notes">${esc(latest.body.trim())}</div>` : ''}
      </div>
      ${olderHtml}`;
  }

  const notice = `
    <div class="notice">
      <span class="ico">⚠</span>
      <div>
        <h4>Aviso al instalar en Windows</h4>
        <p>Esta versión aún no está firmada con certificado de código. La primera vez, Windows
        SmartScreen puede indicar “origen desconocido”: es normal en apps nuevas sin firma. Haz clic
        en <strong>“Más información” → “Ejecutar de todas formas”</strong>. Verifica la integridad
        comparando el hash SHA-256 con el publicado.</p>
      </div>
    </div>`;

  view.innerHTML = `<div class="wrap">${head}${body}${notice}</div>`;
  window.scrollTo(0, 0);
}

/* ---------- Router ---------- */
function route() {
  if (!CONFIG) return;
  const id = decodeURIComponent(location.hash.replace(/^#/, '')).trim();
  const app = (CONFIG.apps || []).find((a) => a.id === id && a.status !== 'comingSoon');
  if (app) productPage(app);
  else landing();
}

async function main() {
  try {
    CONFIG = await (await fetch('apps.json', { cache: 'no-cache' })).json();
  } catch {
    view.innerHTML = '<p class="empty wrap">No se pudo cargar el catálogo.</p>';
    return;
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${HUB}/releases?per_page=100`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (res.ok) RELEASES = await res.json();
  } catch {
    /* sin red / rate limit: la web funciona, sin versiones */
  }
  window.addEventListener('hashchange', route);
  route();
}

main();
