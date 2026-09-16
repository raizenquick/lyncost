#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$ROOT_DIR/src-tauri/target/release/lyncost"
DIST="$ROOT_DIR/dist-packages"
PKG_DIR="$ROOT_DIR/packaging"
VERSION="$(grep '"version":' "$ROOT_DIR/package.json" | head -n 1 | awk -F '"' '{print $4}')"

if [ ! -f "$BIN" ]; then
    echo "Binary $BIN not found! Run npm run release first."
    exit 1
fi

mkdir -p "$DIST"

echo "==> Packaging Universal Portable Tarball with Installer for v$VERSION..."
TAR_STAGING="$PKG_DIR/tarball_staging/lyncost-$VERSION"
rm -rf "$PKG_DIR/tarball_staging"
mkdir -p "$TAR_STAGING"

cp "$BIN" "$TAR_STAGING/lyncost"
chmod +x "$TAR_STAGING/lyncost"
cp "$PKG_DIR/lyncost.desktop" "$TAR_STAGING/"
cp "$ROOT_DIR/src-tauri/icons/icon.png" "$TAR_STAGING/lyncost.png"
cp "$ROOT_DIR/LICENSE" "$TAR_STAGING/"

cp "$ROOT_DIR/install.sh" "$TAR_STAGING/install.sh"
cp "$ROOT_DIR/uninstall.sh" "$TAR_STAGING/uninstall.sh"
chmod +x "$TAR_STAGING/install.sh" "$TAR_STAGING/uninstall.sh"

cat << README_EOF > "$TAR_STAGING/README.txt"
Lyncost — Personal Finance & Investments (v$VERSION)
==================================================

Lyncost is a 100% offline, privacy-first personal finance tracker for Linux.

QUICK START:
  To run immediately without installing:
    ./lyncost

PERMANENT INSTALL (User-level, no sudo required):
    ./install.sh

UNINSTALL:
    ./uninstall.sh
README_EOF

tar -czf "$DIST/lyncost-${VERSION}-linux-x86_64.tar.gz" -C "$PKG_DIR/tarball_staging" "lyncost-$VERSION"
rm -rf "$PKG_DIR/tarball_staging"

cd "$DIST"
NEW_SUM=$(sha256sum "lyncost-${VERSION}-linux-x86_64.tar.gz")
if [ -f SHA256SUMS ]; then
    grep -v "lyncost-${VERSION}-linux-x86_64.tar.gz" SHA256SUMS > SHA256SUMS.tmp || true
    echo "$NEW_SUM" | cat - SHA256SUMS.tmp > SHA256SUMS
    rm -f SHA256SUMS.tmp
else
    echo "$NEW_SUM" > SHA256SUMS
fi
cat SHA256SUMS

echo "==> Distribution package ready!"
ls -lh "$DIST"
