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
const appBot = express()
var UUIDV4   = require('uuid')
//cors handling
appBot.use(cors());
//body parsers for requests
appBot.use(bodyParser.json());
appBot.use(bodyParser.urlencoded({ extended: false }))

// Redis is used as the session tracking store
const redisClient = redis.createClient(config.REDIS_PORT, config.REDIS_HOST);
const chatflowConfig = chatflow.chatflow;

// Route that receives a POST request to /bot
appBot.post('/bot', function (req, res) {
	handler(req, res, 'botclient', data)
})

appBot.post('/bot/whatsapp', function (req, res) {
	handler(req, res, 'whatsapp')
})

function handler(req, res, channel) {
	var message = req.body.Body;
	var deviceId = req.body.From;
	var userId = req.body.userId ? req.body.userId : deviceId;
	var userData = {};
	data = { message: message, customData: { userId: userId } }
	if (!deviceId) {
		sendResponse(deviceId, res, "From attribute missing", 400);
	} else {
		redisClient.get(deviceId, (err, redisValue) => { 
			if (redisValue != null) {
				// Key is already exist and hence assiging data which is already there at the posted key
				userData = JSON.parse(redisValue);
				// all non numeric user messages go to bot
				if (isNaN(message)) {
					///Bot interaction flow
					RasaCoreController.processUserData(data, deviceId, (err, resp) => {
						var response = '';
						if (err) {
							sendChannelResponse(deviceId, res, 'SORRY', channel)
						} else {
							let responses = resp.res;
							if (responses && responses[0].text) {
								response = responses[0].text;
							} else {
								response = literals.message[responseKey];
							}
							sendResponse(res, response)
						}
					});
				} else {
					var currentFlowStep = userData.currentFlowStep;
					var possibleFlow = currentFlowStep + '_' + message;
					if (chatflowConfig[possibleFlow]) {
						var respVarName = chatflowConfig[currentFlowStep].responseVariable;
						if (respVarName) {
							userData[respVarName] = message;
						}
						currentFlowStep = possibleFlow;
						responseKey = chatflowConfig[currentFlowStep].messageKey
					} else if (message === '0') {
						currentFlowStep = 'step1'
						responseKey = chatflowConfig[currentFlowStep].messageKey
					} else if (message === '99') {
						if (currentFlowStep.lastIndexOf("_") > 0) {
							currentFlowStep = currentFlowStep.substring (0, currentFlowStep.lastIndexOf("_"))
							responseKey = chatflowConfig[currentFlowStep].messageKey
						}
					}
					userData['currentFlowStep'] = currentFlowStep;
					setRedisKeyValue(deviceId, userData);
					sendChannelResponse(res, responseKey, channel);
				}
			} else {
				// Implies new user. Adding data in redis for the key and also sending the WELCOME message
				var uuID = UUIDV4();
				userData = { sessionID: uuID, currentFlowStep: 'step1' };
				setRedisKeyValue(deviceId, userData);
				sendChannelResponse(res, 'START', channel);
			}
		});
	}
}
 
function setRedisKeyValue(key, value) {
	const expiryInterval = 3600;
	redisClient.setex(key, expiryInterval, JSON.stringify(value));
}

function delRedisKey(key) {
	redisClient.del(key);
}

//http endpoint
http.createServer(appBot).listen(config.REST_HTTP_PORT, function (err) {
	if (err) {
		throw err
	}
	LOG.info('Server started on port ' + config.REST_HTTP_PORT)
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
	if (channelResponse) {
		response.send(channelResponse)	
	} else {
		response.send(literals.message[responseKey])	
	} 
}