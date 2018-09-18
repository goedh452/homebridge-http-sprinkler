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
	this.name		= config["name"]          	|| "HTTP Sprinkler";
	this.icon		= config["icon"]		|| 0
	this.onUrl              = config["onUrl"];
	this.offUrl             = config["offUrl"];
	this.checkStatus 	= config["checkStatus"]		|| "no";
	this.pollingInterval    = config["pollingInterval"]   	|| 3000;
	this.statusUrl          = config["statusUrl"];
	this.jsonPath		= config["jsonPath"];
	this.onValue		= config["onValue"]		|| "On";
	this.offValue		= config["offValue"]		|| "Off";
	this.useTimer		= config["useTimer"]		|| "no";
	this.defaultTime	= config["defaultTime"]		|| 300;
	this.httpMethod         = config["httpMethod"]   	|| "GET";
	
	this.debuglogs          = config["debugON"]             || false
	
	if ( this.debuglogs )
	{
		//Spool config to log
		this.log("NAME: " + this.name);
		this.log("ICON: " + this.icon);
		this.log("ON URL: " + this.onUrl);
		this.log("OFF URL: " + this.offUrl);
		this.log("CHECKSTATUS: " + this.checkStatus);
		this.log("POLLINGINTERVAL: " + this.pollingInterval);
		this.log("STATUS URL: " + this.statusUrl);
		this.log("JSON PATH: " + this.jsonPath);
		this.log("ON VALUE: " + this.onValue);
		this.log("OFF VALUE: " + this.offValue);
		this.log("USE TIMER: " + this.useTimer);
		this.log("DEFAULT TIME: " + this.defaultTime);
		this.log("HTTP MEDTHOD: " + this.httpMethod);
	}
	
	//realtime polling info
	this.statusOn = false;
	var that = this;

	// Status Polling
	if (this.statusUrl && this.checkStatus === "polling") 
	{
		var powerurl = this.statusUrl;
		var statusemitter = pollingtoevent(function (done)
			{
			that.httpRequest(powerurl, "", "GET", function (error, response, body)
				{
					if (error)
					{
						that.log('HTTP get status function failed: %s', error.message);
						try 
						{
							done(new Error("Network failure that must not stop homebridge!"));
						} catch (err) 
						{
							that.log(err.message);
						}
					} 
					else 
					{
						if ( that.debuglogs )
						{
							that.log("POLLING: no error");
						}
						
						done(null, body);
					}
			})
		}, { interval: that.pollingInterval, eventName: "statuspoll" });


		statusemitter.on("statuspoll", function (responseBody) 
		{
			if ( that.debuglogs )
			{
				that.log("FUNCTION: Statusemitter");
			}
			
			if (that.onValue && that.offValue) 
			{
				var json = JSON.parse(responseBody);
				var status = eval("json." + that.jsonPath);
				
				if ( that.debuglogs )
				{
					that.log("STATUS: " + status);
					that.log("ON VALUE: " + that.onValue);
					that.log("OFF VALUE: " + that.offValue);
					that.log("JSON PATH: " + ("json." + that.jsonPath));
					that.log("JSON: " + responseBody);
				}
				
				if (status == that.onValue)
				{
					if ( that.debuglogs )
					{
					that.log("State is currently: ON");
					}
					
					that.valveService.getCharacteristic(Characteristic.Active)
					.updateValue(1);
		   
					that.valveService.getCharacteristic(Characteristic.InUse)
					.updateValue(1);
				}
				
				if (status == that.offValue)
				{
					if ( that.debuglogs )
					{
					that.log("State is currently: OFF");
					}
						
					that.valveService.getCharacteristic(Characteristic.InUse)
					.updateValue(0);
					
					that.valveService.getCharacteristic(Characteristic.Active)
					.updateValue(0);
				}
			
				if ( that.debuglogs )
				{	
					that.log("FUNCTION: statusemiteer after IF");
				}
			}

		});
	}
}


