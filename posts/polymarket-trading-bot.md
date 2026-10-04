---
title: Polymarket Trading Bot 
description: HFT & inefficiences de marché.
date: 2026-10-04
type: project
---

## Résumé Exécutif
Conception, développement et mise en production d'un algorithme de trading haute-fréquence (HFT) autonome opérant sur l'exchange décentralisé **Polymarket** (Polygon). 

Le projet exploite les inefficiences de tarification à court terme sur les marchés prédictifs liés au Bitcoin (fenêtres de 5 et de 15 minutes). En utilisant une implémentation personnalisée du modèle de **Black-Scholes-Merton** pour définir la *Fair Value* d'un actif conditionnel, le bot exécute des arbitrages directionnels (Taker/FOK) 100 % automatisés de la détection du signal jusqu'au retrait des gains sur la blockchain.

---

## Modélisation Quantitative & Stratégie

### 1. La "Fair Value" via Black-Scholes-Merton
Les marchés "BTC Up/Down" à expiration courte (5/15 minutes) s'apparentent à des options binaires. L'algorithme ingère les flux de prix spot en temps réel (Binance API) et calcule la probabilité de victoire de l'événement à chaque *tick* ($dt = 2\,\text{s}$) selon le modèle BSM. 
La volatilité implicite ($\sigma$) est lissée dynamiquement via une moyenne mobile exponentielle pondérée (EWMA avec $\lambda = 0.9979$) sur une fenêtre glissante afin de réagir aux chocs de marché (Flash Crashes) tout en filtrant le bruit.

### 2. Signal d'Entrée & "Edge" Net
Le bot ne prédit pas la direction du marché, il trade le *Spread* mathématique.
Le signal d'achat est déclenché uniquement si l'écart (l'Edge) entre le modèle prédictif et la réalité du carnet d'ordres est supérieur à un seuil strict d'inefficience :
$$\text{Edge} = P_{\text{bsm}} - P_{\text{ask}}$$  

*   **Simulation VWAP & Slippage :** L'Edge n'est pas calculé sur le prix *Mid*, mais sur le prix d'exécution réel estimé. Le bot scanne la profondeur du carnet d'ordres (Order Book Depth) et simule un remplissage *Fill-Or-Kill* (FOK) pour calculer le prix moyen pondéré par le volume (VWAP).
*   **Le Seuil de X % (Alpha Zone) :** Une analyse de données de production sur plus de 600 trades réels a démontré une "Death Zone" pour les Edges $< X\,\%$ (rendement absorbé par le spread et les frais). Le bot filtre le bruit et n'attaque la liquidité que lorsque $\text{Edge} \ge X$.

### 3. Gestion du Risque : Kelly Fractionnaire
Le dimensionnement des positions (Position Sizing) est dynamique et asymétrique. Il s'appuie sur le **Critère de Kelly**, ajusté par un multiplicateur de fractionnement (Kelly linéaire). Plus la probabilité mathématique diverge de la probabilité du marché, plus l'allocation du capital augmente, tout en préservant le portefeuille des risques de "sur-confiance" algorithmique.

---

## Architecture Logicielle & Ingénierie Web3

Le système est découpé en micro-services asynchrones (Python) pour garantir une exécution sous la milliseconde tout en optimisant les coûts de transaction (Gas).

### 1. Le Cerveau (Observer & LiveTrader)
*   **Boucle temps réel :** Synchronisation stricte sur la clôture des bougies 5m Binance pour figer le "Strike" exact.
*   **Exécution CLOB (Off-chain) :** Interfaçage avec le *Central Limit Order Book* (CLOB) de Polymarket via l'API Gamma. Les ordres sont envoyés en **Fill-Or-Kill (FOK)** pour éviter les exécutions partielles et le risque de *Slippage*.
*   **Hold-to-Maturity :** Chaque trade est conservé jusqu'à l'expiration du marché et la résolution par l'Oracle (UMA).

### 2. Trésorerie Automatisée (On-Chain / Cron Jobs)
La plomberie Web3 est séparée de la logique de trading pour préserver la bande passante RPC (Alchemy) et gérer la concurrence des *Nonces* cryptographiques.
*   **`collect_gains.py` (Redemption) :** Un processus d'arrière-plan scanne l'API Polymarket pour identifier les marchés résolus victorieux. Il interagit directement avec l'usine *Conditional Token Framework (CTF)* via `Web3.py` pour brûler les jetons (ERC-1155) et rapatrier les collatéraux (pUSD).
*   **`wrap_usdce_to_pusd.py` (Smart Routing) :** Un algorithme de balayage (Sweep) détecte les reliquats d'USDC.e legacy. Si le solde dépasse le seuil de rentabilité de 20$ (pour justifier les frais de Gas EIP-1559), le script wrap automatiquement les fonds dans le smart contract `CollateralOnramp` pour réinjecter le pUSD dans le flux de trading.

---

## Métriques de Performance (Données de Production)

À l'issue de la phase de calibration en argent réel :
*   **Taux de Victoire (Win Rate) global :** $\approx 68{,}8\,\%$
*   **Alpha Temporel (Timing) :** Surperformance massive détectée lors de l'ouverture du marché ($T \in [0\,\text{s}, 60\,\text{s}]$) pour capturer les paniques directionnelles, et en fin de cycle ($T > 180\,\text{s}$) exploitant l'écrasement drastique de la volatilité ($\theta\text{-decay}$).
*   **Autonomie :** Infrastructure 100 % auto-réparante (gestion des Reverts, fallback des noeuds RPC, ajustements automatiques des allowances ERC-20).

## Stack Technologique
*   **Langage :** Python (Dataclasses, Threading)
*   **Blockchain & DeFi :** Web3.py, Smart Contracts (ERC-20, ERC-1155), EIP-1559 Gas Optimization, Polygon PoA.
*   **Data & Marchés :** BSM Modeling, API REST/Websockets, Order Book Depth Simulation.
*   **Ops :** Linux (Crontab/tmux), SQLite (Data persistence & Backtesting).