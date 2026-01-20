import { CBDProduct, Rarity, RARITY_CONFIG } from './types';

// French CBD producers mock data
export const CBD_PRODUCTS: CBDProduct[] = [
  // Common products
  {
    id: 'c1',
    name: 'Chanvre des Alpes',
    description: 'Fleurs de chanvre cultivées dans les Alpes françaises. Notes terreuses et florales.',
    producer: 'Alpes Chanvre Bio',
    region: 'Rhône-Alpes',
    rarity: 'common',
    thcPercent: 0.2,
    cbdPercent: 5,
    image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400',
    value: 15,
  },
  {
    id: 'c2',
    name: 'Provence Relax',
    description: 'Huile CBD infusée à la lavande de Provence pour une détente optimale.',
    producer: 'Provence Wellness',
    region: 'Provence',
    rarity: 'common',
    thcPercent: 0.1,
    cbdPercent: 8,
    image: 'https://images.unsplash.com/photo-1556928045-16f7f50be0f3?w=400',
    value: 18,
  },
  {
    id: 'c3',
    name: 'Bretagne Sérénité',
    description: 'Tisane CBD aux algues bretonnes. Riche en minéraux et relaxante.',
    producer: 'Breizh Bio CBD',
    region: 'Bretagne',
    rarity: 'common',
    thcPercent: 0.15,
    cbdPercent: 4,
    image: 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=400',
    value: 12,
  },
  // Rare products
  {
    id: 'r1',
    name: 'Amnesia Haze CBD',
    description: 'Variété premium aux arômes citronnés. Culture indoor française.',
    producer: 'French Indoor Farms',
    region: 'Île-de-France',
    rarity: 'rare',
    thcPercent: 0.2,
    cbdPercent: 12,
    image: 'https://images.unsplash.com/photo-1616690002178-a8fbdd238c12?w=400',
    value: 35,
  },
  {
    id: 'r2',
    name: 'Bordeaux Gold Oil',
    description: 'Huile CBD full spectrum extraite à froid. Qualité pharmaceutique.',
    producer: 'Bordeaux Extracts',
    region: 'Nouvelle-Aquitaine',
    rarity: 'rare',
    thcPercent: 0.18,
    cbdPercent: 15,
    image: 'https://images.unsplash.com/photo-1590318229371-e8c3e2a3f325?w=400',
    value: 45,
  },
  {
    id: 'r3',
    name: 'Lyon Crystals',
    description: 'Cristaux de CBD purs à 99%. Idéal pour les connaisseurs.',
    producer: 'Lyon Labs',
    region: 'Auvergne-Rhône-Alpes',
    rarity: 'rare',
    thcPercent: 0,
    cbdPercent: 99,
    image: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400',
    value: 50,
  },
  // Epic products
  {
    id: 'e1',
    name: 'Gorilla Glue Premium',
    description: 'Fleurs exceptionnelles avec trichomes visibles. Arômes de pin et diesel.',
    producer: 'Trichome Masters',
    region: 'Occitanie',
    rarity: 'epic',
    thcPercent: 0.19,
    cbdPercent: 18,
    image: 'https://images.unsplash.com/photo-1585063560228-1b05e0dcc28c?w=400',
    value: 75,
  },
  {
    id: 'e2',
    name: 'Coffret Dégustation',
    description: 'Box exclusive avec 5 variétés françaises primées et accessoires.',
    producer: 'French CBD Collective',
    region: 'Multi-régions',
    rarity: 'epic',
    thcPercent: 0.2,
    cbdPercent: 14,
    image: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400',
    value: 89,
  },
  // Platinum products
  {
    id: 'p1',
    name: 'White Widow Platinum',
    description: 'Édition platine de la légendaire White Widow. Culture biologique certifiée.',
    producer: 'Elite Growers France',
    region: 'Normandie',
    rarity: 'platinum',
    thcPercent: 0.2,
    cbdPercent: 20,
    image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400',
    value: 120,
  },
  {
    id: 'p2',
    name: 'Coffret Sommelier CBD',
    description: 'Sélection exclusive de 7 variétés premium avec guide de dégustation.',
    producer: 'Maison du Chanvre',
    region: 'Bourgogne',
    rarity: 'platinum',
    thcPercent: 0.18,
    cbdPercent: 18,
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
    value: 135,
  },
  // Legendary products
  {
    id: 'l1',
    name: 'Château Reserve 2024',
    description: 'Édition limitée cultivée sur terroir viticole. Seulement 100 exemplaires.',
    producer: 'Château Cannabis',
    region: 'Bourgogne',
    rarity: 'legendary',
    thcPercent: 0.2,
    cbdPercent: 22,
    image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400',
    value: 150,
  },
  {
    id: 'l2',
    name: 'Collection Prestige',
    description: 'Coffret collector avec huile, fleurs et résine artisanale. Numéroté.',
    producer: 'Maison du Chanvre',
    region: 'Champagne',
    rarity: 'legendary',
    thcPercent: 0.2,
    cbdPercent: 20,
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
    value: 200,
  },
];

// Get products by rarity
export function getProductsByRarity(rarity: Rarity): CBDProduct[] {
  return CBD_PRODUCTS.filter(p => p.rarity === rarity);
}

// Draw a random product based on rarity probabilities
export function drawRandomProduct(): CBDProduct {
  const random = Math.random();
  let cumulativeProbability = 0;
  let selectedRarity: Rarity = 'common';

  for (const [rarity, config] of Object.entries(RARITY_CONFIG)) {
    cumulativeProbability += config.probability;
    if (random <= cumulativeProbability) {
      selectedRarity = rarity as Rarity;
      break;
    }
  }

  let productsOfRarity = getProductsByRarity(selectedRarity);

  // Fallback to common if no products of selected rarity exist
  if (productsOfRarity.length === 0) {
    productsOfRarity = getProductsByRarity('common');
  }

  // Final fallback to any product
  if (productsOfRarity.length === 0) {
    return CBD_PRODUCTS[0];
  }

  const randomIndex = Math.floor(Math.random() * productsOfRarity.length);
  return productsOfRarity[randomIndex];
}