HttpSprinkler.prototype = 
{

	httpRequest: function (url, body, method, callback) 
	{
		var callbackMethod = callback;
		
		if ( this.debuglogs )
		{
			this.log("FUNCTION: httpRequest");
		}
		
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
		if ( this.debuglogs )
		{
			this.log("FUNCTION: getPowerState");
		}
		
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
		
		var that = this;
		
		if ( this.debuglogs )
		{
			this.log("FUNCTION: setPowerState");
		}
		
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
		
		this.httpRequest(url, "", "GET", function (error, response, body)
		{
			if (error)
			{
				that.log("HTTP set status function failed %s", error.message);
			} 
		}.bind(this))	
		
		this.log("HTTP power function succeeded!");
		this.valveService.getCharacteristic(Characteristic.InUse).updateValue(inuse);
		callback();
		
	},
	
	
	setPowerStatePolling: function (powerOn, callback) 
	{
		var url;
		var body;
		var inuse;
		
		var that = this;
		
		if ( this.debuglogs )
		{
			this.log("FUNCTION: setPowerStatePolling");
		}
		
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
		
		this.httpRequest(url, "", "GET", function (error, response, body)
		{
			if (error)
			{
				that.log("HTTP set status function failed %s", error.message);
			} 
		}.bind(this))	
		
		this.log("HTTP power function succeeded!");
		
		// InUse characteristic is set with the polling mechanism
		
		callback();
		
	},
	
	
	setDurationTime: function(data, callback)
	{
		console.log("Valve Time Duration Set to: " + data.newValue + " seconds")
		
		if(this.valveService.getCharacteristic(Characteristic.InUse).value)
		{
			this.valveService.getCharacteristic(Characteristic.RemainingDuration)
				.updateValue(data.newValue);
			
			// clear any existing timer
			clearTimeout(this.valveService.timer);
			
			this.valveService.timer = setTimeout( ()=> 
			{
				console.log("Valve Timer Expired. Shutting off Valve");
				// use 'setvalue' when the timer ends so it triggers the .on('set'...) event
				this.valveService.getCharacteristic(Characteristic.Active).setValue(0); 
			}, (data.newValue *1000));	
		}
	},
	
	
	setRemainingTime: function(data, callback)
	{
		switch(data.newValue)
		{
			case 0:
			{
				this.valveService.getCharacteristic(Characteristic.RemainingDuration).updateValue(0);
				clearTimeout(this.valveService.timer); // clear the timer if it was used
				break;
			}
			case 1:
			{
				var timer = this.valveService.getCharacteristic(Characteristic.SetDuration).value;
					
				this.valveService.getCharacteristic(Characteristic.RemainingDuration)
					.updateValue(timer);
									
				console.log("Turning Valve "
				    	+ this.name
				    	+ " on with Timer set to: "
				    	+ timer
				    	+ " seconds");									
					
				this.valveService.timer = setTimeout( ()=> 
				{
					console.log("Valve Timer Expired. Shutting off Valve");
			
					// use 'setvalue' when the timer ends so it triggers the .on('set'...) event
					this.valveService.getCharacteristic(Characteristic.Active).setValue(0); 
				}, (timer *1000));
				break;
			}
		}
	},
	
	
	getServices: function ()
	{
		var that = this;
		
		var informationService = new Service.AccessoryInformation();

		informationService
			.setCharacteristic(Characteristic.Manufacturer, "Sprinkler")
			.setCharacteristic(Characteristic.Model, "Sprinkler Model")
			.setCharacteristic(Characteristic.SerialNumber, "Sprinkler");

		this.valveService = new Service.Valve(this.name);
		
		this.valveService.getCharacteristic(Characteristic.ValveType).updateValue(this.icon);
		//this.valveService.addCharacteristic(Characteristic.IsConfigured);

		switch (this.checkStatus)
		{
			//Status polling
			case "once":
				this.log("Check status: once");
				var powerState = this.getPowerState.bind(this)
				var powerStateInt = 0
				
				this.valveService
					.getCharacteristic(Characteristic.Active)
					.on('set', this.setPowerState.bind(this))
					.on('get', powerState);
				
				if (powerState) { powerStateInt = 1 }
				else { powerStateInt = 0}
				
				this.valveService.getCharacteristic(Characteristic.InUse)
					.updateValue(powerStateInt);
				
                        break;
			case "polling":
				that.log("Check status: polling");
				this.valveService
					.getCharacteristic(Characteristic.Active)
					.on('get', function (callback) 
					{ callback(null, that.statusOn) })
					
					.on('set', this.setPowerStatePolling.bind(this))
				
			break;
			default:
				that.log("Check status: default");
				this.valveService
					.getCharacteristic(Characteristic.Active)
					.on('set', this.setPowerState.bind(this))
				
			break;
                }
		
		if (this.useTimer == "yes") 
		{
			this.valveService.addCharacteristic(Characteristic.SetDuration);
			this.valveService.addCharacteristic(Characteristic.RemainingDuration);
			
			// Set initial runtime from config
			this.valveService.getCharacteristic(Characteristic.SetDuration).setValue(this.defaultTime);
			
			this.valveService.getCharacteristic(Characteristic.SetDuration)
				.on('change', this.setDurationTime.bind(this));
			
			this.valveService.getCharacteristic(Characteristic.RemainingDuration)
				.on('change', (data) => { console.log("Valve Remaining Duration changed to: " + data.newValue) })

			this.valveService.getCharacteristic(Characteristic.InUse)
				.on('change', this.setRemainingTime.bind(this));
		}
		
		return [this.valveService];
	}
};
