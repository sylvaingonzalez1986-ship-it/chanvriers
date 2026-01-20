/**
 * Types pour les régions de France
 * Les Chanvriers Unis - Espace Professionnel
 */

export interface FranceRegion {
  id: string;
  name: string;
  code: string; // Code officiel de la région
  departments: string[]; // Liste des départements
  // Position sur la carte (pourcentage)
  position: {
    x: number;
    y: number;
  };
  // Taille relative de la région
  size: {
    width: number;
    height: number;
  };
  // Couleur de base de la région
  color: string;
}

export interface RegionProducerCount {
  regionId: string;
  count: number;
}

// Les 13 régions administratives de France métropolitaine
// Positions ajustées pour ressembler à la carte de France
export const FRANCE_REGIONS: FranceRegion[] = [
  {
    id: 'hauts-de-france',
    name: 'Hauts-de-France',
    code: 'HDF',
    departments: ['02', '59', '60', '62', '80'],
    position: { x: 48, y: 2 },
    size: { width: 18, height: 14 },
    color: '#22c55e',
  },
  {
    id: 'ile-de-france',
    name: 'Île-de-France',
    code: 'IDF',
    departments: ['75', '77', '78', '91', '92', '93', '94', '95'],
    position: { x: 45, y: 17 },
    size: { width: 12, height: 11 },
    color: '#4ade80',
  },
  {
    id: 'grand-est',
    name: 'Grand Est',
    code: 'GES',
    departments: ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'],
    position: { x: 62, y: 10 },
    size: { width: 24, height: 22 },
    color: '#16a34a',
  },
  {
    id: 'normandie',
    name: 'Normandie',
    code: 'NOR',
    departments: ['14', '27', '50', '61', '76'],
    position: { x: 22, y: 10 },
    size: { width: 22, height: 14 },
    color: '#86efac',
  },
  {
    id: 'bretagne',
    name: 'Bretagne',
    code: 'BRE',
    departments: ['22', '29', '35', '56'],
    position: { x: 2, y: 20 },
    size: { width: 20, height: 14 },
    color: '#4ade80',
  },
  {
    id: 'pays-de-la-loire',
    name: 'Pays de la Loire',
    code: 'PDL',
    departments: ['44', '49', '53', '72', '85'],
    position: { x: 12, y: 34 },
    size: { width: 20, height: 16 },
    color: '#22c55e',
  },
  {
    id: 'centre-val-de-loire',
    name: 'Centre-Val de Loire',
    code: 'CVL',
    departments: ['18', '28', '36', '37', '41', '45'],
    position: { x: 35, y: 30 },
    size: { width: 18, height: 18 },
    color: '#16a34a',
  },
  {
    id: 'bourgogne-franche-comte',
    name: 'Bourgogne-Franche-Comté',
    code: 'BFC',
    departments: ['21', '25', '39', '58', '70', '71', '89', '90'],
    position: { x: 55, y: 32 },
    size: { width: 20, height: 18 },
    color: '#86efac',
  },
  {
    id: 'nouvelle-aquitaine',
    name: 'Nouvelle-Aquitaine',
    code: 'NAQ',
    departments: ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'],
    position: { x: 12, y: 50 },
    size: { width: 26, height: 28 },
    color: '#4ade80',
  },
  {
    id: 'auvergne-rhone-alpes',
    name: 'Auvergne-Rhône-Alpes',
    code: 'ARA',
    departments: ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'],
    position: { x: 52, y: 48 },
    size: { width: 24, height: 24 },
    color: '#16a34a',
  },
  {
    id: 'occitanie',
    name: 'Occitanie',
    code: 'OCC',
    departments: ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'],
    position: { x: 28, y: 68 },
    size: { width: 30, height: 20 },
    color: '#22c55e',
  },
  {
    id: 'provence-alpes-cote-azur',
    name: "Provence-Alpes-Côte d'Azur",
    code: 'PACA',
    departments: ['04', '05', '06', '13', '83', '84'],
    position: { x: 60, y: 70 },
    size: { width: 24, height: 18 },
    color: '#86efac',
  },
  {
    id: 'corse',
    name: 'Corse',
    code: 'COR',
    departments: ['2A', '2B'],
    position: { x: 84, y: 76 },
    size: { width: 10, height: 16 },
    color: '#4ade80',
  },
];

// Mapping département -> région
export const DEPARTMENT_TO_REGION: Record<string, string> = {};
FRANCE_REGIONS.forEach((region) => {
  region.departments.forEach((dept) => {
    DEPARTMENT_TO_REGION[dept] = region.id;
  });
});

// Fonction pour trouver la région à partir du nom de département
export function getRegionFromDepartment(department: string): FranceRegion | undefined {
  // Extraire le numéro de département si c'est un nom complet
  const deptNumber = department.match(/^(\d{2}[AB]?)/)?.[1];
  if (deptNumber) {
    const regionId = DEPARTMENT_TO_REGION[deptNumber];
    return FRANCE_REGIONS.find((r) => r.id === regionId);
  }

  // Sinon chercher par nom de région
  const lowerDept = department.toLowerCase();
  return FRANCE_REGIONS.find(
    (r) => r.name.toLowerCase().includes(lowerDept) || lowerDept.includes(r.name.toLowerCase())
  );
}

// Fonction pour trouver la région à partir du nom de région
export function getRegionByName(regionName: string): FranceRegion | undefined {
  const lowerName = regionName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return FRANCE_REGIONS.find((r) => {
    const normalizedRegionName = r.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedRegionName.includes(lowerName) || lowerName.includes(normalizedRegionName);
  });
}
