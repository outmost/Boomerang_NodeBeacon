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
        var urlParts = url.parse(request.url,true);
 
        // Parse "u" parameter from request URL using tldtools
        var rUrl = urlParts.query.u;
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
		
		var pageType = urlParts.query.pageType;
        var userStatus = urlParts.query.userStatus;
 
        // Parse "ip" parameter from request URL using GEO IP
        var loc = geoip.lookup(urlParts.query.ip);
        var country = loc.country;
        var region = loc.region;
 
        // Parse "ua" parameter from Request URL using UA-Parser
        var ua = useragent.parse(urlParts.query.ua);
        var browser = ua.family;
        var browser_version = ua.major;
        var os = ua.os.family;
        var device = ua.device.family;
		
		// move this to Boomerang to ease load on Node Beacon?
		var uaString = urlParts.query.ua.toString();
		var mobileTest = uaString.toLowerCase();
		if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(mobileTest)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(mobileTest.substr(0,4))) {
		var deviceType = "mobile";
		}
		else {
		var deviceType = "desktop";
		}
	
		// Check to see if the "r" (referrer) parameter is empty, if so then mark as New Visit
		// NOTE: assumes users are not tracked across domains - a user browsing between www.example.com and blog.example.com would be marked as a repeat visit, even if the www and blog site share no cachable files.
		if (urlParts.query.r.length >= 1) { 
			var visitType = "repeat"; 
		}
		else { 
			var visitType = "new"; 
		}
		
		// Parse load time parameters and convert to milliseconds using ms
		var responseTime = ms(urlParts.query.t_resp);
		var pageReady = ms(urlParts.query.t_page);
		var docComplete = ms(urlParts.query.t_done);
 
 
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
 
        //c.timing(root+'.'+tld+'.'+subdomain+'.pages.'+pageType+'.TTFB', responseTime);
        //c.timing(root+'.'+tld+'.'+subdomain+'.pages.'+pageType+'.Render', pageReady);
        c.timing(root+'.'+tld+'.'+subdomain+'.pageTypes.'+pageType+'.docComplete', docComplete);
 
        c.timing(root+'.'+tld+'.'+subdomain+'.geographical.'+country+'.'+region+'.docComplete', docComplete);
        
        c.timing(root+'.'+tld+'.'+subdomain+'.browsers.'+browser+'.'+browser_version+'.docComplete', docComplete);
 
		//tracking devices in graphite could be VERY expensive, let's try OS instead
        //c.timing(root+'.'+tld+'.'+subdomain+'.devices.'+device+'.docComplete', docComplete);
        c.timing(root+'.'+tld+'.'+subdomain+'.devices.'+deviceType+'.docComplete', docComplete);
 
        c.timing(root+'.'+tld+'.'+subdomain+'.visitors.'+visitType+'.docComplete', docComplete);
 
	// set server to listen for requests at port 8080
	}).listen( 8080 );
}