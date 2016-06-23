#!/bin/bash

# DOMAIN=box.knilxof.org
# SECRET=foxbox

pagekite.py --isfrontend --ports=80,443 --protos=http,https,websocket --domain=http,https,websocket:*.$DOMAIN:$SECRET &

node /app/index.js /certdir 53 5300 $DOMAIN
