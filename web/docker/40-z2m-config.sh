#!/bin/sh
# Support Supervisor options and standalone Docker environment configuration.
set -eu
if [ -f /data/options.json ]; then
    Z2M_UPSTREAM=$(jq -er '.z2m_url' /data/options.json)
    Z2M_TOKEN=$(jq -r '.z2m_token // ""' /data/options.json)
fi
if [ -n "${Z2M_UPSTREAM:-}" ]; then
    # Restrict generated nginx syntax. Credentials belong in z2m_token, not the URL.
    if ! printf '%s' "$Z2M_UPSTREAM" | grep -Eq '^https?://[a-zA-Z0-9._-]+(:[0-9]{1,5})?(/[a-zA-Z0-9_./~%-]*)?$'; then
        echo 'Invalid z2m_url: use an HTTP(S) frontend base URL without credentials, query or fragment.' >&2
        exit 1
    fi
    upstream=${Z2M_UPSTREAM%/}
    token=$(printf '%s' "${Z2M_TOKEN:-}" | jq -sRr @uri)
    cat > /etc/nginx/conf.d/z2m-proxy.inc <<EOF_PROXY
location = /api {
    proxy_pass ${upstream}/api?token=${token};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$proxy_host;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_ssl_server_name on;
}
location /device_icons/ {
    proxy_pass ${upstream}/device_icons/;
    proxy_set_header Host \$proxy_host;
    proxy_ssl_server_name on;
}
EOF_PROXY
    cat > /usr/share/nginx/html/config.js <<'EOF_CONFIG'
// Same-origin WebSocket: works through Home Assistant ingress and reverse proxies.
const z2mEndpoint = new URL('api', document.baseURI);
z2mEndpoint.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
window.__Z2M_CONFIG__ = { url: z2mEndpoint.href, token: '' };
EOF_CONFIG
    echo 'z2m-dashboard: same-origin proxy configured (token stays server-side)'
else
    : > /etc/nginx/conf.d/z2m-proxy.inc
    { printf 'window.__Z2M_CONFIG__ = '; jq -cn --arg url "${Z2M_URL:-}" --arg token "${Z2M_TOKEN:-}" '{url:$url,token:$token}'; printf ';\n'; } > /usr/share/nginx/html/config.js
    echo 'z2m-dashboard: direct browser WebSocket configured'
fi
