# !!! Not maintained anymore !!!
Since I do not use Homebridge and Domoticz anymore, this module is not maintained. Feel free to fork it and make the changes you need.

# homebridge-http-sprinkler

[![npm](https://img.shields.io/npm/v/homebridge-http-sprinkler.svg)](https://www.npmjs.com/package/homebridge-http-sprinkler) [![npm](https://img.shields.io/npm/dt/homebridge-http-sprinkler.svg)](https://www.npmjs.com/package/homebridge-http-sprinkler)

## Description

This [homebridge](https://github.com/nfarina/homebridge) plugin exposes a web-based sprinkler/valve to Apple's [HomeKit](http://www.apple.com/ios/home/) and allows you to control it via HTTP requests.

## Installation

1. Install [homebridge](https://github.com/nfarina/homebridge#installation-details)
2. Install this plugin: `npm install -g homebridge-http-sprinkler`
3. Update your `config.json` file

## Configuration

### Core
| Key | Description | Default |
| --- | --- | --- |
| `accessory` | Must be `HttpSprinkler` | N/A |
| `name` | Name to appear in the Home app | N/A |
| `onUrl` | URL to turn on sprinklers | N/A |
| `offUrl` | URL to turn off sprinklers | N/A |

### Optional fields
| Key | Description | Default |
| --- | --- | --- |
| `icon` _(optional)_ | Icon to be shown in the Home app (`0`, `1`, `2`, `3`) | `0` |
| `checkStatus` _(optional)_ | Whether the status should be checked via the API (`once`, `polling`, `no`) | `no` |
| `jsonPath` _(optional)_ | JSON Path where the status can be found - required when `checkStatus` is `once` or `polling` | N/A |
| `onValue` _(optional)_ | Value for On when status is checked | `On` |
| `offValue` _(optional)_ | Value for Off when status is checked | `Off` |
| `useTimer` _(optional)_ | Indication if a timer can be used (`yes` or `no`) | `no` |
| `defaultTime` _(optional)_ | Default time (in seconds) the timer should be set to if enabled | `300` |
| `pollingInterval` _(optional)_ | If `checkStatus` is set to `polling`, this is the time (in ms) between status checks| `3000` |

### Additional fields
| Key | Description | Default |
| --- | --- | --- |
| `timeout` _(optional)_ | Time (in milliseconds) until the accessory will be marked as _Not Responding_ if it is unreachable | `5000` |
| `httpMethod` _(optional)_ | HTTP method used to communicate with the device | `GET` |
| `model` _(optional)_ | Appears under the _Model_ field for the accessory | `homebridge-http-sprinkler` |
| `serial` _(optional)_ | Appears under the _Serial_ field for the accessory | `homebridge-http-sprinkler` |
| `manufacturer` _(optional)_ | Appears under the _Manufacturer_ field for the accessory | `goedh452` |

## Configuration Examples

#### Simple configuration:

```json
"accessories": [
     {
       "accessory": "HttpSprinkler",
       "name": "HTTP Sprinkler",
       "onUrl": "http://myurl.com/on",
       "offUrl": "http://myurl.com/off"
     }
]
```

#### Sample based on Domoticz JSON API:

 ```json
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
]
```    
