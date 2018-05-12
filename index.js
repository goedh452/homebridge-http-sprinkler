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
    this.url = config["url"];
    this.http_method = config["http_method"];
    this.sendimmediately = config["sendimmediately"];
    this.default_state_off = config["default_state_off"];
    this.name = config["name"];
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
        callback(null, !this.default_state_off);
    },

    setPowerState: function(powerOn, callback) {
        var body;

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
//		.setConfigValues(that.config)
//		.updateUsingHSReference(that.config.ref);
					
	valveService.getCharacteristic(Characteristic.InUse)
//		.setConfigValues(that.config)
//		.updateUsingHSReference(that.config.ref);
					
	valveService.getCharacteristic(Characteristic.ValveType)
//		.updateValue(this.config.valveType)
	    
	    
//        var informationService = new Service.AccessoryInformation();
//
//        informationService
//                .setCharacteristic(Characteristic.Manufacturer, "Sprinkler manufacturer")
//                .setCharacteristic(Characteristic.Model, "Sprinkler model")
//                .setCharacteristic(Characteristic.SerialNumber, "Sprinkler Serial Number");
//
//        switchService = new Service.Switch(this.name);
//        switchService
//                .getCharacteristic(Characteristic.On)
//                .on('get', this.getPowerState.bind(this))
//                .on('set', this.setPowerState.bind(this));
//
//    
        return [valveService];
    }
};
