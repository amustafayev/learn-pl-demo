import './patchH5pServerBugs.js';
import path from 'path';
import express from 'express';
import fileUpload from 'express-fileupload';
import {
  h5pAjaxExpressRouter,
  libraryAdministrationExpressRouter,
  contentTypeCacheExpressRouter,
} from '@lumieducation/h5p-express';
import * as H5P from '@lumieducation/h5p-server';

import createH5PEditor from './createH5PEditor.js';
import createTranslationCallback from './translations.js';
import contentRoutes from './routes.js';

// Minimal real H5P backend for the prototype's Interactive (H5P) block.
//
// Trimmed from @lumieducation/h5p-server's own example server: no
// login/session/CSRF (this whole app has no real backend auth yet — see
// project notes), one hardcoded anonymous "teacher" user for every
// request, filesystem storage only. This is a dev-only mock of the real
// backend the architecture calls for, not a production H5P deployment —
// see the "not done yet" list at the bottom of this file before exposing
// this beyond localhost.
async function start() {
  const translationCallback = await createTranslationCallback();

  const config = await new H5P.H5PConfig(
    new H5P.fsImplementations.JsonStorage(path.resolve('config.json')),
  ).load();

  // @lumieducation/h5p-server@10.0.4 (latest on npm) hardcodes coreApiVersion
  // at 1.27 — H5PConfig.load() doesn't even restore it from config.json, so
  // it can't be fixed there. But the live H5P Hub now serves content types
  // (Multiple Choice, Question Set, ...) that declare 1.28, so every real
  // install fails "api-version-unsupported" unless we bump this. The actual
  // core/editor JS this server serves (download-assets.sh, pulling from
  // upstream's master branch) genuinely does declare 1.28, so this reflects
  // real capability, not just silencing a check. Remove once h5p-server
  // ships a version with a newer default.
  config.coreApiVersion = { major: 1, minor: 28 };

  // Retint H5P's editor/player chrome to match this app's design tokens —
  // see h5p-custom/theme.css for what's covered and why. This is H5P's own
  // supported override mechanism (config.customization.global.*.styles),
  // not a fork of any vendored file.
  config.customization = {
    ...config.customization,
    global: {
      ...config.customization?.global,
      editor: { ...config.customization?.global?.editor, styles: ['/h5p-custom/theme.css'] },
      player: { ...config.customization?.global?.player, styles: ['/h5p-custom/theme.css'] },
    },
  };

  const urlGenerator = new H5P.UrlGenerator(config);

  const { h5pEditor, permissionSystem } = await createH5PEditor(
    config,
    urlGenerator,
    path.resolve('h5p/libraries'),
    path.resolve('h5p/content'),
    path.resolve('h5p/temporary-storage'),
    path.resolve('h5p/user-data'),
    translationCallback,
  );
  h5pEditor.setRenderer((model) => model);

  const h5pPlayer = new H5P.H5PPlayer(
    h5pEditor.libraryStorage,
    h5pEditor.contentStorage,
    config,
    undefined,
    urlGenerator,
    undefined,
    { permissionSystem },
    h5pEditor.contentUserDataStorage,
  );
  h5pPlayer.setRenderer((model) => model);

  const server = express();
  server.use(express.json({ limit: '500mb' }));
  server.use(express.urlencoded({ extended: true }));
  server.use(fileUpload({ limits: { fileSize: h5pEditor.config.maxTotalSize } }));

  // No real login yet — every request acts as the same anonymous teacher.
  // Swap this for real auth once the app has any (see CLAUDE.md's data
  // layer notes: db/apiClient.js is the seam for that on the frontend).
  server.use((req, res, next) => {
    req.user = { id: 'demo-teacher', name: 'Demo Teacher', type: 'local' };
    req.language = 'en';
    next();
  });

  // Serves h5p-custom/theme.css, referenced above.
  server.use('/h5p-custom', express.static(path.resolve('h5p-custom')));

  server.use(
    config.baseUrl,
    h5pAjaxExpressRouter(
      h5pEditor,
      path.resolve('h5p/core'),
      path.resolve('h5p/editor'),
    ),
  );
  server.use(config.baseUrl, contentRoutes(h5pEditor, h5pPlayer));
  server.use(
    `${config.baseUrl}/libraries`,
    libraryAdministrationExpressRouter(h5pEditor),
  );
  server.use(
    `${config.baseUrl}/content-type-cache`,
    contentTypeCacheExpressRouter(h5pEditor.contentTypeCache),
  );

  const port = process.env.PORT || 8080;
  server.listen(port, () => {
    console.log(`H5P server listening on http://localhost:${port}${config.baseUrl}`);
  });
}

start().catch((error) => {
  console.error('Failed to start H5P server:', error);
  process.exit(1);
});

/* Not done yet, deliberately out of scope for this mock:
   - Real authentication/sessions (one hardcoded user for everyone)
   - CSRF protection (fine for local-only dev use, not for a public deploy)
   - Mongo/S3 storage (see h5p-mongos3 package for the upgrade path)
   - .h5p package download/export endpoint */
