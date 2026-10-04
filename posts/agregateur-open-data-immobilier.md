---
title: NoristicImmo
description: Estimation immobilière automatisée, simulateur de crédit & dossier PDF générés à partir de données publiques.
date: 2026-10-04
type: project
url: https://www.noristic.com
---

## Résumé Exécutif
Conception et développement d'une plateforme immobilière à trois composantes : un **moteur d'estimation** agrégeant en temps réel une dizaine de sources de données publiques (DVF/DGFiP, ADEME, INSEE, Géorisques, GPU, IGN, OpenStreetMap) pour chiffrer un bien à partir d'une simple adresse, un **simulateur de crédit immobilier** calculant mensualité, coût total et taux d'endettement d'un projet d'achat, et un **moteur de pages SEO programmatiques** générant automatiquement l'équivalent de **35 000 pages**, une par commune française, à partir des mêmes données publiques. Les trois composantes convergent vers des mécaniques de conversion distinctes — dossier PDF payant, mise en relation courtier, redirection vers l'outil d'estimation par adresse — mais s'appuient toutes sur le même socle de données DVF/INSEE.

Le projet repose sur un principe de conception central côté estimation : **une seule source de vérité pour le calcul du prix**. Le même pipeline (élargissement progressif du rayon de recherche, pondération distance/ancienneté, filtrage des valeurs aberrantes) alimente à la fois le chiffre affiché à l'utilisateur et les ventes comparables présentées pour le justifier — sur le site comme dans le document PDF généré côté serveur.

---

## Modélisation & Stratégie d'Estimation

### 1. Le prix de référence au m² — élargissement progressif du rayon
L'algorithme interroge les transactions DVF (ventes immobilières réelles, DGFiP) autour du point GPS du bien, par rayons croissants (50 m → 3 km), jusqu'à atteindre un échantillon minimal jugé statistiquement exploitable. Chaque vente retenue est pondérée selon deux axes :

$$w(d, t) = \underbrace{\frac{1}{1 + d/100}}_{\text{décroissance distance}} \times \underbrace{e^{-t/18}}_{\text{décroissance ancienneté (demi-vie ≈ 12–13 mois)}}$$

Les valeurs aberrantes (erreurs de saisie DVF, ventes atypiques) sont filtrées statistiquement avant calcul de la moyenne pondérée, et un prix médian est calculé en parallèle comme indicateur de robustesse.

### 2. Fiabilité & fourchette asymétrique
Chaque estimation est assortie d'un niveau de confiance (haute / moyenne / faible), déterminé par la taille de l'échantillon et le rayon finalement nécessaire pour l'atteindre. Ce niveau pilote directement la marge d'incertitude affichée (±10 % à ±25 %) : plus le marché local est documenté, plus la fourchette se resserre.

### 3. Ajustements qualitatifs — Bonus/Malus plafonné
Le prix de référence sectoriel est ensuite ajusté selon les caractéristiques propres au bien (DPE, état général, vue, extérieurs, stationnement...), chaque critère contribuant un pourcentage calibré manuellement. L'ensemble des ajustements est **plafonné à ±30 %** pour éviter toute dérive d'un cumul de critères trop favorables ou défavorables — un garde-fou volontairement strict plutôt qu'un modèle en apparence plus précis mais moins robuste.

### 4. Sélection des ventes comparables
Les ventes affichées à l'appui de l'estimation ne sont pas un second calcul indépendant : elles sont extraites du **même jeu de candidats** que celui utilisé pour le prix de référence, puis reclassées par un score de similarité combinant écart de surface (40 %), proximité géographique (30 %), ancienneté (15 %) et écart de nombre de pièces (15 %). Cette contrainte de cohérence — ne jamais justifier un chiffre par des données qu'il n'a pas réellement utilisées — a guidé l'architecture du module dès sa conception.

---

## Outil n°2 — Simulateur de Crédit Immobilier

### 1. Calcul de mensualité — amortissement classique
Le simulateur calcule la mensualité d'un prêt à taux fixe selon la formule d'amortissement standard, à laquelle s'ajoute une assurance emprunteur calculée séparément sur le capital emprunté :

$$M_{credit} = \frac{C \times i}{1 - (1+i)^{-n}} \qquad\text{avec } i = \frac{\text{taux annuel}}{12},\ n = \text{durée en mois}$$

L'ensemble des paramètres (prix du bien, apport, durée, taux nominal, taux d'assurance, financement ou non des frais de notaire) est piloté par curseurs et recalculé instantanément côté client — aucun aller-retour serveur n'est nécessaire pour obtenir un résultat, seule la capture de lead en fin de parcours implique un appel réseau.

