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
const dateFormat = require('dateformat')
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

const errorCodes = require('./helpers/errorCodes.json');
const defaultErrorCode = 'err_500';
let error_obj = {
  "id": "",
  "ver": "1.0",
  "ts": "",
  "params": {
      "resmsgid": "5f36c090-2eee-11eb-80ed-6bb70096c082",
      "msgid": "",
      "status": "failed",
      "err": "",
      "errmsg": ""
  }
}

// Route that receives a POST request to /bot
appBot.post('/bot', function (req, res) {
	var userId = req.body.userId ? req.body.userId : req.body.From;
	var data = {
		message: req.body.Body,
		recipient: userId,
		channel: 'botclient',
		customData: getCustomLogData(req, 'botclient')
	}
	handler(req, res, data)
})

appBot.post('/whatsapp', function (req, res) {
	const customData = getCustomLogData(req, 'whatsapp');
	if(!req.body.incoming_message || !req.body.incoming_message[0]) {
		sendErrorResponse(res, customData, req, 400);
		return false;	
	}
	try {
		const incoming_message = req.body.incoming_message[0];
		const incoming_msg_from = incoming_message.from;
		if (req.query.client_key == config.SECRET_KEY) {
			var userId = incoming_msg_from;
			var data = {
				message: incoming_message.text_type.text,
				recipient: userId,
				channel: config.WHATSAPP,
				customData: customData
			}
			handler(req, res, data)
		} else {
			sendErrorResponse(res, customData, req, 401)
		}
	} catch (error) {
		sendErrorResponse(res, customData, req, 500, error.stack);
	}
})

appBot.post('/whatsapp/deliveryStatus', function (req, res) {
	const customData = getCustomLogData(req, 'whatsapp');
	if(!req.body.delivery_status || !req.body.delivery_status[0]) {
		sendErrorResponse(res, customData, req, 400);
		return false;	
	}
	try {
		const deliveryInfo = req.body.delivery_status[0]
		LOG.info(`Delivery status: ${deliveryInfo.status} & remark :: ${deliveryInfo.status_remark}`)
		const edata = {
			type: "system",
			level: "INFO",
			requestid: customData.requestid,
			message: deliveryInfo.status_remark,
			whatsapp_delivery_status: deliveryInfo.status
		}
		telemetry.telemetryLog(customData, edata);
		res.status(200).send({success: true});
	} catch (error) {
		sendErrorResponse(res, customData, req, 500, error.stack);
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
						var errorBody = errorResponse(req, 401, e);
						response.send(errorBody);
					}
				})
			} catch (e) {
				//if this threw an error, the api variable is still set to the old, working version
				console.error("Failed to reload literals.js! Error: ", e);
				var errorBody = errorResponse(req, 401, e);
				response.send(errorBody);
			}
		})
	} else {
		var errorBody = errorResponse(req, 400, errorCodes["/refresh"].post.errorObject.err_400.errMsg);
		response.send(errorBody);
	}
})

