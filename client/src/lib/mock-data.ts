// Mock data for the Whisky Tasting App

export interface Whisky {
  id: string;
  name: string;
  distillery: string;
  age: number | string;
  abv: number;
  type: string;
  notes: string; // Official notes
  image?: string;
}

export interface Rating {
  userId: string;
  whiskyId: string;
  nose: number;
  taste: number;
  finish: number;
  balance: number;
  overall: number; // 0-100
  notes: string;
}

export interface Tasting {
  id: string;
  title: string;
  date: string;
  location: string;
  host: string;
  whiskies: Whisky[];
  participants: { id: string; name: string }[];
  code: string;
}

export const MOCK_WHISKIES: Whisky[] = [
  {
    id: "w1",
    name: "Uigeadail",
    distillery: "Ardbeg",
    age: "NAS",
    abv: 54.2,
    type: "Single Malt",
    notes: "Peaty, smoky, raisin, sherry bomb.",
  },
  {
    id: "w2",
    name: "18 Year Old",
    distillery: "Glendronach",
    age: 18,
    abv: 46,
    type: "Single Malt",
    notes: "Rich sherry, dark chocolate, orange peel.",
  },
  {
    id: "w3",
    name: "Rare Breed",
    distillery: "Wild Turkey",
    age: "NAS",
    abv: 58.4,
    type: "Bourbon",
    notes: "Caramel, vanilla, spice, oak.",
  },
  {
    id: "w4",
    name: "Green Label",
    distillery: "Johnnie Walker",
    age: 15,
    abv: 43,
    type: "Blended Malt",
    notes: "Balanced, grassy, light smoke, fruit.",
  }
];

export const MOCK_TASTINGS: Tasting[] = [
  {
    id: "t1",
    title: "Friday Night Drams",
    date: "2025-02-14T19:00:00",
    location: "The Library",
    host: "Alex",
    whiskies: MOCK_WHISKIES,
    participants: [
      { id: "u1", name: "Alex" },
      { id: "u2", name: "Sarah" },
      { id: "u3", name: "Mike" },
    ],
    code: "DRAMS25"
  }
];

export const MOCK_RATINGS: Rating[] = [
  // Mock ratings for charts
  { userId: "u1", whiskyId: "w1", nose: 8, taste: 9, finish: 9, balance: 8, overall: 92, notes: "Incredible peat." },
  { userId: "u2", whiskyId: "w1", nose: 7, taste: 8, finish: 8, balance: 7, overall: 85, notes: "A bit too smoky for me." },
  { userId: "u3", whiskyId: "w1", nose: 9, taste: 9, finish: 10, balance: 9, overall: 95, notes: "Perfection." },
  
  { userId: "u1", whiskyId: "w2", nose: 9, taste: 8, finish: 7, balance: 8, overall: 88, notes: "Lovely sherry nose." },
  { userId: "u2", whiskyId: "w2", nose: 9, taste: 9, finish: 9, balance: 9, overall: 93, notes: "My favorite." },
  { userId: "u3", whiskyId: "w2", nose: 8, taste: 8, finish: 8, balance: 8, overall: 86, notes: "Good but dry." },
];
