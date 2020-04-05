const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
var https = require('https');
var http = require('http');
var fs = require('fs');
var redis = require('redis');
var origins = require('./config/corsList')
var LOG = require('./log/logger')
var literals = require('./config/literals')
var config = require('./config/config')
var chatflow = require('./config/chatflow')
var RasaCoreController = require('./controllers/rasaCoreController')
var EDB = require('./api/elastic/connection')

const appBot = express()

//cors handling
appBot.use(cors());

//body parsers for requests
appBot.use(bodyParser.json());
appBot.use(bodyParser.urlencoded({ extended: false }))

// this object tracks session. It needs to be moved to Redis
const redis_client = redis.createClient(config.REDIS_PORT, config.REDIS_HOST);
const chatflowConfig = chatflow.chatflow;
// Route that receives a POST request to /bot
appBot.post('/bot', function (req, res) {
	var body = req.body.Body
	var sessionID = req.body.From;
	var userData = {};
	data = { message: body, customData: { userId: sessionID } }
	LOG.info('context for: ' + sessionID)

	//persisting incoming data to EDB
	//dataPersist = {'message': body, 'channel' : 'rest'}
	//EDB.saveToEDB(dataPersist, 'user', sessionID,(err,response)=>{})

	if (!sessionID) {
		sendResponse(sessionID, res, "From attrib missing", 400);
	} else {
		redis_client.get(sessionID, (err, redisValue) => {
			if (redisValue != null) {
				// Key is already exist and hence assiging data which is already there at the posted key
				userData = JSON.parse(redisValue);
				// all non numeric user messages go to bot
				if (isNaN(body)) {
					///Bot interaction flow
					RasaCoreController.processUserData(data, sessionID, (err, resp) => {
						if (err) {
							sendResponse(sessionID, res, literals.message.SORRY)
						} else {
							let responses = resp.res;
							for (var i = 0; i < responses.length; i++) {
								sendResponse(sessionID, res, responses[i].text)
							}
						}
					})
				} else {
					var currentFlowStep = userData.currentFlowStep;
					var respVarName = chatflowConfig[currentFlowStep].responseVariable;
					userData[respVarName] = body;
					currentFlowStep += '_' + body;
					userData['currentFlowStep'] = currentFlowStep;
					setRedisKeyValue(sessionID, userData);
					sendResponse(sessionID, res, literals.message[chatflowConfig[currentFlowStep].messageKey]);
				}

			} else {
				// Implies new user. Adding data in redis for the key and also sending the WELCOME message
				userData = { sessionId: sessionID, currentFlowStep: 'step1' };
				setRedisKeyValue(sessionID, userData);
				sendResponse(sessionID, res, literals.message.START);
			}
		});
	}
})

//http endpoint
http.createServer(appBot).listen(config.REST_HTTP_PORT, function (err) {
	if (err) {
		throw err
	}

	LOG.info('Server started on port ' + config.REST_HTTP_PORT)
});

LOG.info('HTTPS port value ' + config.HTTPS_PATH_KEY)
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

function setRedisKeyValue(key, value) {
	const expiryInterval = 3600;
	redis_client.setex(key, expiryInterval, JSON.stringify(value));
}

function delRedisKey(key) {
	redis_client.del(key);
}

//send data to user
function sendResponse(sessionID, response, responseBody, responseCode) {
	//persisting outgoing data to EDB
	//dataPersist = {'message': responseBody, 'channel' : 'rest'}
	//EDB.saveToEDB(dataPersist, 'bot', sessionID,(err,response)=>{})
	//emit to client
	response.set('Content-Type', 'text/plain')
	if (responseCode) response.status(responseCode)
	response.send(responseBody)
}