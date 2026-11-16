import { createClient } from "@/lib/supabase/server";
import {
  AUTH_REQUEST_COLUMNS,
  AUTH_REQUEST_COLUMNS_BASIC,
  PUBLIC_REQUEST_COLUMNS,
  REQUEST_COLUMNS_WITHOUT_PHOTO,
  Ride,
  rideFromRequest,
} from "@/lib/rides";

type RideRow = Parameters<typeof rideFromRequest>[0];

export function publicPhotoUrl(path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/request-photos/${encoded}`;
}

export function isStillVisible(ride: Ride): boolean {
  if (ride.status === "open" || !ride.deadline) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return ride.deadline >= cutoff.toISOString().slice(0, 10);
}

export async function loadPublicRides(): Promise<Ride[]> {
  try {
    const supabase = await createClient();
    let rows: RideRow[] | null;
    const primary = await supabase
      .from("requests")
      .select(PUBLIC_REQUEST_COLUMNS)
      .in("status", ["open", "claimed"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (primary.error) {
      const fallback = await supabase
        .from("requests")
        .select(REQUEST_COLUMNS_WITHOUT_PHOTO)
        .in("status", ["open", "claimed"])
        .order("created_at", { ascending: false })
        .limit(100);
      rows = fallback.data;
    } else {
      rows = primary.data;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const rides = (rows ?? []).map((row) => rideFromRequest(row));
    const photoPaths = rides.flatMap((ride) => (ride.photoPath ? [ride.photoPath] : []));
    const signedUrls = new Map<string, string>();
    if (user && photoPaths.length) {
      const { data: signed } = await supabase.storage.from("request-photos").createSignedUrls(photoPaths, 60 * 60);
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl);
      }
    }
    for (const ride of rides) {
      if (!ride.photoPath) continue;
      ride.image = signedUrls.get(ride.photoPath) ?? publicPhotoUrl(ride.photoPath);
    }
    return rides;
  } catch {
    return [];
  }
}

export async function loadRide(id: string): Promise<{ ride: Ride | null; isAuthed: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let result: { data: RideRow | null; error: unknown };
    if (user) {
      result = await supabase.from("requests").select(AUTH_REQUEST_COLUMNS).eq("id", id).maybeSingle();
    } else {
      result = await supabase.from("requests").select(PUBLIC_REQUEST_COLUMNS).eq("id", id).maybeSingle();
    }
    if (result.error) {
      result = user
        ? await supabase.from("requests").select(AUTH_REQUEST_COLUMNS_BASIC).eq("id", id).maybeSingle()
        : await supabase.from("requests").select(REQUEST_COLUMNS_WITHOUT_PHOTO).eq("id", id).maybeSingle();
    }
    const data = result.data;
    if (!data) return { ride: null, isAuthed: Boolean(user) };

    const ride = rideFromRequest(data);
    ride.isCreator = Boolean(user && data.created_by === user.id);
    ride.isClaimer = Boolean(user && data.claimed_by === user.id);

    if (ride.photoPath) {
      if (user) {
        const { data: signed } = await supabase.storage
          .from("request-photos")
          .createSignedUrl(ride.photoPath, 60 * 60);
        ride.image = signed?.signedUrl ?? publicPhotoUrl(ride.photoPath);
      } else {
        ride.image = publicPhotoUrl(ride.photoPath);
      }
    }
    return { ride, isAuthed: Boolean(user) };
  } catch {
    return { ride: null, isAuthed: false };
  }
}
