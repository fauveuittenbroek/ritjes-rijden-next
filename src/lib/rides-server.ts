import { createClient } from "@/lib/supabase/server";
import {
  DEMO_RIDES,
  PUBLIC_REQUEST_COLUMNS,
  REQUEST_COLUMNS_WITHOUT_PHOTO,
  Ride,
  rideFromRequest,
} from "@/lib/rides";

export function publicPhotoUrl(path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/request-photos/${encoded}`;
}

export async function loadRide(id: string): Promise<{ ride: Ride | null; isAuthed: boolean }> {
  const demo = DEMO_RIDES.find((ride) => ride.id === id);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (demo) return { ride: demo, isAuthed: Boolean(user) };

    let result = await supabase
      .from("requests")
      .select(PUBLIC_REQUEST_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (result.error) {
      result = await supabase
        .from("requests")
        .select(REQUEST_COLUMNS_WITHOUT_PHOTO)
        .eq("id", id)
        .maybeSingle();
    }
    const data = result.data;
    if (!data) return { ride: null, isAuthed: Boolean(user) };

    const ride = rideFromRequest(data);
    if (ride.photoPath) {
      if (user) {
        const { data: signed } = await supabase.storage
          .from("request-photos")
          .createSignedUrl(ride.photoPath, 60 * 60);
        ride.image = signed?.signedUrl ?? supabase.storage.from("request-photos").getPublicUrl(ride.photoPath).data.publicUrl;
      } else {
        ride.image = publicPhotoUrl(ride.photoPath);
      }
    }
    return { ride, isAuthed: Boolean(user) };
  } catch {
    return { ride: demo ?? null, isAuthed: false };
  }
}
