#!/usr/bin/env bash
# ==============================================================================
# Lyncost One-Line Linux Installer
# https://github.com/raizenquick/lyncost
# ==============================================================================
set -e

# ANSI Colors & Styles
if [ -t 1 ]; then
    BOLD="\033[1m"
    DIM="\033[2m"
    RESET="\033[0m"
    PURPLE="\033[38;2;168;85;247m"
    ROYAL="\033[38;2;147;51;234m"
    DEEP_PURPLE="\033[38;2;124;58;237m"
    CYAN="\033[38;2;56;189;248m"
    GREEN="\033[38;2;34;197;94m"
    AMBER="\033[38;2;245;158;11m"
    WHITE="\033[1;37m"
else
    BOLD=""
    DIM=""
    RESET=""
    PURPLE=""
    ROYAL=""
    DEEP_PURPLE=""
    CYAN=""
    GREEN=""
    AMBER=""
    WHITE=""
fi

APP_NAME="lyncost"
DISPLAY_NAME="Lyncost"
GITHUB_REPO="raizenquick/lyncost"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
PIXMAP_DIR="$HOME/.local/share/pixmaps"

clear 2>/dev/null || true

echo -e "${ROYAL}${BOLD}"
cat << "BANNER"
  ██╗     ██╗   ██╗███╗   ██╗ ██████╗  ██████╗ ███████╗████████╗
  ██║     ╚██╗ ██╔╝████╗  ██║██╔════╝ ██╔═══██╗██╔════╝╚══██╔══╝
  ██║      ╚████╔╝ ██╔██╗ ██║██║      ██║   ██║███████╗   ██║   
  ██║       ╚██╔╝  ██║╚██╗██║██║      ██║   ██║╚════██║   ██║   
  ███████╗   ██║   ██║ ╚████║╚██████╗ ╚██████╔╝███████║   ██║   
  ╚══════╝   ╚═╝   ╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚══════╝   ╚═╝   
BANNER
echo -e "${RESET}"
echo -e " ${PURPLE}${BOLD}Personal Money & Investment Manager${RESET} ${DIM}• Native Linux Desktop (Offline & Private)${RESET}"
echo -e " ${DIM}Created by ${WHITE}raizenquick${RESET} ${DIM}• GPL-3.0 Open Source${RESET}"
echo -e "${ROYAL}────────────────────────────────────────────────────────────────${RESET}"
echo ""

print_step() {
    local num="$1"
    local title="$2"
    echo -e " ${ROYAL}${BOLD}[$num]${RESET} ${WHITE}${BOLD}$title${RESET}"
}

print_sub() {
    local msg="$1"
    echo -e "     ${DIM}➜${RESET} $msg"
}

print_ok() {
    local msg="$1"
    echo -e "     ${GREEN}${BOLD}✓${RESET} $msg"
}

# Step 1: Prepare environment
print_step "1/5" "Preparing local system directories..."
mkdir -p "$BIN_DIR" "$DESKTOP_DIR" "$ICON_DIR" "$PIXMAP_DIR"
print_ok "Destination paths ready in ~/.local"
echo ""

# Step 2: Acquire binaries & assets
print_step "2/5" "Locating Lyncost application package..."

SCRIPT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]:-}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

TEMP_DIR=""
SOURCE_BIN=""
SOURCE_ICON=""
SOURCE_DESKTOP=""

if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/src-tauri/target/release/lyncost" ]; then
    print_sub "Using release binary from local workspace build"
    SOURCE_BIN="$SCRIPT_DIR/src-tauri/target/release/lyncost"
    SOURCE_ICON="$SCRIPT_DIR/src-tauri/icons/icon.png"
    SOURCE_DESKTOP="$SCRIPT_DIR/packaging/lyncost.desktop"
elif [ -f "./src-tauri/target/release/lyncost" ]; then
    print_sub "Using release binary from current directory workspace"
    SOURCE_BIN="./src-tauri/target/release/lyncost"
    SOURCE_ICON="./src-tauri/icons/icon.png"
    SOURCE_DESKTOP="./packaging/lyncost.desktop"
elif [ -f "$HOME/Projects/lyncost/src-tauri/target/release/lyncost" ]; then
    print_sub "Using release binary from ~/Projects/lyncost workspace"
    SOURCE_BIN="$HOME/Projects/lyncost/src-tauri/target/release/lyncost"
    SOURCE_ICON="$HOME/Projects/lyncost/src-tauri/icons/icon.png"
    SOURCE_DESKTOP="$HOME/Projects/lyncost/packaging/lyncost.desktop"
