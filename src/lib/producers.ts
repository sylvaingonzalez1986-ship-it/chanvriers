// French CBD Producers data

export interface Producer {
  id: string;
  name: string;
  companyName?: string; // Nom de l'entreprise (prioritaire pour l'affichage)
  businessName?: string; // Nom commercial
  profileId?: string; // Lien vers le profil utilisateur Supabase (auth.uid)
  region: string;
  department: string;
  city: string;
  image: string;
  description: string;
  email?: string; // Email de contact du producteur
  // GPS coordinates for map positioning
  coordinates: {
    latitude: number;
    longitude: number;
  };
  // Legacy percentage coordinates for SVG map fallback
  mapPosition?: { x: number; y: number };
  soil: {
    type: string;
    ph: string;
    characteristics: string;
  };
  climate: {
    type: string;
    avgTemp: string;
    rainfall: string;
  };
  products: ProducerProduct[];
  // Featured products for Pokemon card display
  featuredProducts?: string[];
  // Types de culture
  cultureOutdoor?: boolean; // Culture en plein air
  cultureGreenhouse?: boolean; // Culture sous serre
  cultureIndoor?: boolean; // Culture en intérieur
  // Vente directe à la ferme
  vente_directe_ferme?: boolean;
  adresse_retrait?: string;
  horaires_retrait?: string;
  instructions_retrait?: string;
  // Réseaux sociaux
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
    website?: string;
  };
}

export interface ProducerProduct {
  id: string;
  name: string;
  type: 'fleur' | 'huile' | 'resine' | 'infusion';
  cbdPercent: number;
  thcPercent: number;
  price: number;
  pricePro?: number; // Prix professionnel (optionnel)
  weight: string;
  image: string; // Image principale (rétrocompatibilité)
  images?: string[]; // Jusqu'à 3 images
  videoUrl?: string; // URL de la vidéo du produit
  description: string;
  tvaRate?: number; // Taux de TVA en % (défaut: 20)
  stock?: number; // Quantité en stock (undefined = illimité)
  // Promo fields
  isOnPromo?: boolean; // Produit en promotion
  promoPercent?: number; // Pourcentage de réduction (ex: 20 pour -20%)
  // Visibility fields
  visibleForClients?: boolean; // Visible pour les clients (défaut: true)
  visibleForPros?: boolean; // Visible pour les pros (défaut: true)
  status?: 'draft' | 'published' | 'archived'; // Statut du produit
  // Lab analysis
  labAnalysisUrl?: string; // URL de l'analyse de laboratoire (PDF ou image)
  // Direct farm sales
  disponible_vente_directe?: boolean; // Disponible en vente directe à la ferme (défaut: false)
  ville_retrait?: string; // Ville de retrait pour la vente directe
  adresse_retrait?: string; // Adresse complète de retrait
  horaires_retrait?: string; // Horaires de retrait
  instructions_retrait?: string; // Instructions spéciales pour le retrait
  // Delivery options
  delivery_type?: 'flat' | 'min_order'; // Type de livraison: prix fixe ou montant minimum
  delivery_flat_price?: number; // Prix fixe de livraison (si delivery_type = 'flat')
  delivery_min_order_amount?: number; // Montant minimum de commande pour livraison (si delivery_type = 'min_order')
}

// Type pour les options de livraison
export type DeliveryType = 'flat' | 'min_order';

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  flat: 'Livraison à prix fixe',
  min_order: 'Livraison au-dessus d\'un montant minimum',
};

export const PRODUCT_TYPE_LABELS: Record<ProducerProduct['type'], string> = {
  fleur: 'Fleur',
  huile: 'Huile',
  resine: 'Résine',
  infusion: 'Infusion',
};

// Couleurs harmonisées avec la palette Chanvriers Bretons
export const PRODUCT_TYPE_COLORS: Record<ProducerProduct['type'], string> = {
  fleur: '#7d8c5c',    // Vert chanvre
  huile: '#f1cf6e',    // Or pâle
  resine: '#8b6914',   // Brun doré
  infusion: '#5a7247', // Vert feuille
};

// Helper pour obtenir le nom d'affichage du producteur (entreprise > nom commercial > nom)
export function getProducerDisplayName(producer: Producer): string {
  return producer.companyName || producer.businessName || producer.name || 'Producteur';
}

// Sample producers data with real GPS coordinates
export const SAMPLE_PRODUCERS: Producer[] = [];

// France center coordinates for initial map view
export const FRANCE_CENTER = {
  latitude: 46.603354,
  longitude: 1.888334,
};

// France bounding region for map
export const FRANCE_REGION = {
  latitude: 46.603354,
  longitude: 1.888334,
  latitudeDelta: 10,
  longitudeDelta: 10,
};
