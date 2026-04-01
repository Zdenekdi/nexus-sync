#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# setup.sh — Nexus Hub Asterisk Setup
# VPS: 78.141.202.139 (Debian/Ubuntu)
#
# Spuštění:
#   chmod +x setup.sh && sudo ./setup.sh
#   sudo ./setup.sh --domain vas-domen.cz   (s Let's Encrypt)
#   sudo ./setup.sh --self-signed            (bez domény, testovací)
# ══════════════════════════════════════════════════════════════════════════════
set -e

DOMAIN=""
USE_SELF_SIGNED=false
ASTERISK_CONF_DIR="/etc/asterisk"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Zpracování argumentů ───────────────────────────────────────────────────────
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN="$2"; shift ;;
    --self-signed) USE_SELF_SIGNED=true ;;
    *) echo "Neznámý argument: $1"; exit 1 ;;
  esac
  shift
done

echo "╔══════════════════════════════════════════════╗"
echo "║  Nexus Hub — Asterisk Setup                 ║"
echo "╚══════════════════════════════════════════════╝"

# ── 1. Instalace Asterisku ─────────────────────────────────────────────────────
echo "[1/6] Instalace Asterisku..."
apt-get update -qq
apt-get install -y asterisk asterisk-modules openssl 2>/dev/null || true
systemctl enable asterisk

# ── 2. TLS certifikát ──────────────────────────────────────────────────────────
echo "[2/6] Konfigurace TLS..."
mkdir -p /etc/asterisk/keys

if [[ -n "$DOMAIN" ]]; then
  # Let's Encrypt
  apt-get install -y certbot
  certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos -m admin@"$DOMAIN" || {
    echo "⚠️  Let's Encrypt selhal — přepínám na self-signed"
    USE_SELF_SIGNED=true
  }
  if [[ "$USE_SELF_SIGNED" = false ]]; then
    LE_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    LE_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
    # Aktualizuj pjsip.conf s cestami k certifikátům
    sed -i "s|; cert_file=.*|cert_file=$LE_CERT|" "$ASTERISK_CONF_DIR/pjsip.conf"
    sed -i "s|; privkey_file=.*|privkey_file=$LE_KEY|" "$ASTERISK_CONF_DIR/pjsip.conf"
    echo "✓ Let's Encrypt certifikát nastaven pro $DOMAIN"
  fi
fi

if [[ "$USE_SELF_SIGNED" = true || -z "$DOMAIN" ]]; then
  echo "⚠️  Generuji self-signed certifikát (pro produkci použijte --domain)"
  openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
    -keyout /etc/asterisk/keys/nexushub.key \
    -out    /etc/asterisk/keys/nexushub.crt \
    -subj "/CN=nexushub-asterisk" \
    -extensions san \
    -config <(printf '[req]\ndistinguished_name=req\n[san]\nsubjectAltName=IP.1:78.141.202.139')
  sed -i "s|; cert_file=.*|cert_file=/etc/asterisk/keys/nexushub.crt|" "$ASTERISK_CONF_DIR/pjsip.conf" 2>/dev/null || true
  sed -i "s|; privkey_file=.*|privkey_file=/etc/asterisk/keys/nexushub.key|" "$ASTERISK_CONF_DIR/pjsip.conf" 2>/dev/null || true
  echo "✓ Self-signed certifikát vytvořen v /etc/asterisk/keys/"
  echo "  ⚠️  Prohlížeč bude vyžadovat ruční trust certifikátu (otevřít https://78.141.202.139:8089 a přijmout)"
fi

# ── 3. Kopírování konfigurací ──────────────────────────────────────────────────
echo "[3/6] Kopírování konfigurací..."
cp "$SCRIPT_DIR/pjsip.conf"      "$ASTERISK_CONF_DIR/pjsip.conf"
cp "$SCRIPT_DIR/extensions.conf" "$ASTERISK_CONF_DIR/extensions.conf"

# ── 4. http.conf pro WebSocket ─────────────────────────────────────────────────
echo "[4/6] Konfigurace HTTP serveru pro WebSocket..."
cat > "$ASTERISK_CONF_DIR/http.conf" << 'EOF'
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088
tlsenable=yes
tlsbindaddr=0.0.0.0:8089
; Cesty jsou nastaveny z pjsip.conf transport-wss
EOF

# ── 5. Firewall ────────────────────────────────────────────────────────────────
echo "[5/6] Otevírám porty ve firewallu..."
if command -v ufw &>/dev/null; then
  ufw allow 5060/udp  comment "SIP UDP (Android relay)"
  ufw allow 5060/tcp  comment "SIP TCP"
  ufw allow 8088/tcp  comment "Asterisk WS (testovací)"
  ufw allow 8089/tcp  comment "Asterisk WSS (produkce)"
  ufw allow 10000:20000/udp comment "RTP audio"
  echo "✓ UFW porty otevřeny"
elif command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-port=5060/udp
  firewall-cmd --permanent --add-port=8088/tcp
  firewall-cmd --permanent --add-port=8089/tcp
  firewall-cmd --permanent --add-port=10000-20000/udp
  firewall-cmd --reload
  echo "✓ firewalld porty otevřeny"
else
  echo "⚠️  Firewall nenalezen — ručně otevřete: 5060/udp, 8088/tcp, 8089/tcp, 10000-20000/udp"
fi

# ── 6. Start Asterisku ─────────────────────────────────────────────────────────
echo "[6/6] Spouštím Asterisk..."
systemctl restart asterisk
sleep 2
systemctl status asterisk --no-pager | head -5

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Hotovo! Nexus Hub Asterisk je spuštěn.                      ║"
echo "║                                                                  ║"
echo "║  SIP UDP:  78.141.202.139:5060  (Android relay)                ║"
echo "║  WS:       ws://78.141.202.139:8088  (testovací)               ║"
echo "║  WSS:      wss://78.141.202.139:8089  (produkce)               ║"
echo "║                                                                  ║"
echo "║  Ověření: asterisk -rx \"pjsip show endpoints\"                  ║"
if [[ "$USE_SELF_SIGNED" = true ]]; then
echo "║                                                                  ║"
echo "║  ⚠️  Self-signed: navštivte https://78.141.202.139:8089         ║"
echo "║     v prohlížeči a přijměte bezpečnostní výjimku.               ║"
fi
echo "╚══════════════════════════════════════════════════════════════════╝"
