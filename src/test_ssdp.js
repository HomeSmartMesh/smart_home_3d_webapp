//https://github.com/diversario/node-ssdp
//https://www.burgestrand.se/hue-api/api/discovery/

var Client = require('node-ssdp').Client
, client = new Client();

client.on('notify', function () {
  console.log('Got a notification.')
})

client.on('response', function inResponse(headers, code, rinfo) {
  console.log('Got a response to an m-search:\n%d\n%s\n%s', code, JSON.stringify(headers, null, '  '), JSON.stringify(rinfo, null, '  '))
})

client.search('urn:schemas-upnp-org:service:ContentDirectory:1')

// Or maybe if you want to scour for everything after 5 seconds
setInterval(function() {
  client.search('ssdp:all')
}, 5000)

// And after 10 seconds, you want to stop
// setTimeout(function () {
//   client.stop()
// }, 10000)


console.log("don sending search requests. press any key to continue");

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', process.exit.bind(process, 0));