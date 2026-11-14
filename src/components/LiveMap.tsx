"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { MapPoint } from "@/lib/rides";

const FALLBACK: [number, number] = [52.0907, 5.1214];

const originIcon = L.divIcon({
  className: "map-pin map-pin-origin",
  html: "A",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const destinationIcon = L.divIcon({
  className: "map-pin map-pin-dest",
  html: "B",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 11);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function LiveMap({ points }: { points: MapPoint[] }) {
  const center = points[0]?.position ?? FALLBACK;

  return (
    <div className="live-map">
      <MapContainer center={center} zoom={10} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPoints points={points.map((point) => point.position)} />
        {points.map((point) => (
          <Marker
            key={point.role}
            position={point.position}
            icon={point.role === "origin" ? originIcon : destinationIcon}
          >
            <Popup>{point.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
