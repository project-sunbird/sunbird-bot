const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
var https = require('https');
var http = require('http');
var fs = require('fs');
var _ = require('lodash');
var redis = require('redis');
var LOG = require('./log/logger')
var literals = require('./config/literals')
var config = require('./config/config')
var chatflow = require('./config/chatflow')
var reload = require('require-reload')(require),
chatflow = reload('./config/chatflow');
literals = reload('./config/literals');
var RasaCoreController = require('./controllers/rasaCoreController')
const telemetry = require('./api/telemetry/telemetry.js')
var UUIDV4 = require('uuid')
var date = new Date();
const parser = require('ua-parser-js')
const REDIS_KEY_PREFIX = "bot_";
const appBot = express()
//cors handling
appBot.use(cors());
//body parsers for requests
appBot.use(bodyParser.json());
appBot.use(bodyParser.urlencoded({ extended: false }))
var request = require("request");
var crypto = require('crypto');
const { data } = require('./log/logger');
const url = require('url');
const querystring = require('querystring');

// Redis is used as the session tracking store
const redisClient = redis.createClient(config.REDIS_PORT, config.REDIS_HOST);

// Route that receives a POST request to /bot
appBot.post('/bot', function (req, res) {
	var userId = req.body.userId ? req.body.userId : req.body.From;
	var data = {
		message: req.body.Body,
		recipient: userId,
		channel: 'botclient',
		customData: {
			userId: userId,
			deviceId: req.body.From,
			appId: req.body.appId + '.bot',
			env: req.body.appId + '.bot',
			sessionId: '',
			channelId: req.body.channel,
			uaspec: getUserSpec(req),
			requestid: req.headers["x-request-id"] ? req.headers["x-request-id"] :"",
		}
	}
	handler(req, res, data)
})


appBot.post('/whatsapp', function (req, res) {
	if (req.query.client_key == config.SECRET_KEY) {
		var userId = req.body.incoming_message[0].from;
		var data = {
			message: req.body.incoming_message[0].text_type.text,
			recipient: userId,
			channel: config.WHATSAPP,
			customData: {
				userId: crypto.createHash('sha256').update(req.body.incoming_message[0].from).digest("hex"),
				deviceId: crypto.createHash('sha256').update(req.body.incoming_message[0].from).digest("hex"),
				appId: config.TELEMETRY_DATA_PID_WHATSAPP,
				env: config.TELEMETRY_DATA_ENV_WHATSAPP,
				channelId: config.TELEMETRY_DATA_CHANNELID_WHATSAPP,
				sessionId: '',
				uaspec: getUserSpec(req),
				requestid: req.headers["x-request-id"] ? req.headers["x-request-id"] :"",
			}
		}
		handler(req, res, data)
	} else {
		var customData= {
			userId: crypto.createHash('sha256').update(req.body.incoming_message[0].from).digest("hex"),
			deviceId: crypto.createHash('sha256').update(req.body.incoming_message[0].from).digest("hex"),
			appId: config.TELEMETRY_DATA_PID_WHATSAPP,
			env: config.TELEMETRY_DATA_ENV_WHATSAPP,
			channelId: config.TELEMETRY_DATA_CHANNELID_WHATSAPP,
			sessionId: '',
			uaspec: getUserSpec(req),
			requestid: req.headers["x-request-id"] ? req.headers["x-request-id"] :"",
		}
		sendErrorResponse(res, customData)
	}

})

// Update latest config from blob
appBot.post('/refresh', function(req, response) {
	if(config.CONFIG_BLOB_PATH) {
		var domian = "https://" + config.CONFIG_BLOB_PATH + ".blob.core.windows.net"
		var url = domian + '/chatbot/router/config/'
		var dest = './config/'

		var literalsStr = 'literals.js';
		var chatflowStr = 'chatflow.js';
		updateConfigFromBlob(url, dest, literalsStr, function(){
			try {
				literals = reload('./config/literals');
				updateConfigFromBlob(url, dest, chatflowStr, function(){
					try {
						chatflow = reload('./config/chatflow');
						response.send({'msg': 'Configuration is updated successfully for chatflow and literals!!!'})
					} catch (e) {
						//if this threw an error, the api variable is still set to the old, working version
						console.error("Failed to reload chatflow.js! Error: ", e);
						response.send({'msg': e.message})
					}
				})
			} catch (e) {
				//if this threw an error, the api variable is still set to the old, working version
				console.error("Failed to reload literals.js! Error: ", e);
				response.send({'msg': e.message})
			}
		})
	} else {
		response.send({'msg': 'ENV configuration blob path is not defined'})
	}
})

