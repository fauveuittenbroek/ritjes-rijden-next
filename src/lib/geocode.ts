export type Coordinates = [number, number];

const cache = new Map<string, Coordinates>();

export async function geocodePlace(place: string): Promise<Coordinates | null> {
  const query = place.trim();
  if (!query) return null;
  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;
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
    const coordinates: Coordinates = [Number(first.lat), Number(first.lon)];
    cache.set(key, coordinates);
    return coordinates;
  } catch {
    return null;
  }
}
