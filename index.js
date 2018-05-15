var Service, Characteristic;
var syncRequest = require('sync-request');
var request = require("request");
var pollingtoevent = require('polling-to-event');


module.exports = function(homebridge) 
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-http-sprinkler", "HttpSprinkler", HttpSprinkler);
};


function HttpSprinkler(log, config) 
{
	this.log = log;
	
	// Get config info
	this.name		= config["name"]          	|| "HTTP Switch";
	this.onUrl              = config["onUrl"];
	this.offUrl             = config["offUrl"];
	this.checkStatus 	= config["checkStatus"]		|| "no";
	this.pollingMillis      = config["pollingMillis"]   	|| 3000;
	this.statusUrl          = config["statusUrl"];
	this.jsonPath		= config["jsonPath"];
	this.onValue		= config["onValue"]		|| "On";
	this.offValue		= config["offValue"]		|| "Off";
	this.httpMethod         = config["httpMethod"]   	|| "GET";

	//realtime polling info
	this.state = false;
	this.currentlevel = 0;
	this.enableSet = true;
	var that = this;

	// Status Polling
    if (this.statusUrl && this.checkStatus === "realtime") 
    {
	    that.log("POLLING 1");
        var powerurl = this.statusUrl;
        var statusemitter = pollingtoevent(function (done)
        {	that.log("POLLING 1a");
            that.httpRequest(powerurl, "", "GET", function (error, response, body)
            {
		    
                if (error)
                {
			that.log("POLLING 1b");
                    that.log('HTTP get power function failed: %s', error.message);
                    try 
                    {
			    that.log("POLLING 1c");
                        done(new Error("Network failure that must not stop homebridge!"));
                    } catch (err) 
                    {
			    that.log("POLLING 1d");
                        that.log(err.message);
                    }
                } 
                else 
                {
			that.log("POLLING 1e");
                    done(null, body);
                }
            })
        }, { longpolling: true, interval: 2000, longpollEventName: "statuspoll" });


        statusemitter.on("statuspoll", function (responseBody) 
        {
		that.log("POLLING 3");
            if (that.onValue && that.offValue) 
            {
		var json = JSON.parse(responseBody);
		var status = eval("json." + that.jsonPath);
		var statusOn = 0;
		    
		    that.log(responseBody);
		    that.log("STATUS: " + status);
		    that.log("JSONPATH: " + that.jsonPath);
		    
		    if (status == that.onValue) { statusOn = 1; }
		    if (status == that.offValue) { statusOn = 0; }
	       
                that.log("Status On Status Poll", statusOn);
               } 
          
            that.log("Received power from polling", that.statusUrl, "state is currently", statusOn);
 
            if (that.valveService) 
            {
		    that.log("Characteristics aanpassen!");
                that.valveService.getCharacteristic(Characteristic.Active)
                        .updateValue(that.statusOn);
		   that.valveService.getCharacteristic(Characteristic.InUse)
                        .updateValue(that.statusOn);
            }

            that.enableSet = true;
        });
    }
}


HttpSprinkler.prototype = 
{

	httpRequest: function (url, body, method, callback) 
	{
		var callbackMethod = callback;
		
		request({
			url: url,
			body: body,
			method: method,
			rejectUnauthorized: false
			},
			function (error, response, responseBody) 
			{
			if (callbackMethod) 
			{
				callbackMethod(error, response, responseBody)
			}
			else 
			{
				//this.log("callbackMethod not defined!");
			}
			})
	},
		

	getPowerState: function (callback) 
	{
		
		if (!this.statusUrl || !this.jsonPath || !this.offValue) 
		{
			this.log("Ignoring request: Missing status properties in config.json.");
			callback(new Error("No status url defined."));
			return;
		}

		var url = this.statusUrl;
				
		this.httpRequest(url, "", "GET", function (error, response, responseBody) 
		{
			if (error) 
			{
				this.log('HTTP get status function failed: %s', error.message);
				callback(error);
			}
			else 
			{
				var powerOn = false;
				var json = JSON.parse(responseBody);
				var status = eval("json." + this.jsonPath);
				
				if (status != this.offValue) 
				{
					powerOn = true;
				}
				else 
				{
					powerOn = false;
				}
				
				this.log("status received from: " + url, "state is currently: ", powerOn.toString());
				callback(null, powerOn);
			}
		}.bind(this));
	},
	
	
	setPowerState: function (powerOn, callback) 
	{
		
		var url;
		var body;
		var inuse;

		if (!this.onUrl || !this.offUrl) 
		{
			this.log("Ignoring request: No power url defined.");
			callback(new Error("No power url defined."));
			return;
		}

		if (powerOn) 
		{
			url = this.onUrl;
			inuse = 1;
			this.log("Setting power state to on");
		} 
		else 
		{
			url = this.offUrl;
			inuse = 0;
			this.log("Setting power state to off");
		}
		
		var res = syncRequest(this.httpMethod, url, {});
		if(res.statusCode > 400) 
		{
			this.log('HTTP power function failed');
			callback(error);
		}
		else 
		{
			this.log('HTTP power function succeeded!');
			this.valveService.getCharacteristic(Characteristic.InUse).updateValue(inuse);
			
			callback();
		}
	},
	
	
	getServices: function ()
	{
		var that = this;
		
		var informationService = new Service.AccessoryInformation();

		informationService
			.setCharacteristic(Characteristic.Manufacturer, "Sprinkler Manufacturer")
			.setCharacteristic(Characteristic.Model, "Sprinkler Model")
			.setCharacteristic(Characteristic.SerialNumber, "Sprinkler Serial Number");

		this.valveService = new Service.Valve(this.name);
		
		this.valveService.getCharacteristic(Characteristic.ValveType).updateValue(1);

		switch (this.checkStatus)
		{
			//Status polling
			case "yes":
				this.log("Check status: yes");
				this.valveService
					.getCharacteristic(Characteristic.Active)
					.on('set', this.setPowerState.bind(this))
					.on('get', this.getPowerState.bind(this));
		
				this.valveService.getCharacteristic(Characteristic.InUse)
					.on('get', this.getPowerState.bind(this));
                        break;
			case "realtime":
				that.log("Check status: realtime");
				this.valveService
					.getCharacteristic(Characteristic.Active)
					.on("get", function (callback) 
					{ callback(null, that.state) })
					
					.on('set', this.setPowerState.bind(this));
				break;
			default:
				that.log("Check status: default");
				this.valveService
					.getCharacteristic(Characteristic.Active)
					.on('set', this.setPowerState.bind(this))
				break;
                }
		
		return [this.valveService];
	}
};
