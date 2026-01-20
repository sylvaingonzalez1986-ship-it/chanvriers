# PROMPT POUR CRÉER "LES CHANVRIERS UNIS" - VERSION DESKTOP

## CONTEXTE

Tu es un développeur expert en applications desktop. Tu dois créer une application desktop complète pour "Les Chanvriers Unis", une plateforme communautaire française dédiée au chanvre (CBD). L'app combine un système de tirage aléatoire (gacha), une marketplace e-commerce, un mini-jeu de ferme pixel art, et un lecteur musique style iPod.

**Stack recommandé :** Electron + React + TypeScript + Tailwind CSS + Zustand + Supabase

---

## 1. CONCEPT GÉNÉRAL

**Les Chanvriers Unis** est une plateforme qui combine :
- **Système de Tirage (Gacha)** - Boîtes mystères avec produits CBD de différentes raretés
- **Marketplace Multi-Vendeurs** - Boutiques producteurs, marché local, bourse professionnelle
- **Mini-Jeu Farming** - Simulation agricole pixel art style Stardew Valley
- **Lecteur Musique** - Interface iPod Classic avec playlist personnalisée
- **Réseau Producteurs** - Carte interactive de France avec profils producteurs
- **Dashboard Admin** - Gestion complète du système

**Public cible :** Amateurs de chanvre CBD en France, producteurs, professionnels du secteur

---

## 2. SYSTÈME DE RARETÉ (5 NIVEAUX)

```
COMMON (Commun)     - 89.57% - Gris (#9CA3AF)
RARE                - 1.33%  - Bleu (#3B82F6)
EPIC (Épique)       - 0.5%   - Violet (#8B5CF6)
PLATINUM            - 0.2%   - Argent (#E5E4E2)
LEGENDARY           - 0.1%   - Or (#F59E0B)
```

Chaque rareté a :
- Une couleur de bordure/glow spécifique
- Un effet sonore différent
- Une animation de révélation proportionnelle à l'importance

---

## 3. PALETTE DE COULEURS

**Couleurs Principales :**
```css
--gold: #D4A853
--bright-yellow: #F7D44C
--orange: #E8945A
--coral: #E07858
```

**Texte :**
```css
--white: #FFFFFF
--cream: #FDF8E8
--dark: #1A2744
--muted: #7A8BA8
```

**Arrière-plans (Thème Ciel Nocturne) :**
```css
--night-sky: #162236
--dark-bg: #1A2744
--black: #0F1A2E
```

**Accents :**
```css
--hemp-green: #5A9E5A
--forest: #3D7A4A
--teal: #4A9B9B
--sky-blue: #6BB5D9
--circus-red: #C75B5B
```

**Couleurs par Type de Produit :**
```css
--fleur: #5A9E5A (vert)
--huile: #F7D44C (jaune)
--resine: #9B7B5A (marron)
--infusion: #4A9B9B (turquoise)
--cosmetique: #E8945A (orange)
--alimentaire: #E8C97A (or pâle)
```

---

## 4. TYPOGRAPHIE

- **Police principale :** Wallpoet (Google Fonts) - style rétro/arcade
- **Fallback :** System fonts
- **Tailles :** 10px (small), 12px (body), 16px (normal), 20px (heading), 24px (large)

---

## 5. ÉCRANS ET FONCTIONNALITÉS

### 5.1 TIRAGE (Page Principale)

**Interface :**
- Machine à sous animée avec effet de secousse
- Bouton "TIRER" central proéminent
- Compteur de tickets restants
- Toggle mute pour les sons
- Affichage des probabilités par rareté

**Mécanique :**
- 1 ticket = 1 tirage
- Animation de révélation avec suspense
- Carte produit révélée avec glow selon rareté
- Son et effet visuel adaptés à la rareté
- Produit ajouté automatiquement à la collection

**Modèle de données Produit :**
```typescript
interface CBDProduct {
  id: string
  name: string
  description: string
  producer: string
  region: string
  rarity: 'common' | 'rare' | 'epic' | 'platinum' | 'legendary'
  thcPercent: number
  cbdPercent: number
  image: string
  value: number
}
```

