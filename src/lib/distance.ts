export type DistanceResult = { km: number; mode: "road" | "straight" };

const cache = new Map<string, DistanceResult>();

export function straightLineKm(a: [number, number], b: [number, number]): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export async function distanceBetween(a: [number, number], b: [number, number]): Promise<DistanceResult> {
  const key = `${a[0]},${a[1]}-${b[0]},${b[1]}`;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=false`;
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (response.ok) {
      const data = (await response.json()) as { code?: string; routes?: { distance?: number }[] };
      const meters = data.routes?.[0]?.distance;
      if (data.code === "Ok" && typeof meters === "number") {
        const result: DistanceResult = { km: meters / 1000, mode: "road" };
        cache.set(key, result);
        return result;
      }
    }
  } catch {
  }
  return { km: straightLineKm(a, b), mode: "straight" };
}
