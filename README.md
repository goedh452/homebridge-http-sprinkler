# homebridge-http-sprinkler
A switch plugin for [homebridge](https://github.com/nfarina/homebridge) which integrates with HTTP(S) APIs.

A plugin for sprinklers that can be controlled with an API.

# Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin: `npm install -g homebridge-http-sprinkler`
3. Update your `config.json` configuration file

## Structure & Interfacing

| Key | Description |
| --- | --- |
| `accessory` | Must be `HttpSprinkler` |
| `name` | Name to appear in the Home app |
| `onUrl` | URL to turn on sprinklers |
| `offUrl` | URL to turn on sprinklers |
| `icon` _(optional)_ | Icon to be shown in the Home app (`0-3`, Default is `0`) |
| `timeout` _(optional)_ | Time (in milliseconds) until the accessory will be marked as "Not Responding" if it is unreachable. (5000ms default) |
| `httpMethod` _(optional)_ | Method for sending requests (`GET` is default) |
| `checkStatus` _(optional)_ | Whether the status should be checked via the API (`once`, `polling`, `no`; `no` is default) |
| `pollingInterval` _(optional)_ | If `checkStatus` is set to `polling`, this is the time (in ms) betwwen status checks (3000ms default) |
| `jsonPath` _(optional)_ | JSON Path where the status can be found; required when `checkStatus` is `once` or `polling` |
| `onValue` _(optional)_ | Value for On when status is checked (`On` is default) |
| `offValue` _(optional)_ | Value for Off when status is checked (`Off` is default) |
| `useTimer` _(optional)_ | Indication if a timer can be used (possible values: `yes`, `no`; `no` is default) |
| `defaultTime` _(optional)_ | Default time (in seconds) the timer should be set to if enabled |
| `model` _(optional)_ | Appears under "Model" for your accessory in the Home app |
| `serial` _(optional)_ | Appears under "Serial" for your accessory in the Home app |
| `manufacturer` _(optional)_ | Appears under "Manufacturer" for your accessory in the Home app |

## Configuration Examples

### Simple configuration

```json
 "accessories": [
     {
       "accessory": "HttpSprinkler",
       "name": "HTTP Sprinkler",
       "onUrl": "http://myurl.com/on",
       "offUrl": "http://myurl.com/off",
       "timeout": 3000
     }
]
```

### Sample based on Domoticz JSON API:

 ``` 
"accessories": [ 
        {
                "accessory": "HttpSprinkler",
                "name": "Sprinkler backyard",
                "icon": 1,
                "onUrl": "http://localhost:8080/json.htm?type=command&param=switchlight&idx=135&switchcmd=On",
                "offUrl": "http://localhost:8080/json.htm?type=command&param=switchlight&idx=135&switchcmd=Off",
                "timeout": 3000,
                "checkStatus": "polling",
                "pollingInterval": 5000,
                "statusUrl": "http://localhost:8080/json.htm?type=devices&rid=135",
                "jsonPath": "result[0].Status",
                "onValue": "On",
                "offValue": "Off",
                "useTimer": "yes",
                "defaultTime": 900,
                "httpMethod": "GET"
        }
```    
