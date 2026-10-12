# H5P backend

Real `@lumieducation/h5p-server` + `@lumieducation/h5p-express`, powering the
app's **Interactive (H5P)** block. Filesystem storage only, one hardcoded
anonymous user, no CSRF — a dev-only mock of the real backend, not a
production deployment. See `src/index.js`'s trailing comment for what's
deliberately left out.

## First-time setup

```
cd server
npm install
bash download-assets.sh   # pulls H5P's real core/editor JS+CSS (~13MB, gitignored)
```

## Running

```
npm start                 # http://localhost:8080/h5p
npm run h5p               # the same, from the repo root
```

Then run the frontend as usual (`npm run dev` from the repo root) — Vite
proxies `/h5p` to this server (see `vite.config.js`), so nothing else needs
configuring. It has to be running for the **Interactive (H5P)** block to
work; `npm run dev` doesn't start it.

**Port 8080 must be free.** Many Java/Spring Boot apps (Tomcat's default)
take 8080 too; if one is running, `/h5p` requests reach it instead and the
editor says *"The H5P server isn't answering"*. Check with
`lsof -nP -iTCP:8080 -sTCP:LISTEN`, stop whatever holds it, then start this
server.

## Known upstream issues worked around here

`@lumieducation/h5p-server@10.0.4` (latest on npm) has real bugs/version-lag
that break every H5P Hub call, and content type installs, if left unpatched:

1. Its `ContentTypeCache.getLocalId()` sends the full un-truncated machine
   id as the Hub's `local_id` field, which the Hub rejects (422, "local id
   may not be greater than 15 characters"). Worked around via
   `H5PEditor`'s own `getLocalIdOverride` option — see `createH5PEditor.js`.
2. `ContentTypeCache.registerOrGetUuid()` only accepts an HTTP 200 from the
   Hub's registration endpoint, but the Hub actually replies `201 Created`
   on success — every fresh registration fails. Patched directly (no
   extension point exists for this one) in `patchH5pServerBugs.js`.
3. `H5PConfig`'s `coreApiVersion` is hardcoded to 1.27 and isn't even one of
   the settings `load()` restores from `config.json` — but the live H5P Hub
   now serves content types (Multiple Choice, Question Set, ...) that
   declare 1.28, so every real install fails "api-version-unsupported".
   Bumped via a direct instance override in `src/index.js`, right after
   `config` loads — matches the actual core/editor assets this server
   serves, since `download-assets.sh` pulls from upstream's `master` (which
   declares 1.28), not the older commits h5p-server's own example pins.

Remove all three once a fixed/caught-up `h5p-server` version ships.
