#!/usr/bin/env node
'use strict';

var https = require('https');
var fs = require('fs');
var exec = require('child_process').exec;
var proxy = require('http-proxy').createProxyServer();
var os = require('os');

var args = process.argv;
if (args.length < 7) {
  console.log('Usage: node ./proxy.js ns.useraddress.net box.useraddress.net 108.61.190.188 8000 4334');
  return;
}

var server=args[2];
var domain = args[3];
var tunnelIpAddr = args[4];
var ports = {
  backend: args[5],
  publicLocal: args[6]
};

console.log('Args:', args);

function run(cmd, ignoreStdErr) {
  console.log(cmd);
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      if (stderr.length) {
        console.log('stderr detected:', cmd, stdout, stderr);
        if (!ignoreStdErr) {
          reject(stderr);
        }
      }
      resolve(stdout);
    });
  });
}

function buildSelfSigned() {
  let fqdn;
  // Make directories to work from
  return run('mkdir -p scripts/certs/{server,client,ca,tmp}').then(() => {
    // Create your very own Root Certificate Authority
    return run('openssl genrsa -out scripts/certs/ca/my-root-ca.key.pem 2048',
        true);
  }).then(() => {
    // Self-sign your Root Certificate Authority
    // Since this is private, the details can be as bogus as you like
    return run(`openssl req -x509 -new -nodes -key scripts/certs/ca/my-root-ca.\
key.pem -days 1000000 -out scripts/certs/ca/my-root-ca.crt.pem -subj "/C=US/ST=\
Utah/L=Provo/O=ACME Signing Authority Inc/CN=self-signed"`);
  }).then(() => {
    // Create a Device Certificate for each domain,
    // such as example.com, *.example.com, awesome.example.com
    // NOTE: You MUST match CN to the domain name or ip address you want to use
    return run(`openssl genrsa -out scripts/certs/server/my-server.key.pem \
2048`, true);
  }).then(() => {
    // Determine the fingerprint of the signing cert
    return run(`openssl x509 -in scripts/certs/ca/my-root-ca.crt.pem -sha256 \
-noout -fingerprint`);
  }).then(out => {
    fqdn = out.substring('SHA256 Fingerprint='.length)
        .split(':').join('').toLowerCase().trim().substring(0, 32) +
        '.self-signed';

    // Create a request from your Device, which your Root CA will sign
    return run('openssl req -new -key scripts/certs/server/my-server.key.pem ' +
      '-out scripts/certs/tmp/my-server.csr.pem ' +
      `-subj "/C=US/ST=Utah/L=Provo/O=ACME Tech Inc/CN=${fqdn}"`, true);
  }).then(() => {
    // Sign the request from Device with your Root CA
    // -CAserial scripts/certs/ca/my-root-ca.srl
    return run('openssl x509 -req -in scripts/certs/tmp/my-server.csr.pem ' +
        '-CA scripts/certs/ca/my-root-ca.crt.pem ' +
        '-CAkey scripts/certs/ca/my-root-ca.key.pem ' +
        '-CAcreateserial ' +
        '-out scripts/certs/server/my-server.crt.pem ' +
        '-days 1000000', true);
  }).then(() => {
    console.log(`Generated certificate chain for ${fqdn} in ./scripts/certs.`);
    // Determine the fingerprint of the signing cert
    return run(`openssl x509 -in scripts/certs/server/my-server.crt.pem -sha1 \
-noout -fingerprint`);
  }).then(out => {
    console.log('Seeing', out);
    var fingerprint = out.substring('SHA1 Fingerprint='.length)
        .split(':').join('').toLowerCase().trim();
    console.log('client cert fingerprint is', fingerprint);

    return fingerprint;
  });
}

function getLocalIPAddr() {
  return new Promise((resolve, reject) => {
    var ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(function(ifname) {
      // var alias = 0;

      ifaces[ifname].forEach(function(iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
          // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          return;
        }
        resolve(iface.address);
        // if (alias >= 1) {
        //   // this single interface has multiple ipv4 addresses
        //   console.log(ifname + ':' + alias, iface.address);
        // } else {
        //   // this interface has only one ipv4 adress
        //   console.log(ifname, iface.address);
        // }
        // ++alias;
      });
    });
    reject(new Error('Local IP address not found'));
  });
}

function buildPublicLocal(fqdn) {
  var hash = fqdn.split('.')[0];
  return getLocalIPAddr().then(localIpAddr => {
    var cmd = `cd scripts ; ./update.sh ${server} ${domain} ${hash} ${localIpAddr} \
${tunnelIpAddr}`;
    console.log(`Running ${cmd} (this may take a while before you see any \
output)`);
    return run(cmd, true);
  }).then(stdout => {
    console.log(stdout);
    return hash;
  });
}

function proxyPublicLocal(hash) {
  // serve a web server on the local network:
  https.createServer({
    key: fs.readFileSync(`scripts/certs/${hash}.${domain}/privkey.pem`),
    cert: fs.readFileSync(`scripts/certs/${hash}.${domain}/cert.pem`),
    ca: fs.readFileSync(`scripts/certs/${hash}.${domain}/chain.pem`)
  }, (req, res) => {
    proxy.web(req, res, {target: `http://localhost:${ports.backend}`});
  }).listen(ports.publicLocal);
  console.log(`Proxying https port ${ports.publicLocal} to http port \
${ports.backend}, ready for connections.`);
  return Promise.resolve();
}

//...
buildSelfSigned().then(fqdn => {
  return buildPublicLocal(fqdn).then(hash => {
    setTimeout(function() {
      console.log(`Try this: openssl s_client -connect \
${hash}.${domain}:${ports.publicLocal}`);
      console.log(`You can also open https://${hash}.${domain}:\
${ports.publicLocal}/ using your browser (the https cert will be signed by the\
LetsEncrypt staging server).`);
    }, 1000);
    return proxyPublicLocal(hash);
  });
}).catch(err => {
  console.error(err);
});
