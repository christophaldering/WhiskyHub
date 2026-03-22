// CaskSense Apple — Flavor Data (vollständige Hierarchie)

export interface FlavorDescriptor {
  en: string
  de: string
}

export interface FlavorSubGroup {
  en: string
  de: string
  descriptors: FlavorDescriptor[]
}

export interface FlavorCategory {
  id: string
  en: string
  de: string
  color: string
  emoji: string // nur intern für Daten, nie in UI anzeigen
  subGroups?: FlavorSubGroup[]
  descriptors: FlavorDescriptor[]
}

export const FLAVOR_CATEGORIES: FlavorCategory[] = [
  {
    id: 'fruity', en: 'Fruity', de: 'Fruchtig', color: '#f4a261', emoji: '🍎',
    subGroups: [
      {
        en: 'Fresh Fruit', de: 'Frische Früchte',
        descriptors: [
          { en: 'Apple', de: 'Apfel' }, { en: 'Pear', de: 'Birne' }, { en: 'Peach', de: 'Pfirsich' },
          { en: 'Apricot', de: 'Aprikose' }, { en: 'Cherry', de: 'Kirsche' }, { en: 'Citrus', de: 'Zitrus' },
        ]
      },
      {
        en: 'Dark & Dried', de: 'Dunkle & Getrocknete',
        descriptors: [
          { en: 'Raisins', de: 'Rosinen' }, { en: 'Plum', de: 'Pflaume' }, { en: 'Fig', de: 'Feige' },
          { en: 'Date', de: 'Dattel' }, { en: 'Prune', de: 'Dörrpflaume' }, { en: 'Blackcurrant', de: 'Schwarze Johannisbeere' },
        ]
      }
    ],
    descriptors: [
      { en: 'Apple', de: 'Apfel' }, { en: 'Pear', de: 'Birne' }, { en: 'Peach', de: 'Pfirsich' },
      { en: 'Apricot', de: 'Aprikose' }, { en: 'Raisins', de: 'Rosinen' }, { en: 'Plum', de: 'Pflaume' },
    ]
  },
  {
    id: 'floral', en: 'Floral', de: 'Blumig', color: '#e9c46a', emoji: '🌸',
    descriptors: [
      { en: 'Heather', de: 'Heidekraut' }, { en: 'Rose', de: 'Rose' }, { en: 'Lavender', de: 'Lavendel' },
      { en: 'Jasmine', de: 'Jasmin' }, { en: 'Elderflower', de: 'Holunder' }, { en: 'Perfume', de: 'Parfüm' },
    ]
  },
  {
    id: 'sweet', en: 'Sweet', de: 'Süß', color: '#f6bd60', emoji: '🍯',
    subGroups: [
      {
        en: 'Sugar & Syrup', de: 'Zucker & Sirup',
        descriptors: [
          { en: 'Honey', de: 'Honig' }, { en: 'Caramel', de: 'Karamell' }, { en: 'Toffee', de: 'Toffee' },
          { en: 'Maple syrup', de: 'Ahornsirup' }, { en: 'Molasses', de: 'Melasse' },
        ]
      },
      {
        en: 'Confection', de: 'Süßwaren',
        descriptors: [
          { en: 'Vanilla', de: 'Vanille' }, { en: 'Chocolate', de: 'Schokolade' }, { en: 'Marzipan', de: 'Marzipan' },
          { en: 'Butterscotch', de: 'Butterscotch' }, { en: 'Cream', de: 'Sahne' },
        ]
      }
    ],
    descriptors: [
      { en: 'Honey', de: 'Honig' }, { en: 'Caramel', de: 'Karamell' }, { en: 'Vanilla', de: 'Vanille' },
      { en: 'Toffee', de: 'Toffee' }, { en: 'Chocolate', de: 'Schokolade' }, { en: 'Marzipan', de: 'Marzipan' },
    ]
  },
  {
    id: 'spicy', en: 'Spicy', de: 'Würzig', color: '#e76f51', emoji: '🌶️',
    descriptors: [
      { en: 'Pepper', de: 'Pfeffer' }, { en: 'Cinnamon', de: 'Zimt' }, { en: 'Ginger', de: 'Ingwer' },
      { en: 'Clove', de: 'Nelke' }, { en: 'Nutmeg', de: 'Muskat' }, { en: 'Anise', de: 'Anis' },
    ]
  },
  {
    id: 'woody', en: 'Woody', de: 'Holzig', color: '#a8785c', emoji: '🪵',
    descriptors: [
      { en: 'Oak', de: 'Eiche' }, { en: 'Cedar', de: 'Zeder' }, { en: 'Sandalwood', de: 'Sandelholz' },
      { en: 'Sawdust', de: 'Sägemehl' }, { en: 'Resin', de: 'Harz' }, { en: 'Leather', de: 'Leder' },
    ]
  },
  {
    id: 'smoky', en: 'Smoky', de: 'Rauchig', color: '#6d6875', emoji: '💨',
    subGroups: [
      {
        en: 'Peat Smoke', de: 'Torfrauch',
        descriptors: [
          { en: 'Peat', de: 'Torf' }, { en: 'Earthy smoke', de: 'Erdiger Rauch' }, { en: 'Tar', de: 'Teer' },
          { en: 'Medicinal', de: 'Medizinisch' }, { en: 'Iodine', de: 'Jod' },
        ]
      },
      {
        en: 'Wood Smoke', de: 'Holzrauch',
        descriptors: [
          { en: 'Bonfire', de: 'Lagerfeuer' }, { en: 'Ash', de: 'Asche' }, { en: 'Charred oak', de: 'Gekohlte Eiche' },
          { en: 'Smoked meat', de: 'Geräuchertes Fleisch' },
        ]
      }
    ],
    descriptors: [
      { en: 'Peat', de: 'Torf' }, { en: 'Smoke', de: 'Rauch' }, { en: 'Ash', de: 'Asche' },
      { en: 'Tar', de: 'Teer' }, { en: 'Medicinal', de: 'Medizinisch' }, { en: 'Bonfire', de: 'Lagerfeuer' },
    ]
  },
  {
    id: 'malty', en: 'Malty', de: 'Malzig', color: '#b5838d', emoji: '🌾',
    descriptors: [
      { en: 'Malt', de: 'Malz' }, { en: 'Biscuit', de: 'Keks' }, { en: 'Bread', de: 'Brot' },
      { en: 'Cereal', de: 'Getreide' }, { en: 'Porridge', de: 'Haferbrei' }, { en: 'Grainy', de: 'Körning' },
    ]
  },
  {
    id: 'maritime', en: 'Maritime', de: 'Meerig', color: '#a8c4d4', emoji: '🌊',
    subGroups: [
      {
        en: 'Salt & Brine', de: 'Salz & Sole',
        descriptors: [
          { en: 'Sea salt', de: 'Meersalz' }, { en: 'Brine', de: 'Sole' }, { en: 'Seaweed', de: 'Seetang' },
          { en: 'Oyster', de: 'Auster' },
        ]
      },
      {
        en: 'Coastal & Marine', de: 'Küste & Meer',
        descriptors: [
          { en: 'Sea breeze', de: 'Meeresbrise' }, { en: 'Driftwood', de: 'Treibholz' },
          { en: 'Rope', de: 'Tau' }, { en: 'Fish oil', de: 'Fischöl' },
        ]
      }
    ],
    descriptors: [
      { en: 'Sea salt', de: 'Meersalz' }, { en: 'Seaweed', de: 'Seetang' }, { en: 'Brine', de: 'Sole' },
      { en: 'Sea breeze', de: 'Meeresbrise' }, { en: 'Oyster', de: 'Auster' }, { en: 'Driftwood', de: 'Treibholz' },
    ]
  },
  {
    id: 'nutty', en: 'Nutty', de: 'Nussig', color: '#c9a96e', emoji: '🥜',
    descriptors: [
      { en: 'Almond', de: 'Mandel' }, { en: 'Walnut', de: 'Walnuss' }, { en: 'Hazelnut', de: 'Haselnuss' },
      { en: 'Coconut', de: 'Kokos' }, { en: 'Roasted nuts', de: 'Geröstete Nüsse' }, { en: 'Praline', de: 'Praline' },
    ]
  },
  {
    id: 'herbal', en: 'Herbal', de: 'Kräuterig', color: '#86c678', emoji: '🌿',
    descriptors: [
      { en: 'Grass', de: 'Gras' }, { en: 'Mint', de: 'Minze' }, { en: 'Eucalyptus', de: 'Eukalyptus' },
      { en: 'Tea', de: 'Tee' }, { en: 'Herbs', de: 'Kräuter' }, { en: 'Dried herbs', de: 'Getrocknete Kräuter' },
    ]
  },
  {
    id: 'earthy', en: 'Earthy', de: 'Erdig', color: '#9b7960', emoji: '🍂',
    descriptors: [
      { en: 'Soil', de: 'Erde' }, { en: 'Mushroom', de: 'Pilz' }, { en: 'Forest floor', de: 'Waldboden' },
      { en: 'Clay', de: 'Ton' }, { en: 'Damp leaves', de: 'Feuchte Blätter' }, { en: 'Tobacco', de: 'Tabak' },
    ]
  },
  {
    id: 'creamy', en: 'Creamy', de: 'Cremig', color: '#f0d9b5', emoji: '🥛',
    descriptors: [
      { en: 'Butter', de: 'Butter' }, { en: 'Cream', de: 'Sahne' }, { en: 'Milk', de: 'Milch' },
      { en: 'Custard', de: 'Pudding' }, { en: 'Yogurt', de: 'Joghurt' }, { en: 'Cheesecake', de: 'Käsekuchen' },
    ]
  },
  {
    id: 'mineral', en: 'Mineral', de: 'Mineralisch', color: '#7ab8c4', emoji: '💎',
    descriptors: [
      { en: 'Flint', de: 'Feuerstein' }, { en: 'Chalk', de: 'Kreide' }, { en: 'Wet stone', de: 'Nasser Stein' },
      { en: 'Gunpowder', de: 'Schießpulver' }, { en: 'Steel', de: 'Stahl' }, { en: 'Slate', de: 'Schiefer' },
    ]
  },
]

