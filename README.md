# ShiftPilot

A private, voice-first shift planner built for fast daily use on a phone.

## First release

- Morning, mid, and night shift planning
- Available labor-hours and workload capacity by shift
- Truck Day mode
- Automatic morning Bookwork and Smart Counts routine
- Bookwork assigned to Loretta and excluded from workload on Truck Day
- Daily Walk checklist for every shift
- Coffee and fountain checks for cups, lids, and straws
- Separate BIB checklist
- Food warmer, stock gap, safety, and handoff checks
- One-tap voice task entry with manual fallback
- Shift handoff sharing
- Daily completion report for Loretta
- Extra completed items added by voice or text
- 30-day history
- Local device storage with no login
- Backup and restore
- Installable PWA manifest
- Large shift-completion confetti and smaller milestone celebrations

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

For Cloudflare Pages, use `npm run build` as the build command and `dist` as the output directory.