var updateConfigFromBlob = function(url, dest, configName, cb) {
	url = url + configName;
	dest = dest + configName;
	var file = fs.createWriteStream(dest);
	var request = https.get(url, function(response) {
	  response.pipe(file);
	  file.on('finish', function() {
		file.close(cb);  // close() is async, call cb after close completes.
	  });
	}).on('error', function(err) { // Handle errors
	  fs.unlink(dest); // Delete the file async. (But we don't check the result)
	  if (cb) cb(err.message);
	});
  };

function handler(req, res, data) {


	var chatflowConfig = req.body.context ? chatflow[req.body.context] ? chatflow[req.body.context] : chatflow.chatflow : chatflow.chatflow;
	redisSessionData = {};

	if (!data.customData.deviceId) {
		var edata = {
			type: "system",
			level: "INFO",
			requestid: data.customData.requestid,
			message: "Attribute missing from request body"
		  }
		telemetry.telemetryLog(data.customData, edata);
		sendResponse(data.customData.deviceId, res, "From attribute missing", 400);
	} else {
		redisClient.get(REDIS_KEY_PREFIX + data.customData.deviceId, (err, redisValue) => {

			if (redisValue != null) {

				// Key is already exist and hence assiging data which is already there at the posted key
				redisSessionData = JSON.parse(redisValue);
				data.customData.sessionId = redisSessionData.sessionID;
				var telemetryData = {};
				// all non numeric user messages go to bot
				if (isNaN(data.message)) {
					///Bot interaction flow
					freeFlowLogic(data, res,chatflowConfig)

				} else {
					menuDrivenLogic(data, res, chatflowConfig)
				}
			} else {

				// Implies new user. Adding data in redis for the key and also sending the WELCOME message

				var uuID = UUIDV4();
				userData = { sessionID: uuID, currentFlowStep: 'step1' };
				setRedisKeyValue(data.customData.deviceId, userData);
				data.customData.sessionId = uuID;
				telemetry.logSessionStart(data.customData);
				if (data.channel == "botclient") {
					telemetryData = createInteractionData({ currentStep: 'step1', responseKey: chatflowConfig['step1']['messageKey'] }, data, false)
					telemetry.logInteraction(telemetryData)
					sendChannelResponse(res, chatflowConfig['step1']['messageKey'], data);

				} else {
					if (isNaN(data.message)) {
						///Bot interaction flow
						freeFlowLogic(data, res, chatflowConfig)

					} else {
						menuDrivenLogic(data, res, chatflowConfig)
					}

				}
			}
		});
	}
}

function freeFlowLogic(data, res, chatflowConfig) {
	RasaCoreController.processUserData(data, (err, resp) => {
		var response = '';
		var edata = {
			type: "system",
			level: "INFO",
			requestid: data.customData.requestid,
			message: ""
		  }
		if (err) {
			edata.message = "Sorry: Core RASA controller failed to load";
			telemetry.telemetryLog(data.customData, edata);
			sendChannelResponse(data.customData.deviceId, res, data, 'SORRY')
		} else {
			var responses = resp.res;
			if (responses && responses[0].text && responses[0].text != '') {
				response = responses[0].text;
				telemetryData = createInteractionData(responses[0], data, true);
			} else {
				responseKey = getErrorMessageForInvalidInput(responses[0], chatflowConfig, false);
				if (data.channel == config.WHATSAPP) {
					errorResponse = literals.message[responseKey + config._WHATSAPP];
					response = {
						"data":
							{ "text": errorResponse }
					}
				} else {
					response = literals.message[responseKey];
				}
				consolidatedLog(data, responseKey, '', false);
				telemetryData = createInteractionData(responses[0], data, true)
			}
			telemetry.logInteraction(telemetryData);
			if (data.channel == config.WHATSAPP) {
				edata.message = "Free flow whats app response";
				telemetry.telemetryLog(data.customData, edata);
				sendResponseWhatsapp(res, response, data.recipient, "freeFlow")
			} else {
				edata.message = "Free flow web poartal response";
				telemetry.telemetryLog(data.customData, edata);
				sendResponse(res, response)
			}

		}
	});

}

