import { createRequire } from 'module';
import path from 'path';
import i18next from 'i18next';
import i18nextFsBackend from 'i18next-fs-backend';

const require = createRequire(import.meta.url);

// h5p-server ships its own translation JSON files for the editor/player UI
// strings (namespaced like i18next: "client:save", "hub:title", ...). We
// reuse them directly instead of writing our own copy. English only for
// now — add languages to `preload` below if you need more.
const h5pServerDir = path.dirname(
  require.resolve('@lumieducation/h5p-server/package.json'),
);

export default async function createTranslationCallback() {
  await i18next.use(i18nextFsBackend).init({
    backend: {
      loadPath: path.join(
        h5pServerDir,
        'build/assets/translations/{{ns}}/{{lng}}.json',
      ),
    },
    defaultNS: 'server',
    fallbackLng: 'en',
    lng: 'en',
    ns: [
      'client',
      'copyright-semantics',
      'hub',
      'library-metadata',
      'metadata-semantics',
      'server',
      'storage-file-implementations',
    ],
    preload: ['en'],
  });

  return (key, language) => i18next.t(key, { lng: language || 'en' });
}
