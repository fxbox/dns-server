#!/bin/bash

SERVER=`cat ./server.txt`
DOMAIN=`cat ./domains.txt | cut -d' ' -f 1`
SECRET=foxbox

echo kitename = remote.$DOMAIN > ~/.pagekite.rc
echo kitesecret = $SECRET >> ~/.pagekite.rc

pagekite.py --frontend=$SERVER:80 \
    localhost:4334 https://remote.$DOMAIN:443
