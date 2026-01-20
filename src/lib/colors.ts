// Palette de couleurs fantaisiste inspirée de la carte whimsique
// Style parc d'attractions magique avec tons nocturnes et accents dorés

export const COLORS = {
  // Couleurs primaires - Style fantaisiste
  primary: {
    gold: '#D4A853',           // Or chaud lumineux
    brightYellow: '#F7D44C',   // Jaune soleil
    paleGold: '#E8C97A',       // Or pâle doux
    mutedGold: '#C9A85C',      // Or mat
    lightTan: '#F0D88A',       // Tan clair chaleureux
    orange: '#E8945A',         // Orange coucher de soleil
    coral: '#E07858',          // Corail chaleureux
  },

  // Couleurs de texte
  text: {
    dark: '#1A2744',           // Bleu nuit profond
    nearBlack: '#0F1A2E',      // Bleu très foncé
    white: '#FFFFFF',          // Blanc pur
    cream: '#FDF8E8',          // Crème chaud
    lightGray: '#B8C4D8',      // Gris bleuté clair
    muted: '#7A8BA8',          // Gris bleuté moyen
  },

  // Couleurs de fond - Ambiance nocturne magique
  background: {
    dark: '#1A2744',           // Bleu nuit profond
    charcoal: '#243352',       // Bleu nuit moyen
    mediumBlue: '#2D3F66',     // Bleu intermédiaire
    nightSky: '#162236',       // Ciel étoilé
    offWhite: '#FDF8E8',       // Crème chaud
    cream: '#FAF3E0',          // Crème doux
    black: '#0F1A2E',          // Bleu très profond
  },

  // Couleurs d'accent fantaisistes
  accent: {
    hemp: '#5A9E5A',           // Vert prairie vibrant
    leaf: '#4A8B4A',           // Vert feuille
    forest: '#3D7A4A',         // Vert forêt
    teal: '#4A9B9B',           // Turquoise
    sky: '#6BB5D9',            // Bleu ciel
    water: '#5AA0C9',          // Bleu eau
    earth: '#9B7B5A',          // Terre chaude
    sand: '#D4C4A4',           // Sable doux
    warmBrown: '#8B6B4A',      // Brun chaud
    red: '#C75B5B',            // Rouge circus
    redOrange: '#D66B4A',      // Rouge-orangé
  },

  // Nuages et effets - tons dorés/orangés
  clouds: {
    golden: '#E8C878',         // Nuage doré
    orange: '#E8A858',         // Nuage orangé
    peach: '#F0C090',          // Nuage pêche
    sunset: '#E89868',         // Nuage coucher de soleil
  },

  // Dégradés fantaisistes
  gradients: {
    gold: ['#D4A853', '#E8C97A', '#F0D88A'],
    sunset: ['#E07858', '#E8945A', '#F7D44C'],
    nightSky: ['#0F1A2E', '#1A2744', '#2D3F66'],
    forest: ['#3D7A4A', '#4A8B4A', '#5A9E5A'],
    ocean: ['#162236', '#1A2744', '#5AA0C9'],
    warmGold: ['#F7D44C', '#E8C97A', '#D4A853'],
    darkGold: ['#8B6B4A', '#6B5234', '#4A3824'],
    magical: ['#2D3F66', '#4A6B8A', '#6BB5D9'],
  },

  // Couleurs par type de produit (harmonisées style fantaisiste)
  productTypes: {
    fleur: '#5A9E5A',      // Vert prairie
    huile: '#F7D44C',      // Jaune soleil
    résine: '#9B7B5A',     // Terre chaude
    infusion: '#4A9B9B',   // Turquoise
    cosmétique: '#E8945A', // Orange
    alimentaire: '#E8C97A', // Or pâle
  },

  // Couleurs par caractéristique de terroir
  characteristics: {
    departement: '#FF9800', // Orange vif - pour le département
    climat: '#2196F3',     // Bleu - pour le climat
    sol: '#795548',        // Marron - pour le sol/terre
    terre: '#795548',      // Marron terre
    produits: '#5A9E5A',   // Vert - pour les produits
    eau: '#5AA0C9',        // Bleu eau
    temperature: '#E8945A', // Orange - température
    pluie: '#7BA3C9',      // Bleu gris - pluie
  },
} as const;

// Types pour l'autocomplétion
export type ColorPalette = typeof COLORS;
export type ProductTypeColor = keyof typeof COLORS.productTypes;

/**
 * Converts a hex color to rgba format with specified opacity
 * Use this instead of hex + suffix (e.g., `${COLORS.primary.gold}20`)
 * as the hex suffix format doesn't work well on Android
 *
 * @param hex - Hex color string (e.g., '#D4A853' or 'D4A853')
 * @param opacity - Opacity value from 0 to 1 (e.g., 0.2 for 20%)
 * @returns rgba string (e.g., 'rgba(212, 168, 83, 0.2)')
 *
 * @example
 * // Instead of: `${COLORS.primary.gold}20`
 * // Use: withOpacity(COLORS.primary.gold, 0.2)
 */
export function withOpacity(hex: string, opacity: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse hex values
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