### 5.2 COLLECTION

**Interface :**
- Galerie en grille organisée par rareté
- Filtres par rareté, producteur, type
- Valeur totale de la collection affichée
- Statistiques (nombre par rareté)

**Fonctionnalités :**
- Système de cadeaux avec codes uniques
- Partage social
- Points de parrainage (10 pts par cadeau utilisé)
- Marquer les items comme "utilisés"

### 5.3 MA VIE DE CHANVRIER (Mini-Jeu Farming)

**Interface :**
- Grille 8x6 (48 parcelles) en pixel art 8-bit
- Barre d'outils en bas
- Indicateurs : Jour, Saison, Météo, Argent, XP/Niveau
- Boutique in-game

**Outils :**
1. Main (sélection)
2. Houe (préparer le sol)
3. Arrosoir (arroser)
4. Graines (planter)
5. Faucille (récolter)
6. Engrais (fertiliser)

**4 Variétés de Chanvre :**
```typescript
interface HempVariety {
  name: 'Sativa' | 'Indica' | 'Hybride' | 'CBD Rich'
  color: string
  growthTime: number // en jours de jeu
  yield: number
  quality: number // 1-5 étoiles base
}
```

**Phases de Croissance :**
1. Germination
2. Semis
3. Végétatif
4. Floraison
5. Mature
6. Récolte

**Systèmes Dynamiques :**
- Cycle jour/nuit en temps réel
- 4 saisons avec multiplicateurs de croissance différents
- 5 types de météo : Ensoleillé, Nuageux, Pluvieux, Orageux, Brumeux
- Ressources à gérer : Eau, Santé, Qualité

**Progression :**
- Système XP/Niveau avec bonus déblocables
- Quêtes avec récompenses
- Tutoriel pour nouveaux joueurs

### 5.4 CARTE DES PRODUCTEURS

**Interface :**
- Carte de France interactive
- Pins animés pour chaque producteur
- Cards style Pokémon au clic avec effet glow

**Infos Producteur :**
```typescript
interface Producer {
  id: string
  name: string
  city: string
  department: string
  region: string
  soil: string // Type de sol
  climate: string
  products: ProducerProduct[]
  reviews: Review[]
  rating: number
  photos: string[]
  coordinates: { lat: number, lng: number }
}
```

### 5.5 BOUTIQUES PRODUCTEURS

**Interface :**
- Liste de tous les producteurs
- Page produit avec images, specs, analyses labo
- Avis et notes
- Bouton "Ajouter au panier"

**Modèle Produit Boutique :**
```typescript
interface ProducerProduct {
  id: string
  name: string
  description: string
  type: 'fleur' | 'huile' | 'resine' | 'infusion' | 'cosmetique' | 'alimentaire'
  price: number
  costPrice: number // Prix pro
  images: string[]
  cbdPercent: number
  thcPercent: number
  stock: number
  vat: number
  soilType: string
  climateType: string
  harvestedDate: Date
  labAnalysis?: string // URL PDF
}
```

### 5.6 MARCHÉ LOCAL

**Interface :**
- Organisation par départements français
- Carousel de producteurs par localisation
- Adresse et horaires de retrait
- Produits disponibles en vente directe

### 5.7 BOURSE (Pro uniquement)

**Interface :**
- Données de marché en temps réel
- Graphiques de tendances
- Système d'ordres achat/vente
- Historique des transactions

### 5.8 PANIER

**Interface :**
- Groupé par producteur
- Contrôles de quantité
- Système de codes promo
- Badges de réduction abonnement
- Récapitulatif commande

**Modèle Panier :**
```typescript
interface CartItem {
  product: ProducerProduct
  producerId: string
  producerName: string
  quantity: number
  promoDiscount?: number
}
```

### 5.9 LECTEUR MUSIQUE

**Interface style iPod Classic :**
- Molette circulaire rotative
- Écran avec artwork rotatif pendant lecture
- Contrôles : Play/Pause, Précédent, Suivant
- Modes : Repeat Off/One/All, Shuffle
- Barre de progression temps réel
- Contrôle volume

