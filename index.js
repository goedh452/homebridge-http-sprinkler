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
	this.minTime		= config["minTime"]		|| 1;
	this.httpMethod         = config["httpMethod"]   	|| "GET";

	//realtime polling info
	this.statusOn = false;
	this.enableSet = true;
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
					done(null, body);
				}
			})
		}, { longpolling: true, interval: that.pollingInterval, longpollEventName: "statuspoll" });


		statusemitter.on("statuspoll", function (responseBody) 
		{
			if (that.onValue && that.offValue) 
			{
				var json = JSON.parse(responseBody);
				var status = eval("json." + that.jsonPath);
				var statusOn = 0;
				
				if (status == that.onValue) { statusOn = 1; }
				if (status == that.offValue) { statusOn = 0; }
			} 
          
			that.log("State is currently:", statusOn);
 
			if (that.valveService) 
			{
				that.valveService.getCharacteristic(Characteristic.Active)
					.updateValue(statusOn);
		   
				that.valveService.getCharacteristic(Characteristic.InUse)
					.updateValue(statusOn);
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
		
		var that = this;
		
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
		
		this.valveService.getCharacteristic(Characteristic.InUse).updateValue(inuse);
		
		this.httpRequest(url, "", "GET", function (error, response, body)
		{
			if (error)
			{
				that.log("HTTP set status function failed %s", error.message);
			} 
		})	
		
		this.log("HTTP power function succeeded!");
		
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
					
					.on('set', this.setPowerState.bind(this));
				
			break;
			default:
				that.log("Check status: default");
				this.valveService
					.getCharacteristic(Characteristic.Active)
					.on('set', this.setPowerState.bind(this))
				break;
                }
		
		if (this.useTimer == "yes") {
			this.valveService.addCharacteristic(Characteristic.SetDuration)
					.on('change', (data)=> 
						{
							console.log("Valve Time Duration Set to: " + data.newValue + " seconds")
							if(this.valveService.getCharacteristic(Characteristic.InUse).value)
							{
								this.valveService.getCharacteristic(Characteristic.RemainingDuration)
									.updateValue(data.newValue);
									
								clearTimeout(this.valveService.timer); // clear any existing timer
								this.valveService.timer = setTimeout( ()=> 
										{
											console.log("Valve Timer Expired. Shutting off Valve");
											// use 'setvalue' when the timer ends so it triggers the .on('set'...) event
											this.valveService.getCharacteristic(Characteristic.Active).setValue(0); 
										}, (data.newValue *1000));	
							}
						}); // end .on('change' ...

				this.valveService.addCharacteristic(Characteristic.RemainingDuration)
					.on('change', (data) => { console.log("Valve Remaining Duration changed to: " + data.newValue) });

				this.valveService.getCharacteristic(Characteristic.InUse)
					.on('change', (data) =>
						{
							switch(data.newValue)
							{
								case 0:
								{
									this.valveService.getCharacteristic(Characteristic.RemainingDuration).updateValue(0);
									clearTimeout(this.valveService.timer); // clear the timer if it was used!
									break;
								}
								case 1:
								{
									var timer = this.valveService.getCharacteristic(Characteristic.SetDuration).value;
									
									if (timer < this.minTime) 
										{
											console.log("Selected Valve On Duration of: " 
												    	+ timer 
												    	+ " seconds is less than the minimum permitted time, setting On time to: "
													+ this.minTime
												    	+ " seconds");
													timer = this.minTime
										}
									this.valveService.getCharacteristic(Characteristic.RemainingDuration)
										.updateValue(timer);
									
									console.log("Turning Valve "
										    	+ this.name
										    	+ " on with Timer set to: "
										    	+ timer
										    	+ " seconds");									
									this.valveService.timer = setTimeout( ()=> {
														console.log("Valve Timer Expired. Shutting off Valve");
														// use 'setvalue' when the timer ends so it triggers the .on('set'...) event
														this.valveService.getCharacteristic(Characteristic.Active).setValue(0); 
												}, (timer *1000));
									break;
								}
							}
						}); // end .on('change' ...
			} // end if(this.useTimer)
		
		return [this.valveService];
	}
};