function menuDrivenLogic(data, res, chatflowConfig) {
	var menuIntentKnown = false
	var currentFlowStep = redisSessionData.currentFlowStep;
	var possibleFlow = currentFlowStep + '_' + data.message;
	var responseKey = ''
	if (chatflowConfig[possibleFlow]) {
		var respVarName = chatflowConfig[currentFlowStep].responseVariable;
		if (respVarName) {
			redisSessionData[respVarName] = data.message;
		}
		currentFlowStep = possibleFlow;
		responseKey = chatflowConfig[currentFlowStep].messageKey
		// TODO : Don't call function inside each if/else if it should be called once.
		menuIntentKnown = true
		telemetryData = createInteractionData({ currentStep: currentFlowStep, responseKey: responseKey }, data, false)
	} else if (data.message === '0') {
		currentFlowStep = 'step1'
		responseKey = chatflowConfig[currentFlowStep].messageKey
		menuIntentKnown = true
		// TODO : Don't call function inside each if/else if it should be called once.
		telemetryData = createInteractionData({ currentStep: currentFlowStep, responseKey: responseKey }, data, false)
	} else if (data.message === '99') {
		if (currentFlowStep.lastIndexOf("_") > 0) {
			currentFlowStep = currentFlowStep.substring(0, currentFlowStep.lastIndexOf("_"))
			responseKey = chatflowConfig[currentFlowStep].messageKey
			menuIntentKnown = true
			// TODO : Don't call function inside each if/else if it should be called once. 
			telemetryData = createInteractionData({ currentStep: currentFlowStep, responseKey: responseKey }, data, false)
		}
	} else {
		responseKey = getErrorMessageForInvalidInput(currentFlowStep, chatflowConfig, true)
		menuIntentKnown = false
		var edata = {
			type: "system",
			level: "INFO",
			requestid: data.customData.requestid,
			message: ""
		  }
		edata.message = "UNKNOWN OPTION";
		telemetry.telemetryLog(data.customData, edata);
		// TODO : Don't call function inside each if/else if it should be called once.
		telemetryData = createInteractionData({ currentStep: currentFlowStep + '_UNKNOWN_OPTION' }, data, false)
	}
	redisSessionData['currentFlowStep'] = currentFlowStep;
	consolidatedLog(data, responseKey, menuIntentKnown, true);
	setRedisKeyValue(data.customData.deviceId, redisSessionData);
	telemetry.logInteraction(telemetryData)
	sendChannelResponse(res, responseKey, data);

}

// for free flow error only response is handled here other is handled in botwebhook
function consolidatedLog(data, responseKey, menuIntentKnown, isMenuDriven) {
	var intent
	if (isMenuDriven) {
		if (menuIntentKnown) {
			if (data.channel == config.WHATSAPP) {
				intent = config.WHATSAPP_MENU_INTENT_DETECTED
			} else {
				intent = config.MENU_INTENT_DETECTED
			}
		}
		else {
			responseKey = config.UNKNOWN_OPTION
			if (data.channel == config.WHATSAPP) {
				intent = config.WHATSAPP_MENU_INTENT_NOT_DETECTED
			} else {
				intent = config.MENU_INTENT_NOT_DETECTED
			}
		}
	} else {
		if (data.channel == config.WHATSAPP) {
			responseKey = config.WHATSAPP_UNKNOWN_OPTION_FREEFLOW
			intent = config.WHATSAPP_FREEFLOW_INTENT_NOT_DETECTED
		} else {
			responseKey = config.UNKNOWN_OPTION_FREEFLOW
			intent = config.FREEFLOW_INTENT_NOT_DETECTED
		}
	}
	var message = "UserId: " + data.customData.userId + "," + " DeviceId: " + data.customData.deviceId + "," + " UserQuery: " + data.message + "," + " Bot_Response_identifier: " + intent + "," + " BotResponse: " + responseKey;

	var edata = {
		type: "system",
		level: "INFO",
		requestid: data.customData.requestid,
		message: message
	  }
	telemetry.telemetryLog(data.customData, edata)
	LOG.info(message)
}

function setRedisKeyValue(key, value) {
	const expiryInterval = 3600;
	redisClient.setex(REDIS_KEY_PREFIX + key, expiryInterval, JSON.stringify(value));
}

function delRedisKey(key) {
	redisClient.del(key);
}

function getErrorMessageForInvalidInput(currentFlowStep, chatflowConfig, isNumeric) {
	if (isNumeric) {
		return chatflowConfig[currentFlowStep + '_error'].messageKey;
	} else {
		return chatflowConfig['step1_wrong_input'].messageKey
	}
}

//http endpoint
http.createServer(appBot).listen(config.REST_HTTP_PORT, function (err) {
	if (err) {
		throw err
	}
	LOG.info('Server started on port ' + config.REST_HTTP_PORT)
	var telemetryConfig = {
		batchSize: config.TELEMETRY_SYNC_BATCH_SIZE,
		endPoint: config.TELEMETRY_ENDPOINT,
		serviceUrl: config.TELEMETRY_SERVICE_URL,
		apiToken: config.API_AUTH_TOKEN,
		pid: config.TELEMETRY_DATA_PID,
		ver: config.TELEMETRY_DATA_VERSION
	};
	telemetry.initializeTelemetry(telemetryConfig)
});

//https endpoint only started if you have updated the config with key/crt files
if (config.HTTPS_PATH_KEY) {
	//https certificate setup
	var options = {
		key: fs.readFileSync(config.HTTPS_PATH_KEY),
		cert: fs.readFileSync(config.HTTPS_PATH_CERT),
		ca: fs.readFileSync(config.HTTPS_PATH_CA)
	};

	https.createServer(options, appBot).listen(config.REST_HTTPS_PORT, function (err) {
		if (err) {
			throw err
		}
		LOG.info('Server started on port ' + config.REST_HTTPS_PORT)
	});

}