elif [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/lyncost" ]; then
    print_sub "Using local package directory binary"
    SOURCE_BIN="$SCRIPT_DIR/lyncost"
    SOURCE_ICON="$SCRIPT_DIR/lyncost.png"
    SOURCE_DESKTOP="$SCRIPT_DIR/lyncost.desktop"
elif [ -n "$SCRIPT_DIR" ] && compgen -G "$SCRIPT_DIR/dist-packages/lyncost-*-linux-x86_64.tar.gz" >/dev/null; then
    LOCAL_TAR=$(ls -1t "$SCRIPT_DIR"/dist-packages/lyncost-*-linux-x86_64.tar.gz | head -n 1)
    print_sub "Extracting from $(basename "$LOCAL_TAR")"
    TEMP_DIR=$(mktemp -d)
    tar -xzf "$LOCAL_TAR" -C "$TEMP_DIR"
    SOURCE_BIN=$(find "$TEMP_DIR" -type f -name "lyncost" | head -n 1)
    SOURCE_ICON=$(find "$TEMP_DIR" -type f -name "*.png" | head -n 1)
    SOURCE_DESKTOP=$(find "$TEMP_DIR" -type f -name "*.desktop" | head -n 1)
elif [ -d "$HOME/Projects/lyncost/dist-packages" ] && compgen -G "$HOME/Projects/lyncost/dist-packages/lyncost-*-linux-x86_64.tar.gz" >/dev/null; then
    LOCAL_TAR=$(ls -1t "$HOME"/Projects/lyncost/dist-packages/lyncost-*-linux-x86_64.tar.gz | head -n 1)
    print_sub "Extracting from $(basename "$LOCAL_TAR")"
    TEMP_DIR=$(mktemp -d)
    tar -xzf "$LOCAL_TAR" -C "$TEMP_DIR"
    SOURCE_BIN=$(find "$TEMP_DIR" -type f -name "lyncost" | head -n 1)
    SOURCE_ICON=$(find "$TEMP_DIR" -type f -name "*.png" | head -n 1)
    SOURCE_DESKTOP=$(find "$TEMP_DIR" -type f -name "*.desktop" | head -n 1)
else
    print_sub "Downloading verified release package from GitHub..."
    TEMP_DIR=$(mktemp -d)
    
    # Query latest version from version.json or fallback
    LATEST_VER=$(curl -fsSL --connect-timeout 4 "https://raw.githubusercontent.com/$GITHUB_REPO/main/version.json" 2>/dev/null | grep -o '"version": *"[^"]*"' | head -n 1 | cut -d'"' -f4 || echo "0.1.3")
    [ -z "$LATEST_VER" ] && LATEST_VER="0.1.3"

    RAW_URL="https://raw.githubusercontent.com/$GITHUB_REPO/main/dist-packages/lyncost-${LATEST_VER}-linux-x86_64.tar.gz"
    FALLBACK_RAW_URL="https://raw.githubusercontent.com/$GITHUB_REPO/main/dist-packages/lyncost-0.1.3-linux-x86_64.tar.gz"
    RELEASE_URL="https://github.com/$GITHUB_REPO/releases/download/v${LATEST_VER}/lyncost-${LATEST_VER}-linux-x86_64.tar.gz"
    
    if curl -fSL --progress-bar "$RAW_URL" -o "$TEMP_DIR/lyncost.tar.gz" 2>/dev/null; then
        print_ok "Downloaded v${LATEST_VER} build from repository"
    elif curl -fSL --progress-bar "$FALLBACK_RAW_URL" -o "$TEMP_DIR/lyncost.tar.gz" 2>/dev/null; then
        print_ok "Downloaded build from repository"
    else
        curl -fSL --progress-bar "$RELEASE_URL" -o "$TEMP_DIR/lyncost.tar.gz"
    fi
    tar -xzf "$TEMP_DIR/lyncost.tar.gz" -C "$TEMP_DIR"
    SOURCE_BIN=$(find "$TEMP_DIR" -type f -name "lyncost" | head -n 1)
    SOURCE_ICON=$(find "$TEMP_DIR" -type f -name "*.png" | head -n 1)
    SOURCE_DESKTOP=$(find "$TEMP_DIR" -type f -name "*.desktop" | head -n 1)
fi

# Fallback: if icon was not in package, download directly from repo
if [ -z "$SOURCE_ICON" ] || [ ! -f "$SOURCE_ICON" ]; then
    print_sub "Downloading application icon asset..."
    [ -z "$TEMP_DIR" ] && TEMP_DIR=$(mktemp -d)
    if curl -fsSL --connect-timeout 6 "https://raw.githubusercontent.com/$GITHUB_REPO/main/src-tauri/icons/icon.png" -o "$TEMP_DIR/lyncost.png" 2>/dev/null; then
        SOURCE_ICON="$TEMP_DIR/lyncost.png"
    fi
fi

# Fallback: if desktop file was not in package, download or generate directly
if [ -z "$SOURCE_DESKTOP" ] || [ ! -f "$SOURCE_DESKTOP" ]; then
    print_sub "Downloading desktop launcher asset..."
    [ -z "$TEMP_DIR" ] && TEMP_DIR=$(mktemp -d)
    if curl -fsSL --connect-timeout 6 "https://raw.githubusercontent.com/$GITHUB_REPO/main/packaging/lyncost.desktop" -o "$TEMP_DIR/lyncost.desktop" 2>/dev/null; then
        SOURCE_DESKTOP="$TEMP_DIR/lyncost.desktop"
    fi
fi

print_ok "Package extracted and verified successfully"
echo ""

# Step 3: Install binary
print_step "3/5" "Installing executable binary..."
install -m 755 "$SOURCE_BIN" "$BIN_DIR/lyncost"
print_ok "Binary installed to ${CYAN}$BIN_DIR/lyncost${RESET}"
echo ""

# Step 4: Install icons
print_step "4/5" "Registering application icons..."
if [ -n "$SOURCE_ICON" ] && [ -f "$SOURCE_ICON" ]; then
    cp -f "$SOURCE_ICON" "$ICON_DIR/lyncost.png"
    cp -f "$SOURCE_ICON" "$PIXMAP_DIR/lyncost.png"

    for size in 16 24 32 48 64 96 128 256; do
        mkdir -p "$HOME/.local/share/icons/hicolor/${size}x${size}/apps"
        cp -f "$SOURCE_ICON" "$HOME/.local/share/icons/hicolor/${size}x${size}/apps/lyncost.png" 2>/dev/null || true
    done
    print_ok "High-resolution hicolor icon assets installed"
else
    print_sub "Notice: Application icon skipped (fallback pending)"
fi
echo ""

# Step 5: Desktop launcher & database
print_step "5/5" "Configuring desktop integration..."
if [ -n "$SOURCE_DESKTOP" ] && [ -f "$SOURCE_DESKTOP" ]; then
    sed -e 's|^Exec=.*|Exec='"$BIN_DIR"'/lyncost %U|' \
        -e 's|^Icon=.*|Icon='"$ICON_DIR"'/lyncost.png|' \
        "$SOURCE_DESKTOP" > "$DESKTOP_DIR/lyncost.desktop"
else
    cat << DESKTOP_EOF > "$DESKTOP_DIR/lyncost.desktop"
[Desktop Entry]
Name=Lyncost
GenericName=Personal Finance & Investment Tracker
Comment=Fast, offline personal finance, bank, cash, and investment portfolio manager
Exec=$BIN_DIR/lyncost %U
Icon=$ICON_DIR/lyncost.png
Terminal=false
Type=Application
Categories=Office;Finance;Utility;
Keywords=finance;money;budget;investment;portfolio;bank;crypto;stocks;
StartupWMClass=lyncost
DESKTOP_EOF
fi
chmod +x "$DESKTOP_DIR/lyncost.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
fi

touch "$DESKTOP_DIR/lyncost.desktop"
print_ok "Desktop launcher integrated into system application menu"

# Cleanup
if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
fi

echo ""
echo -e "${ROYAL}╭──────────────────────────────────────────────────────────────────╮${RESET}"
echo -e "${ROYAL}│${RESET}   ${GREEN}${BOLD}✓ Installation Completed Successfully!${RESET}                         ${ROYAL}│${RESET}"
echo -e "${ROYAL}╰──────────────────────────────────────────────────────────────────╯${RESET}"
echo ""
echo -e " ${WHITE}${BOLD}How to Launch:${RESET}"
echo -e "   ${PURPLE}• Terminal:${RESET}         ${CYAN}${BOLD}lyncost${RESET}"
echo -e "   ${PURPLE}• Application Menu:${RESET} Press Super/Windows key and search for ${WHITE}${BOLD}Lyncost${RESET}"
echo ""
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo -e " ${AMBER}${BOLD}Note:${RESET} ${DIM}$BIN_DIR is not in your current PATH.${RESET}"
    echo -e " Add it with: ${CYAN}export PATH=\"\$HOME/.local/bin:\$PATH\"${RESET} in ~/.bashrc"
    echo ""
fi
echo -e " ${WHITE}${BOLD}Mobile Companion:${RESET}"
echo -e "   ${PURPLE}• Android APK:${RESET}      ${CYAN}https://raw.githubusercontent.com/raizenquick/lyncost/main/dist-packages/lyncost-mobile.apk${RESET} ${DIM}(Beta)${RESET}"
echo ""


