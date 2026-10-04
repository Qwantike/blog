// Génère le site statique : posts/*.md + public/ -> dist/
import fs from 'node:fs';
import matter from 'gray-matter';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';

marked.use(markedKatex({
  throwOnError: false
}));

// ---------- À PERSONNALISER ----------
const SITE = {
  name: 'Paul',
  description: 'Projets et articles.',
  url: 'https://blog-psi-nine-87.vercel.app',
  links: [
    ['GitHub', 'https://github.com/Qwantike'],
    ['Email', 'mailto:paul.moinereau@hotmail.fr'],
  ],
};
// -------------------------------------

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = d => new Date(d).toLocaleDateString('fr-FR',
  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const posts = fs.readdirSync('posts').filter(f => f.endsWith('.md')).map(f => {
  const { data, content } = matter(fs.readFileSync(`posts/${f}`, 'utf8'));
  return {
    slug: f.slice(0, -3),
    title: data.title ?? f,
    description: data.description ?? '',
    date: new Date(data.date).toISOString().slice(0, 10),
    type: data.type === 'project' ? 'project' : 'article',
    github: data.github, url: data.url, draft: !!data.draft,
    minutes: Math.max(1, Math.round(content.split(/\s+/).length / 220)),
    html: marked.parse(content),
  };
}).filter(p => !p.draft).sort((a, b) => b.date.localeCompare(a.date));

const projects = posts.filter(p => p.type === 'project');
const articles = posts.filter(p => p.type === 'article');

const links = p => [p.github && ['Code', p.github], p.url && ['Voir le projet', p.url]]
  .filter(Boolean).map(([l, h]) => `<a href="${esc(h)}" target="_blank" rel="noopener">${l}</a>`).join('');

const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>';

const group = (label, list, cur) => list.length ? `<details open><summary>${label}</summary>${list.map(p =>
  `<a href="/p/${p.slug}"${cur === `/p/${p.slug}` ? ' aria-current="page"' : ''}>${esc(p.title)}</a>`).join('')}</details>` : '';

const layout = ({ title, desc, body, path = '/', article }) => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<script>
  (function() {
    try {
      var t = localStorage.getItem('theme');
      var dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      if (t) {
        document.documentElement.dataset.theme = t;
      } else if (dark) {
        document.documentElement.dataset.theme = 'dark';
      }
    } catch(e) {}
  })();
</script>
<style>
  /* Bloque le fond blanc instantanément avant le parsing de style.css */
  :root[data-theme='dark'], html[data-theme='dark'] { background-color: #1c1c1c; color: #ececec; }
  :root:not([data-theme='dark']), html:not([data-theme='dark']) { background-color: #ffffff; color: #171717; }
  body { background-color: inherit; color: inherit; }
</style>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta name="author" content="${esc(SITE.name)}">
<meta property="og:site_name" content="${esc(SITE.name)}"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${article ? 'article' : 'website'}">
${article ? `<meta property="article:published_time" content="${article.date}">` : ''}
<link rel="canonical" href="${SITE.url}${path}">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)}" href="/rss.xml">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><text y=%27.9em%27 font-size=%2790%27>✦</text></svg>">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<link rel="stylesheet" href="/style.css">
</head>
<body><div class="shell">
<aside class="side">
<div class="side-top"><a class="brand" href="/">${esc(SITE.name)}</a>
<button id="theme" type="button" aria-label="Changer de thème" title="Changer de thème">${ICON}</button></div>
<nav class="menu" aria-label="Site"><a href="/about"${path === '/about' ? ' aria-current="page"' : ''}>À propos</a>
${SITE.links.map(([l, h]) => `<a href="${esc(h)}">${l}</a>`).join('')}</nav>
<nav id="files" aria-label="Articles">${group('Projets', projects, path)}${group('Articles', articles, path)}</nav>
</aside>
<div class="col"><main>${body}</main>
<footer><span>© ${new Date().getFullYear()} ${esc(SITE.name)}</span><a href="/rss.xml">RSS</a></footer></div>
</div>

<script>
// Gestion du bouton de changement de thème
document.getElementById('theme').onclick = function() {
  var d = document.documentElement;
  var isDark = d.dataset.theme ? d.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
  var next = isDark ? 'light' : 'dark';
  d.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch(e) {}
};

// Repli auto des dossiers sur mobile
if (matchMedia('(max-width:800px)').matches) {
  document.querySelectorAll('#files details').forEach(function(d){ d.open = false; });
}

// Navigation instantanée sans rechargement ni FOUC
document.addEventListener('click', async function(e) {
  var a = e.target.closest('a');
  if (!a || !a.href || a.target || a.origin !== location.origin || a.getAttribute('href').startsWith('#') || a.href.endsWith('.xml')) return;
  
  e.preventDefault();
  try {
    var res = await fetch(a.href);
    if (!res.ok) { location.href = a.href; return; }
    var text = await res.text();
    var doc = new DOMParser().parseFromString(text, 'text/html');
    
    // Remplace la colonne centrale
    document.querySelector('.col').innerHTML = doc.querySelector('.col').innerHTML;
    document.title = doc.title;
    history.pushState(null, '', a.href);
    window.scrollTo(0, 0);

    // Met à jour les états actifs des liens dans la sidebar
    var currentPath = new URL(a.href).pathname.replace(/\\/$/, '') || '/';
    document.querySelectorAll('.side a').forEach(function(link) {
      var linkPath = new URL(link.href).pathname.replace(/\\/$/, '') || '/';
      if (linkPath === currentPath) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  } catch(err) {
    location.href = a.href;
  }
});

window.addEventListener('popstate', function() {
  location.reload();
});
</script>
</body></html>`;

const row = p => `<li><a class="row" href="/p/${p.slug}"><span class="t">${esc(p.title)}</span>
<time datetime="${p.date}">${fmt(p.date)}</time></a>${p.description ? `<p>${esc(p.description)}</p>` : ''}</li>`;
const section = (h, list) => list.length ? `<section><h2>${h}</h2><ul class="list">${list.map(row).join('')}</ul></section>` : '';

fs.rmSync('dist', { recursive: true, force: true });
if (fs.existsSync('public')) fs.cpSync('public', 'dist', { recursive: true });

fs.writeFileSync('dist/index.html', layout({
  title: SITE.name, desc: SITE.description,
  body: section('Projets', projects) + section('Articles', articles),
}));

fs.writeFileSync('dist/404.html', layout({
  title: `Page introuvable – ${SITE.name}`, desc: 'Page introuvable.',
  body: '<section><h1>Page introuvable</h1><p>Cette page n’existe pas ou a été déplacée. <a href="/">Retour à l’accueil</a></p></section>',
}));

if (fs.existsSync('about.md')) {
  const { data, content } = matter(fs.readFileSync('about.md', 'utf8'));
  fs.mkdirSync('dist/about', { recursive: true });
  fs.writeFileSync('dist/about/index.html', layout({
    title: `${data.title ?? 'À propos'} – ${SITE.name}`, desc: data.description ?? SITE.description, path: '/about',
    body: `<article><header><h1>${esc(data.title ?? 'À propos')}</h1></header><div class="prose">${marked.parse(content)}</div></article>`,
  }));
}

for (const p of posts) {
  fs.mkdirSync(`dist/p/${p.slug}`, { recursive: true });
  fs.writeFileSync(`dist/p/${p.slug}/index.html`, layout({
    title: `${p.title} – ${SITE.name}`, desc: p.description, path: `/p/${p.slug}`, article: p,
    body: `<a class="back" href="/">Retour</a>
<article><header><h1>${esc(p.title)}</h1>
<p class="meta"><time datetime="${p.date}">${fmt(p.date)}</time><span>${p.minutes} min de lecture</span></p>
${links(p) ? `<p class="actions">${links(p)}</p>` : ''}</header>
<div class="prose">${p.html}</div></article>`,
  }));
}

fs.writeFileSync('dist/rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${esc(SITE.name)}</title><link>${SITE.url}</link>
<description>${esc(SITE.description)}</description>
${posts.map(p => `<item><title>${esc(p.title)}</title><link>${SITE.url}/p/${p.slug}</link>
<guid>${SITE.url}/p/${p.slug}</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate>
<description>${esc(p.description)}</description></item>`).join('\n')}
</channel></rss>`);

console.log(`${posts.length} article(s) générés dans dist/`);
