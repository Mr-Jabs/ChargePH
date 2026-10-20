"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  ArrowUpRight,
  Crosshair,
  LoaderCircle,
  Minus,
  Plus,
  Zap,
  MapPin,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { directions, standard, type Station } from "@/lib/stations";
import {
  formatDistance,
  type UserLocation,
  type ViewMode,
} from "@/lib/spatial";
import type { MapTheme } from "@/lib/themes";

const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;
const cartoUrl =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const animate = () =>
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Nearest = { station: Station; distance: number } | null;
type MapProps = {
  stations: Station[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  resetKey: number;
  theme: MapTheme;
  viewMode: ViewMode;
  query: string;
  userLocation: UserLocation | null;
  nearest: Nearest;
  onLocate: () => void;
  locating: boolean;
};

function markerIcon(color: string, active = false, fast = false) {
  return L.divIcon({
    className: `station-marker${active ? " highlighted-marker" : ""}`,
    html: `<svg width="${active ? 36 : 27}" height="${active ? 42 : 33}" viewBox="0 0 30 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 34s12-13 12-21A12 12 0 0 0 3 13c0 8 12 21 12 21Z" fill="${color}" stroke="${active ? "#ffffff" : "#10201c"}" stroke-width="${active ? 2 : 1.5}"/>${fast ? '<path d="m16 6-7 9h5l-1 7 8-10h-5l1-6Z" fill="#091512"/>' : '<circle cx="15" cy="13" r="4" stroke="#10201c" stroke-width="2"/>'}</svg>`,
    iconSize: active ? [36, 42] : [27, 33],
    iconAnchor: active ? [18, 42] : [13.5, 33],
    popupAnchor: [0, -34],
  });
}

/** Leaflet must observe the container itself when the sidebar animates. */
function MapViewport({
  stations,
  viewMode,
  query,
  resetKey,
  selectedId,
  userLocation,
  nearest,
}: Pick<
  MapProps,
  | "stations"
  | "viewMode"
  | "query"
  | "resetKey"
  | "selectedId"
  | "userLocation"
  | "nearest"
>) {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() =>
      map.invalidateSize({ pan: true, debounceMoveend: true }),
    );
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    const mobile = map.getSize().x < 600;
    const fit = (points: L.LatLngTuple[], maxZoom: number) => {
      const bounds = L.latLngBounds(points);
      const height = map.getSize().y;
      map.flyToBounds(bounds, {
        paddingTopLeft: [35, Math.min(mobile ? 235 : 165, height * 0.35)],
        paddingBottomRight: [65, Math.min(mobile ? 220 : 175, height * 0.25)],
        maxZoom,
        animate: animate(),
        duration: 0.8,
      });
    };
    const timer = window.setTimeout(
      () => {
        if (viewMode === "reset") {
          map.closePopup();
          map.flyTo([12.8797, 121.774], 6, {
            animate: animate(),
            duration: 0.8,
          });
        } else if (viewMode === "search" && query.trim() && stations.length) {
          map.closePopup();
          fit(
            stations.map((s) => [s.latitude, s.longitude]),
            13,
          );
        } else if (viewMode === "nearest" && userLocation) {
          map.closePopup();
          fit(
            [
              [userLocation.latitude, userLocation.longitude],
              ...(nearest
                ? [
                    [
                      nearest.station.latitude,
                      nearest.station.longitude,
                    ] as L.LatLngTuple,
                  ]
                : []),
            ],
            15,
          );
        } else if (viewMode === "station") {
          const station = stations.find((s) => s.id === selectedId);
          if (station)
            map.flyTo(
              [station.latitude, station.longitude],
              Math.max(map.getZoom(), 12),
              { animate: animate(), duration: 0.8 },
            );
        }
      },
      viewMode === "search" ? 350 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [
    map,
    stations,
    viewMode,
    query,
    resetKey,
    selectedId,
    userLocation,
    nearest,
  ]);
  return null;
}

function MapControls({
  onLocate,
  locating,
}: Pick<MapProps, "onLocate" | "locating">) {
  const map = useMap();
  return (
    <div className="map-tools">
      <div className="zoom-group">
        <button aria-label="Zoom in" onClick={() => map.zoomIn()}>
          <Plus size={18} />
        </button>
        <button aria-label="Zoom out" onClick={() => map.zoomOut()}>
          <Minus size={18} />
        </button>
      </div>
      <button
        className="locate"
        aria-label="Locate nearest charger on map"
        onClick={onLocate}
        disabled={locating}
      >
        {locating ? (
          <LoaderCircle className="loading-spin" size={18} />
        ) : (
          <Crosshair size={18} />
        )}
      </button>
    </div>
  );
}

