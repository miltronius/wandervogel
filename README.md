# wandervogel

Schweizer Wandervogel — Schweizer Hike Planner (React 19 + Vite + TypeScript + Tailwind v4).

## Setup

```sh
npm install
npm run dev
```

## Route planner (OpenRouteService)

The "Planen" tab snaps user-drawn waypoints to real hiking trails via
[OpenRouteService](https://openrouteservice.org/)'s `foot-hiking` profile.
This requires a free API key:

1. Sign up at [openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup) and create a token.
2. Copy `.env.example` to `.env.local` and paste the key:

   ```sh
   ORS_API_KEY=your-key-here
   ```

3. Restart `npm run dev`.

The key is deliberately **not** prefixed with `VITE_`, so Vite never inlines
it into the browser bundle. The browser only ever talks to this app's own
`/api/route` endpoint:

- In production (Vercel), `api/route.ts` is a serverless function that reads
  `ORS_API_KEY` from Vercel's environment variables (Project → Settings →
  Environment Variables — same key, same name) and forwards the request to
  ORS server-side.
- In local dev, a Vite middleware (`vite.config.ts`) does the same thing so
  `npm run dev` works without the Vercel CLI.

Both share the same logic (`api/_lib/orsProxy.ts`), so there's one place to
change if the routing engine or profile ever changes.

### Enriching the curated hikes with real trail data

`scripts/enrich-hikes.mjs` re-routes the 9 curated hikes in
`src/data/hikes.ts` (whose `route` arrays started out as rough straight-line
guesses) through the same ORS profile, so Discover also shows real,
trail-snapped distances/ascent. Run once you have a key:

```sh
ORS_API_KEY=your-key-here node scripts/enrich-hikes.mjs
```

It prints a before/after report per hike; the real numbers then get merged
into `hikes.ts` by hand (some alpine routes have off-trail sections ORS can't
match, which need a manual `routeNotice` caveat rather than a silent
overwrite).
