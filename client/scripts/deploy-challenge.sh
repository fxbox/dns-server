#!/bin/bash
URL_PATH=`echo $2 | perl -lpe '$_ = join "/", reverse split /\./'`
echo Deploying challenge: node ./apiCall.js `cat server.txt` 5300 /v1/dns/$URL_PATH/_acme-challenge "{\"type\":\"TXT\",\"value\":\"$4\"}"
node ./apiCall.js `cat server.txt` 5300 /v1/dns/$URL_PATH/_acme-challenge "{\"type\":\"TXT\",\"value\":\"$4\"}"