// dummy api for load testing
appBot.post('/dummy', function (req, res) {
	res.json({message: 'success'})
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

	const reqBodycontext = req.body.context;
	var chatflowConfig = reqBodycontext ? chatflow[reqBodycontext] ? chatflow[reqBodycontext] : chatflow.chatflow : chatflow.chatflow;
	redisSessionData = {};
	const deviceId = data.customData.deviceId;

	if (!deviceId) {
		var edata = {
			type: "system",
			level: "INFO",
			requestid: data.customData.requestid,
			message: "Attribute missing from request body"
		  }
		telemetry.telemetryLog(data.customData, edata);
		sendResponse(data.customData.deviceId, res, "From attribute missing", 400);
		// Error code
		var errorBody = errorResponse(req, 400, edata.message);
		res.send(errorBody);
	} else {
		redisClient.get(REDIS_KEY_PREFIX + data.customData.deviceId, (err, redisValue) => {
			if(err){
				var errorBody = errorResponse(req, 402, err);
				response.send(errorBody);
			}
			if (redisValue != null) {

				// Key is already exist and hence assiging data which is already there at the posted key
				redisSessionData = JSON.parse(redisValue);
				data.customData.sessionId = redisSessionData.sessionID;
				var telemetryData = {};
				// all non numeric user messages go to bot
				if (isNaN(data.message)) {
					///Bot interaction flow
					freeFlowLogic(data, res,chatflowConfig, req)

				} else {
					menuDrivenLogic(data, res, chatflowConfig)
				}
			} else {

				// Implies new user. Adding data in redis for the key and also sending the WELCOME message

				var uuID = UUIDV4();
				userData = { sessionID: uuID, currentFlowStep: 'step1' };
				setRedisKeyValue(deviceId, userData);
				data.customData.sessionId = uuID;
				telemetry.logSessionStart(data.customData);
				if (data.channel == "botclient") {
					telemetryData = createInteractionData({ currentStep: 'step1', responseKey: chatflowConfig['step1']['messageKey'] }, data, false)
					telemetry.logInteraction(telemetryData)
					sendChannelResponse(res, chatflowConfig['step1']['messageKey'], data);

				} else {
					if (isNaN(data.message)) {
						///Bot interaction flow
						freeFlowLogic(data, res, chatflowConfig, req)

					} else {
						menuDrivenLogic(data, res, chatflowConfig)
					}

				}
			}
		});
	}
}

function freeFlowLogic(data, res, chatflowConfig, req) {
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
			// Error code
			var errorBody = errorResponse(req, 403, err);
			res.send(errorBody);
		} else {
			var responses = resp.res[0];
			if ((responses && responses.text && responses.text != '') || 
				(responses && responses.menu_key && responses.menu_key != '') ) {
				response = responses.text;
				response = getMessage([response, data.channel]);
				telemetryData = createInteractionData(response.data, data, true);
			} else {
				responseKey = getErrorMessageForInvalidInput(responses, chatflowConfig, false);
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
				telemetryData = createInteractionData(response.data, data, true)
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
		var interactionData = { currentStep: currentFlowStep, responseKey: responseKey, intent: menuIntentKnown }
		telemetryData = createInteractionData(interactionData, data, false)
	} else if (data.message === '0') {
		currentFlowStep = 'step1'
		responseKey = chatflowConfig[currentFlowStep].messageKey
		menuIntentKnown = true
		// TODO : Don't call function inside each if/else if it should be called once.
		var interactionData = { currentStep: currentFlowStep, responseKey: responseKey, intent: menuIntentKnown }
		telemetryData = createInteractionData(interactionData, data, false)
		// Telemetry event for Main menu button
		var interactionDataMainMenu = { currentStep: 'step_0', responseKey: 'MAIN_MENU', intent: menuIntentKnown }
		var mainMenuEventData = createInteractionData(interactionDataMainMenu, data, false)
		telemetry.logInteraction(mainMenuEventData);
	} else if (data.message === '99') {
		if (currentFlowStep.lastIndexOf("_") > 0) {
			currentFlowStep = currentFlowStep.substring(0, currentFlowStep.lastIndexOf("_"))
			responseKey = chatflowConfig[currentFlowStep].messageKey
			menuIntentKnown = true
			var interactionData = { currentStep: currentFlowStep, responseKey: responseKey, intent: menuIntentKnown }
			// TODO : Don't call function inside each if/else if it should be called once. 
			telemetryData = createInteractionData(interactionData, data, false)
			// Telemetry event for Go-back button
			var interactionDataGoBack= { currentStep: 'step_99', responseKey: 'GO_BACK', intent: menuIntentKnown }
			var goBackEventData = createInteractionData(interactionDataGoBack, data, false)
			telemetry.logInteraction(goBackEventData);
		} else {
			responseKey = getErrorMessageForInvalidInput(currentFlowStep, chatflowConfig, true)
			telemetryData = createInteractionData({ currentStep: currentFlowStep + '_UNKNOWN_OPTION' }, data, false)
		}
	} else {
		responseKey = getErrorMessageForInvalidInput(possibleFlow, chatflowConfig, true)
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
	if (isNumeric && !_.isUndefined(currentFlowStep) && _.has(chatflowConfig, currentFlowStep)) {
		return chatflowConfig[currentFlowStep + '_error'].messageKey;
	} else {
		return chatflowConfig['step1_wrong_input'].messageKey
	}
}

/**
 * @description This method is use to decide message for web & whatsapp bot based on menu_key
 * @param  {array} params has  freeflowMsg, channel parameters 
 * @return if freeFlowLogic is returning empty text & menu_key then it will return message from literals
 */
function getMessage(params) {
	let [ freeflowRes, channel ] = params;
	if(freeflowRes.data.text === '' && freeflowRes.data.menu_key !== '') {
		// TODO: Need to change this logic to use single literals key for both client portal and whatsapp
		// Modify literals to have single response for both client and change the logic all the places
		if(channel === "botclient") {
			freeflowRes = _.cloneDeep(literals.message[freeflowRes.data.menu_key]);
			freeflowRes.data.text = replaceUserSpecficData(freeflowRes.data.text);
		} else {
			freeflowRes.data.text = literals.message[freeflowRes.data.menu_key + '_' + channel];	
		}
	}
	return freeflowRes
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

/**
 * @description This method is use to prepare error response body and log telemetry log and send response to client
 * @param  { object } response api response object
 * @param  { object } data custom log data 
 * @param  { object } req api request object
 * @param  { string } errorCode custom error status code || default value is 500
 * @param  { string } stackTrace error stackTrace details || default value is empty
 */
function sendErrorResponse(response, data, req, errorCode = 500, stackTrace = ''){
	const errorBody = errorResponse(req, errorCode, stackTrace);
	var edata = {
		type: "system",
		level: "INFO",
		requestid: data.requestid,
		message: errorBody.params.errmsg
	}
	telemetry.telemetryLog(data, edata);
	response.status(errorCode).send(errorBody);
}

/**
 * @description This method is use to generate custom log data based on bot client 
 * @param  { object } req api request object 
 * @param  { string } client bot client name 
 * @return { object } custom data 
 * @todo implement interface for object
 */
 function getCustomLogData(req, client) {
	let cryptoHash;
	if(_.get(req, 'body.incoming_message[0].from') || _.get(req, 'body.delivery_status[0].recipient')) {
		const incoming_msg_from = _.get(req, 'body.incoming_message[0].from') || _.get(req, 'body.delivery_status[0].recipient') || '';
		cryptoHash = incoming_msg_from ? crypto.createHash('sha256').update(incoming_msg_from).digest("hex") : undefined;
	}
	const data = {
		sessionId: '',
		uaspec: getUserSpec(req),
		requestid: req.headers["x-request-id"] ? req.headers["x-request-id"] : "",
		userId: cryptoHash ? cryptoHash : req.body.userId ? req.body.userId : req.body.From,
		deviceId: cryptoHash ? cryptoHash : req.body.From,
		appId: client === 'botclient' ? req.body.appId + '.bot' : config.TELEMETRY_DATA_PID_WHATSAPP,
		env: client === 'botclient' ? req.body.appId + '.bot' : config.TELEMETRY_DATA_ENV_WHATSAPP,
		channelId: client === 'botclient' ? req.body.channel : config.TELEMETRY_DATA_CHANNELID_WHATSAPP
	}
	return data;
}

//send data to user
function sendResponseWhatsapp(response,responseBody, recipient, textContent) {
	var rsponseText = ''
	if (textContent == "freeFlow") {
		rsponseText = responseBody.data.text
	} else {
		rsponseText = responseBody
	}
	const customData = getCustomLogData(response.req, 'whatsApp');
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
	request(options, function (error, resp, body) {
		const edata = {
			type: "system",
			level: "INFO",
			requestid: response.req.headers["x-request-id"] ? response.req.headers["x-request-id"] : "",
			message: body.message || '',
			request: {
				url: options.url
			}
		}
		telemetry.telemetryLog(customData, edata);
		LOG.info("WhatsApp api Response body :: ", body);
		if (error) {
			throw new Error(error)
		};
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
		// Error code
		var errorBody = errorResponse(req, 404, errorCodes["/bot"].post.errorObject.err_404.errMsg);
		res.send(errorBody);
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
	const intentData =  responseData.intent;
	if (isNonNumeric) {
		if (data.channel == config.WHATSAPP) {
			subtypeVar = intentData ? config.WHATSAPP_FREEFLOW_INTENT_DETECTED : config.WHATSAPP_FREEFLOW_INTENT_NOT_DETECTED
		} else {
			subtypeVar = intentData ? config.FREEFLOW_INTENT_DETECTED : config.FREEFLOW_INTENT_NOT_DETECTED
		}
		return {
			interactionData: {
				id: intentData ? intentData : 'UNKNOWN_OPTION',
				type: intentData ? intentData : 'UNKNOWN_OPTION',
				subtype: subtypeVar

			},
			requestData: data.customData
		}
	} else {
		if (data.channel == config.WHATSAPP) {
			subtypeVar = intentData ? config.WHATSAPP_INTENT_DETECTED : config.WHATSAPP_INTENT_NOT_DETECTED
		} else {
			subtypeVar = intentData ? config.INTENT_DETECTED : config.INTENT_NOT_DETECTED
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
		str = str.replace(/[%]\w+[%]/g, function(item){
			var matchedItem = item.replace(/[^a-zA-Z ]/g, "");
			return chatflow.chatflow[currentFlowStep].data.replaceLabels[matchedItem];
		});
	}
	return str;
}

function errorResponse(req, statusCode, stackTrace) {
	const errorCode = `err_${statusCode}`;
	const method = req.method.toLowerCase();
	const routePath = req.route.path.split('/')[1];
	const path = `/${routePath}.${method}.errorObject`;
	const errorObj = _.get(errorCodes, `${path}.${errorCode}`) || _.get(errorCodes, `${path}.${defaultErrorCode}`);
	const id =  req.originalUrl.split('/');

	error_obj['id'] = id.join('.');
	error_obj['ts'] = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss:lo');
	error_obj['params']['msgid'] = req.headers['x-request-id']; // TODO: replace with x-request-id;
	error_obj['params']['errmsg'] = errorObj.errMsg
	error_obj['params']['err'] = errorObj.err;
	error_obj['params']['stacktrace'] = stackTrace;
	return error_obj;
  }
module.exports = appBot;
