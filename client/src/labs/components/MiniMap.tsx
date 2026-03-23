import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MiniMapProps {
  lat: number;
  lng: number;
}

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export default function MiniMap({ lat, lng }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:24px;height:24px;border-radius:50%;background:var(--labs-accent, hsl(25,70%,45%));border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });

    L.marker([lat, lng], { icon, interactive: false }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      data-testid="mini-map"
      style={{
        width: "100%",
        height: 200,
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid var(--labs-border)",
        marginTop: 10,
      }}
    />
  );
}
