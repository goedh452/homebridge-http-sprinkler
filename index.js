"use strict";

var Service, Characteristic;
var request = require("request");
var pollingtoevent = require('polling-to-event');


module.exports = function(homebridge) {

    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-http-sprinkler", "http-sprinkler", HttpSprinkler);
};


function HttpSprinkler(log, config) {
    this.log = log;

    this.name                   = config["name"]                || "HTTP Switch";
    this.checkStatus 	        = config["checkStatus"] 	|| "no";
    this.pollingMillis          = config["pollingMillis"]       || 10000;
    this.onUrl                  = config["onUrl"];
    this.onBody                 = config["onBody"];
    this.offUrl                 = config["offUrl"];
    this.offBody                = config["offBody"];
    this.statusUrl              = config["statusUrl"];
    this.statusRegex            = config["statusRegex"]		|| "";
    this.httpMethod             = config["httpMethod"] 	  	|| "GET";

    this.state = false;

    var that = this;

//    this.services = {
//        AccessoryInformation: new Service.AccessoryInformation(),
//        Switch: new Service.Switch(this.name)
//    };

    this.services.AccessoryInformation
        .setCharacteristic(Characteristic.Manufacturer, "sprinkler");
//    this.services.AccessoryInformation
        .setCharacteristic(Characteristic.Model, "sprinkler");

    switch (this.checkStatus) {
        case "yes":
            this.services.Switch
                .getCharacteristic(Characteristic.On)
                .on('get', this.getStatusState.bind(this))
                .on('set', this.setPowerState.bind(this));
            break;
        case "polling":
            this.services.Switch
                .getCharacteristic(Characteristic.On)
                .on('get', function(callback) {callback(null, that.state)})
                .on('set', this.setPowerState.bind(this));
            break;
        default	:
            this.services.Switch
                .getCharacteristic(Characteristic.On)
                .on('set', this.setPowerState.bind(this));
            break;
    }

    // Status Polling
    if (this.statusUrl && this.checkStatus === "polling") {

        var url = this.statusUrl;
        var statusemitter = pollingtoevent(function(done) {
            that.httpRequest(url, "", "GET", function(error, response, body) {
                if (error) {
                    that.log('HTTP get status function failed: %s', error.message);
                    callback(error);
                }
                else {
                    done(null, body);
                }
            })
        }, {longpolling:true, interval:that.pollingMillis, longpollEventName:"statuspoll"});

        statusemitter.on("statuspoll", function(data) {
            if (Boolean(that.statusRegex)) {
                var re = new RegExp(that.statusRegex);
                that.state = re.test(data);
            }
            else {
                var binaryState = parseInt(data);
                that.state = binaryState > 0;
            }
            that.log("status received from: " + that.statusUrl, "state is currently: ", that.state.toString());

            that.services.Switch
                .getCharacteristic(Characteristic.On)
                .setValue(that.state);
        });
    }
}


HttpSwitchAccessory.prototype.httpRequest = function (url, body, method, callback) {

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
};


HttpSwitchAccessory.prototype.getStatusState = function (callback) {

    if (!this.statusUrl) {
        this.log.warn("Ignoring request: No status url defined.");
        callback(new Error("No status url defined."));
        return;
    }

    var url = this.statusUrl;
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
    }.bind(this));
};


HttpSwitchAccessory.prototype.setPowerState = function (powerOn, callback) {

    var url;
    var body;

    if (!this.onUrl || !this.offUrl) {
        this.log.warn("Ignoring request: No power url defined.");
        callback(new Error("No power url defined."));
        return;
    }

    if (powerOn) {
        url = this.onUrl;
        body = this.onBody;
        this.log("Setting power state to on");
    } else {
        url = this.offUrl;
        body = this.offBody;
        this.log("Setting power state to off");
    }

    this.httpRequest(url, body, this.httpMethod, function (error, response, responseBody) {
        if (error) {
            this.log('HTTP set power function failed: %s', error.message);
            callback(error);
        }
        else {
            this.log('HTTP set power function succeeded!');
            callback();
        }
    }.bind(this));
};


HttpSwitchAccessory.prototype.getServices = function () {
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
