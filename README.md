# VOICE — Hazardous Substances Finder

Production-ready Next.js 14 application replicating [Dräger's VOICE substance
database](https://www.draeger.com/en-us_us/Substances). Search 9,400+ chemicals
by name, CAS number, or formula and get:

- CAS / UN / EC / Hazard ID identifiers
- GHS hazard pictograms (GHS01–GHS09)
- Occupational exposure limits (OSHA PEL, NIOSH REL, ACGIH TLV, IDLH) in ppm
  and mg/m³
- H-statements (hazard phrases) with full UN GHS Rev. 9 text
- P-statements (precautionary phrases) with full CLP Annex IV text
- Physical/chemical properties (BP, FP, LEL, UEL, density, ignition temp…)
- Synonyms (including trade names and IUPAC variants)
- Recommended PPE product categories (tubes, masks, PAPR, suits, SCBA)

## Tech stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui primitives + lucide-react icons
- **DB**: PostgreSQL via Prisma 6
- **Cache**: Upstash Redis REST (with in-memory fallback for local dev)
- **Data**: PubChem REST API + curated CAS list (NIOSH Pocket Guide seed)
- **Deploy**: Railway (Nixpacks builder)

## Quick start

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env
# Edit DATABASE_URL. Optionally add UPSTASH_REDIS_REST_URL / TOKEN.

# 3. Run a local Postgres (docker)
docker run -d --name voice-pg \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=voice \
  postgres:16

# 4. Apply schema
npm run db:push

# 5. Seed ~100 chemicals (pulls GHS + synonyms from PubChem; ~90s total)
npm run seed

# 6. Dev server
npm run dev
# open http://localhost:3000/substances
```

## Architecture

```
src/
├── app/
│   ├── substances/              # /substances (search) and /substances/[id]
│   ├── api/
│   │   ├── substances/
│   │   │   ├── search/          # GET ?q=... → local DB full-text
│   │   │   ├── [id]/            # GET → full substance object
│   │   │   ├── by-cas/[cas]/    # GET → lookup by CAS
│   │   │   └── enrich/[id]/     # POST → refresh from PubChem
│   │   └── pubchem/autocomplete # Proxied autocomplete fallback
│   └── about/                   # About page
├── components/
│   ├── substance-search.tsx     # Debounced autocomplete (300ms)
│   ├── ghs-grid.tsx             # 9-pictogram grid, dim inactive
│   ├── limits-table.tsx         # Pivoted exposure-limit table
│   └── product-suggestions.tsx  # Category-tabbed PPE products
└── lib/
    ├── prisma.ts                # Prisma singleton
    ├── cache.ts                 # Upstash Redis + in-memory fallback
    ├── pubchem.ts               # Typed PubChem client (all responses cached 24h)
    ├── ghs-parser.ts            # Extract pictograms/H-codes/P-codes from PUG-View
    ├── statements.ts            # UN GHS / EU CLP canonical H & P texts
    ├── ghs.ts                   # Pictogram metadata (names + SVG URLs)
    ├── ppe.ts                   # PPE recommendation rules
    ├── products.ts              # Dräger product catalog (static)
    ├── substance-query.ts       # Canonical "full substance" query
    └── enrich.ts                # PubChem → DB enrichment pipeline
```

## PubChem caching

Every PubChem response is cached in Redis under
`pubchem:<cid-or-query>:<endpoint>` for 24 hours. When Upstash is not
configured the app silently falls back to an in-process Map (sufficient for
local development).

Rate limit: the seed script throttles to ≤ 2 substances/sec (well inside
PubChem's 5 req/s quota across the 3 calls per substance).

## PPE recommendation logic

Implemented in `src/lib/ppe.ts`:

- `tubes` — anything with BP < 150 °C or a published LEL
- `masks_and_filters` + `filtering_escape_devices` — toxic, irritant or
  corrosive (GHS05/06/07/08)
- `papr` — toxic or corrosive
- `suits` — corrosive, or systemic health hazard (GHS05 or GHS08)
- `scba` — IDLH < 100 ppm

## Deploying to Railway

1. Create a new Railway project, add a Postgres plugin.
2. Add an Upstash Redis plugin (or create one manually and copy the REST URL + token).
3. Set env vars:
   - `DATABASE_URL` (auto-populated by the Postgres plugin)
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Connect this repo. The `railway.json` configures Nixpacks to run
   `prisma migrate deploy` during build.
5. After first deploy, run `npm run seed` via a Railway one-off:
   ```bash
   railway run npm run seed
   ```

## Seeding more substances

The seed list (`prisma/seed-data.ts`) is a curated 100 entries. To scale to
9,400+ entries:

1. Download the IFA GESTIS CAS list (XLSX).
2. Convert to the `SeedSubstance` shape (you only need `name` + `casNumber`).
3. Run `npm run seed` — PubChem enrichment fills in everything else.

Expect ~45 minutes for a full 9,400-substance seed due to PubChem rate limits.

## Disclaimer

This replica is for educational and demonstration purposes. Always consult
the manufacturer's SDS and a qualified industrial hygienist before selecting
respiratory or chemical protective equipment.
