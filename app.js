/*
 * Portal de descargas WiXa. Lee los releases públicos de este repo vía la API de
 * GitHub y los agrupa por app (según `tagPrefix` en apps.json). Sin dependencias.
 *
 * Para agregar una app: añade una entrada en apps.json y publica sus releases
 * aquí con el tag `<id>-vX.Y.Z` (p. ej. watuy-v1.0.1).
 */
const HUB = 'WixaDevelop/wixa-hub';

function esc(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtSize(n) {
  if (!n && n !== 0) return '';
  const mb = n / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

function pickAssets(release) {
  const a = release.assets || [];
  const exe = a.find((x) => /\.exe$/i.test(x.name));
  const msi = a.find((x) => /\.msi$/i.test(x.name));
  const shaFor = (asset) => (asset ? a.find((x) => x.name === asset.name + '.sha256') : null);
  return { exe, msi, exeSha: shaFor(exe), msiSha: shaFor(msi) };
}

function downloadButtons(release) {
  const { exe, msi } = pickAssets(release);
  let html = '';
  if (exe)
    html += `<a class="btn primary" href="${esc(exe.browser_download_url)}">⬇ Instalador (.exe) <small>${fmtSize(exe.size)}</small></a>`;
  if (msi)
    html += `<a class="btn" href="${esc(msi.browser_download_url)}">⬇ MSI <small>${fmtSize(msi.size)}</small></a>`;
  if (!exe && !msi) html += `<span class="meta">Sin instaladores en este release.</span>`;
  return `<div class="downloads">${html}</div>`;
}

function hashesBlock(release) {
  const { exeSha, msiSha } = pickAssets(release);
  if (!exeSha && !msiSha) return '';
  let rows = '';
  if (exeSha)
    rows += `<p class="hash-row"><b>.exe</b> · <a href="${esc(exeSha.browser_download_url)}">${esc(exeSha.name)}</a></p>`;
  if (msiSha)
    rows += `<p class="hash-row"><b>.msi</b> · <a href="${esc(msiSha.browser_download_url)}">${esc(msiSha.name)}</a></p>`;
  return `<details class="hashes"><summary>Verificación SHA-256</summary>${rows}</details>`;
}

function versionOf(release, app) {
  const t = release.tag_name || '';
  return t.startsWith(app.tagPrefix) ? t.slice(app.tagPrefix.length) : t;
}

function renderApp(app, releases) {
  const accent = app.accent || '#4f9ce8';
  const initial = (app.name || '?').slice(0, 1).toUpperCase();
  const head = `
    <div class="app-head">
      <div class="app-badge" style="background:${esc(accent)}">${esc(initial)}</div>
      <div>
        <h2 class="app-title" id="${esc(app.id)}">${esc(app.name)}</h2>
        <p class="app-tagline">${esc(app.tagline || '')}</p>
        ${app.description ? `<p class="app-desc">${esc(app.description)}</p>` : ''}
      </div>
    </div>`;

  if (releases.length === 0) {
    return `<section class="app">${head}<p class="empty">Aún no hay versiones publicadas. Próximamente.</p></section>`;
  }

  const latest = releases[0];
  const latestCard = `
    <div class="latest">
      <div class="latest-top">
        <span class="ver">v${esc(versionOf(latest, app))}</span>
        <span class="pill">Última</span>
        ${app.platform ? `<span class="meta">${esc(app.platform)}${app.webview2 ? ' · requiere WebView2' : ''}</span>` : ''}
        <span class="meta">${esc(fmtDate(latest.published_at))}</span>
      </div>
      ${downloadButtons(latest)}
      ${hashesBlock(latest)}
      ${latest.body ? `<div class="notes">${esc(latest.body.trim())}</div>` : ''}
    </div>`;

  const older = releases.slice(1);
  const olderBlock =
    older.length === 0
      ? ''
      : `<details class="older"><summary>Versiones anteriores (${older.length})</summary>${older
          .map((r) => {
            const { exe, msi } = pickAssets(r);
            const links = [
              exe ? `<a href="${esc(exe.browser_download_url)}">.exe</a>` : '',
              msi ? `<a href="${esc(msi.browser_download_url)}">.msi</a>` : '',
            ]
              .filter(Boolean)
              .join('');
            return `<div class="older-item"><span class="ver">v${esc(versionOf(r, app))}</span><span class="meta">${esc(
              fmtDate(r.published_at),
            )}</span><span class="older-links">${links}</span></div>`;
          })
          .join('')}</details>`;

  return `<section class="app">${head}${latestCard}${olderBlock}</section>`;
}

async function main() {
  const appsEl = document.getElementById('apps');
  const navEl = document.getElementById('nav');
  let config;
  try {
    config = await (await fetch('apps.json', { cache: 'no-cache' })).json();
  } catch {
    appsEl.innerHTML = `<p class="empty">No se pudo cargar la configuración de apps.</p>`;
    return;
  }
  const apps = config.apps || [];

  let releases = [];
  try {
    const res = await fetch(`https://api.github.com/repos/${HUB}/releases?per_page=100`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (res.ok) releases = await res.json();
  } catch {
    /* sin red / rate limit: mostramos apps sin versiones */
  }

  navEl.innerHTML = apps.map((a) => `<a href="#${esc(a.id)}">${esc(a.name)}</a>`).join('');

  appsEl.innerHTML = apps
    .map((app) => {
      const rels = releases
        .filter((r) => !r.draft && (r.tag_name || '').startsWith(app.tagPrefix))
        .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
      return renderApp(app, rels);
    })
    .join('');
}

main();
