import { ContentTypeCache } from '@lumieducation/h5p-server';

// @lumieducation/h5p-server 10.0.4 has a real bug: ContentTypeCache's
// registerOrGetUuid() rejects the H5P Hub's registration response unless
// its HTTP status is *exactly* 200 — but the Hub actually replies 201
// Created on success, so every fresh registration fails with
// "error-registering-at-hub (statusCode: 201, statusText: Created)".
// (The getLocalId() 15-char truncation bug from the same version is
// worked around separately via H5PEditor's own getLocalIdOverride option
// in createH5PEditor.js — this one has no such extension point, so it's
// patched directly here.)
//
// Confirmed against the installed package's compiled source
// (node_modules/@lumieducation/h5p-server/build/src/ContentTypeCache.js).
// Remove this file (and its one import in index.js) once a fixed version
// ships upstream.
ContentTypeCache.prototype.registerOrGetUuid = async function patchedRegisterOrGetUuid() {
  if (this.config.uuid && this.config.uuid !== '') {
    return this.config.uuid;
  }
  const response = await this.httpClient.post(
    this.config.hubRegistrationEndpoint,
    this.compileRegistrationData(),
  );
  if (!response.data || !response.data.uuid) {
    throw new Error('error-registering-at-hub-no-status');
  }
  this.config.uuid = response.data.uuid;
  await this.config.save();
  return this.config.uuid;
};
