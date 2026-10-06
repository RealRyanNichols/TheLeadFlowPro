export const INDUSTRIES = [
  {
    id: "farm-ag",
    name: "Farm, ag & dirt work",
    short: "Farm & ag",
    icon: "tractor",
    description: "Land clearing, ponds, hay, and the equipment to get it done.",
    services: ["land-clearing", "earthwork", "ponds", "hay", "ag-services"],
  },
  {
    id: "electrical",
    name: "Electricians",
    short: "Electrical",
    icon: "zap",
    description: "Electrical work for homes, businesses, and job sites.",
    services: ["electrical"],
  },
  {
    id: "plumbing",
    name: "Plumbers",
    short: "Plumbing",
    icon: "droplets",
    description:
      "Plumbing, repairs, and service calls in the area you can cover.",
    services: ["plumbing"],
  },
  {
    id: "hvac",
    name: "Heating & air",
    short: "HVAC",
    icon: "wind",
    description:
      "Installation, repairs, and maintenance close to your customers.",
    services: ["hvac"],
  },
  {
    id: "oil-gas",
    name: "Oil & gas",
    short: "Oil & gas",
    icon: "fuel",
    description:
      "A local field, a basin, several states, or a national market.",
    services: ["oilfield-services", "earthwork", "equipment"],
  },
  {
    id: "concrete",
    name: "Concrete",
    short: "Concrete",
    icon: "layers",
    description: "Concrete installation, restoration, and decorative finishes.",
    services: ["concrete", "earthwork"],
  },
  {
    id: "mortgage",
    name: "Mortgage",
    short: "Mortgage",
    icon: "landmark",
    description: "A local market or the states your business actually serves.",
    services: ["mortgage"],
  },
  {
    id: "real-estate",
    name: "Real estate",
    short: "Real estate",
    icon: "house",
    description: "An agreed market for the properties and customers you serve.",
    services: ["real-estate"],
  },
] as const;
export type IndustryId = (typeof INDUSTRIES)[number]["id"];
export const SERVICE_NAMES: Record<string, string> = {
  "land-clearing": "Land clearing",
  earthwork: "Dirt work / earthmoving",
  ponds: "Ponds & drainage",
  hay: "Hay baling",
  "ag-services": "Agricultural services",
  electrical: "Electrical",
  plumbing: "Plumbing",
  hvac: "Heating & air",
  "oilfield-services": "Oilfield services",
  equipment: "Equipment services",
  concrete: "Concrete",
  mortgage: "Mortgage",
  "real-estate": "Real estate",
};
// Public city reference points are illustrations and inquiry markets, never a
// substitute for a client's verified operating base.
export const PLACES = [
  { id: "tyler", name: "Tyler, TX", lat: 32.3513, lng: -95.3011 },
  { id: "longview", name: "Longview, TX", lat: 32.5007, lng: -94.7405 },
  { id: "kilgore", name: "Kilgore, TX", lat: 32.3863, lng: -94.8758 },
  { id: "marshall", name: "Marshall, TX", lat: 32.5449, lng: -94.3674 },
  { id: "gilmer", name: "Gilmer, TX", lat: 32.7288, lng: -94.9424 },
  { id: "canton", name: "Canton, TX", lat: 32.5565, lng: -95.8633 },
  { id: "dallas", name: "Dallas, TX", lat: 32.7767, lng: -96.797 },
  { id: "houston", name: "Houston, TX", lat: 29.7604, lng: -95.3698 },
  { id: "austin", name: "Austin, TX", lat: 30.2672, lng: -97.7431 },
  { id: "lufkin", name: "Lufkin, TX", lat: 31.3382, lng: -94.7291 },
  { id: "midland", name: "Midland, TX", lat: 31.9973, lng: -102.0779 },
] as const;
export const STAGE_LABELS = {
  review: "Agreement review needed",
  interest: "Interest registered",
  held: "Temporarily held",
  protected: "Client protected",
  released: "Released",
} as const;
export const INTEREST_DAYS = 30;
