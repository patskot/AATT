//R E Q U I R E S
var express = require('express')
var app = express();
var http = require('http'); 
var https = require('https');
var cons = require('consolidate')
var childProcess = require('child_process');
var path =require('path');
var phantomjs = require('phantomjs/lib/phantomjs');
var binPath = phantomjs.path
var fs = require('fs');
var bodyParser = require('body-parser');
var session = require('express-session');
var debug = require('debug');
var log = debug('AATT:log');
var error = debug('AATT:error');
var nconf = require('nconf');

nconf.env().argv();

// B A S I C 	C O N F I G
var http_port = nconf.get('http_port') || 80;		// Start with Sudo for starting in  port 80 or 443
var https_port = nconf.get('https_port') || 443;
var ssl_path= 'cert/ssl.key';
var cert_file = 'cert/abc.cer';

// Add headers
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.set('views', __dirname + '/views');
app.engine('html', cons.handlebars);
app.set('view engine', 'html');

app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));

app.use(session({ resave: true,
	      saveUninitialized: true,
	      secret: 'uwotm8' }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'src')));
app.use('/test', express.static(__dirname + '/test'));
app.use('/screenshots', express.static(__dirname + '/screenshots'));
app.use('/Auditor',express.static(path.join(__dirname, 'src/HTML_CodeSniffer/Auditor')));    
app.use('/Images',express.static(path.join(__dirname, 'src/HTML_CodeSniffer/Auditor/Images')));

if (fs.existsSync(ssl_path)) {
		var hskey = fs.readFileSync(ssl_path);
		var hscert = fs.readFileSync(cert_file) ; 	
		var options = {
		    key: hskey,
		    cert: hscert
		};
		var httpsServer = https.createServer(options, app);
		httpsServer.listen(https_port);
		log('Express started on port ' , https_port);

} else {
		var server = http.createServer(app);
		app.listen(http_port);					
		log('Express started on port ', http_port);
}
	// /sniffURL', {'textURL': this.website.url, 'output': 'json','scrshot': false}
	app.post('/sniffurl', function(req, res) {
 		var childArgs
 		, userName = ''
 		, d = new Date()
        , customDateString = d.getHours() +'_'  + d.getMinutes() + '_' + d.getSeconds() +'_'+ d.getMonth() + '_' + d.getDate() + '_' + d.getFullYear()
        , dirName = "screenshots/" + customDateString
        , scrshot = req.body.scrshot
        , msgErr = req.body.msgErr
        , msgWarn = req.body.msgWarn
        , msgNotice = req.body.msgNotice
    	, eLevel=[1]
    	, engine = req.body.engine
			, output =req.body.output

		if(typeof engine === 'undefined' || engine ==='') engine = 'htmlcs';
		if(typeof output === 'undefined' || output ==='') output = 'string';

    	log('E N G I N E ', engine);

		if (typeof req.session.userName !== 'undefined') {
			userName = req.session.userName;
			log('Testing logged in session: -> ', userName)
		}
    	if(engine === 'htmlcs'){
	    	// if(typeof msgErr !== 'undefined' && msgErr=='true') eLevel.push(1);
	    	// if(typeof msgWarn !== 'undefined' && msgWarn=='true') eLevel.push(2);
	    	// if(typeof msgNotice !== 'undefined' && msgNotice=='true') eLevel.push(3);

	    	//Default to Error
			if(typeof msgErr === 'undefined' &&  typeof msgWarn === 'undefined' && typeof msgNotice === 'undefined') eLevel.push(1);

			if(typeof scrshot !== 'undefined' && scrshot === 'true')  fs.mkdirSync(dirName);		//Create SCREEN SHOT DIRECTORY
			childArgs = ['--config=config/config.json', path.join(__dirname, 'src/PAET.js')
							, req.body.textURL
							, 'WCAG2A'
							, userName
							, dirName
							, scrshot
							, eLevel
							, output
						];
		}
		if(engine === 'axe'){
			childArgs = ['--config=config/config.json', path.join(__dirname, 'src/axe_url.js'), 'url', req.body.textURL, output];
		}	
		if(engine === 'chrome'){
			childArgs = ['--config=config/config.json', path.join(__dirname, 'src/chrome_url.js'), 'url', req.body.textURL, output];
		}	
		childProcess.execFile(binPath, childArgs, function(err, stdout, stderr) {
			stdout = stdout.replace('done','');
			res.write(stdout);
	    res.end();
			log(stdout);
		});
	});
