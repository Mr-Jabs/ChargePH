"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Bolt,
  ChevronDown,
  ChevronRight,
  Compass,
  Crosshair,
  Globe2,
  Layers,
  List,
  LoaderCircle,
  MapPin,
  Navigation,
  PlugZap,
  Radio,
  Search,
  SlidersHorizontal,
  X,
  Zap,
} from "lucide-react";
import { cn, stations, maxPower, standard, type Station } from "@/lib/stations";
import {
  findNearest,
  formatDistance,
  matchesSearch,
  type UserLocation,
  type ViewMode,
} from "@/lib/spatial";
import { themes, type ThemeName } from "@/lib/themes";
import ThemeSwitcher from "./ThemeSwitcher";
import { requestUserLocation } from "@/lib/location";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <Globe2 size={34} />
      <span>Mapping the archipelago…</span>
    </div>
  ),
});

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [operators, setOperators] = useState<string[]>([]);
  const [plugs, setPlugs] = useState<string[]>([]);
  const [fastOnly, setFastOnly] = useState(false);
  const [tab, setTab] = useState<"overview" | "stations">("overview");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [about, setAbout] = useState(false);
  const [theme, setTheme] = useState<ThemeName>("emerald");
  const [viewMode, setViewMode] = useState<ViewMode>("explore");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const locationRequest = useRef(0);
  useEffect(
    () => () => {
      locationRequest.current += 1;
    },
    [],
  );
  const aboutRef = useRef<HTMLElement>(null);
  const mobileRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!about && !mobileOpen) return;
    const root = about ? aboutRef.current : mobileRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'button, a[href], input, [tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAbout(false);
        setMobileOpen(false);
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [about, mobileOpen]);
  const operatorCounts = useMemo(
    () =>
      Object.entries(
        stations.reduce<Record<string, number>>((acc, s) => {
          acc[s.operator] = (acc[s.operator] || 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    [],
  );
  const plugOptions = useMemo(
    () => [
      ...new Set([
        "CCS2",
        "Type 2",
        "GB/T",
        ...stations.flatMap((s) => s.connections.map((c) => standard(c.title))),
      ]),
    ],
    [],
  );
  const filtered = useMemo(
    () =>
      stations.filter(
        (s) =>
          matchesSearch(s, query) &&
          (!operators.length || operators.includes(s.operator)) &&
          (!plugs.length ||
            s.connections.some((c) => plugs.includes(standard(c.title)))) &&
          (!fastOnly || s.is_dc_fast),
      ),
    [query, operators, plugs, fastOnly],
  );
  const nearest = useMemo(
    () => (userLocation ? findNearest(userLocation, filtered) : null),
    [userLocation, filtered],
  );
  const dc = filtered.filter((s) => s.is_dc_fast).length;
  const provinces = new Set(filtered.map((s) => s.state).filter(Boolean)).size;
  const activeCount = operators.length + plugs.length + Number(fastOnly);
  function filterChanged() {
    setSelectedId(null);
    setViewMode(userLocation ? "nearest" : query.trim() ? "search" : "explore");
  }
  function toggle(
    value: string,
    values: string[],
    setter: (v: string[]) => void,
  ) {
    setter(
      values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value],
    );
    filterChanged();
  }
  function reset() {
    setQuery("");
    setOperators([]);
    setPlugs([]);
    setFastOnly(false);
    setSelectedId(null);
    setViewMode("reset");
    setResetKey((v) => v + 1);
  }
  function select(station: Station) {
    setSelectedId(station.id);
    setViewMode("station");
    setMobileOpen(false);
  }
  function search(value: string) {
    setQuery(value);
    setSelectedId(null);
    setViewMode(value.trim() ? "search" : "reset");
    if (!value.trim()) setResetKey((v) => v + 1);
  }
  function locate() {
    if (locating) return;
    setLocationError("");
    setLocating(true);
    const request = ++locationRequest.current;
    requestUserLocation(navigator.geolocation)
      .then((location) => {
        if (request !== locationRequest.current) return;
        setUserLocation(location);
        setSelectedId(null);
        setViewMode("nearest");
        setLocating(false);
        setMobileOpen(false);
      })
      .catch((error: unknown) => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        setLocationError(
          error instanceof Error
            ? error.message
            : "Location unavailable. Please try again.",
        );
      });
  }
  function download() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "charge-ph-stations.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="app-shell" data-theme={theme}>
      <header className="topbar">
        <Link href="/" className="brand" aria-label="ChargePH home">
          <span className="brand-icon">
            <Zap size={24} fill="currentColor" />
          </span>
          <span>
            Charge<span className="brand-ph">PH</span>
            <span className="brand-period">.</span>
          </span>
        </Link>
        <div className="header-divider" />
        <span className="header-subtitle">INFRASTRUCTURE INTELLIGENCE</span>
        <nav className="main-nav" aria-label="Main navigation">
          <button className="nav-active" onClick={() => setAbout(false)}>
            <Compass size={15} />
            Explorer
          </button>
          <button onClick={() => setAbout(true)}>
            About the data <ArrowUpRight size={13} />
          </button>
        </nav>
        <ThemeSwitcher value={theme} onChange={setTheme} />
        <span className="country-label">
          <span className="ph-flag">🇵🇭</span> Philippines{" "}
          <ChevronDown size={13} />
        </span>
      </header>
      <div
        className={cn(
          "workspace",
          (userLocation || locating || locationError) && "has-location",
        )}
      >
        <section
          className="map-region"
          aria-label="Philippine charging station map"
        >
          <Map
            stations={filtered}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setViewMode("station");
            }}
            resetKey={resetKey}
            theme={themes[theme]}
            viewMode={viewMode}
            query={query}
            userLocation={userLocation}
            nearest={nearest}
            onLocate={locate}
            locating={locating}
          />
        </section>
        <aside
          id="analytics-sidebar"
          ref={mobileRef}
          className={cn(
            "analytics-panel",
            mobileOpen && "mobile-open",
          )}
          aria-label="Infrastructure analytics"
        >
          <div className="panel-intro">
            <div className="eyebrow">
              <span className="live-dot" /> CHARGEPH — INFRASTRUCTURE ANALYTICS
            </div>
            <h1>
              Powering the
              <br />
              next <span>journey.</span>
            </h1>
            <p>
              A closer look at the infrastructure
              <br className="desktop-break" /> driving our electric future.
            </p>
            <button
              className="mobile-close icon-button"
              aria-label="Close analytics"
              onClick={() => setMobileOpen(false)}
            >
              <X size={19} />
            </button>
          </div>
          <div
            className="panel-tabs"
            role="tablist"
            aria-label="Analytics view"
          >
            <button
              role="tab"
              id="overview-tab"
              aria-controls="overview-panel"
              aria-selected={tab === "overview"}
              className={cn(tab === "overview" && "active")}
              onClick={() => setTab("overview")}
            >
              <Layers size={15} />
              Overview
            </button>
            <button
              role="tab"
              id="stations-tab"
              aria-controls="stations-panel"
              aria-selected={tab === "stations"}
              className={cn(tab === "stations" && "active")}
              onClick={() => setTab("stations")}
            >
              <List size={16} />
              Stations<span>{filtered.length}</span>
            </button>
          </div>
          <div className="panel-scroll">
            {tab === "overview" ? (
              <div
                role="tabpanel"
                id="overview-panel"
                aria-labelledby="overview-tab"
              >
                <div className="section-caption">
                  NETWORK AT A GLANCE <span>01</span>
                </div>
                <div className="metric-grid">
                  <div className="metric-card">
                    <span className="metric-label">
                      <MapPin size={14} />
                      Total stations
                    </span>
                    <strong>
                      {filtered.length.toLocaleString()}
                      <span className="metric-decoration">↗</span>
                    </strong>
                    <span className="metric-foot">
                      Across {provinces} provinces / areas
                    </span>
                  </div>
                  <button
                    className={cn(
                      "metric-card fast-card",
                      fastOnly && "selected",
                    )}
                    aria-pressed={fastOnly}
                    onClick={() => {
                      setFastOnly(!fastOnly);
                      filterChanged();
                    }}
                  >
                    <span className="metric-label">
                      <Zap size={14} />
                      DC fast chargers
                    </span>
                    <strong>
                      {dc}
                      <span className="metric-decoration">
                        <Bolt size={20} />
                      </span>
                    </strong>
                    <span className="metric-foot">
                      {filtered.length
                        ? Math.round((dc / filtered.length) * 100)
                        : 0}
                      % of selected network
                    </span>
                  </button>
                </div>
                <div className="network-bar">
                  <span
                    style={{
                      width: `${filtered.length ? (dc / filtered.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="network-bar-label">
                  <span>
                    <i className="fast-dot" />
                    DC fast charging
                  </span>
                  <span>
                    <i className="ac-dot" />
                    Standard / other
                  </span>
                </div>
                <div className="section-caption operators-caption">
                  TOP OPERATORS <span>BY STATION COUNT</span>
                </div>
                {operatorCounts.slice(0, 4).map(([name, count], i) => (
                  <button
                    className="operator-row"
                    key={name}
                    onClick={() => toggle(name, operators, setOperators)}
                    aria-pressed={operators.includes(name)}
                  >
                    <span className="operator-rank">0{i + 1}</span>
                    <div>
                      <div className="operator-name">
                        {name}
                        <span>{count}</span>
                      </div>
                      <div className="operator-track">
                        <span
                          style={{
                            width: `${(count / stations.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <ChevronRight size={14} />
                  </button>
                ))}
                <p className="data-note">
                  <Radio size={13} />
                  Operator details are unspecified in this dataset.
                </p>
              </div>
            ) : (
              <div
                role="tabpanel"
                id="stations-panel"
                aria-labelledby="stations-tab"
                className="station-list"
              >
                <div className="section-caption">
                  EXPLORE THE NETWORK <span>{filtered.length} RESULTS</span>
                </div>
                {filtered.slice(0, 100).map((s) => (
                  <button
                    className={cn(
                      "station-row",
                      selectedId === s.id && "selected",
                    )}
                    key={s.id}
                    onClick={() => select(s)}
                  >
                    <span
                      className={cn(
                        "station-list-icon",
                        s.is_dc_fast && "fast",
                      )}
                    >
                      <Zap size={16} />
                    </span>
                    <span>
                      <strong>{s.title}</strong>
                      <small>
                        {[s.town, s.state].filter(Boolean).join(", ") ||
                          "Philippines"}
                      </small>
                      <em>
                        {maxPower(s)
                          ? `${maxPower(s)} kW`
                          : "Power unspecified"}{" "}
                        · {s.is_dc_fast ? "DC fast" : "Standard / other"}
                      </em>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
                {filtered.length > 100 && (
                  <p className="data-note">
                    Showing the first 100 results. Search to narrow your
                    results.
                  </p>
                )}
                {!filtered.length && (
                  <div className="list-empty">
                    <Search size={24} />
                    <p>No stations match these filters.</p>
                    <button onClick={reset}>Clear filters</button>
                  </div>
                )}
              </div>
            )}
            <section className="filter-section" aria-label="Station filters">
              <div className="section-caption">
                <span className="filter-heading">
                  <SlidersHorizontal size={13} /> REFINE YOUR VIEW
                  {activeCount > 0 && <b>{activeCount}</b>}
                </span>
                <button className="reset-button" onClick={reset}>
                  Reset
                </button>
              </div>
              <h2>Operator</h2>
              <div className="filter-pills">
                <button
                  aria-pressed={!operators.length}
                  className={cn(!operators.length && "active")}
                  onClick={() => {
                    setOperators([]);
                    filterChanged();
                  }}
                >
                  All operators
                </button>
                {operatorCounts.map(([op]) => (
                  <button
                    key={op}
                    aria-pressed={operators.includes(op)}
                    className={cn(operators.includes(op) && "active")}
                    onClick={() => toggle(op, operators, setOperators)}
                  >
                    {op === "Independent / Unknown"
                      ? "Independent / unknown"
                      : op}
                  </button>
                ))}
              </div>
              <h2>Plug standard</h2>
              <div className="filter-pills plugs">
                <button
                  aria-pressed={!plugs.length}
                  className={cn(!plugs.length && "active")}
                  onClick={() => {
                    setPlugs([]);
                    filterChanged();
                  }}
                >
                  All plugs
                </button>
                {plugOptions.map((plug) => (
                  <button
                    key={plug}
                    className={cn(plugs.includes(plug) && "active")}
                    aria-pressed={plugs.includes(plug)}
                    onClick={() => toggle(plug, plugs, setPlugs)}
                  >
                    {plug}
                  </button>
                ))}
              </div>
              <p className="plug-note">
                Connector standards are currently unspecified.
              </p>
              <button
                role="switch"
                aria-checked={fastOnly}
                className="fast-switch"
                onClick={() => {
                  setFastOnly(!fastOnly);
                  filterChanged();
                }}
              >
                <span>
                  <Zap size={15} />
                  DC fast charging only
                </span>
                <i className={cn("switch-track", fastOnly && "on")}>
                  <i />
                </i>
              </button>
            </section>
          </div>
          <div className="panel-footer">
            <span className="live-dot" />
            <span>Open Charge Map dataset</span>
            <button aria-label="About the data" onClick={() => setAbout(true)}>
              <ArrowUpRight size={15} />
            </button>
          </div>
        </aside>
        <div className="map-topbar">
          <div className="map-heading">
            <span className="eyebrow">THE EXPLORER</span>
            <h2>
              A nation, connected<span>.</span>
            </h2>
          </div>
          <label className="search-box">
            <Search size={17} />
            <input
              aria-label="Search stations, cities or provinces"
              placeholder="Search a station, city, or province"
              value={query}
              title={
                /\bbgc\b/i.test(query)
                  ? "BGC area: within 1.5 km of Menarco Tower, plus explicit BGC addresses"
                  : "Search station, address, city, or province"
              }
              onChange={(e) => search(e.target.value)}
            />
            {query ? (
              <button aria-label="Clear search" onClick={() => search("")}>
                <X size={15} />
              </button>
            ) : (
              <span className="search-hint">PH</span>
            )}
          </label>
          <button className="export-button" onClick={download}>
            <ArrowDownToLine size={16} />
            <span>Export data</span>
          </button>
        </div>
        <div
          className="map-quickbar"
          aria-label="Quick connector filters"
          title={
            /\bbgc\b/i.test(query)
              ? "BGC area: within 1.5 km of Menarco Tower, plus explicit BGC addresses"
              : "Filter by documented connector type"
          }
        >
          <span className="quickbar-label">
            <PlugZap size={13} /> CONNECTOR
          </span>
          {[
            ["CCS2", "CCS Type 2"],
            ["Type 2", "Type 2 (AC)"],
            ["GB/T", "GB/T"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-label={`Filter ${label}`}
              aria-pressed={plugs.includes(value)}
              className={cn("quick-badge", plugs.includes(value) && "active")}
              onClick={() => toggle(value, plugs, setPlugs)}
            >
              <PlugZap size={13} />
              {label}
              <span>
                {
                  stations.filter((s) =>
                    s.connections.some((c) => standard(c.title) === value),
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <button
          className="mobile-filter-button"
          onClick={() => setMobileOpen(true)}
        >
          <SlidersHorizontal size={16} />
          Analytics & filters{activeCount > 0 && <span>{activeCount}</span>}
        </button>
        {/\bbgc\b/i.test(query) && <p className="search-area-note">BGC area · approx. 1.5 km around Menarco Tower</p>}
        <div className="nearest-panel" aria-live="polite" aria-atomic="true">
          {locating && (
            <div className="location-notice">
              <LoaderCircle className="loading-spin" size={16} />
              Locating you…
            </div>
          )}
          {locationError && (
            <div className="location-notice location-error">
              <p>{locationError}</p>
              <button
                className="icon-button"
                aria-label="Dismiss location message"
                onClick={() => setLocationError("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {userLocation && !locating && (
            <div className="nearest-card">
              <div className="nearest-label">
                <Navigation size={13} />{" "}
                {activeCount || query
                  ? "NEAREST MATCHING CHARGER"
                  : "NEAREST CHARGER"}
                <button
                  aria-label="Clear my location"
                  onClick={() => {
                    setUserLocation(null);
                    setSelectedId(null);
                    setLocationError("");
                    setViewMode("explore");
                  }}
                >
                  <X size={15} />
                </button>
              </div>
              {nearest ? (
                <button
                  className="nearest-result"
                  onClick={() => select(nearest.station)}
                >
                  <span>
                    <strong>{nearest.station.title}</strong>
                    <small>
                      {nearest.station.town || nearest.station.state}
                    </small>
                  </span>
                  <b>
                    {formatDistance(nearest.distance)}
                    <ArrowUpRight size={15} />
                  </b>
                </button>
              ) : (
                <p className="nearest-no-match">
                  No stations match your filters. Clear filters to find the
                  nearest charger.
                </p>
              )}
              <div className="nearest-foot">
                Straight-line distance · GPS ±
                {Math.round(userLocation.accuracy)} m
              </div>
            </div>
          )}
        </div>
        <button
          className={cn("nearest-button", locating && "is-locating")}
          onClick={locate}
          disabled={locating}
          aria-label="Find nearest charger"
        >
          {locating ? (
            <LoaderCircle className="loading-spin" size={16} />
          ) : (
            <Crosshair size={16} />
          )}
          <span>{locating ? "Locating…" : "Find nearest charger"}</span>
        </button>
        <div className="map-bottom">
          <div className="map-status" role="status">
            <span className="live-dot" />
            <strong>{filtered.length}</strong>
            <span>stations on the map</span>
            {filtered.length !== stations.length && (
              <button onClick={reset}>
                Clear filters <X size={12} />
              </button>
            )}
          </div>
          <button
            className="reset-map"
            onClick={() => {
              setSelectedId(null);
              setViewMode("reset");
              setResetKey((v) => v + 1);
            }}
          >
            <Globe2 size={15} />
            Philippines view
          </button>
        </div>
        <div className="map-legend">
          <span className="legend-title">CHARGING NETWORK</span>
          <span>
            <i className="fast-dot" />
            DC fast
          </span>
          <span>
            <i className="ac-dot" />
            Standard / other
          </span>
        </div>
        {!filtered.length && (
          <div className="empty-map">
            <Search size={26} />
            <h3>No stations found</h3>
            <p>Try another location or adjust your filters.</p>
            <button onClick={reset}>Reset all filters</button>
          </div>
        )}
        <div className="map-coordinate">
          12.8797° N &nbsp; 121.7740° E <span> / </span> PHILIPPINES
        </div>
      </div>
      {about && (
        <div className="modal-backdrop" onClick={() => setAbout(false)}>
          <section
            ref={aboutRef}
            className="about-modal"
            role="dialog"
            aria-modal="true"
            aria-label="About the data"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setAbout(false);
            }}
          >
            <button
              autoFocus
              className="modal-close icon-button"
              aria-label="Close about the data"
              onClick={() => setAbout(false)}
            >
              <X size={20} />
            </button>
            <div className="eyebrow">BEHIND THE MAP</div>
            <h2>
              Infrastructure.
              <br />
              <span>In perspective.</span>
            </h2>
            <p>
              ChargePH visualizes {stations.length} Philippine station records
              from the local Open Charge Map dataset. This is a snapshot, not a
              live availability service.
            </p>
            <p>
              Operator and connector names are unspecified in the supplied data.
              DC fast charging follows the dataset’s classification (at least 50
              kW). Station records may overlap, and power ratings do not
              guarantee availability or access.
            </p>
            <a
              href="https://openchargemap.org/site"
              target="_blank"
              rel="noopener noreferrer"
            >
              Explore Open Charge Map <ArrowUpRight size={16} />
            </a>
            <button className="modal-done" onClick={() => setAbout(false)}>
              Back to the explorer
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
