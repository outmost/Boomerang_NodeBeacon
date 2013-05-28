// Assumptions
 
// The following NodeJS modules are installed:
// npm install node-statsd
// npm install geoip-lite
// npm install ms
// npm install tldtools
// npm install useragent
 
// StatsD is running on same server (localhost) 

// Boomerang is configured to send custom parameters for "domain", "page_type", "user_status", "ip" and "user_agent".
// http://lognormal.github.io/boomerang/doc/howtos/howto-5.html
 
StatsD = require('node-statsd').StatsD;

var tldtools = require('tldtools').init();

var sys = require ('util'),url = require('url'),http = require('http'),qs = require('querystring'),ms = require('ms'),geoip = require('geoip-lite'),useragent = require('useragent');
 
 
// Create Multi Core Server
// credit: http://cjihrig.com/blog/scaling-node-js-applications/
var cluster = require("cluster");
var http = require("http");
var numCPUs = require("os").cpus().length;
var port = parseInt(process.argv[2]);

if (cluster.isMaster) {
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", function(worker, code, signal) {
    cluster.fork();
  });
} 
else {
	http.createServer(function(request, response) {
 
        // Parse Request URL
        var url_parts = url.parse(request.url,true);
 
        // Parse "u" parameter from request URL using tldtools
        var rUrl = url_parts.query.u;
		var domain = tldtools.extract(rUrl);
		var root = domain.domain;
		// get TLD (.com / .co.uk / .de ... etc)
		var tld = domain.tld;
		// replace periods in tld with underscores ready for graphite
		var tld = tld.replace(/\./g, '_');
		// check if subdomain (inc www), if no subdomain then assign to www
		if(domain.subdomain.length < 1) { 
			var subdomain = "www"; 
		} 
		else { 
			var subdomain = domain.subdomain; 
		}
		// http or https?
		var protocol = domain.url_tokens.protocol;
		
		var page_type = url_parts.query.page_type;
        var user_status = url_parts.query.user_status;
 
        // Parse "ip" parameter from request URL using GEO IP
        var loc = geoip.lookup(url_parts.query.ip);
        var country = loc.country;
        var region = loc.region;
 
        // Parse "ua" parameter from Request URL using UA-Parser
        var ua = useragent.parse(url_parts.query.ua);
        var browser = ua.family;
        var browser_version = ua.major;
        var os = ua.os.family;
        var device = ua.device.family;
  	
		// Check to see if the "r" (referrer) parameter is empty, if so then mark as New Visit
		// NOTE: assumes users are not tracked across domains - a user browsing between www.example.com and blog.example.com would be marked as a repeat visit, even if the www and blog site share no cachable files.
		if (url_parts.query.r.length >= 1) { 
			var visit_type = "repeat"; 
		}
		else { 
			var visit_type = "new"; 
		}
		
		// Parse load time parameters and convert to milliseconds using ms
		var t_resp = ms(url_parts.query.t_resp);
		var t_page = ms(url_parts.query.t_page);
		var t_done = ms(url_parts.query.t_done);
 
 
		// Send a 204 Response (no content)
		response.writeHead( 204 );
		response.end();
 
		//Debug me (remove for production use)
	
		// domain
		console.log("root domain:" + root);
		console.log("tld:" + tld);
		console.log("subdomain:" + subdomain);
		console.log("protocol:" + protocol);
		// ip
		console.log("country IP:" + country);	
		console.log("region IP:" + region);	
		// ua
		console.log("useragent:" + ua);
		console.log("os:" + os);
		console.log("device:" + device);
		//graphite
		console.log("graphite pathname:" + root + "." + tld);
        
		
		
		// Connect to StatsD (hostname, port number) and send timing data 
		c = new StatsD('127.0.0.1',8125);
 
        //c.timing(root+'.'+tld+'.'+subdomain+'.pages.'+page_type+'.TTFB', t_resp);
        //c.timing(root+'.'+tld+'.'+subdomain+'.pages.'+page_type+'.Render', t_page);
        c.timing(root+'.'+tld+'.'+subdomain+'.page_types.'+page_type+'.pageReady', t_done);
 
        c.timing(root+'.'+tld+'.'+subdomain+'.geographical.'+country+'.'+region+'.pageReady', t_done);
        
        c.timing(root+'.'+tld+'.'+subdomain+'.browsers.'+browser+'.'+browser_version+'.pageReady', t_done);
 
		//tracking devices in graphite could be VERY expensive, let's try OS instead
        //c.timing(root+'.'+tld+'.'+subdomain+'.devices.'+device+'.pageReady', t_done);
        c.timing(root+'.'+tld+'.'+subdomain+'.devices.'+os+'.pageReady', t_done);
 
        c.timing(root+'.'+tld+'.'+subdomain+'.visitors.'+visit_type+'.pageReady', t_done);
 
	// set server to listen for requests at port 8080
	}).listen( 8080 );
}