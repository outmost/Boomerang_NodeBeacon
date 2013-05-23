// Assumptions
 
// The following NodeJS modules are installed:
// npm install node-statsd
// npm install geoip-lite
// npm install ua-parser
// npm install ms
// npm install tldtools
// npm install useragent
 
// Boomerang makes beacon call to port :8080
// StatsD is running on same server (localhost) 
 
// Boomerang is configured to send custom parameters for "domain", "page_type", "user_status", "ip" and "user_agent".
// http://lognormal.github.io/boomerang/doc/howtos/howto-5.html
 
 
 
StatsD = require('node-statsd').StatsD;

var tldtools = require('tldtools').init();
 
var sys = require ('util'),url = require('url'),http = require('http'),qs = require('querystring'),ms = require('ms'),geoip = require('geoip-lite'),useragent = require('useragent');
 
 
// Create Server
var server=http.createServer(
 
function (request, response) {
 
        // Parse Request URL
        var url_parts = url.parse(request.url,true);
 
        // Parse Domain using tldtools
        var hostname = url_parts.query.hostname;
		var domain = tldtools.extract(hostname);
		var root = domain.domain;
		var tld = domain.tld;
		if(domain.subdomain.length < 1) { 
			var subdomain = "www"; 
			} 
		else { 
			var subdomain = domain.subdomain; 
			}
		var protocol = domain.url_tokens.protocol;
		
		
        var page_type = url_parts.query.page_type;
        var user_status = url_parts.query.user_status;
 
        // Parse User IP parameter from Request URL using GEO IP
        var loc = geoip.lookup(url_parts.query.ip);
        var country = loc.country;
        var region = loc.region;
 
        // Parse User Agent parameter from Request URL using UA-Parser
        var ua = useragent.parse(url_parts.query.user_agent);
        var browser = ua.family;
        var browser_version = ua.major;
        var os = ua.os;
        var device = ua.device;
  	
    // Check to see if the referrer parameter is empty, if so then mark as New Visit
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
 
	//Debug me
	console.log(root);
	console.log(tld);
	console.log(subdomain);
	console.log(protocol);
	
	console.log(country);	
	console.log(region);	
	
 
        
		// Connect to StatsD (hostname, port number) and send timing data 
		c = new StatsD('127.0.0.1',8125);
 
        c.timing(domain+'.pages.'+page_type+'.serverResponse', t_resp);
        c.timing(domain+'.pages.'+page_type+'.pageRender', t_page);
        c.timing(domain+'.pages.'+page_type+'.pageDone', t_done);
 
        c.timing(domain+'.geographical.'+country+'.pageDone', t_done);
        c.timing(domain+'.geographical.'+country+'.'+region+'.pageDone', t_done);
        
        c.timing(domain+'.browsers.'+browser+'.pageDone', t_done);
        c.timing(domain+'.browsers.'+browser+'.'+browser_version+'.pageDone', t_done);
 
        c.timing(domain+'.devices.'+device+'.pageDone', t_done);
 
        c.timing(domain+'.visitors.'+visit_type+'.pageDone', t_done);
        }
 
);
 
// set server to listen for requests at port 8080
server.listen( 8080 );