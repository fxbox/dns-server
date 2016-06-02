#!/bin/bash
# Usage: ./update.sh ns.useraddress.net box.useraddress.net a7427c5ce2175c61a7427c5ce2175c61 192.168.0.42 52.36.71.23

echo "Got called: ./update.sh $1 $2 $3 $4 $5"

SERVER=$1
DOMAIN=$2
PREFIX=/v1/dns/`echo $2 | perl -lpe '$_ = join "/", reverse split /\./'`
HASH=$3
LOCAL=$4
REMOTE=$5

# Used by pagekite backend as well as by LetsEncrypt.sh deploy-hook:
echo "$SERVER" > ./server.txt
echo "$HASH.$DOMAIN a.$HASH.$DOMAIN b.$HASH.$DOMAIN remote.$HASH.$DOMAIN" > ./domains.txt

echo "Creating DNS records..."

node ./apiCall.js $SERVER 5300 $PREFIX/$HASH "{\"type\":\"A\",\"value\":\"$LOCAL\"}"
node ./apiCall.js $SERVER 5300 $PREFIX/$HASH/a "{\"type\":\"A\",\"value\":\"$LOCAL\"}"
node ./apiCall.js $SERVER 5300 $PREFIX/$HASH/b "{\"type\":\"A\",\"value\":\"$LOCAL\"}"
node ./apiCall.js $SERVER 5300 $PREFIX/$HASH/remote "{\"type\":\"A\",\"value\":\"$REMOTE\"}"


echo "Getting SAN cert for: `cat domains.txt`"
./letsencrypt.sh --cron --challenge dns-01 --hook ./deploy-challenge.sh --config ./config.sh
