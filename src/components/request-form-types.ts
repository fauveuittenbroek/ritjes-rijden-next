export type RequestFormInitial = {
  type: "goederen" | "personen";
  itemDescription: string | null;
  numPeople: number | null;
  note: string | null;
  vertrekplaats: string;
  bestemming: string;
  ophaaladres: string | null;
  afleveradres: string | null;
  reward: number | null;
  scheduledAt: string | null;
  deadline: string | null;
  contactName: string | null;
  photoPath: string | null;
};
