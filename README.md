# EcoLearn AI 🌱

Plateforme d'apprentissage écologique qui génère des parcours d'apprentissage personnalisés via IA et calcule l'empreinte carbone pour financer la plantation d'arbres.

## Fonctionnalités

- **Parcours d'apprentissage IA** : Génération de contenu éducatif adaptatif utilisant OpenRouter (GPT)
- **Calcul d'empreinte carbone** : Évaluation temps réel de l'impact CO2
- **Intégration plantation d'arbres** : Compensation carbone par plantation d'arbres
- **Dashboard moderne** : Frontend React avec visualisations D3.js
- **Architecture full-stack** : Backend FastAPI, base de données PostgreSQL
- **Conteneurisé** : Docker pour déploiement facile
- **Interface française** : UI entièrement traduite en français

## Pile technologique

- Backend : FastAPI, Python, API OpenRouter
- Frontend : React, D3.js
- Base de données : PostgreSQL
- DevOps : Docker

## Installation

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/votreusername/ecolearn-ai.git
   cd ecolearn-ai
   ```

2. Copiez le fichier d'exemple d'environnement :
   ```bash
   cp .env.example .env
   ```

3. (Optionnel) Pour activer les parcours d'apprentissage avec IA :
   - Allez sur https://openrouter.ai/
   - Créez un compte, générez une clé API
   - Ajoutez une méthode de paiement et des crédits (min $5)
   - Éditez `.env` et mettez votre clé : `OPENROUTER_API_KEY=sk-or-v1-...`

4. Lancez l'application :
   ```bash
   docker-compose up --build
   ```

5. Accédez :
   - Frontend : http://localhost:3000
   - API Backend : http://localhost:8000

## Endpoints API

- `POST /generate-learning-path` : Génère un parcours d'apprentissage IA
- `POST /calculate-carbon` : Calcule l'empreinte carbone
- `GET /get-plantation-summary` : Récupère le résumé des plantations

## Architecture

3 conteneurs Docker :
- Backend (FastAPI)
- Frontend (React + Nginx)
- Base de données (PostgreSQL)

## Remarques

- Sans clé API, les parcours utilisent un fallback déterministe.
- L'interface est entièrement en français.
