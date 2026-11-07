"""Validate app discovery, version alignment and image publication settings."""
import json
import sys
from pathlib import Path
import yaml

root = Path(__file__).resolve().parents[1]
app = yaml.safe_load((root / 'web/config.yaml').read_text())
repo = yaml.safe_load((root / 'repository.yaml').read_text())
package = json.loads((root / 'web/package.json').read_text())
assert app['version'] == package['version']
assert app['arch'] == ['amd64', 'aarch64']
assert app['image'] == 'ghcr.io/j4n-e4t/zigbee2mqtt-dashboard'
assert app['ingress'] and app['ingress_port'] == 80
assert app['schema']['z2m_token'] == 'password'
assert repo['url'] == 'https://github.com/j4n-e4t/zigbee2mqtt-dashboard'
if len(sys.argv) > 1:
    assert sys.argv[1] == 'v' + app['version'], 'Tag must match app and package versions'
print('App metadata and release version are valid')
