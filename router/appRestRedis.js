const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
var https = require('https');
var http = require('http');
var fs = require('fs');
var origins = require('./config/corsList')
var LOG = require('./log/logger')
var literals = require('./config/literals')
var config = require('./config/config')
var RasaCoreController = require('./controllers/rasaCoreController')
var EDB = require('./api/elastic/connection')
const appBot = express()
var redisContext = require('./api/redis/context')
//// IVR is best done outside the bot...as no NLU interpretation is required


//cors handling
appBot.use(cors());

//body parsers for requests
appBot.use(bodyParser.json());
appBot.use(bodyParser.urlencoded({ extended: false }))

// client to connect to redis
var redisClient = redisContext.createRedisClient()
// Route that receives a POST request to /bot
appBot.post('/bot', function (req, res) {
        const body = req.body.Body
        LOG.info('req.body:')
        LOG.info(req.body)
        data = { message: body, customData: { userId: req.body.From } }
        sessionID = req.body.From
        res.set('Content-Type', 'text/plain')

        //persisting incoming data to EDB
        dataPersist = { 'message': body, 'channel': 'rest' }
        //EDB.saveToEDB(dataPersist, 'user', sessionID,(err,response)=>{})

        //load client context in memory
        var memory = redisContext.getRedisKeyValue(redisClient, sessionID)

        if (body == '0') {
                memory = {}   //--------remove
                redisContext.removeRedisKeyValue(redisClient, sessionID)
        }
        LOG.info('context for: ' + sessionID)
        LOG.info(memory[sessionID])
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
        else if (memory && memory[sessionID]) {
                ////this if-else cascade is difficult to maintain, so working on a json config to drive this decision tree
                if (memory[sessionID]['role']) {
                        if (memory[sessionID]['educationLvl']) {
                                if (memory[sessionID]['board']) {
                                        if (memory[sessionID]['board'] == '1') {
                                                emitToUser(sessionID, res, literals.message.LINK + 'CBSE')
                                                redisContext.removeRedisKeyValue(redisClient, sessionID)
                                        } else if (memory[sessionID]['board'] == '2') {
                                                if (req.body.Body == '1') {
                                                        emitToUser(sessionID, res, literals.message.LINK + 'AP')
                                                        redisContext.removeRedisKeyValue(redisClient, sessionID)
                                                }
                                                if (req.body.Body == '2') {
                                                        emitToUser(sessionID, res, literals.message.LINK + 'KA')
                                                        redisContext.removeRedisKeyValue(redisClient, sessionID)
                                                }
                                                if (req.body.Body == '3') {
                                                        emitToUser(sessionID, res, literals.message.LINK + 'TN')
                                                        redisContext.removeRedisKeyValue(redisClient, sessionID)
                                                }
                                        } else {
                                                emitToUser(sessionID, res, literals.message.BOARD_NOT_HANDLED)
                                        }
                                }
                                else {
                                        if (req.body.Body == '1') {
                                                emitToUser(sessionID, res, literals.message.LINK + 'CBSE')
                                                redisContext.removeRedisKeyValue(redisClient, sessionID)
                                        } else if (req.body.Body == '2') {
                                                LOG.info('setting up board:' + req.body.Body)
                                                memory[sessionID]['board'] = req.body.Body
                                                redisContext.setRedisKeyValue(redisClient, sessionID, memory)
                                                emitToUser(sessionID, res, literals.message.CHOOSE_STATE)
                                        } else {
                                                emitToUser(sessionID, res, literals.message.BOARD_NOT_HANDLED)

                                        }
                                }
                        }
                        else {
                                LOG.info('setting up educationLvl:' + req.body.Body)
                                memory[sessionID]['educationLvl'] = req.body.Body
                                redisContext.setRedisKeyValue(redisClient, sessionID, memory)
                                if (req.body.Body == '2') {
                                        emitToUser(sessionID, res, literals.message.LINK)
                                        redisContext.removeRedisKeyValue(redisClient, sessionID)
                                } else {
                                        emitToUser(sessionID, res, literals.message.CHOOSE_BOARD)
                                }
                        }
                }
                else {
                        LOG.info('setting up role:' + req.body.Body)
                        memory[sessionID]['role'] = req.body.Body
                        redisContext.setRedisKeyValue(redisClient, sessionID, memory)
                        emitToUser(sessionID, res, literals.message.EDUCATION_LEVEL)
                }
        } else {
                memory[sessionID] = {}
                redisContext.setRedisKeyValue(redisClient, sessionID, memory)
                emitToUser(sessionID, res, literals.message.MENU)
        }
})

//send data to user
function emitToUser(sessionID, client, text) {
        //persisting outgoing data to EDB
        dataPersist = { 'message': text, 'channel': 'rest' }
        //EDB.saveToEDB(dataPersist, 'bot', sessionID,(err,response)=>{})
        //emit to client
        client.send(text)
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
