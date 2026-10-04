// Génère le site statique : posts/*.md + public/ -> dist/
import fs from 'node:fs';
import matter from 'gray-matter';
import { marked } from 'marked';

// ---------- À PERSONNALISER ----------
const SITE = {
  name: 'Ton Nom',
  tagline: 'Je construis des choses et j’écris sur ce que j’apprends.',
  url: 'https://ton-site.vercel.app',
  links: [
    ['GitHub', 'https://github.com/ton-pseudo'],
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

const layout = ({ title, desc, body, path = '/' }) => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<link rel="canonical" href="${SITE.url}${path}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><text y=%27.9em%27 font-size=%2790%27>✦</text></svg>">
<link rel="stylesheet" href="/style.css"></head>
<body><header><a class="brand" href="/">${esc(SITE.name)}</a>
<nav>${SITE.links.map(([l, h]) => `<a href="${esc(h)}">${l}</a>`).join('')}</nav></header>
<main>${body}</main>
<footer>© ${new Date().getFullYear()} ${esc(SITE.name)}</footer></body></html>`;

const row = p => `<li><a class="row" href="/p/${p.slug}"><span class="t">${esc(p.title)}</span>
<time datetime="${p.date}">${fmt(p.date)}</time></a>${p.description ? `<p>${esc(p.description)}</p>` : ''}</li>`;

const projects = posts.filter(p => p.type === 'project');
const articles = posts.filter(p => p.type === 'article');
const section = (h, list) => list.length ? `<section><h2>${h}</h2><ul class="list">${list.map(row).join('')}</ul></section>` : '';

fs.rmSync('dist', { recursive: true, force: true });
if (fs.existsSync('public')) fs.cpSync('public', 'dist', { recursive: true });

fs.writeFileSync('dist/index.html', layout({
  title: SITE.name, desc: SITE.tagline,
  body: `<h1 class="hero">${esc(SITE.tagline)}</h1>${section('Projets', projects)}${section('Articles', articles)}`,
}));

for (const p of posts) {
  fs.mkdirSync(`dist/p/${p.slug}`, { recursive: true });
  fs.writeFileSync(`dist/p/${p.slug}/index.html`, layout({
    title: `${p.title} – ${SITE.name}`, desc: p.description, path: `/p/${p.slug}`,
    body: `<article><a class="back" href="/">Retour</a>
<h1>${esc(p.title)}</h1>
<p class="meta"><time datetime="${p.date}">${fmt(p.date)}</time><span>${p.minutes} min de lecture</span></p>
${links(p) ? `<p class="actions">${links(p)}</p>` : ''}
<div class="prose">${p.html}</div></article>`,
  }));
}
console.log(`${posts.length} page(s) générée(s) dans dist/`);
