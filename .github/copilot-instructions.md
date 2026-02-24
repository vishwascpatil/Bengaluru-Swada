# BengaluruSwada Copilot Instructions

## Project Overview
BengaluruSwada is a location-aware food discovery platform built with Angular (CLI v21), using Firebase for authentication/storage and Cloudflare R2 for video hosting. The app is structured for mobile and web, with Capacitor for native builds.

## Architecture & Key Components
- **src/app/**: Main Angular app. Features are organized by folder (e.g., `video-feed`, `upload-reel`, `profile`, `search`).
- **Routing**: See [src/app/app.routes.ts](src/app/app.routes.ts) for route definitions and guard usage.
- **Services**: Shared logic (e.g., [src/app/services/location.service.ts](src/app/services/location.service.ts)) is injected via Angular DI.
- **Cloudflare Worker**: Video upload/streaming logic is in [cloudflare-worker/src/index.ts](cloudflare-worker/src/index.ts). See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for R2 migration steps.
- **Environment Config**: [src/environments/environment.ts](src/environments/environment.ts) and [set-env.js](set-env.js) manage Firebase/Cloudflare credentials.
- **Transcoder**: [src/assets/transcoder/](src/assets/transcoder/) contains HLS transcoding logic and service worker for cross-origin isolation.

## Developer Workflows
- **Start Dev Server**: `ng serve` (see [README.md](README.md)).
- **Build**: `ng build` (outputs to `dist/`).
- **Unit Tests**: `ng test` (Karma).
- **E2E Tests**: `ng e2e` (custom framework required).
- **Cloudflare Worker**: Deploy with `npx wrangler deploy` from `cloudflare-worker/`.
- **Environment Setup**: Use [set-env.js](set-env.js) to generate environment files from `.env`.

## Patterns & Conventions
- **Component Structure**: Each feature has its own folder with `.ts`, `.html`, `.scss`, and `.spec.ts` files.
- **Guards**: Route access is controlled via `authGuard`, `noAuthGuard`, and `splashGuard`.
- **Location Handling**: [LocationService](src/app/services/location.service.ts) provides area data and user location, with a hard timeout and fallback.
- **Video Upload**: Videos are uploaded via Cloudflare Worker, with aggressive caching and CORS headers (see [cloudflare-worker/src/index.ts](cloudflare-worker/src/index.ts)).
- **Transcoder**: Uses FFmpeg via CDN in an isolated iframe ([src/assets/transcoder/index.html](src/assets/transcoder/index.html)).
- **Legal & Help Content**: Centralized in [src/app/legal/legal-content.ts](src/app/legal/legal-content.ts).

## Integration Points
- **Firebase**: Authentication, Firestore, and Storage (legacy, see [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)).
- **Cloudflare R2**: Video storage and streaming via Worker.
- **Capacitor**: Native builds configured in [capacitor.config.ts](capacitor.config.ts).

## Debugging & Troubleshooting
- **Build Errors**: See `build_error_full.txt` and `prod_build_log.txt` for logs.
- **Environment Issues**: Regenerate environment files if credentials change.
- **Video Issues**: Check Cloudflare Worker logs and CORS settings.

## Example: Adding a Feature
1. Generate a new component: `ng generate component feature-name`.
2. Add route in [app.routes.ts](src/app/app.routes.ts).
3. Implement service logic in [services/](src/app/services/).
4. Update environment config if needed.

---
For further details, see [README.md](README.md) and [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md).