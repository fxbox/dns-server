#!/bin/bash

npm install http-proxy

# The `| head -1 | cut -d ' ' -f 4` commands will extract the IP address
# from the `host` command's output, which would look like:

# knilxof.org has address 52.39.215.79
# knilxof.org mail is handled by 50 fb.mail.gandi.net.
# knilxof.org mail is handled by 10 spool.mail.gandi.net.

node proxy.js $1 $2 `host $1 | head -1 | cut -d ' ' -f 4` 8000 4334 &
python -m SimpleHTTPServer 8000 &
sleep 10
cd scripts
sh ./fly.sh
