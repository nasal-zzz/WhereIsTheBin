# WhereIsTheBin

Bilingual (English + Malayalam) website to find public bins and authorised waste facilities in Kerala, India. Pilot area: Nilambur. Full product spec: `docs/WhereIsTheBin_Project_Blueprint_EN_ML.docx` (read it before big features; it is the source of truth).

## Stack
Node.js 24, Express, EJS (server-rendered), MongoDB + Mongoose (local, port 27017), express-session + connect-mongo, bcryptjs, helmet, express-rate-limit, Leaflet (served from node_modules at /vendor/leaflet), OpenStreetMap tiles, Nominatim geocoding proxied through our server.

## Run
- `npm run dev` (node --watch), `npm test` (node --test), `npm run seed:demo` (8 fictional DEMO facilities near Nilambur; `-- --clear` removes them), `npm run set-role -- <email> <user|moderator|admin|super-admin>`
- `.env` keys: NODE_ENV, PORT, MONGODB_URI, SESSION_SECRET, NOMINATIM_USER_AGENT (real contact email required or Nominatim returns 403). Never print or commit `.env`.
- Developer is on Windows + PowerShell, VS Code.

## Non-negotiable rules
1. Every user-visible string goes in BOTH `locales/en.json` and `locales/ml.json` (keys used through `t('key')`). `tests/i18n.test.js` enforces identical keys. Malayalam must be natural, not literal; flag new Malayalam text for native-speaker review.
2. Only facilities with `verificationStatus: 'verified'` AND `accessType: 'public'` appear in public results. Community submissions are always created as `pending`. Never show unverified data as verified.
3. Demo data is always labelled DEMO (isDemo flag, badge, banner). Never invent real locations.
4. Location is only requested on a user click and is never stored.
5. Security: CSRF token on every POST form (`<input name="_csrf" value="<%= csrfToken() %>">`), escape all output (`<%=`, never `<%-` for user data), validate input server-side, rate-limit auth and submissions, role checks with `requireRole`. CSP is strict (`script-src 'self'`): NO inline scripts or inline event handlers; put JS in `public/js/`. New external hosts must be added to the CSP in `app.js` deliberately.
6. Accessibility: labelled form fields, keyboard operable, visible focus, never colour alone for status (use text/icons), works at mobile width.
7. Do not add paid services or new heavy dependencies without explaining cost/tradeoffs and asking first. Photo upload (Cloudinary) is deferred until the developer creates an account.
8. WhereIsTheBin is an information service, not a waste-collection agency. Keep wording honest about uncertainty (last-verified dates, "may be out of date").

## Conventions
- Layers: routes -> controllers -> services -> models. Controllers in `controllers/web`, `controllers/api`, `controllers/admin`. JSON API under `/api/v1` returns `{ success, data | error:{code} }`.
- Views: EJS partials `head`, `header`, `footer`, `messages` (flash + errors). Flash messages are stored as i18n keys in `req.session.flash`. Validation errors are i18n keys (`err.*`).
- Styling: one stylesheet `public/css/main.css`, light theme, CSS variables (green #15803D, ink #102B20, tint #EAF5EE). Assets are cache-busted with `assetVersion`.
- Facility types and waste categories live in `utils/constants.js`.
- OSM tiles need a Referer header, so helmet's `referrerPolicy` is `strict-origin-when-cross-origin` (do not change).
- connect-mongo v6 exports the store under `.default`; `middleware/session.js` handles this.
- After any change: run `npm test`, start the server, and click through the affected pages in both languages.
- The developer prefers short explanations, and complete working files over fragments.

## Status
Done: Sprint 1 foundation; Sprint 2 map (nearby API with 2dsphere, filters, place search, DEMO seed); Sprint 3 accounts (sessions, CSRF), Add a bin with map pin + 50 m duplicate warning, My contributions; Sprint 4 moderation (roles via `npm run set-role`, pending queue, approve/reject with reason, atomic decisions, AuditLog, /admin/audit); Sprint 5 facility detail page `/facility/:id`, in-site walking directions (server proxy `/api/v1/route` -> FOSSGIS OSRM `routed-foot`, live navigation in `public/js/facility.js`), "Report a problem" (Report model, one open report per user/facility/type), moderator report queue `/admin/reports` (confirm applies an effect: full/damaged -> operationalStatus, missing -> archived, wrong-location -> back to pending; moderators can reset a condition to available).
Query strings are never logged (they can hold coordinates). Free public services in use (Nominatim, FOSSGIS routing, OSM tiles) are for development only and must be replaced before public launch.

## Known gaps / next
- Moderators cannot edit a facility or restore an archived one; "wrong location" reports cannot be fixed in the UI yet.
- Moderators can review their own submissions (block this before real moderators join).
- No privacy/about pages yet. No PWA. No photo upload (needs the developer's Cloudinary account; explain cost first).
- Launch prep: HTTPS hosting, MongoDB Atlas + backups, production geocoder/routing/tiles, native-speaker review of all Malayalam text.