// Profile → welche Kategorien zuerst anzeigen
export const FLAVOR_PROFILES: Record<string, string[]> = {
  'peated-maritime':  ['smoky', 'maritime', 'earthy', 'fruity', 'spicy', 'malty'],
  'sherried-rich':    ['fruity', 'sweet', 'spicy', 'nutty', 'woody', 'creamy'],
  'speyside-fruity':  ['fruity', 'floral', 'sweet', 'malty', 'herbal', 'creamy'],
  'highland-elegant': ['fruity', 'woody', 'spicy', 'earthy', 'nutty', 'sweet'],
  'bourbon-classic':  ['sweet', 'woody', 'spicy', 'creamy', 'fruity', 'malty'],
  'generic':          ['fruity', 'sweet', 'spicy', 'malty', 'woody', 'floral'],
}

// Journey order (sensory progression: light → intense)
export const JOURNEY_CATEGORY_ORDER = [
  'floral', 'fruity', 'herbal', 'creamy', 'sweet', 'malty',
  'nutty', 'woody', 'spicy', 'earthy', 'mineral', 'maritime', 'smoky',
]

export function getTagsForProfile(profile: string, phase: string, lang: 'de' | 'en'): string[] {
  const order = FLAVOR_PROFILES[profile] || FLAVOR_PROFILES.generic
  const result: string[] = []
  for (const catId of order) {
    const cat = FLAVOR_CATEGORIES.find(c => c.id === catId)
    if (!cat) continue
    for (const d of cat.descriptors.slice(0, 2)) {
      result.push(lang === 'de' ? d.de : d.en)
      if (result.length >= 6) break
    }
    if (result.length >= 6) break
  }
  return result.slice(0, 6)
}
