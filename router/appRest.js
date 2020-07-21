const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
var https = require('https');
var http = require('http');
var fs = require('fs');
var redis = require('redis');
var LOG = require('./log/logger')
var literals = require('./config/literals')
var config = require('./config/config')
var chatflow = require('./config/chatflow')
var RasaCoreController = require('./controllers/rasaCoreController')
const telemetry = require('./api/telemetry/telemetry.js')
var UUIDV4 = require('uuid')
const parser = require('ua-parser-js')
const REDIS_KEY_PREFIX = "bot_";
const appBot = express()
//cors handling
appBot.use(cors());
//body parsers for requests
appBot.use(bodyParser.json());
appBot.use(bodyParser.urlencoded({ extended: false }))

// Redis is used as the session tracking store
const redisClient = redis.createClient(config.REDIS_PORT, config.REDIS_HOST);

// Route that receives a POST request to /bot
appBot.post('/bot', function (req, res) {
	handler(req, res, 'botclient')
})

function handler(req, res, channel) {
	var appId = req.body.appId + '.bot';
	var message = req.body.Body;
	var deviceId = req.body.From;
	var channelId = req.body.channel;
	var userId = req.body.userId ? req.body.userId : deviceId;
	var uaspec = getUserSpec(req);
	const chatflowConfig = req.body.context ? chatflow[req.body.context] ? chatflow[req.body.context] : chatflow.chatflow : chatflow.chatflow;
	var redisSessionData = {};
	data = {
		message: message,
		customData: {
			userId: userId,
			deviceId: deviceId,
			appId: appId,
			sessionId: '',
			channelId: channelId,
			uaspec: uaspec
		}
	}
	if (!deviceId) {
		sendResponse(deviceId, res, "From attribute missing", 400);
	} else {
		LOG.info("UseId: ", userId, " DeviceId: ", deviceId, " UserQuery: ", message)
		redisClient.get(REDIS_KEY_PREFIX + deviceId, (err, redisValue) => {
			if (redisValue != null) {
				// Key is already exist and hence assiging data which is already there at the posted key
				redisSessionData = JSON.parse(redisValue);
				data.customData.sessionId = redisSessionData.sessionID;
				var telemetryData = {};
				// all non numeric user messages go to bot
				if (isNaN(message)) {
					///Bot interaction flow
					RasaCoreController.processUserData(data, deviceId, (err, resp) => {
						var response = '';
						if (err) {
							sendChannelResponse(deviceId, res, 'SORRY', channel)
						} else {
							var responses = resp.res;
							if (responses && responses[0].text) {
								response = responses[0].text;
								telemetryData = createInteractionData(responses[0], data.customData, true);
							} else {
								responseKey = getErrorMessageForInvalidInput(responses[0], chatflowConfig);
								response = literals.message[responseKey];
								telemetryData = createInteractionData(responses[0], data.customData, true)
							}
							telemetry.logInteraction(telemetryData);
							sendResponse(res, response)
						}
					});
				} else {
					var currentFlowStep = redisSessionData.currentFlowStep;
					var possibleFlow = currentFlowStep + '_' + message;
					var responseKey = ''
					if (chatflowConfig[possibleFlow]) {
						var respVarName = chatflowConfig[currentFlowStep].responseVariable;
						if (respVarName) {
							redisSessionData[respVarName] = message;
						}
						currentFlowStep = possibleFlow;
						responseKey = chatflowConfig[currentFlowStep].messageKey
						// TODO : Don't call function inside each if/else if it should be called once.
						telemetryData = createInteractionData({ currentStep: currentFlowStep, responseKey: responseKey }, data.customData, false)
					} else if (message === '0') {
						currentFlowStep = 'step1'
						responseKey = chatflowConfig[currentFlowStep].messageKey
						// TODO : Don't call function inside each if/else if it should be called once.
						telemetryData = createInteractionData({ currentStep: currentFlowStep, responseKey: responseKey }, data.customData, false)
					} else if (message === '99') {
						if (currentFlowStep.lastIndexOf("_") > 0) {
							currentFlowStep = currentFlowStep.substring(0, currentFlowStep.lastIndexOf("_"))
							responseKey = chatflowConfig[currentFlowStep].messageKey
							// TODO : Don't call function inside each if/else if it should be called once. 
							telemetryData = createInteractionData({ currentStep: currentFlowStep, responseKey: responseKey }, data.customData, false)
						}
					} else {
						responseKey = getErrorMessageForInvalidInput(currentFlowStep, chatflowConfig)
						// TODO : Don't call function inside each if/else if it should be called once.
						telemetryData = createInteractionData({ currentStep: currentFlowStep + '_UNKNOWN_OPTION' }, data.customData, false)
					}
					redisSessionData['currentFlowStep'] = currentFlowStep;
					setRedisKeyValue(deviceId, redisSessionData);
					telemetry.logInteraction(telemetryData)
					sendChannelResponse(res, responseKey, channel);
				}
			} else {
				// Implies new user. Adding data in redis for the key and also sending the WELCOME message
				var uuID = UUIDV4();
				userData = { sessionID: uuID, currentFlowStep: 'step1' };
				setRedisKeyValue(deviceId, userData);
				data.customData.sessionId = uuID;
				telemetry.logSessionStart(data.customData);
				telemetryData = createInteractionData({ currentStep: 'step1', responseKey: chatflowConfig['step1']['messageKey'] }, data.customData, false)
				telemetry.logInteraction(telemetryData)
				sendChannelResponse(res, chatflowConfig['step1']['messageKey'], channel);
			}
		});
	}
}

function setRedisKeyValue(key, value) {
	const expiryInterval = 3600;
	redisClient.setex(REDIS_KEY_PREFIX + key, expiryInterval, JSON.stringify(value));
}

function delRedisKey(key) {
	redisClient.del(key);
}

function getErrorMessageForInvalidInput(currentFlowStep, chatflowConfig) {
	if (chatflowConfig[currentFlowStep + '_error']) {
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

function sendChannelResponse(response, responseKey, channel, responseCode) {
	response.set('Content-Type', 'text/plain')
	if (responseCode) response.status(responseCode)
	var channelResponse = literals.message[responseKey + '_' + channel];
	LOG.info("BOT response: ", channelResponse)
	if (channelResponse) {
		response.send(channelResponse)
	} else {
		response.send(literals.message[responseKey])
	}
}

function createInteractionData(responseData, userData, isNonNumeric) {
	if (isNonNumeric) {
		return {
			interactionData: {
				id: responseData.intent ? responseData.intent : 'UNKNOWN_OPTION',
				type: responseData.intent ? responseData.intent : 'UNKNOWN_OPTION',
				subtype: responseData.intent ? 'intent_detected' : 'intent_not_detected'
			},
			requestData: userData
		}
	} else {
		return {
			interactionData: {
				id: responseData.currentStep,
				type: responseData.responseKey ? responseData.responseKey : 'UNKNOWN_OPTION',
				subtype: responseData.responseKey ? 'intent_detected' : 'intent_not_detected'
			},
			requestData: userData
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
