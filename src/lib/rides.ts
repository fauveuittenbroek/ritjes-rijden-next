export type RideType = "goederen" | "personen";

export type MapPoint = {
  role: "origin" | "destination";
  label: string;
  position: [number, number];
};

export type Ride = {
  id: string;
  type: RideType;
  title: string;
  icon: string;
  image?: string;
  photoPath?: string | null;
  origin: string;
  destination: string;
  description: string | null;
  contactName?: string | null;
  itemDescription?: string | null;
  numPeople: number | null;
  pickupAddress: string | null;
  deliveryAddress: string | null;
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
  "id,type,item_description,num_people,note,contact_name,vertrekplaats,bestemming,reward,scheduled_at,deadline_date,status,created_at";

export const PUBLIC_REQUEST_COLUMNS = `${REQUEST_COLUMNS_WITHOUT_PHOTO},photo_path` as const;

export const AUTH_REQUEST_COLUMNS = `${PUBLIC_REQUEST_COLUMNS},created_by,claimed_by` as const;

export const AUTH_REQUEST_COLUMNS_BASIC = `${REQUEST_COLUMNS_WITHOUT_PHOTO},created_by,claimed_by` as const;

export const SEEDED_RIDE_ICONS: Record<string, string> = {
  "3f1b9c4e-8a21-4c7d-9e11-6a1d2b3c4f01": "🛏️",
  "3f1b9c4e-8a21-4c7d-9e11-6a1d2b3c4f02": "📦",
  "3f1b9c4e-8a21-4c7d-9e11-6a1d2b3c4f03": "🪑",
  "3f1b9c4e-8a21-4c7d-9e11-6a1d2b3c4f04": "🛵",
  "3f1b9c4e-8a21-4c7d-9e11-6a1d2b3c4f05": "🗄️",
  "3f1b9c4e-8a21-4c7d-9e11-6a1d2b3c4f06": "🌿",
};

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
  reward: number | string | null;
  scheduled_at: string | null;
  deadline_date: string | null;
  status: string;
  created_at: string;
};

export function rideFromRequest(row: RequestRow): Ride {
  return {
    id: row.id,
    type: row.type,
    title: requestTitle(row),
    icon: SEEDED_RIDE_ICONS[row.id] ?? (row.type === "personen" ? "🧑‍🤝‍🧑" : "📦"),
    origin: row.vertrekplaats,
    destination: row.bestemming,
    description: row.note,
    contactName: row.contact_name,
    itemDescription: row.item_description,
    photoPath: row.photo_path ?? null,
    numPeople: row.num_people,
    pickupAddress: null,
    deliveryAddress: null,
    reward: row.reward == null ? null : Number(row.reward),
    scheduledAt: row.scheduled_at,
    deadline: row.deadline_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function requestTitle(row: Pick<RequestRow, "type" | "item_description" | "num_people">): string {
  if (row.type === "goederen") return row.item_description || "Goederen";
  const people = row.num_people ?? "?";
  return `Rit voor ${people} ${people === 1 ? "persoon" : "personen"}`;
}

export function matchesLocation(ride: Ride, query: string): boolean {
  if (!query.trim()) return true;
  const locationQuery = query.trim().toLocaleLowerCase("nl-NL");
  return [ride.origin, ride.destination].some((location) => location.toLocaleLowerCase("nl-NL").includes(locationQuery));
}
