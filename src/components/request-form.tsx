"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeatureAuth } from "@/components/feature-auth";

type RequestType = "goederen" | "personen";

const MAX_PHOTO_EDGE = 1600;
const PHOTO_QUALITY = 0.8;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", PHOTO_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function RequestForm() {
  const { client, userId, loading: authLoading, error: authError } = useFeatureAuth();
  const router = useRouter();

  const [type, setType] = useState<RequestType>("goederen");
  const [item, setItem] = useState("");
  const [numPeople, setNumPeople] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [deadline, setDeadline] = useState("");
  const [rideDate, setRideDate] = useState("");
  const [rideTime, setRideTime] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickup, setPickup] = useState("");
  const [by, setBy] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !userId) return;
    setError("");

    if (!origin.trim() || !destination.trim()) {
      setError("Vul een vertrekplaats en bestemming in.");
      return;
    }
    if (type === "goederen" && !item.trim()) {
      setError("Vul in wat er vervoerd moet worden.");
      return;
    }
    if (type === "personen" && (!numPeople || Number(numPeople) < 1)) {
      setError("Vul het aantal personen in.");
      return;
    }

    const scheduledAt =
      type === "personen" && rideDate
        ? new Date(`${rideDate}T${rideTime || "00:00"}:00`).toISOString()
        : null;

    setBusy(true);
    try {
      let photoPath: string | null = null;
      if (photo) {
        const upload = await compressImage(photo);
        const safeName = upload.name.replace(/[^\w.-]/g, "_");
        const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await client.storage
          .from("request-photos")
          .upload(path, upload, { contentType: upload.type || "image/jpeg" });
        if (uploadError) {
          setError("De foto uploaden is mislukt. Probeer het opnieuw.");
          setBusy(false);
          return;
        }
        photoPath = path;
      }

      const { data, error: rpcError } = await client.rpc("create_request", {
        p_request: {
          type,
          item_description: type === "goederen" ? item.trim() : null,
          num_people: type === "personen" ? Number(numPeople) : null,
          note: note.trim() || null,
          vertrekplaats: origin.trim(),
          bestemming: destination.trim(),
          ophaaladres: pickup.trim() || null,
          reward: price ? Number(price.replace(",", ".")) : null,
          contact_name: by.trim() || null,
          scheduled_at: type === "personen" ? scheduledAt : null,
          deadline_date: type === "goederen" ? deadline || null : null,
          photo_path: photoPath,
        },
        p_circle_ids: [],
      });

      if (rpcError || !data) {
        setError("Het verzoek plaatsen is mislukt. Probeer het opnieuw.");
        setBusy(false);
        return;
      }

      const created = data as { id: string };
      router.push(`/rides/${created.id}`);
    } catch {
      setError("Het verzoek plaatsen is mislukt. Probeer het opnieuw.");
      setBusy(false);
    }
  }

  if (authError) return <p role="alert">{authError}</p>;
  if (authLoading || !userId) return <p>Laden…</p>;

  return (
    <form className="request-form" onSubmit={submit}>
      <div className="form-card">
        <label>Type</label>
        <div className="type-grid">
          <button
            type="button"
            className="type-card"
            aria-pressed={type === "goederen"}
            onClick={() => setType("goederen")}
          >
            <span aria-hidden="true">📦</span>
            <strong>Spullen</strong>
            <span>meenemen</span>
          </button>
          <button
            type="button"
            className="type-card"
            aria-pressed={type === "personen"}
            onClick={() => setType("personen")}
          >
            <span aria-hidden="true">🧑‍🤝‍🧑</span>
            <strong>Personen</strong>
            <span>rijden</span>
          </button>
        </div>
      </div>

      <div className="form-card">
        {type === "goederen" ? (
          <>
            <label htmlFor="request-item">Wat wil je vervoeren?</label>
            <input id="request-item" value={item} onChange={(event) => setItem(event.target.value)} required />

            <label htmlFor="request-photo">Foto</label>
            <input
              id="request-photo"
              type="file"
              accept="image/*"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            />

            <label htmlFor="request-note">Opmerkingen</label>
            <textarea
              id="request-note"
              rows={3}
              placeholder="Bijv. breekbaar, afmetingen, tijdstip..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />

            <label htmlFor="request-deadline">Moet dit voor een specifieke datum opgehaald zijn? (Optioneel)</label>
            <input
              id="request-deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </>
        ) : (
          <>
            <label htmlFor="request-people">Met hoeveel personen?</label>
            <input
              id="request-people"
              type="number"
              min={1}
              step={1}
              placeholder="Bijv. 2"
              value={numPeople}
              onChange={(event) => setNumPeople(event.target.value)}
              required
            />

            <label htmlFor="request-ride-date">Wanneer?</label>
            <div className="datetime-row">
              <input
                id="request-ride-date"
                type="date"
                aria-label="Datum"
                value={rideDate}
                onChange={(event) => setRideDate(event.target.value)}
              />
              <input
                type="time"
                aria-label="Tijd"
                value={rideTime}
                onChange={(event) => setRideTime(event.target.value)}
              />
            </div>

            <label htmlFor="request-note">Extra opmerking / gegevens</label>
            <textarea
              id="request-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </>
        )}
      </div>

      <div className="form-card">
        <label htmlFor="request-origin">Vertrekplaats</label>
        <input
          id="request-origin"
          placeholder="bv. Kockengen"
          value={origin}
          onChange={(event) => setOrigin(event.target.value)}
          required
        />

        <label htmlFor="request-destination">Bestemming</label>
        <input
          id="request-destination"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          required
        />

        <label htmlFor="request-pickup">Exact ophaaladres / locatie</label>
        <input id="request-pickup" value={pickup} onChange={(event) => setPickup(event.target.value)} />
      </div>

      <div className="form-card">
        <label htmlFor="request-by">Door</label>
        <input id="request-by" placeholder="Naam" value={by} onChange={(event) => setBy(event.target.value)} />

        <label htmlFor="request-price">Prijs (€)</label>
        <input
          id="request-price"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </div>

      <p className="request-groups">Je verzoek wordt openbaar geplaatst en is direct zichtbaar op de overzichtspagina.</p>

      {error && <p role="alert">{error}</p>}

      <button type="submit" className="request-submit" disabled={busy}>
        {busy ? "Bezig..." : "Plaats verzoek"}
      </button>
    </form>
  );
}
