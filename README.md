# Blog

**Ajouter un article** : crée `posts/mon-article.md`.

```yaml
---
title: Titre
description: Une phrase de résumé
date: 2026-10-04
type: project          # facultatif : "project" ou "article" (défaut)
github: https://github.com/...   # projets : bouton "Code"
url: https://...                 # projets : bouton "Voir le projet"
draft: true            # facultatif : cache l'article
---
```

Images : mets-les dans `public/img/` et écris `![alt](/img/photo.png)`.

**En local** : `npm install` puis `npm run dev`.
**Personnaliser** : nom, tagline et liens en haut de `build.js` ; couleurs dans `public/style.css`.
**Vercel** : importe le repo GitHub, c'est tout (`vercel.json` règle la config).