**Playlist (4 titres) :**
1. "Gloire aux Chanvriers Français"
2. "Tranche de Campagne"
3. "Donne-moi l'Or"
4. "En Feu"

**Musique de Fond :**
- 3 pistes "Guinguette du Canal" en rotation aléatoire
- Boucle infinie
- Se met en pause automatiquement quand la playlist joue
- Reprend après la playlist

### 5.10 SYSTÈME D'ABONNEMENT

**3 Niveaux :**
```typescript
interface SubscriptionTier {
  name: 'Basic' | 'Premium' | 'VIP'
  price: number // 30€, 60€, 90€
  ticketsPerMonth: number // 1, 2, 3
}
```

**Fonctionnalités :**
- Refresh mensuel automatique des tickets
- 1 ticket gagné par tranche de 20€ commandée
- Réductions sur les produits

### 5.11 DASHBOARD ADMIN

**Onglets :**
1. **Commandes** - Gestion statuts (pending, confirmed, shipped, delivered, cancelled)
2. **Stock** - CRUD inventaire, alertes stock bas
3. **Produits** - Gestion par producteur, promotions
4. **Producteurs** - Ajout/modification avec photos
5. **Lots** - Création prix avec 4 niveaux rareté
6. **Promos** - Produits promotionnels
7. **Codes** - Codes promo avec % réduction
8. **Tabs** - Visibilité onglets par rôle
9. **Régions** - Gestion régions françaises
10. **Sols** - Types de sols
11. **Climats** - Types de climats
12. **Types** - Types produits avec couleurs
13. **Données Supabase** - CRUD avec auto-refresh 5s

---

## 6. SYSTÈME DE RÔLES

```typescript
type UserRole = 'client' | 'pro' | 'producer' | 'admin'
```

**Accès par rôle :**
- **Client :** Boutique, Carte, Tirage, Collection, Panier, Musique, Farm
- **Pro :** + Bourse, outils professionnels, prix de gros
- **Producteur :** + Gestion boutique, produits, commandes
- **Admin :** Accès total + Dashboard admin

---

## 7. SYSTÈME DE LOTS

**2 Types :**
1. **Lots Produits** - Items bonus ajoutés aux commandes
2. **Lots Réduction** - % ou montant fixe de réduction

**Règles :**
- Maximum 1 réduction par commande
- Suivi utilisation des lots

---

## 8. ARCHITECTURE TECHNIQUE

### State Management (Zustand Stores)

```typescript
// Stores principaux
useSoundStore        // État mute
useSubscriptionStore // Tickets, tier, date refresh
useCollectionStore   // Produits collectionnés
useCartStore         // Panier
useProducerStore     // Producteurs et produits
useLotsStore         // Lots/prix
useOrdersStore       // Historique commandes
useCustomerInfoStore // Profil utilisateur
useTabVisibilityStore // Config tabs par rôle
useChanvrierStore    // État jeu farming
useMusicStore        // État lecteur musique
useOrderQueueStore   // File commandes offline
```

### Base de Données (Supabase)

**Tables principales :**
- producers
- products
- lots
- orders
- users
- user_collection
- user_stats
- chat_messages
- promo_codes

### Fonctionnalités Offline

- Queue locale des commandes si hors ligne
- Sync automatique à la reconnexion
- Cache local avec localStorage
- Updates UI optimistes
- Bannière status réseau

---

## 9. ANIMATIONS

**Bibliothèque :** Framer Motion (équivalent desktop de Reanimated)

**Effets clés :**
- Springs avec damping personnalisé
- Fade, Slide, Zoom
- Boucles répétitives pour UI
- Interpolation basée sur le scroll
- Effets de glow animés
- Rotation disque musique
- Secousse machine à sous

---

## 10. SONS ET AUDIO

**Effets sonores (jeu) :**
- Planter : son doux
- Arroser : son eau
- Récolter : son succès
- Level up : son notification
- Erreur : son erreur
- Pièces : son coins

**Musique :**
- 3 pistes fond "Guinguette" en boucle aléatoire
- 4 pistes playlist utilisateur
- Gestion priorité (playlist > fond)
- Toggle mute global