### 2. Frais de notaire différenciés & financement intégré
Le taux de frais de notaire appliqué dépend du type de bien (≈ 7,5 % dans l'ancien contre ≈ 2,5 % dans le neuf), et peut être intégré ou non au montant emprunté — un choix qui modifie directement le capital à financer et donc l'ensemble des résultats en aval (mensualité, coût total, taux d'endettement).

### 3. Taux d'endettement & seuil HCSF
Si l'utilisateur renseigne ses revenus mensuels nets (champ optionnel, jamais requis pour obtenir un résultat), le simulateur calcule son taux d'endettement et le compare au seuil de 35 % fixé par le Haut Conseil de Stabilité Financière, avec un retour visuel immédiat (vert/rouge) sur la faisabilité du dossier avant toute présentation en banque.

### 4. Génération de leads qualifiés
Plutôt qu'un simple formulaire de contact générique, la mise en relation avec un courtier partenaire embarque l'intégralité du contexte de simulation (montant emprunté, mensualité, taux d'endettement) dans la requête de lead (`/api/simulation`) et dans l'événement analytique associé (`trackEvent('lead_courtier', ...)`), permettant de qualifier et prioriser les leads en fonction de la taille du projet et de sa viabilité, sans ressaisie côté courtier.

### 5. Contenu structurel SEO
Chaque outil de la plateforme embarque un bloc de contenu informatif (règle des 35 %, frais de notaire, assurance emprunteur, loi Lemoine...) positionné sous le simulateur lui-même : l'outil capte l'intention transactionnelle immédiate, le contenu capte le trafic informationnel et la longue traîne — deux logiques d'acquisition combinées sur une seule page plutôt que séparées en deux parcours.

---

## Canal n°3 — SEO Programmatique à l'Échelle Communale

Contrairement aux deux outils précédents, cette composante n'est pas un point d'interaction produit mais un canal d'acquisition : une page statistique par commune française (`/ville/[slug]`), conçue pour capter le trafic de recherche informationnel ("prix immobilier [ville]") et le rediriger vers l'outil d'estimation par adresse.

### 1. Un contenu réellement unique par page, pas un gabarit rempli
Le risque principal d'une génération à 35 000 pages est le contenu dupliqué (pénalisant pour le référencement). Chaque paragraphe descriptif est donc **composé dynamiquement** à partir des statistiques propres à la commune (prix médian, tendance 2021→présent, écart appartement/maison, taux de propriétaires, taux de vacance...) plutôt que rédigé une fois et réinjecté avec le nom de la ville en variable — deux communes aux profils de marché différents n'affichent jamais le même texte.

### 2. Nettoyage statistique adaptatif
Le filtrage des valeurs aberrantes DVF n'utilise pas un seuil fixe mais une fenêtre calculée dynamiquement autour de la médiane locale (×0,3 à ×3,5) : une approche volontairement plus souple que le filtrage par quantiles utilisé dans le moteur d'estimation, car à l'échelle d'une commune entière l'échantillon est plus large et plus hétérogène (tous types de biens, tout le territoire communal) qu'au niveau d'un rayon de 500 m autour d'une adresse précise.

### 3. Visualisations en SVG natif, sans dépendance client
Graphique d'évolution des prix, histogramme de distribution, jauges de liquidité du marché : l'ensemble est généré en SVG pur, calculé côté serveur au moment du build/de la revalidation, sans bibliothèque de graphiques côté client. Sur 35 000 pages, l'absence de JavaScript d'hydratation dédié au rendu graphique a un effet direct sur les Core Web Vitals et le budget de crawl — un facteur de classement à cette échelle.

### 4. Maillage interne géographique automatique
Chaque page lie vers les communes les plus proches (distance orthodromique calculée sur coordonnées INSEE), avec repli national si le département ne compte pas assez de communes couvertes. Ce maillage distribue automatiquement l'autorité de la page d'accueil vers les pages de longue traîne, sans intervention manuelle à chaque nouvelle commune ajoutée au jeu de données.

### 5. Génération à l'échelle — ISR plutôt que SSG ou SSR
Avec 35 000 pages, un export statique complet (SSG) serait coûteux à rebuilder à chaque mise à jour DVF, tandis qu'un rendu à la demande (SSR) multiplierait les lectures disque par visite. Le choix d'**ISR à 30 jours** (`revalidate: 2592000`) fait un compromis délibéré : la donnée DVF n'évolue pas à la minute près, donc une fraîcheur mensuelle suffit, et seules les pages réellement visitées sont effectivement regénérées.

### 6. Données structurées & maillage SEO technique
Chaque page embarque un graphe `schema.org` complet (`WebSite`, `WebPage`, `Place`, `BreadcrumbList`) plutôt qu'un simple balisage `WebPage` isolé, pour expliciter aux moteurs de recherche la relation entre la page, le site et l'entité géographique qu'elle décrit.

---

## Architecture Logicielle

Application **Next.js (App Router)**, avec une séparation nette entre les fonctions pures de calcul (testables, sans dépendance I/O) et les routes API qui les orchestrent.

### 1. Le moteur de calcul (`lib/estimation.js`, `lib/comparables.js`)
Fonctions pures, sans dépendance React ni Next.js : chargement des fichiers DVF par code postal, calcul du prix de référence, scoring des comparables. Le fait qu'elles soient découplées du framework permet de les appeler indifféremment depuis la route d'estimation instantanée et depuis le générateur de dossier PDF, sans jamais dupliquer la logique métier.

### 2. Deux points d'entrée, un seul pipeline
*   **`/api/estimation`** : estimation instantanée affichée sur le site, email de notification (Nodemailer/OVH SMTP) et persistance en base (PostgreSQL) pour chaque simulation réalisée.
*   **`/api/dossier`** : génération à la volée d'un rapport PDF de 7 pages (`@react-pdf/renderer`) — identité cadastrale, risques naturels/technologiques, urbanisme (PLU/GPU), DPE, historique de marché, profil INSEE de la commune, ventes comparables. Une synthèse de points de vigilance est générée automatiquement à partir des données (DPE énergivore, zone PLU contraignante, taux de vacance élevé...) plutôt que rédigée manuellement bien par bien.

### 3. Cartographie — du web au PDF
La carte interactive du site (Leaflet, tuiles WMTS IGN) ne peut pas être réutilisée telle quelle dans le PDF — `@react-pdf/renderer` n'a pas de moteur DOM/JS. La carte cadastrale du dossier est donc une image statique obtenue via une requête **WMS GetMap** unique (orthophoto + parcellaire superposés côté serveur IGN), téléchargée et encodée en PDF avec un marqueur positionné sur le bien. Ce choix a nécessité un diagnostic WMS en conditions réelles (le service renvoyait un `ServiceException` en HTTP 200 plutôt qu'une erreur explicite) avant d'identifier qu'un format PNG — et non JPEG — était requis pour conserver le canal alpha du calque cadastral superposé.

### 4. Robustesse opérationnelle
Chaque section du dossier (comparables, carte, DPE, risques...) échoue indépendamment des autres : l'absence d'une donnée ne bloque jamais la génération du document, elle se traduit par un message de repli explicite dans la section concernée. Le calcul des comparables et le téléchargement de la carte sont par ailleurs exécutés en parallèle plutôt qu'en séquence.

### 5. Suivi analytique transverse
Les trois composantes partagent la même brique de tracking (`TrackPageView`, Server Action `trackEvent`), qui journalise aussi bien la consultation de page que les événements à forte valeur (génération de lead, dossier payant) avec leurs métadonnées métier — un seul système d'événements pour piloter la conversion sur l'ensemble de la plateforme plutôt qu'un suivi ad hoc par composante.

### 6. Cache module-level pour les lectures de fichiers répétées
Les référentiels lus à chaque rendu de page ville (dictionnaire INSEE, correspondance code postal, coordonnées des communes) sont mis en cache au niveau du module Node plutôt que rechargés à chaque requête. Sur un site à 35 000 pages candidates à la revalidation, éviter une lecture disque redondante par visite — même JSON, même code postal — réduit directement la latence et la charge serveur à l'échelle.

---

## État du projet & prochaines étapes
Le moteur d'estimation et le générateur de dossier sont fonctionnels de bout en bout. Deux chantiers restent ouverts avant une mise en production commerciale :
*   **Paiement** : la génération du dossier PDF n'est pour l'instant pas protégée (accès libre en phase de test), en attendant l'intégration d'un flux de paiement à l'acte.
*   **Annonces actives** : une section du dossier est réservée à la mise en regard des ventes passées avec l'offre actuellement disponible sur le marché (annonces en cours), fonctionnalité en cours de développement.
*   **Carte choroplèthe par quartier** : les statistiques de prix par quartier sont déjà calculées et affichées (`QuartiersCard`) sur les pages communes, mais leur visualisation cartographique (zones colorées par niveau de prix) est développée et désactivée en attendant finalisation.

## Stack Technologique
*   **Framework :** Next.js (App Router, Turbopack), React
*   **Génération de documents :** @react-pdf/renderer
*   **Base de données :** PostgreSQL
*   **Cartographie :** Leaflet, IGN Géoplateforme (WMTS tuiles & WMS GetMap)
*   **Données publiques :** DVF/DGFiP, ADEME (DPE), INSEE, Géorisques, GPU (urbanisme), OpenStreetMap
*   **Notifications :** Nodemailer (SMTP OVH)
*   **Analytics & leads :** Server Actions Next.js, suivi d'événements métier (`trackEvent`)
*   **SEO à l'échelle :** ISR (revalidation 30 jours), SVG généré côté serveur, données structurées schema.org (JSON-LD)
*   **Ops :** VPS Linux, pm2