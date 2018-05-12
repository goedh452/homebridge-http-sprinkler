var Service, Characteristic;
var request = require('sync-request');

var url 

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-http-sprinkler", "HttpSprinkler", HttpSprinkler);
}


function HttpSprinkler(log, config) {
    	this.log = log;

    	// url info
	this.on_url 		= config["on_url"];
    	this.off_url 		= config["off_url"];
    	this.status_url 	= config["status_url"];
	this.status_regex 	= config["status_regex"];
    	this.http_method 	= config["http_method"];
    	this.sendimmediately 	= config["sendimmediately"];
    	this.default_state_off 	= config["default_state_off"];
    	this.name 		= config["name"];
}

HttpSprinkler.prototype = {

    httpRequest: function (url, body, method, username, password, sendimmediately, callback) {
        request({
                    url: url,
                    body: body,
                    method: method,
                    rejectUnauthorized: false
                },
                function (error, response, body) {
                    callback(error, response, body)
                })
    },

    getPowerState: function (callback) {
        if (!this.status_url) {
        this.log.warn("Ignoring request: No status url defined.");
        callback(new Error("No status url defined."));
        return;
    }

    var url = this.status_url;
    var regex = this.statusRegex;

    this.httpRequest(url, "", "GET", function (error, response, responseBody) {
        if (error) {
            this.log('HTTP get status function failed: %s', error.message);
            callback(error);
        }
        else {
            var powerOn = false;
            if (Boolean(regex)) {
                var re = new RegExp(regex);
                powerOn = re.test(responseBody);
            }
            else {
                var binaryState = parseInt(responseBody);
                powerOn = binaryState > 0;
            }
            this.log("status received from: " + url, "state is currently: ", powerOn.toString());
            callback(null, powerOn);
        }
    },

    setPowerState: function(powerOn, callback) {
        var body;
	var url;
	    
	if (powerOn) {
        	url = this.on_url;
        	this.log("Setting power state to on");
        } else {
        	url = this.off_url;
        	this.log("Setting power state to off");
        }

		var res = request(this.http_method, this.url, {});
		if(res.statusCode > 400){
			this.log('HTTP power function failed');
			callback(error);
		}else{
			this.log('HTTP power function succeeded!');
            var info = JSON.parse(res.body);
            this.log(res.body);
            this.log(info);
			callback();
		}

    },

    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function () {
	var valveService = new Service.Valve();
	    
	valveService.isPrimaryService = true;
	valveService.displayName = "Service.Valve";
	valveService.timer = null;
			
	valveService.getCharacteristic(Characteristic.Active)
		.on('set', this.setPowerState.bind(this))
					
	valveService.getCharacteristic(Characteristic.InUse)
					
	valveService.getCharacteristic(Characteristic.ValveType)
		.updateValue(1)
	       
        return [valveService];
    }
};
