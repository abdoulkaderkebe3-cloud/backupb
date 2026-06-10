# UPB Analyse — Backend API

API NestJS sécurisée pour le système d'évaluation des enseignants de l'UPB.

## 🚀 Déploiement

### Développement local
```bash
npm install
cp .env.example .env  # puis modifier les valeurs
npm run start:dev
```

### Variables d'environnement
```
ADMIN_PASSWORD=votre_mot_de_passe
JWT_SECRET=votre_secret_jwt_32_caracteres_minimum
CORS_ORIGINS=https://votre-student.vercel.app,https://votre-admin.vercel.app
PORT=3000
```

### Déploiement sur Railway
1. Connecter ce repo à Railway
2. Railway détecte automatiquement Node.js
3. Build command : `npm run build`
4. Start command : `npm run start:prod`
5. Configurer toutes les variables d'environnement ci-dessus

## 🔒 Sécurité
- **Helmet** : Headers HTTP sécurisés
- **Rate limiting** : 60 requêtes/minute par IP
- **CORS** : Seuls les domaines autorisés peuvent accéder à l'API
- **JWT** : Authentification par token signé pour les routes admin
- **Validation** : Tous les inputs sont validés et sanitisés (class-validator)
- **XSS Prevention** : Les caractères HTML sont échappés automatiquement

## 📡 Routes API

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/professors` | GET | ❌ | Liste des professeurs |
| `/api/professors/levels` | GET | ❌ | Niveaux et filières |
| `/api/evaluate` | POST | ❌ | Soumettre une évaluation |
| `/api/admin/login` | POST | ❌ | Connexion admin → JWT |
| `/api/results` | GET | ✅ JWT | Statistiques globales |
| `/api/results/:id` | GET | ✅ JWT | Détail d'un professeur |
| `/api/admin/export` | GET | ✅ JWT | Export Excel |
