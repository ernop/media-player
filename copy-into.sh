#!/bin/sh
# Copies the player into a project folder: media-player.js, media-player.css, and
# media-player.sha256 with their checksums. The project's tests compare the copy with the
# checksums, so a copy edited in place fails them; change the player here, then copy it again.
#
#   ./copy-into.sh ~/proj/some-project/static/media-player
set -eu

if [ "$#" -ne 1 ]; then
    echo "usage: $0 <folder in the project>" >&2
    exit 2
fi

here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$1"
cp "$here/web/media-player.js" "$here/web/media-player.css" "$1/"
cd "$1"
sha256sum media-player.js media-player.css > media-player.sha256
version=$(sed -n "s/^ *const VERSION = '\([^']*\)';.*/\1/p" media-player.js)
echo "media-player $version copied into $(pwd)"