---

## 11. ADAPTATION DESKTOP

**Navigation :**
- Remplacer tabs bottom par sidebar gauche
- Menu top pour actions rapides
- Raccourcis clavier

**Interactions :**
- Adapter long-press → clic droit
- Swipe → scroll horizontal ou boutons
- Pinch zoom → molette souris
- Hover states sur tous les éléments interactifs

**Layout :**
- Responsive pour différentes tailles d'écran
- Minimum 1024x768
- Mode plein écran pour le jeu farming

**Jeu Farming :**
- Contrôles souris pour sélection parcelle
- Raccourcis clavier pour outils (1-6)
- Zoom molette sur la grille

---

## 12. INTÉGRATION SUPABASE

```typescript
// Configuration
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Auth
supabase.auth.signUp({ email, password })
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signInWithOtp({ email }) // Magic link

// Realtime
supabase.channel('orders').on('postgres_changes', ...)
supabase.channel('chat').on('postgres_changes', ...)
```

---

## 13. STRUCTURE FICHIERS RECOMMANDÉE

```
/src
  /main           # Process principal Electron
  /renderer       # UI React
    /components
      /game       # Composants jeu farming
      /music      # Lecteur musique
      /shop       # Boutique/panier
      /admin      # Dashboard admin
      /ui         # Composants de base
    /pages
    /stores       # Zustand stores
    /hooks        # Custom hooks
    /lib
      /supabase   # Client et helpers
      /types      # Types TypeScript
      /utils      # Utilitaires
    /assets
      /images
      /sounds
      /fonts
```

---

## 14. POINTS CRITIQUES

1. **Sécurité** - RLS Supabase, vérification âge, validation rôles
2. **Performance** - Lazy loading, memoization, virtual scrolling pour grandes listes
3. **UX** - Feedback visuel/sonore sur chaque action, états de chargement
4. **Offline** - L'app doit rester utilisable sans connexion
5. **Accessibilité** - Navigation clavier, contraste suffisant

---

## 15. TESTS ESSENTIELS

- [ ] Tirage fonctionne et respecte les probabilités
- [ ] Collection se sauvegarde correctement
- [ ] Panier multi-producteurs fonctionne
- [ ] Jeu farming sauvegarde l'état
- [ ] Musique joue correctement avec transitions
- [ ] Sync Supabase fonctionne en temps réel
- [ ] Mode offline queue les commandes
- [ ] Rôles limitent correctement l'accès
- [ ] Admin peut gérer tous les aspects

---

## 16. COMMUNICATION MOBILE ↔ DESKTOP

Pour permettre la synchronisation entre l'app mobile et desktop :

### Option 1 : Même compte Supabase
Les deux apps partagent la même base de données Supabase. L'utilisateur se connecte avec le même compte sur les deux plateformes et les données sont synchronisées automatiquement.

### Option 2 : API REST partagée
Créer une API REST sur Supabase Edge Functions que les deux apps consomment.

### Option 3 : Realtime Sync
Utiliser Supabase Realtime pour synchroniser les changements en temps réel entre les deux apps :

```typescript
// Sur les deux apps
supabase
  .channel('user_sync')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'user_collection',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Mettre à jour le state local
    syncCollection(payload.new)
  })
  .subscribe()
```

### Données à synchroniser :
- Collection utilisateur
- Panier
- Commandes
- Progression jeu farming
- Abonnement et tickets
- Préférences utilisateur

---

## 17. DÉMARRAGE RAPIDE

```bash
# Créer le projet Electron + React
npx create-electron-app les-chanvriers-desktop --template=typescript-webpack

# Installer les dépendances
npm install react react-dom @types/react @types/react-dom
npm install tailwindcss postcss autoprefixer
npm install zustand @supabase/supabase-js
npm install framer-motion
npm install howler # Pour l'audio
npm install react-router-dom

# Configurer Tailwind
npx tailwindcss init -p

# Lancer en dev
npm start

# Build production
npm run make
```

---

Ce prompt contient toutes les spécifications nécessaires pour recréer fidèlement "Les Chanvriers Unis" en version desktop avec Electron.
