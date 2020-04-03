const express          = require('express')
const bodyParser       = require('body-parser')
const cors             = require('cors')
var https              = require('https');
var http               = require('http');
var fs                 = require('fs');
var redis 			   = require('redis');
var origins            = require('./config/corsList')
var LOG                = require('./log/logger')
var literals           = require('./config/literals')
var config             = require('./config/config')
var RasaCoreController = require('./controllers/rasaCoreController')
var EDB                = require('./api/elastic/connection')
const appBot     = express()

//// IVR is best done outside the bot...as no NLU interpretation is required


//cors handling
appBot.use(cors());

//body parsers for requests
appBot.use(bodyParser.json());
appBot.use(bodyParser.urlencoded({ extended: false }))

// this object tracks session. It needs to be moved to Redis
var memory = {}
var userData = {}; //  TODO Add interface for the data that is stored in the redis session

// Route that receives a POST request to /bot
appBot.post('/bot', function (req, res) {
	const body = req.body.Body
	LOG.info('req.body:')
	LOG.info(req.body)
	data = { message: body, customData: { userId: req.body.From } }
	sessionID = req.body.From;
	LOG.info('context for: ' + sessionID)
	LOG.info(memory[sessionID])
	res.set('Content-Type', 'text/plain')
	redis_client = createRedisClient();

	//persisting incoming data to EDB
	dataPersist = {'message': body, 'channel' : 'rest'}
	//EDB.saveToEDB(dataPersist, 'user', sessionID,(err,response)=>{})

	if (body == '0') {
		memory = {}
		userData = {};
	}

	if (req.body.From) {
		redis_client.get(req.body.From, (err, data) => {
			if (data != null) {
				// Key is already exist and hence assiging data which is already there at the posted key
				 userData = data;
			} else {
			 obj = { sessionId: req.body.From, role: '', educationLvl: '',  board: '', boardType: ''};
			 // Adding data in redis for the key
			 setRedisKeyValue(redis_client, req.body.From, JSON.stringify(obj), 3600);
			}
		});		
	}

	// all non numeric user messages go to bot
	if (isNaN(body)) {
		///Bot interaction flow
		RasaCoreController.processUserData(data, sessionID, (err, resp) => {
			if (err) {
				emitToUser(sessionID, res, literals.message.SORRY)
			} else {
				let responses = resp.res;
				for (var i = 0; i < responses.length; i++) {
					emitToUser(sessionID, res, responses[i].text)
				}
			}
		})
	}
	// this section with numeric input does not require NLU interpretation so it will not go to Bot
	else if (memory[sessionID]) {
		////this if-else cascade is difficult to maintain, so working on a json config to drive this decision tree
		if (memory[sessionID]['role']) {
			if (memory[sessionID]['educationLvl']) {
				if (memory[sessionID]['board']) {
					if (memory[sessionID]['board'] == '1') {
						emitToUser(sessionID, res, literals.message.LINK + 'CBSE')
						delete memory[sessionID]
					} else if (memory[sessionID]['board'] == '2') {
						if (memory[sessionID]['boardType']) {
							if (memory[sessionID]['boardType'] == '1') {
								emitToUser(sessionID, res, literals.message.LINK + 'AP')
								delete memory[sessionID]
							}
							if (memory[sessionID]['boardType'] == '2') {
								emitToUser(sessionID, res, literals.message.LINK + 'KA')
								delete memory[sessionID]
							}
							if (memory[sessionID]['boardType'] == '3') {
								emitToUser(sessionID, res, literals.message.LINK + 'TN')
								delete memory[sessionID]
							}
						}
						else {
							LOG.info('setting up boardType:' + req.body.Body)
							memory[sessionID]['boardType'] = req.body.Body
							if (memory[sessionID]['boardType'] == '1') {
								emitToUser(sessionID, res, literals.message.LINK + 'AP')
								delete memory[sessionID]
							}
							if (memory[sessionID]['boardType'] == '2') {
								emitToUser(sessionID, res, literals.message.LINK + 'KA')
								delete memory[sessionID]
							}
							if (memory[sessionID]['boardType'] == '3') {
								emitToUser(sessionID, res, literals.message.LINK + 'TN')
								delete memory[sessionID]
							}
						}
					} else {
						emitToUser(sessionID, res, literals.message.BOARD_NOT_HANDLED)
					}
				}
				else {
					if (req.body.Body == '1') {
						LOG.info('setting up board:' + req.body.Body)
						memory[sessionID]['board'] = req.body.Body
						emitToUser(sessionID, res, literals.message.LINK + 'CBSE')
						delete memory[sessionID]
					} else if (req.body.Body == '2') {
						LOG.info('setting up board:' + req.body.Body)
						memory[sessionID]['board'] = req.body.Body
						emitToUser(sessionID, res, literals.message.CHOOSE_STATE)
					} else {
						emitToUser(sessionID, res, literals.message.BOARD_NOT_HANDLED)

					}
				}
			}
			else {
				LOG.info('setting up educationLvl:' + req.body.Body)
				memory[sessionID]['educationLvl'] = req.body.Body
				if (req.body.Body == '2') {
					emitToUser(sessionID, res, literals.message.LINK)
					delete memory[sessionID]
				} else {
					emitToUser(sessionID, res, literals.message.CHOOSE_BOARD)
				}
			}
		}
		else {
			LOG.info('setting up role:' + req.body.Body)
			memory[sessionID]['role'] = req.body.Body
			obj = { sessionId: req.body.From, role: req.body.Body, educationLvl: '',  board: '', boardType: ''};
			setRedisKeyValue(redis_client, req.body.From, JSON.stringify(obj), 3600);
			emitToUser(sessionID, res, literals.message.EDUCATION_LEVEL)
		}
	} else {
		memory[sessionID] = {}
		obj = { };
		setRedisKeyValue(redis_client, req.body.From, JSON.stringify(obj), 3600);
		emitToUser(sessionID, res, literals.message.MENU)
	}
})

//send data to user
function emitToUser(sessionID, client, text) {
	//persisting outgoing data to EDB
	dataPersist = {'message': text, 'channel' : 'rest'}
	//EDB.saveToEDB(dataPersist, 'bot', sessionID,(err,response)=>{})
	//emit to client
	client.send(text)
}

//http endpoint
http.createServer(appBot).listen(config.REST_HTTP_PORT, function (err) {
        if (err) {
                throw err
        }

        LOG.info('Server started on port '+config.REST_HTTP_PORT)
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

		LOG.info('Server started on port '+config.REST_HTTPS_PORT)
	});

}

function createRedisClient() {
	//configure redis client on port 6379
	const port_redis = config.REDIS_PORT || 6379;
	return redis.createClient(port_redis);
}

function setRedisKeyValue(client, key, value, expireTime) {
	client.setex(key, expireTime, value);
}
