// Génère le site statique : posts/*.md + public/ -> dist/
import fs from 'node:fs';
import matter from 'gray-matter';
import { marked } from 'marked';

// ---------- À PERSONNALISER ----------
const SITE = {
  name: 'Ton Nom',
  description: 'Projets et articles.',
  url: 'https://blog-psi-nine-87.vercel.app',
  links: [
    ['GitHub', 'https://github.com/Qwantike'],
    ['Email', 'mailto:toi@exemple.com'],
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

const links = p => [p.github && ['Code', p.github], p.url && ['Voir le projet', p.url]]
  .filter(Boolean).map(([l, h]) => `<a href="${esc(h)}" target="_blank" rel="noopener">${l}</a>`).join('');

const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>';

const layout = ({ title, desc, body, path = '/', article }) => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta name="author" content="${esc(SITE.name)}">
<meta property="og:site_name" content="${esc(SITE.name)}"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${article ? 'article' : 'website'}">
${article ? `<meta property="article:published_time" content="${article.date}">` : ''}
<link rel="canonical" href="${SITE.url}${path}">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)}" href="/rss.xml">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><text y=%27.9em%27 font-size=%2790%27>✦</text></svg>">
<script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<link rel="stylesheet" href="/style.css"></head>
<body><header class="site"><a class="brand" href="/">${esc(SITE.name)}</a>
<nav>${SITE.links.map(([l, h]) => `<a href="${esc(h)}">${l}</a>`).join('')}
<button id="theme" type="button" aria-label="Changer de thème" title="Changer de thème">${ICON}</button></nav></header>
<main>${body}</main>
<footer><span>© ${new Date().getFullYear()} ${esc(SITE.name)}</span><a href="/rss.xml">RSS</a></footer>
<script>document.getElementById('theme').onclick=function(){var d=document.documentElement,k=d.dataset.theme?d.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches,n=k?'light':'dark';d.dataset.theme=n;try{localStorage.setItem('theme',n)}catch(e){}}</script>
</body></html>`;

const row = p => `<li><a class="row" href="/p/${p.slug}"><span class="t">${esc(p.title)}</span>
<time datetime="${p.date}">${fmt(p.date)}</time></a>${p.description ? `<p>${esc(p.description)}</p>` : ''}</li>`;
const section = (h, list) => list.length ? `<section><h2>${h}</h2><ul class="list">${list.map(row).join('')}</ul></section>` : '';

fs.rmSync('dist', { recursive: true, force: true });
if (fs.existsSync('public')) fs.cpSync('public', 'dist', { recursive: true });

fs.writeFileSync('dist/index.html', layout({
  title: SITE.name, desc: SITE.description,
  body: section('Projets', posts.filter(p => p.type === 'project')) + section('Articles', posts.filter(p => p.type === 'article')),
}));

fs.writeFileSync('dist/404.html', layout({
  title: `Page introuvable – ${SITE.name}`, desc: 'Page introuvable.',
  body: '<section><h1>Page introuvable</h1><p>Cette page n’existe pas ou a été déplacée. <a href="/">Retour à l’accueil</a></p></section>',
}));

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