//send data to user
function sendResponse(response, responseBody, responseCode) {
	response.set('Content-Type', 'text/plain')
	if (responseCode) response.status(responseCode)
	response.send(responseBody)
}

function sendErrorResponse(response, data){
	var edata = {
		type: "system",
		level: "INFO",
		requestid: data.customData.requestid,
		message: "401 invalid request"
	  }
	telemetry.telemetryLog(data, edata)
	response.status(401);
	response.send('invalid request');
}
//send data to user
function sendResponseWhatsapp(response,responseBody, recipient, textContent) {
	var rsponseText = ''
	if (textContent == "freeFlow") {
		rsponseText = responseBody.data.text
	} else {
		rsponseText = responseBody
	}
	var options = {
		method: 'POST',
		url: config.WHATSAPP_URL,
		headers:
		{
			authorization: config.WHATSAPP_AUTHORIZATION,
			'content-type': 'application/json'
		},
		body:
		{
			message:
				[{
					recipient_whatsapp: recipient,
					message_type: config.WHATSAPP_MESSAGE_TYPE,
					recipient_type: config.WHATSAPP_RECIPIENT_TYPE,
					source: config.WHATSAPP_SOURCE,
					'x-apiheader': config.WHATSAPP_API_HEADER,
					type_text: [{ preview_url: 'false', content: rsponseText }]
				}]
		},
		json: true
	};
	request(options, function (error, response, body) {
		if (error) throw new Error(error);

	});
	response.send(responseBody)
}
function sendChannelResponse(response, responseKey, data, responseCode) {
	response.set('Content-Type', 'application/json')
	if (responseCode){
		response.status(responseCode)
		var edata = {
			type: "system",
			level: "INFO",
			requestid: data.customData.requestid,
			message: "404 not found"
		  }
		telemetry.telemetryLog(data.customData, edata)
	}

	//version check
	var channelResponse = literals.message[responseKey + '_' + data.channel];

	if (channelResponse) {
		channelResponse = replaceUserSpecficData(channelResponse);
		sendResponseWhatsapp(response, channelResponse, data.recipient, "menu driven")
	} else {
		const currentFlowText = _.cloneDeep(literals.message[responseKey]);
		currentFlowText.data.text = replaceUserSpecficData(currentFlowText.data.text);
		response.send(currentFlowText);
	}
}
function createInteractionData(responseData, data, isNonNumeric) {
	subtypeVar = ''
	if (isNonNumeric) {
		if (data.channel == config.WHATSAPP) {
			subtypeVar = responseData.intent ? config.WHATSAPP_FREEFLOW_INTENT_DETECTED : config.WHATSAPP_FREEFLOW_INTENT_NOT_DETECTED
		} else {
			subtypeVar = responseData.intent ? config.FREEFLOW_INTENT_DETECTED : config.FREEFLOW_INTENT_NOT_DETECTED
		}
		return {
			interactionData: {
				id: responseData.intent ? responseData.intent : 'UNKNOWN_OPTION',
				type: responseData.intent ? responseData.intent : 'UNKNOWN_OPTION',
				subtype: subtypeVar

			},
			requestData: data.customData
		}
	} else {
		if (data.channel == config.WHATSAPP) {
			subtypeVar = responseData.intent ? config.WHATSAPP_INTENT_DETECTED : config.WHATSAPP_INTENT_NOT_DETECTED
		} else {
			subtypeVar = responseData.intent ? config.INTENT_DETECTED : config.INTENT_NOT_DETECTED
		}
		return {
			interactionData: {
				id: responseData.currentStep,
				type: responseData.responseKey ? responseData.responseKey : 'UNKNOWN_OPTION',
				subtype: subtypeVar
			},
			requestData: data.customData
		}
	}
}

/**
* This function helps to get user spec
*/
function getUserSpec(req) {
	var ua = parser(req.headers['user-agent'])
	return {
		'agent': ua['browser']['name'],
		'ver': ua['browser']['version'],
		'system': ua['os']['name'],
		'platform': ua['engine']['name'],
		'raw': ua['ua']
	}
}

/**
* This function helps to replace %string% with required data
*/
function replaceUserSpecficData(str) {
	var currentFlowStep = redisSessionData.currentFlowStep;
	var regEx = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/
	if(regEx.test(str)){
		str = str.replace(/[%]?\w+[%]/g, function(item){
			var matchedItem = item.replace(/[^a-zA-Z ]/g, "");
			return chatflow.chatflow[currentFlowStep].data.replaceLabels[matchedItem];
		});
	}
	return str;
}