function StationPin({
  station,
  selected,
  nearest,
  onSelect,
  icon,
}: {
  station: Station;
  selected: boolean;
  nearest: boolean;
  onSelect: (id: number) => void;
  icon: L.DivIcon;
}) {
  const ref = useRef<L.Marker>(null);
  useEffect(() => {
    if (selected) ref.current?.openPopup();
    else ref.current?.closePopup();
  }, [selected]);
  return (
    <Marker
      ref={ref}
      position={[station.latitude, station.longitude]}
      icon={icon}
      zIndexOffset={selected || nearest ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(station.id) }}
      title={`${station.title}${nearest ? " — nearest matching charger" : ""}`}
      alt={station.title}
    >
      {nearest && (
        <Tooltip
          direction="bottom"
          offset={[0, 6]}
          permanent
          className="nearest-tooltip"
        >
          Nearest charger
        </Tooltip>
      )}
      <Popup
        minWidth={255}
        maxWidth={300}
        autoPanPaddingTopLeft={[20, 170]}
        autoPanPaddingBottomRight={[20, 80]}
      >
        <div className="station-popup">
          <div className="popup-eyebrow">
            <span className={station.is_dc_fast ? "fast-dot" : "ac-dot"} />
            {station.is_dc_fast ? "DC FAST CHARGING" : "STANDARD CHARGING"}
          </div>
          <h3>{station.title}</h3>
          <span className="operator-badge">{station.operator}</span>
          <div className="popup-address">
            <MapPin size={15} />
            <p>
              {station.address}
              <br />
              {[station.town, station.state].filter(Boolean).join(", ")}
            </p>
          </div>
          <div className="popup-connections">
            {station.connections.map((c, i) => (
              <div key={i}>
                <span>
                  <Zap size={13} />
                  {standard(c.title) === "Unknown"
                    ? "Plug unspecified"
                    : standard(c.title)}
                </span>
                <strong>
                  {c.power_kw ? `${c.power_kw} kW` : "Power unspecified"}
                </strong>
              </div>
            ))}
          </div>
          <a
            className="directions-link"
            href={directions(station)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions <ArrowUpRight size={17} />
          </a>
        </div>
      </Popup>
    </Marker>
  );
}

export default function Map(props: MapProps) {
  const {
    stations,
    selectedId,
    onSelect,
    resetKey,
    theme,
    viewMode,
    query,
    userLocation,
    nearest,
    onLocate,
    locating,
  } = props;
  const [tileError, setTileError] = useState(false);
  const icons = useMemo(
    () => ({
      fast: markerIcon(theme.accent, false, true),
      ac: markerIcon(theme.secondary),
      activeFast: markerIcon(theme.accent, true, true),
      activeAc: markerIcon(theme.accent, true),
      location: L.divIcon({
        className: "user-location-marker",
        html: `<span style="--location-color:${theme.accent}"><i></i></span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    }),
    [theme.accent, theme.secondary],
  );

  return (
    <>
      <MapContainer
        center={[12.8797, 121.774]}
        zoom={6}
        minZoom={3}
        maxZoom={19}
        zoomControl={false}
        className="leaflet-map"
      >
        <TileLayer
          className={cartoKey ? "carto-tiles" : "osm-dark-tiles"}
          url={
            cartoKey
              ? `${cartoUrl}?key=${encodeURIComponent(cartoKey)}`
              : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution={
            cartoKey
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />
        {stations.map((station) => {
          const highlighted =
            selectedId === station.id || nearest?.station.id === station.id;
          return (
            <StationPin
              key={station.id}
              station={station}
              selected={selectedId === station.id}
              nearest={nearest?.station.id === station.id}
              onSelect={onSelect}
              icon={
                highlighted
                  ? station.is_dc_fast
                    ? icons.activeFast
                    : icons.activeAc
                  : station.is_dc_fast
                    ? icons.fast
                    : icons.ac
              }
            />
          );
        })}
        {userLocation && (
          <>
            <Circle
              center={[userLocation.latitude, userLocation.longitude]}
              radius={userLocation.accuracy}
              pathOptions={{
                color: theme.accent,
                weight: 1,
                fillOpacity: 0.07,
              }}
            />
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={icons.location}
              zIndexOffset={2000}
              title="You are here"
              alt="You are here"
            >
              <Tooltip
                permanent
                direction="top"
                offset={[0, -12]}
                className="user-tooltip"
              >
                You are here
              </Tooltip>
              <Popup>
                <div className="you-popup">
                  <strong>You are here</strong>
                  <p>
                    Location accuracy: ±{Math.round(userLocation.accuracy)} m
                  </p>
                  {nearest && (
                    <p>
                      Nearest matching charger:{" "}
                      {formatDistance(nearest.distance)} away in a straight
                      line.
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
            {nearest && (
              <Polyline
                positions={[
                  [userLocation.latitude, userLocation.longitude],
                  [nearest.station.latitude, nearest.station.longitude],
                ]}
                pathOptions={{
                  color: theme.accent,
                  weight: 2,
                  opacity: 0.65,
                  dashArray: "5 8",
                }}
              />
            )}
          </>
        )}
        <MapViewport
          stations={stations}
          viewMode={viewMode}
          query={query}
          resetKey={resetKey}
          selectedId={selectedId}
          userLocation={userLocation}
          nearest={nearest}
        />
        <MapControls onLocate={onLocate} locating={locating} />
      </MapContainer>
      {tileError && (
        <div className="tile-error" role="status">
          Map tiles unavailable. Check your connection; station details remain
          accessible in the list.
        </div>
      )}
    </>
  );
}
