#!/usr/bin/env bash
# Downloads the real H5P core + editor client assets (the "blue" boxes in
# lumieducation's architecture diagram — the original H5P player/editor
# JS+CSS, from the official PHP repos). These are NOT npm packages and
# can't be committed to this repo as vendored source, so this script pulls
# them once into ./h5p/core and ./h5p/editor (gitignored).
#
# NOTE: @lumieducation/h5p-server v10.0.4's own example pins the commits
# below, but those declare core API 1.27 — too old for content types the
# live H5P Hub currently serves (they need 1.28), so every install fails
# with "api-version-unsupported". Using "master" instead, which declares
# 1.28 (matches config.json's coreApiVersion override in createH5PEditor
# setup) — re-pin to a specific commit once h5p-server ships a version
# whose own default coreApiVersion has caught up.
set -euo pipefail
cd "$(dirname "$0")"

core_version=master
editor_version=master

mkdir -p h5p/tmp/core h5p/tmp/editor h5p/core h5p/editor h5p/libraries h5p/content h5p/temporary-storage h5p/user-data
rm -rf h5p/tmp/* h5p/core/* h5p/editor/*

echo "Downloading H5P core ($core_version)..."
curl -L "https://github.com/h5p/h5p-php-library/archive/$core_version.zip" -o h5p/tmp/core.zip
unzip -q -o h5p/tmp/core.zip -d h5p/tmp/core

echo "Downloading H5P editor ($editor_version)..."
curl -L "https://github.com/h5p/h5p-editor-php-library/archive/$editor_version.zip" -o h5p/tmp/editor.zip
unzip -q -o h5p/tmp/editor.zip -d h5p/tmp/editor

mv "h5p/tmp/core/h5p-php-library-$core_version"/* h5p/core/
mv "h5p/tmp/editor/h5p-editor-php-library-$editor_version"/* h5p/editor/
rm -rf h5p/tmp

echo "Done. H5P core/editor assets are in ./h5p/core and ./h5p/editor."
