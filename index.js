var Service, Characteristic;
var syncRequest = require('sync-request');
var request = require("request");
var pollingtoevent = require('polling-to-event');


module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-http-sprinkler", "HttpSprinkler", HttpSprinkler);
};


function HttpSprinkler(log, config) {
	this.log = log;
	
	// Get config info
	this.name		= config["name"]          	|| "HTTP Switch";
	this.onUrl              = config["onUrl"];
	this.offUrl             = config["offUrl"];
	this.checkStatus 	= config["checkStatus"]		|| "no";
	this.pollingSec	        = config["pollingMillis"]   	|| 1;
	this.statusUrl          = config["statusUrl"];
	this.jsonPath		= config["jsonPath"];
	this.offValue		= config["offValue"];
	this.httpMethod         = config["httpMethod"]   	|| "GET";

	this.state = false;

	var that = this;
}


HttpSprinkler.prototype = {
	
	httpRequest: function (url, body, method, callback) {
		
		var callbackMethod = callback;
		
		request({
			url: url,
			body: body,
			method: method,
			rejectUnauthorized: false
		},
			function (error, response, responseBody) {
			if (callbackMethod) {
				callbackMethod(error, response, responseBody)
			}
			else {
				this.log.warn("callbackMethod not defined!");
			}
		})
	},
		

	getPowerState: function (callback) {
		
		if (!this.statusUrl || !this.jsonPath || !this.offValue) {
			this.log.warn("Ignoring request: Missing status properties in config.json.");
			callback(new Error("No status url defined."));
			return;
		}

		var url = this.statusUrl;
				
		this.httpRequest(url, "", "GET", function (error, response, responseBody) {
			if (error) {
				this.log('HTTP get status function failed: %s', error.message);
				callback(error);
			}
			else {
				var powerOn = false;
				var json = JSON.parse(responseBody);
				var status = window["json." + this.jsonPath];
				//var status = json.result[0].Status;
	
				this.log("STATUS: " + status);
				
				if (status != this.offValue) {
					powerOn = true;
				}
				else {
					powerOn = false;
				}
				
				this.log("status received from: " + url, "state is currently: ", powerOn.toString());
				callback(null, powerOn);
			}
		}.bind(this));
	},
	
	
	setPowerState: function (powerOn, callback) {
		
		var url;
		var body;
		var inuse;

		if (!this.onUrl || !this.offUrl) {
			this.log.warn("Ignoring request: No power url defined.");
			callback(new Error("No power url defined."));
			return;
		}

		if (powerOn) {
			url = this.onUrl;
			//body = this.onBody;
			inuse = 1;
			this.log("Setting power state to on");
		} else {
			url = this.offUrl;
			//body = this.offBody;
			inuse = 0;
			this.log("Setting power state to off");
		}
		
		var res = syncRequest(this.httpMethod, url, {});
		if(res.statusCode > 400) {
			this.log('HTTP power function failed');
			callback(error);
		}
		else {
			this.log('HTTP power function succeeded!');
			valveService.getCharacteristic(Characteristic.InUse).updateValue(inuse);
			
			callback();
		}
	},
	
	
	getServices: function () {
		var informationService = new Service.AccessoryInformation();

		informationService
			.setCharacteristic(Characteristic.Manufacturer, "Sprinkler Manufacturer")
			.setCharacteristic(Characteristic.Model, "Sprinkler Model")
			.setCharacteristic(Characteristic.SerialNumber, "Sprinkler Serial Number");

		valveService = new Service.Valve(this.name);
		valveService.getCharacteristic(Characteristic.ValveType).updateValue(1)
		valveService.getCharacteristic(Characteristic.Active)
			.on('set', this.setPowerState.bind(this))
			.on('get', this.getPowerState.bind(this))

		return [valveService];
	}
};
