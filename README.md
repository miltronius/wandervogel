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
   VITE_ORS_API_KEY=your-key-here
   ```

3. Restart `npm run dev`.

**Note:** this is a static frontend with no backend, so the key ships in the
browser bundle and is visible in network requests. That's fine for personal
use on the free tier, but don't treat it as a secret if you deploy this
publicly — anyone with the URL could spend your daily quota. A small
server-side proxy would be the next step to harden this.

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
