"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_EDGE = 800;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function publicPhotoUrl(path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/${encoded}`;
}

async function resizeImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  bitmap.close();
  if (!blob) return file;
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export function ProfilePhotoForm({
  userId,
  displayName,
  initialPath,
}: {
  userId: string;
  displayName: string;
  initialPath: string | null;
}) {
  const router = useRouter();
  const [client] = useState(() => createClient());
  const [avatarPath, setAvatarPath] = useState(initialPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function upload(file: File | null) {
    if (!file || busy) return;
    if (!file.type.startsWith("image/")) {
      setError("Kies een afbeelding (JPG, PNG of WebP).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("De foto is te groot. Kies een afbeelding onder 5 MB.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const resized = await resizeImage(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await client.storage
        .from("profile-photos")
        .upload(path, resized, { contentType: resized.type || "image/jpeg", upsert: false });
      if (uploadError) {
        setError("De foto uploaden is mislukt. Probeer het opnieuw.");
        return;
      }

      const { error: saveError } = await client.from("profiles").upsert(
        { id: userId, avatar_path: path },
        { onConflict: "id" },
      );
      if (saveError) {
        setError("De foto opslaan is mislukt. Probeer het opnieuw.");
        return;
      }

      if (avatarPath) {
        await client.storage.from("profile-photos").remove([avatarPath]).catch(() => {});
      }
      setAvatarPath(path);
      setMessage("Profielfoto bijgewerkt.");
      router.refresh();
    } catch {
      setError("De foto uploaden is mislukt. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (busy || !avatarPath) return;
    if (!window.confirm("Weet je zeker dat je je profielfoto wilt verwijderen?")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: saveError } = await client.from("profiles").upsert(
        { id: userId, avatar_path: null },
        { onConflict: "id" },
      );
      if (saveError) {
        setError("De foto verwijderen is mislukt. Probeer het opnieuw.");
        return;
      }
      await client.storage.from("profile-photos").remove([avatarPath]).catch(() => {});
      setAvatarPath(null);
      setMessage("Profielfoto verwijderd.");
      router.refresh();
    } catch {
      setError("De foto verwijderen is mislukt. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-photo">
      <div className="account-avatar">
        {avatarPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={publicPhotoUrl(avatarPath)} alt={`Profielfoto van ${displayName}`} />
        ) : (
          <span aria-hidden="true">{initials(displayName)}</span>
        )}
      </div>
      <div className="profile-photo-actions">
        <label className="profile-photo-upload">
          {busy ? "Bezig…" : avatarPath ? "Foto wijzigen" : "Foto toevoegen"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              upload(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
        </label>
        {avatarPath && (
          <button type="button" className="profile-photo-remove" onClick={removePhoto} disabled={busy}>
            Verwijder foto
          </button>
        )}
        {error && <p className="profile-photo-message" role="alert">{error}</p>}
        {message && <p className="profile-photo-message" role="status">{message}</p>}
      </div>
    </div>
  );
}
