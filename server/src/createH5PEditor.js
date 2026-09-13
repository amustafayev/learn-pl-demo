import * as H5P from '@lumieducation/h5p-server';

// Trimmed down from @lumieducation/h5p-server's own example server
// (packages/h5p-rest-example-server/src/createH5PEditor.ts): filesystem
// storage only (no Mongo/S3 — see project notes on the upgrade path),
// LaissezFairePermissionSystem (no real auth/roles yet — this backend has
// no login of its own), no virus scanning / SVG sanitizing. Swap pieces in
// here later; nothing above this file needs to change.
export default async function createH5PEditor(
  config,
  urlGenerator,
  localLibraryPath,
  localContentPath,
  localTemporaryPath,
  localContentUserDataPath,
  translationCallback,
) {
  const permissionSystem = new H5P.LaissezFairePermissionSystem();

  const contentUserDataStorage = new H5P.fsImplementations.FileContentUserDataStorage(
    localContentUserDataPath,
  );

  const h5pEditor = new H5P.H5PEditor(
    new H5P.fsImplementations.InMemoryStorage(),
    config,
    new H5P.fsImplementations.FileLibraryStorage(localLibraryPath),
    new H5P.fsImplementations.FileContentStorage(localContentPath),
    new H5P.fsImplementations.DirectoryTemporaryFileStorage(localTemporaryPath),
    translationCallback,
    urlGenerator,
    {
      enableHubLocalization: true,
      enableLibraryNameLocalization: true,
      permissionSystem,
      // Works around a real bug in @lumieducation/h5p-server 10.0.4: its
      // built-in getLocalId() sends the full (untruncated) machine id as
      // the Hub registration's `local_id` field, which the H5P Hub rejects
      // with 422 "local id may not be greater than 15 characters" — every
      // Hub call (registration AND content-type-cache fetch) fails until
      // this is overridden. Remove this once upstream ships the fix.
      getLocalIdOverride: () => 'lucid-prototype',
    },
    contentUserDataStorage,
  );

  return { h5pEditor, permissionSystem };
}
