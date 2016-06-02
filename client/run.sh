#!/bin/bash

npm install http-proxy
node proxy.js $1 $2 `host $1 | cut -d ' ' -f 4` 8000 4334 &
python -m SimpleHTTPServer 8000 &
sleep 10
cd scripts
sh ./fly.sh
