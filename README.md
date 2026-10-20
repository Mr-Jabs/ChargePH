# ChargePH

An interactive Philippine EV charging infrastructure dashboard built with Next.js App Router, TypeScript, Tailwind CSS, React Leaflet, and CARTO Dark Matter.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. Production: `npm run build` then `npm start`. Checks: `npm run lint` and `npm run typecheck`.

## Neon controls and spatial search

- Choose Emerald Matrix (default, `#10B981`), Cyberpunk Pink (`#FF007F`), or Electric Cyan (`#00F0FF`) in the header. Marker SVGs, connector highlights, focus states, and glow borders share the selected palette. Theme selection lasts for the current page session.
- The analytics sidebar stays open on desktop. Mobile uses the analytics drawer with a close control so the map stays accessible. Map resizing preserves its geographic center; reduced-motion preferences disable animated map flights.
- Search by name, address, city, or province. Results filter immediately, and the viewport fits matching stations after a short typing pause. `BGC` matches explicit Bonifacio Global City/Fort Bonifacio addresses plus Taguig stations within 1.5 km of the supplied Menarco Tower coordinate. This is an approximate neighborhood search, not an official boundary; it excludes other Taguig areas such as Arca South. Menarco Tower's BGC location is documented by [BCG's Manila office](https://www.bcg.com/ja-jp/offices/manila).
- “Find nearest charger” requests location only when clicked. It adds a “You are here” marker, an accuracy circle, a highlighted nearest **matching** station, and a dashed straight-line connection. The result card shows distance in meters or kilometers and GPS accuracy. Search and plug/operator/DC filters constrain the candidates; clearing location removes its map overlays. Permission denial, timeout, unavailable GPS, and empty matches have explicit states. Distances are great-circle distances, not driving distance or travel time.
- CCS Type 2, Type 2 (AC), and GB/T quick badges share state with the sidebar's connector filters. Their counts show documented connectors in the full snapshot. The refreshed snapshot includes documented connector types. Missing plug information stays unknown; charger power is not used to guess plug compatibility.

`npm test` runs seven spatial-search and GPS tests, including nearest-candidate selection, distance calculation, BGC matching, successful location handling, denial, timeout, and unsupported browsers. The test command uses Node.js TypeScript stripping (Node 22.6+).

## Data and interaction

The dashboard imports `data/ph_stations.json` through `@/data/ph_stations.json`. The original ingestion script and data are preserved. Search by station, address, town, or province; combine operator, connector, and DC filters; select station list entries or map markers for details and Google Maps directions. Export downloads the filtered records as JSON. Location requires browser permission and a secure context (localhost is supported).

The current snapshot has 250 records with operator and connector details where supplied. Counts describe charging stations in the current dataset, not a national total. The ingestion request uses `maxresults=250`; because the saved snapshot reaches that limit, additional API records may have been omitted. National coverage is not verified. Missing operator and connector values remain unknown; no values are inferred from station names. Summary metrics follow the current filters; the operator ranking describes the full snapshot. DC classification follows the supplied `is_dc_fast` field, set by ingestion at 50 kW or above, rather than a verified connector specification. Counts represent records, which can include nearby or duplicate entries. This is not real-time charger availability.

The ingestion script requests expanded Open Charge Map responses (`compact=false`) so reference titles can be retained. It warns when the API returns the requested limit. HTTP errors, invalid/empty responses, and an absence of valid coordinates preserve the existing dataset; a successful export replaces it atomically. The request limit is a snapshot setting, not an asserted API maximum. `ingest.py` uses the local API credential from `.env`; credentials are never exposed to the client.

Map tiles require internet access. CARTO now requires a basemap API key (https://www.carto.com/basemaps/apikey/). Add `NEXT_PUBLIC_CARTO_API_KEY` to `.env.local` and restart the dev server (or rebuild production) to use the requested CARTO Dark Matter tile URL. This key is browser-visible; restrict its allowed domains. Without the key, ChargePH uses OpenStreetMap tiles with a dark CSS treatment. Both providers retain visible attribution. DM Sans and Space Grotesk load through Google Fonts with sans-serif fallbacks.

## Dependency audit

The initial npm registry audit reports five high-severity findings in the development-only ESLint/fast-glob/micromatch/braces dependency chain. npm proposes downgrading the Next.js ESLint configuration across major versions, so that change was not applied. Production dependencies are checked separately with npm audit --omit=dev. Review patched releases before using this tooling with untrusted glob patterns.

Ingestion checks (mocked API, no network calls): `python -m unittest discover -s tests -p test_ingest.py`.

