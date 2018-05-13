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
	this.pollingMillis      = config["pollingMillis"]   	|| 3000;
	this.statusUrl          = config["statusUrl"];
	this.jsonPath		= config["jsonPath"];
	this.onValue		= config["onValue"];
	this.offValue		= config["offValue"];
	this.httpMethod         = config["httpMethod"]   	|| "GET";

	var that = this;
	
	//realtime polling info
	this.state = false;
	this.currentlevel = 0;
	this.enableSet = true;
	var that = this;

	// Status Polling
	if (this.statusUrl && this.checkStatus === "realtime") {
		var powerurl = this.statusUrl;
		var statusemitter = pollingtoevent(function (done) {
			that.httpRequest(powerurl, "", "GET", "", "", "", function (error, response, body) {
				if (error) {
					that.log("HTTP get power function failed: %s", error.message);
					try {
						done(new Error("Network failure that must not stop homebridge!"));
					} catch (err) {
						that.log(err.message);
					}
				} else {
					done(null, body);
				}
			})
		}, { longpolling: true, interval: this.pollingMillis, longpollEventName: "statuspoll" });

		
	function compareStates(customStatus, stateData) {
		var objectsEqual = true;
		for (var param in customStatus) {
			if (!stateData.hasOwnProperty(param) || customStatus[param] !== stateData[param]) {
				objectsEqual = false;
				break;
			}
		}
		return objectsEqual;
	}

        statusemitter.on("statuspoll", function (responseBody)
	{
		var binaryState;
		
		if (that.onValue && that.offValue)
		{	//Check if custom status checks are set
			var customStatusOn = that.onValue;
			var customStatusOff = that.offValue;
			var statusOn, statusOff;

			// Check to see if custom states are a json object and if so compare to see if either one matches the state response
			if (responseBody.startsWith("{"))
			{
				statusOn = compareStates(customStatusOn, JSON.parse(responseBody));
				statusOff = compareStates(customStatusOff, JSON.parse(responseBody));
			} 
			else
			{
				statusOn = responseBody.includes(customStatusOn);
				statusOff = responseBody.includes(customStatusOff);
			}
			that.log("Status On Status Poll", statusOn);
			
			if (statusOn) binaryState = 1;
			
			// else binaryState = 0;
			if (statusOff) binaryState = 0;
		} 
		else
		{
			binaryState = 0; //parseInt(responseBody.replace(/\D/g, ""));
		}
		
		that.state = binaryState > 0;
		that.log(that.service, "received power", that.status_url, "state is currently", binaryState);
		
		// switch used to easily add additonal services
		that.enableSet = false;
		
		that.valveService.getCharacteristic(Characteristic.Active)
			.setValue(that.state);
		
		that.valveService.getCharacteristic(Characteristic.InUse)
			.setValue(that.state);

		that.enableSet = true;
	});
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
				var status = eval("json." + this.jsonPath);
				
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
			inuse = 1;
			this.log("Setting power state to on");
		} else {
			url = this.offUrl;
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
		
		switch (this.checkStatus) {
				//Status polling
			case "yes":
				this.valveService
					.getCharacteristic(Characteristic.Active)
					.on('set', this.setPowerState.bind(this))
					.on('get', this.getPowerState.bind(this));
		
				valveService.getCharacteristic(Characteristic.InUse)
					.on('get', this.getPowerState.bind(this));
                        break;
			case "realtime":
				this.valveService
				.getCharacteristic(Characteristic.Active)
				.on("get", function (callback) {
					callback(null, that.state)
				})
				.on('set', this.setPowerState.bind(this));
                        break;
			default:
				this.switchService
					.getCharacteristic(Characteristic.Active)
					.on('set', this.setPowerState.bind(this))
                        break;
                }
		
		return [valveService];
	}
};
