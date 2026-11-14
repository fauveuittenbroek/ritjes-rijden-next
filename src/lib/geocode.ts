export type Coordinates = [number, number];

export async function geocodePlace(place: string): Promise<Coordinates | null> {
  const query = place.trim();
  if (!query) return null;
  try {
    const params = new URLSearchParams({
      q: query,
      format: "jsonv2",
      limit: "1",
      countrycodes: "nl",
      "accept-language": "nl",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { "User-Agent": "ritjes-rijden/0.1 (Next.js hobbyproject)" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    const results = (await response.json()) as { lat?: string; lon?: string }[];
    const first = results[0];
    if (!first?.lat || !first.lon) return null;
    return [Number(first.lat), Number(first.lon)];
  } catch {
    return null;
  }
}
