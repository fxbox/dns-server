#!/bin/bash

# DOMAIN=box.knilxof.org
# SECRET=foxbox

DOMAIN=box.useraddress.net
SECRET=foxbox

pagekite.py --isfrontend --ports=80,443 --protos=http,https,websocket --domain=http,https,websocket:*.$DOMAIN:$SECRET &

node /app/index.js /app/test/fixtures/certs 53 5300 $DOMAIN
