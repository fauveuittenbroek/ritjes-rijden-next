export type RideType = "goederen" | "personen";

export type MapPoint = {
  role: "origin" | "destination";
  label: string;
  position: [number, number];
};

export type Ride = {
  id: string;
  demo: boolean;
  type: RideType;
  title: string;
  icon: string;
  image?: string;
  photoPath?: string | null;
  origin: string;
  destination: string;
  description: string | null;
  contactName?: string | null;
  numPeople: number | null;
  pickupAddress: string | null;
  reward: number | null;
  scheduledAt: string | null;
  deadline: string | null;
  status: string;
  createdAt: string;
  isCreator?: boolean;
  isClaimer?: boolean;
  originPoint?: [number, number];
  destinationPoint?: [number, number];
};

export const REQUEST_COLUMNS_WITHOUT_PHOTO =
  "id,type,item_description,num_people,note,contact_name,vertrekplaats,bestemming,ophaaladres,reward,scheduled_at,deadline_date,status,created_at";

export const PUBLIC_REQUEST_COLUMNS = `${REQUEST_COLUMNS_WITHOUT_PHOTO},photo_path` as const;

export const AUTH_REQUEST_COLUMNS = `${PUBLIC_REQUEST_COLUMNS},created_by,claimed_by` as const;

export const AUTH_REQUEST_COLUMNS_BASIC = `${REQUEST_COLUMNS_WITHOUT_PHOTO},created_by,claimed_by` as const;

type RequestRow = {
  id: string;
  type: RideType;
  item_description: string | null;
  num_people: number | null;
  note: string | null;
  contact_name: string | null;
  photo_path?: string | null;
  created_by?: string | null;
  claimed_by?: string | null;
  vertrekplaats: string;
  bestemming: string;
  ophaaladres: string | null;
  reward: number | string | null;
  scheduled_at: string | null;
  deadline_date: string | null;
  status: string;
  created_at: string;
};

export function rideFromRequest(row: RequestRow): Ride {
  return {
    id: row.id,
    demo: false,
    type: row.type,
    title: requestTitle(row),
    icon: row.type === "personen" ? "🧑‍🤝‍🧑" : "📦",
    origin: row.vertrekplaats,
    destination: row.bestemming,
    description: row.note,
    contactName: row.contact_name,
    photoPath: row.photo_path ?? null,
    numPeople: row.num_people,
    pickupAddress: row.ophaaladres,
    reward: row.reward == null ? null : Number(row.reward),
    scheduledAt: row.scheduled_at,
    deadline: row.deadline_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function requestTitle(row: Pick<RequestRow, "type" | "item_description" | "num_people">): string {
  return row.type === "goederen"
    ? row.item_description || "Goederen"
    : `Rit voor ${row.num_people ?? "?"} personen`;
}

export const DEMO_RIDES: Ride[] = [
  {
    id: "demo-co-sleeper",
    demo: true,
    type: "goederen",
    title: "Co sleeper met matras",
    icon: "🛏️",
    image: "/rides/co-sleeper.jpg",
    origin: "Zoetermeer",
    destination: "Nieuwer Ter Aa",
    originPoint: [52.0575, 4.4931],
    destinationPoint: [52.1909, 4.9796],
    description: "Houten co-sleeper inclusief matras. Ophalen in Zoetermeer en afleveren op het opgegeven adres.",
    numPeople: null,
    pickupAddress: null,
    reward: null,
    scheduledAt: null,
    deadline: null,
    status: "open",
    createdAt: "2026-11-14T08:15:00.000Z",
  },
  {
    id: "demo-techniek",
    demo: true,
    type: "goederen",
    title: "Techniek spullen (pakketje)",
    icon: "📦",
    image: "/rides/techniek.jpg",
    origin: "Nieuwer Ter Aa",
    destination: "Den Haag",
    originPoint: [52.1909, 4.9796],
    destinationPoint: [52.0705, 4.3007],
    description: "Doos met techniek- en elektronica-onderdelen (pakketje).",
    numPeople: null,
    pickupAddress: null,
    reward: null,
    scheduledAt: null,
    deadline: null,
    status: "open",
    createdAt: "2026-11-14T08:30:00.000Z",
  },
  {
    id: "demo-tafelonderstel",
    demo: true,
    type: "goederen",
    title: "Tafelonderstel",
    icon: "🪑",
    image: "/rides/tafelonderstel.jpg",
    origin: "Amersfoort",
    destination: "Nieuwer Ter Aa",
    originPoint: [52.1561, 5.3878],
    destinationPoint: [52.1909, 4.9796],
    description: "Los tafelonderstel dat vervoerd moet worden. Ophalen in Amersfoort.",
    numPeople: null,
    pickupAddress: null,
    reward: null,
    scheduledAt: null,
    deadline: null,
    status: "open",
    createdAt: "2026-11-14T09:00:00.000Z",
  },
  {
    id: "demo-scooter",
    demo: true,
    type: "goederen",
    title: "Scooter (kapot)",
    icon: "🛵",
    image: "/rides/scooter.jpg",
    origin: "Amsterdam",
    destination: "Amsterdam",
    originPoint: [52.3676, 4.9041],
    destinationPoint: [52.3738, 4.891],
    description: "Defecte scooter die niet meer rijdt en vervoerd moet worden.",
    numPeople: null,
    pickupAddress: null,
    reward: null,
    scheduledAt: null,
    deadline: null,
    status: "open",
    createdAt: "2026-11-14T09:20:00.000Z",
  },
  {
    id: "demo-commode",
    demo: true,
    type: "goederen",
    title: "Commode",
    icon: "🗄️",
    image: "/rides/commode.jpg",
    origin: "Baambrugge",
    destination: "Nieuwer Ter Aa",
    originPoint: [52.2461, 4.9564],
    destinationPoint: [52.1909, 4.9796],
    description: "Geschilderde houten commode. Ophalen in Baambrugge.",
    numPeople: null,
    pickupAddress: null,
    reward: null,
    scheduledAt: null,
    deadline: null,
    status: "open",
    createdAt: "2026-11-14T09:45:00.000Z",
  },
  {
    id: "demo-tuingereedschap",
    demo: true,
    type: "goederen",
    title: "Tuingereedschap",
    icon: "🌿",
    image: "/rides/tuingereedschap.jpg",
    origin: "Nieuwer Ter Aa",
    destination: "Wijnaldum (Friesland)",
    originPoint: [52.1909, 4.9796],
    destinationPoint: [53.1844, 5.4667],
    description: "Tuingereedschap, waaronder een bosmaaier.",
    numPeople: null,
    pickupAddress: null,
    reward: null,
    scheduledAt: null,
    deadline: null,
    status: "open",
    createdAt: "2026-11-14T10:00:00.000Z",
  },
];

export function matchesQuery(ride: Ride, query: string): boolean {
  if (!query) return true;
  const haystack = [ride.title, ride.origin, ride.destination, ride.description ?? ""].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}
