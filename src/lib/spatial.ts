import type { Station } from "./stations";

export type Position = { latitude: number; longitude: number };
export type UserLocation = Position & { accuracy: number };
export type ViewMode = "explore" | "search" | "station" | "nearest" | "reset";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchesSearch(station: Station, query: string) {
  const text = normalize(
    [station.title, station.address, station.town, station.state].join(" "),
  );
  const terms = normalize(query).split(" ").filter(Boolean);
  // Some records omit "BGC" from their address. Use an explicitly approximate
  // area around the dataset's Menarco Tower coordinate, not all of Taguig.
  const inBgcArea =
    terms.includes("bgc") &&
    normalize(station.town).includes("taguig") &&
    distanceKm(
      { latitude: 14.55293858559628, longitude: 121.05289466079284 },
      station,
    ) <= 1.5;
  return terms.every((term) =>
    term === "bgc"
      ? /\bbgc\b|bonifacio global city|fort bonifacio/.test(text) || inBgcArea
      : text.includes(term),
  );
}

/** Great-circle distance in kilometers; deliberately not road/travel distance. */
export function distanceKm(from: Position, to: Position) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLng = radians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return (
    6371.0088 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)))
  );
}

export function findNearest(origin: Position, candidates: Station[]) {
  let nearest: { station: Station; distance: number } | null = null;
  for (const station of candidates) {
    if (
      !Number.isFinite(station.latitude) ||
      !Number.isFinite(station.longitude)
    )
      continue;
    const distance = distanceKm(origin, station);
    if (!nearest || distance < nearest.distance)
      nearest = { station, distance };
  }
  return nearest;
}

export function formatDistance(km: number) {
  return km < 1
    ? `${Math.round(km * 1000)} m`
    : `${km.toLocaleString("en", { maximumFractionDigits: 1 })} km`;
}
