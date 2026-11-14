import { ImageResponse } from "next/og";
import { loadRide } from "@/lib/rides-server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Ritje op Ritjes Rijden";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ride } = await loadRide(id);
  const title = ride?.title ?? "Ritje";
  const route = ride ? `${ride.origin} → ${ride.destination}` : "Ritjes Rijden";
  const status = ride ? (ride.status === "open" ? "Open" : "Ingevuld") : "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "#f5f8f5",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: "4px", color: "#3b45b8" }}>
            VERVOER-VERZOEK
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: "#17211c", lineHeight: 1.1 }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 46, fontWeight: 600, color: "#175c3b" }}>{route}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 32, color: "#52605a" }}>Ritjes Rijden</div>
          {status ? (
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 600,
                color: "#0b2e13",
                background: "#25d366",
                padding: "12px 28px",
                borderRadius: "999px",
              }}
            >
              Status: {status}
            </div>
          ) : null}
        </div>
      </div>
    ),
    size,
  );
}
