# ShiftPilot

A private, voice-first shift planner built for fast daily use on a phone.

## Guided Command Center release

- One clear **Plan My Shift** entry point instead of multiple floating tools
- Live clock-out planning with current time remaining
- Automatic ahead/behind status
- Exact start, finish, and allotted minutes for remaining tasks
- Full-screen Focus Mode with countdown, pause, complete, skip, and interruption controls
- Interruption tracking for register backup, customers, vendors, employees, calls, cleanup, and custom events
- Learned task timing based on actual Focus Mode completion history
- Voice commands to add tasks, complete work, move tasks, add handoff items, and set clock-out
- Stronger visual hierarchy with a large current-task card and compact upcoming tasks
- Morning, mid, and night shift planning
- Truck Day mode
- Automatic morning Bookwork and Smart Counts routine
- Bookwork assigned to Loretta and excluded from workload on Truck Day
- Daily Walk checklist for every shift
- Coffee and fountain checks for cups, lids, and straws
- Separate BIB checklist
- Food warmer, stock gap, safety, and handoff checks
- Shift handoff sharing
- Daily completion report for Loretta
- 30-day history and learned pace history
- Local device storage with no login
- Backup and restore including preferences and learned times
- Installable PWA with offline app-shell caching
- Large shift-completion confetti

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

For Cloudflare, use `npm run build` as the build command and `dist` as the output directory.
