#!/bin/sh
# Generates /config.js from env vars on container start (run by nginx's entrypoint).
set -eu

esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e "s/'/\\\\'/g"; }

cat > /usr/share/nginx/html/config.js <<EOF
window.__Z2M_CONFIG__ = { url: '$(esc "${Z2M_URL:-}")', token: '$(esc "${Z2M_TOKEN:-}")' };
EOF

echo "z2m-dashboard: Z2M_URL='${Z2M_URL:-<auto>}' token=$([ -n "${Z2M_TOKEN:-}" ] && echo set || echo none)"
