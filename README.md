# homebridge-http-sprinkler
A switch plugin for homebridge (https://github.com/nfarina/homebridge) which integrates with HTTP(S) APIs.

Based on homebridge-http-switch from vectronic (https://github.com/vectronic/homebridge-http-switch)

A plugin for sprinklers that can be controlled with an API.


# Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin: `npm install -g git+https://github.com/goedh452/homebridge-http-sprinkler.git`
3. Update your `config.json` configuration file

# Configuration

Name             | Required    | Description
---------------- | ----------- | --------------------------------------------
name             | No          | Name in home app (default HTTP Sprinkler)
icon             | No          | Icon displayed in Home app (possible values: 0, 1, 2, 3; default 0)
onUrl            | Yes         | URL for turning on the sprinkler
offUrl           | Yes         | URL for turning off the sprinkler
checkStatus      | No          | Indicator if status should be checked via the API (possible values: once, polling, no; default no)
pollingInterval  | No          | If checkStatus is polling, the pollinginterval can be specified in milliseconds (default 3000 (3 seconds))
statusUrl        | No          | URL to check the status via the API; required when checkStatus is once or polling
jsonPath         | No          | JSON Path where the status can be found; required when checkStatus is once or polling
onValue          | No          | Value for On when status is checked (default On)
offValue         | No          | Value for Off when status is checked (default Off)
useTimer         | No          | Indication if a timer can be used (possible values: yes, no; default no)
minTime          | No          | Minimum time in seconds the timer can be set (default 1 second)
httpMethod       | No          | Method for sending requests (default GET)



Configuration sample based on Domoticz JSON API:

 ``` 
"accessories": [ 
        {
                "accessory": "HttpSprinkler",
                "name": "Sprinkler backyard",
                "onUrl": "http://localhost:8080/json.htm?type=command&param=switchlight&idx=135&switchcmd=On",
                "offUrl": "http://localhost:8080/json.htm?type=command&param=switchlight&idx=135&switchcmd=Off",
                "checkStatus": "polling",
                "pollingInterval": 5000,
                "statusUrl": "http://localhost:8080/json.htm?type=devices&rid=135",
                "jsonPath": "result[0].Status",
                "onValue": "On",
                "offValue": "Off",
                "useTimer": "yes",
                "minTime": 10,
                "httpMethod": "GET"
        }
```    
