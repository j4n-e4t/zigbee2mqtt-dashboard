# Zigbee2MQTT Dashboard

1. Enable the frontend in your existing Zigbee2MQTT instance.
2. Set `z2m_url` to its frontend HTTP URL as reached **from this app's container**.
   For the official Zigbee2MQTT app this is often
   `http://45df7312-zigbee2mqtt:8080`. Check the app's hostname and frontend port;
   development/Edge or other repositories can use different hostnames.
3. If Zigbee2MQTT has `frontend.auth_token`, put it in `z2m_token`.
4. Start this app and choose **Open Web UI**. Enable **Show in sidebar** if desired.

Do not append `/api`, a query string, or credentials to `z2m_url`. A frontend
base path is supported. The app proxies WebSockets through Home Assistant ingress,
so there is no public port to configure and no mixed-content WebSocket problem.
The token is used by nginx and is not written into the browser configuration.

This app manages your existing Zigbee2MQTT network; it does not include a broker,
coordinator or Zigbee2MQTT itself. Writes affect the same network as the normal UI.

If startup fails, check the app log and the backend URL. If the interface opens
but cannot connect, confirm the frontend is enabled, reachable, and the token is
correct. After changing app options, restart the app.

Use Supervisor backups for app options. The Settings → Tools backup action backs
up Zigbee2MQTT itself through its API.
