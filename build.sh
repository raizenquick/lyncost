#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"

echo "==> Checking required build tools..."
MISSING=""
for tool in gcc pkg-config; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        MISSING="$MISSING $tool"
    fi
done

if [ -n "$MISSING" ]; then
    echo "Error: Missing required build dependencies:$MISSING"
    echo "Please install them first with:"
    echo "  sudo dnf install -y gcc gcc-c++ webkit2gtk4.1-devel gtk3-devel openssl-devel libsoup3-devel"
    exit 1
fi

if ! pkg-config --exists webkit2gtk-4.1 gtk+-3.0; then
    echo "Error: Missing WebKitGTK / GTK3 development headers."
    echo "Please install them with:"
    echo "  sudo dnf install -y webkit2gtk4.1-devel gtk3-devel openssl-devel libsoup3-devel"
    exit 1
fi

echo "==> Building frontend assets and native binary..."
cd "$ROOT_DIR"
npm run release

echo "==> Creating release distribution packages..."
bash packaging/build_packages.sh

echo "==> Installing Lyncost locally..."
bash install.sh

echo ""
echo "✨ Lyncost build & installation completed successfully!"
echo "Launch it via terminal: lyncost"
echo "Or search for 'Lyncost' in your application menu."
