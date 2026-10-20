# ChargePH

An interactive Philippine EV charging infrastructure dashboard built with Next.js App Router, TypeScript, Tailwind CSS, React Leaflet, and CARTO Dark Matter.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. Production: `npm run build` then `npm start`. Checks: `npm run lint` and `npm run typecheck`.

## Data and interaction

The dashboard imports `data/ph_stations.json` through `@/data/ph_stations.json`. The original ingestion script and data are preserved. Search by station, address, town, or province; combine operator, connector, and DC filters; select station list entries or map markers for details and Google Maps directions. Export downloads the filtered records as JSON. Location requires browser permission and a secure context (localhost is supported).

The supplied snapshot has 200 records, all with unspecified operators and connector types. These remain unknown; no operator or connector values are inferred from station names. Selecting a known connector therefore returns no results until enriched data is supplied. Summary metrics follow the current filters; the operator ranking describes the full snapshot. DC classification follows the supplied `is_dc_fast` field, set by ingestion at 50 kW or above, rather than a verified connector specification. Counts represent records, which can include nearby or duplicate entries. This is not real-time charger availability.

The existing ingestion script uses compact Open Charge Map responses. Those responses may omit reference titles; enrich reference IDs or request expanded responses before refreshing if operator/connector names are needed. `ingest.py` uses the local API credential from `.env`; credentials are never exposed to the client.

Map tiles require internet access. CARTO now requires a basemap API key (https://www.carto.com/basemaps/apikey/). Add `NEXT_PUBLIC_CARTO_API_KEY` to `.env.local` and restart the dev server (or rebuild production) to use the requested CARTO Dark Matter tile URL. This key is browser-visible; restrict its allowed domains. Without the key, ChargePH uses OpenStreetMap tiles with a dark CSS treatment. Both providers retain visible attribution. DM Sans and Space Grotesk load through Google Fonts with sans-serif fallbacks.

## Dependency audit

The initial npm registry audit reports five high-severity findings in the development-only ESLint/fast-glob/micromatch/braces dependency chain. npm proposes downgrading the Next.js ESLint configuration across major versions, so that change was not applied. Production dependencies are checked separately with npm audit --omit=dev. Review patched releases before using this tooling with untrusted glob patterns.
