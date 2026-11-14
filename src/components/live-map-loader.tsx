"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "@/lib/rides";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => <p>Kaart laden…</p>,
});

export function LiveMapLoader({ points }: { points: MapPoint[] }) {
  return <LiveMap points={points} />;
}
