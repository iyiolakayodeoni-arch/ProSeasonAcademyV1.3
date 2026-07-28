#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# PROSEASONACADEMY SERVER — one-command install on a fresh
# Ubuntu 22.04+ box (Oracle Always Free ARM recommended, ₦0).
#
#   chmod +x install.sh && ./install.sh
#
# Then edit .env ONCE (your founder key), and:
#   sudo systemctl enable --now academy
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

echo "── 1/4 · node 20 (skipped if node already exists)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v

echo "── 2/4 · server dependencies"
npm install --omit=dev --no-audit --no-fund

echo "── 2b/4 · open the machine's OWN door (Ubuntu's inside guard)"
# OCI Ubuntu images ship an iptables ruleset that blocks everything
# except SSH — the cloud Security List alone is not enough.
if command -v iptables >/dev/null 2>&1 && [ -f /etc/iptables/rules.v4 ]; then
  if ! sudo iptables -C INPUT -p tcp --dport 8788 -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8788 -j ACCEPT
    echo "   port 8788 opened in Ubuntu iptables"
  fi
  if command -v netfilter-persistent >/dev/null 2>&1; then
    sudo netfilter-persistent save >/dev/null
  fi
else
  echo "   no Ubuntu firewall ruleset found — nothing to open"
fi

echo "── 3/4 · environment"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "   .env created — EDIT IT NOW: nano .env  (set ADMIN_KEY to your founder key)"
else
  echo "   .env already exists, untouched"
fi

echo "── 4/4 · systemd unit (survives reboots + crashes)"
sudo tee /etc/systemd/system/academy.service > /dev/null <<EOF
[Unit]
Description=ProSeasonAcademy server
After=network.target

[Service]
WorkingDirectory=$(pwd)
EnvironmentFile=$(pwd)/.env
Environment=PORT=8788
ExecStart=$(command -v node) src/index.js
Restart=always
RestartSec=3
User=$(whoami)

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload

echo ""
echo "DONE. Next:"
echo "  1) nano .env          → paste your founder key as ADMIN_KEY"
echo "  2) sudo systemctl enable --now academy"
echo "  3) curl http://localhost:8788/health   → {\"ok\":true,...}"
echo "  4) open the firewall/security-list for TCP 8788 (see DEPLOYMENT.md §2)"
echo "  5) build the app with  EXPO_PUBLIC_PSA_SERVER=http://YOUR_PUBLIC_IP:8788"
