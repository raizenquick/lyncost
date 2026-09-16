#!/usr/bin/env bash
# ==============================================================================
# Lyncost One-Line Linux Uninstaller
# https://github.com/raizenquick/lyncost
# ==============================================================================
set -e

if [ -t 1 ]; then
    BOLD="\033[1m"
    DIM="\033[2m"
    RESET="\033[0m"
    PURPLE="\033[38;2;168;85;247m"
    ROYAL="\033[38;2;147;51;234m"
    GREEN="\033[38;2;34;197;94m"
    WHITE="\033[1;37m"
else
    BOLD=""
    DIM=""
    RESET=""
    PURPLE=""
    ROYAL=""
    GREEN=""
    WHITE=""
fi

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
echo -e " ${PURPLE}${BOLD}Lyncost Linux Uninstaller${RESET}"
echo -e "${ROYAL}────────────────────────────────────────────────────────────────${RESET}"
echo ""

echo -e " ${ROYAL}${BOLD}[1/3]${RESET} Removing executable binary..."
rm -f "$HOME/.local/bin/lyncost"
echo -e "     ${GREEN}${BOLD}✓${RESET} ~/.local/bin/lyncost removed"

echo -e " ${ROYAL}${BOLD}[2/3]${RESET} Removing desktop launcher and icons..."
rm -f "$HOME/.local/share/applications/lyncost.desktop"
rm -f "$HOME/.local/share/icons/hicolor/"*"/apps/lyncost."* 2>/dev/null || true
rm -f "$HOME/.local/share/pixmaps/lyncost.png" 2>/dev/null || true
echo -e "     ${GREEN}${BOLD}✓${RESET} System icons and desktop launcher removed"

echo -e " ${ROYAL}${BOLD}[3/3]${RESET} Refreshing desktop icon database..."
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
fi
echo -e "     ${GREEN}${BOLD}✓${RESET} System caches refreshed"

echo ""
echo -e "${ROYAL}╭──────────────────────────────────────────────────────────────────╮${RESET}"
echo -e "${ROYAL}│${RESET}   ${GREEN}${BOLD}✓ Lyncost uninstalled cleanly from your system!${RESET}                ${ROYAL}│${RESET}"
echo -e "${ROYAL}╰──────────────────────────────────────────────────────────────────╯${RESET}"
echo ""
echo -e " ${DIM}Your local SQLite database is kept safe in ~/.local/share/com.lyncost.desktop/${RESET}"
echo -e " ${DIM}If you ever want to reinstall:${RESET}"
echo -e "   curl -fsSL https://raw.githubusercontent.com/raizenquick/lyncost/main/install.sh | bash"
echo ""
