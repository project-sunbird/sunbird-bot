const express    = require('express')
const bodyParser = require('body-parser')
const cors       = require('cors')
var https        = require('https');
var http         = require('http');
var fs           = require('fs');
var origins      = require('./config/corsList')
var LOG          = require('./log/logger')
var literals     = require('./config/literals')
var config       = require('./config/config')
var RasaCoreController = require('./controllers/rasaCoreController')

const appBot     = express()
//// IVR is best done outside the bot...as no NLU interpretation is required

//https certificate setup
var options = {
	key: fs.readFileSync(config.HTTPS_PATH_KEY),
	cert: fs.readFileSync(config.HTTPS_PATH_CERT),
	ca: fs.readFileSync(config.HTTPS_PATH_CA)
  };

//cors handling
appBot.use(cors());

//body parsers for requests
appBot.use(bodyParser.json());
appBot.use(bodyParser.urlencoded({ extended: false }))

// this object tracks session. It needs to be moved to Redis
var memory = {}
// Route that receives a POST request to /bot
appBot.post('/bot', function (req, res) {
	const body = req.body.Body
	LOG.info('req.body:')
	LOG.info(req.body)
	data = { message: body, customData: { userId: req.body.From } }
	sessionID = req.body.From
	LOG.info('context for: ' + sessionID)
	LOG.info(memory[sessionID])
	res.set('Content-Type', 'text/plain')
	if (body == '0') {
		memory = {}
	}
	// all non numeric user messages go to bot
	if (isNaN(body)) {
		///Bot interaction flow
		RasaCoreController.processUserData(data, sessionID, (err, resp) => {
			if (err) {
				res.send(literals.message.SORRY)
			} else {
				let responses = resp.res;
				for (var i = 0; i < responses.length; i++) {
					res.send(responses[i].text)
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
						res.send(literals.message.LINK + 'CBSE')
						delete memory[sessionID]
					} else if (memory[sessionID]['board'] == '2') {
						if (memory[sessionID]['boardType']) {
							if (memory[sessionID]['boardType'] == '1') {
								res.send(literals.message.LINK + 'AP')
								delete memory[sessionID]
							}
							if (memory[sessionID]['boardType'] == '2') {
								res.send(literals.message.LINK + 'KA')
								delete memory[sessionID]
							}
							if (memory[sessionID]['boardType'] == '3') {
								res.send(literals.message.LINK + 'TN')
								delete memory[sessionID]
							}
						}
						else {
							LOG.info('setting up boardType:' + req.body.Body)
							memory[sessionID]['boardType'] = req.body.Body
							if (memory[sessionID]['boardType'] == '1') {
								res.send(literals.message.LINK + 'AP')
								delete memory[sessionID]
							}
							if (memory[sessionID]['boardType'] == '2') {
								res.send(literals.message.LINK + 'KA')
								delete memory[sessionID]
							}
							if (memory[sessionID]['boardType'] == '3') {
								res.send(literals.message.LINK + 'TN')
								delete memory[sessionID]
							}
						}
					} else {
						res.send(literals.message.BOARD_NOT_HANDLED)
					}
				}
				else {
					if (req.body.Body == '1') {
						LOG.info('setting up board:' + req.body.Body)
						memory[sessionID]['board'] = req.body.Body
						res.send(literals.message.LINK + 'CBSE')
						delete memory[sessionID]
					} else if (req.body.Body == '2') {
						LOG.info('setting up board:' + req.body.Body)
						memory[sessionID]['board'] = req.body.Body
						res.send(literals.message.CHOOSE_STATE)
					} else {
						res.send(literals.message.BOARD_NOT_HANDLED)

					}
				}
			}
			else {
				LOG.info('setting up educationLvl:' + req.body.Body)
				memory[sessionID]['educationLvl'] = req.body.Body
				if (req.body.Body == '2') {
					res.send(literals.message.LINK)
					delete memory[sessionID]
				} else {
					res.send(literals.message.CHOOSE_BOARD)
				}
			}
		}
		else {
			LOG.info('setting up role:' + req.body.Body)
			memory[sessionID]['role'] = req.body.Body
			res.send(literals.message.EDUCATION_LEVEL)
		}
	} else {
		memory[sessionID] = {}
		res.send(literals.message.MENU)
	}
})
//http endpoint
http.createServer(appBot).listen(config.REST_HTTP_PORT, function (err) {
        if (err) {
                throw err
        }

        LOG.info('Server started on port '+config.REST_HTTP_PORT)
});
//https endpoint
https.createServer(options, appBot).listen(config.REST_HTTPS_PORT, function (err) {
        if (err) {
                throw err
        }

        LOG.info('Server started on port '+config.REST_HTTPS_PORT)
});


