const express               = require('express')
const bodyParser            = require('body-parser')
const cors                  = require('cors')
const axios                 = require('axios')
var https                   = require('https');
var http                    = require('http');
var fs                      = require('fs');
var origins                 = require('./config/corsList')
var LOG                     = require('./log/logger')
var literals                = require('./config/literals')
var config                  = require('./config/config')
var RasaCoreController      = require('./controllers/rasaCoreController')
var EDB                     = require('./api/elastic/connection')
const appBot                = express()

//// IVR is best done outside the bot...as no NLU interpretation is required


//cors handling
appBot.use(cors());

//body parsers for requests
appBot.use(bodyParser.json());
appBot.use(bodyParser.urlencoded({ extended: false }))

// this object tracks session. It needs to be moved to Redis
var memory = {}
// Route that receives a POST request to /bot
appBot.post('/bot', function (req, res) {
    const body = req.body.message.text
    LOG.info('req.body:')
    LOG.info(req.body)
    data = { message: body, customData: { userId: req.body.message.chat.id } }
    sessionID = req.body.message.chat.id
    LOG.info('context for: ' + sessionID)
    LOG.info(memory[sessionID])

    //persisting incoming data to EDB
    dataPersist = { 'message': req.body, 'channel': 'telegram' }
    //EDB.saveToEDB(dataPersist, 'user', sessionID,(err,response)=>{})

    if (body == '0') {
        memory = {}
    }
    // all non numeric user messages go to bot
    if (isNaN(body)) {
        ///Bot interaction flow
        RasaCoreController.processUserData(data, sessionID, (err, resp) => {
            if (err) {
                LOG.info('RasaCoreController.processUserData: error')
                emitToUser(sessionID, res, literals.message.SORRY)
            } else {
                let responses = resp.res;
                for (var i = 0; i < responses.length; i++) {
                    LOG.info('RasaCoreController.processUserData: for loop')
                    LOG.info(responses[i])
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
                            LOG.info('setting up boardType:' + body)
                            memory[sessionID]['boardType'] = body
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
                    if (body == '1') {
                        LOG.info('setting up board:' + body)
                        memory[sessionID]['board'] = body
                        emitToUser(sessionID, res, literals.message.LINK + 'CBSE')
                        delete memory[sessionID]
                    } else if (body == '2') {
                        LOG.info('setting up board:' + body)
                        memory[sessionID]['board'] = body
                        emitToUser(sessionID, res, literals.message.CHOOSE_STATE)
                    } else {
                        emitToUser(sessionID, res, literals.message.BOARD_NOT_HANDLED)

                    }
                }
            }
            else {
                LOG.info('setting up educationLvl:' + body)
                memory[sessionID]['educationLvl'] = body
                if (body == '2') {
                    emitToUser(sessionID, res, literals.message.LINK)
                    delete memory[sessionID]
                } else {
                    emitToUser(sessionID, res, literals.message.CHOOSE_BOARD)
                }
            }
        }
        else {
            LOG.info('setting up role:' + body)
            memory[sessionID]['role'] = body
            emitToUser(sessionID, res, literals.message.EDUCATION_LEVEL)
        }
    } else {
        memory[sessionID] = {}
        emitToUser(sessionID, res, literals.message.MENU)
    }
})

//send data to user
function emitToUser(sessionID, client, text) {
    //persisting outgoing data to EDB
    dataPersist = { 'message': text, 'channel': 'telegram' }
    LOG.info('text')
    LOG.info(text)
    //EDB.saveToEDB(dataPersist, 'bot', sessionID,(err,response)=>{})
    //emit to client
    axios
        .post(
            config.TELEGRAM_BOT_ENDPOINT,
            {
                chat_id: sessionID,
                text: text
            }
        )
        .then(response => {
            // We get here if the message was successfully posted
            //LOG.info('Message posted')
            client.end('ok')
        })
        .catch(err => {
            // ...and here if it was not
            LOG.err('Error :', err)
            client.end('Error :' + err)
        })

}
//Telegram only listens to HTTPS endpoints
//https endpoint only started if you have updated the config with key/crt files
if (config.HTTPS_PATH_KEY) {
    //https certificate setup
    var options = {
        key: fs.readFileSync(config.HTTPS_PATH_KEY),
        cert: fs.readFileSync(config.HTTPS_PATH_CERT),
        ca: fs.readFileSync(config.HTTPS_PATH_CA)
    };

    https.createServer(options, appBot).listen(config.TELEGRAM_HTTPS_PORT, function (err) {
        if (err) {
            throw err
        }

        LOG.info('Server started on port ' + config.TELEGRAM_HTTPS_PORT)
    });

}

