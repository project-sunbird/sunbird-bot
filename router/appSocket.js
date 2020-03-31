var http                     = require('http');
var https                    = require('https');
var fs                       = require('fs');
var express                  = require('express');
var helmet                   = require('helmet')
var bodyParser               = require('body-parser');
var methodOverride           = require('method-override');
var RasaCoreController       = require('./controllers/rasaCoreController')
var UUIDV4                   = require('uuid')
var config                   = require('./config/config')
var LOG                      = require('./log/logger')
var literals                 = require('./config/literals')

process.on('SIGINT', function () {
        LOG.info("stopping the application")
        process.exit(0);
});
//// IVR is best done outside the bot...as no NLU interpretation is required
var options = {
  key: fs.readFileSync(config.HTTPS.PATH.KEY),
  cert: fs.readFileSync(config.HTTPS.PATH.CERT),
  ca: fs.readFileSync(config.HTTPS.PATH.CA)
};

startApp()
// this object tracks session. It needs to be moved to Redis
memory = {}
function startApp() {
        var app = express();
        app.use(helmet())
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({
                extended: true
        }));
        app.use(methodOverride());

        app.use(function (req, res, next) {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
                res.header('Access-Control-Allow-Headers', 'userid, application-id, appid, secret-id, token, Content-Type, Authorization, *');

                if ('OPTIONS' === req.method) {
                        res.sendStatus(200);
                }
                else {
                        next();
                };
        });

        var router = express.Router();

        var server = http.createServer(app);
        const io = require('socket.io')(server, {
                path: '/socket.io'
        });

        var serverHTTPS = https.createServer(options, app);
        const io = require('socket.io')(server, {
                path: '/socket.io'
        });



        io.on('connection', client => {
                LOG.info(`client with connection id: ${client.id} connected`)
                client['session_id'] = UUIDV4()
                LOG.info(`session id for this session is ${client['session_id']}`)
                client.on('disconnect', () => {
                        LOG.info(`client with connection id: ${client.id} disconnected`)
                        if (client.sessionInfo) {
                                LOG.info(`closing sessior clientId ${client.id} with AACC credentails ${JSON.stringify(client.sessionInfo)}`)
                        }

                });

                client.on('session_request', (data) => {
                        //client['session_id']  = UUIDV4()
                        data['session_id'] = client['session_id']
                        client.emit("session_confirm", data['session_id'], (data) => {
                                LOG.info(`client with connection id: ${client.id} is confirmed`)
                        })
                });

                /**
                 * Receiving and processing the data in respective controller.
                 * The channel 'user_uttered' passes message to RASA CORE
                 */
                client.on('user_uttered', (data) => {
                        const body = data.message
                        LOG.info('req.body:')
                        LOG.info(data)
                        sessionID = data.customData.userId
                        LOG.info('context for: ' + sessionID)
                        LOG.info(memory[sessionID])
                        if (body == '0') {
                                delete memory[sessionID]
                        }
                        // all non numeric user messages go to bot
                        if (isNaN(body)) {
                                ///Bot interaction flow
                                RasaCoreController.processUserData(data, sessionID, (err, res) => {
                                        if (err) {
                                                RasaCoreController.sendCustomTextToUser(client, 500, () => { })
                                        } else {
                                                let responses = res.res;
                                                for (var i = 0; i < responses.length; i++) {
                                                        RasaCoreController.sendDataToUser(client, responses[i], (err, res) => {
                                                                if (err) {
                                                                        LOG.error(err)
                                                                }
                                                        })
                                                }
                                        }
                                })
                        }
                        // this section with numeric input does not require NLU interpretation so it will not go to Bot
                        if (memory[sessionID]) {
                                ////this is difficult to maintain, so working on a json config to drive this decision tree
                                if (memory[sessionID]['role']) {
                                        if (memory[sessionID]['educationLvl']) {
                                                if (memory[sessionID]['board']) {
                                                        if (memory[sessionID]['board'] == '1') {
                                                                emitToUser(client, literals.message.LINK + 'CBSE')
                                                                delete memory[sessionID]
                                                        } else if (memory[sessionID]['board'] == '2') {
                                                                if (memory[sessionID]['boardType']) {
                                                                        if (memory[sessionID]['boardType'] == '1') {
                                                                                emitToUser(client, literals.message.LINK + 'AP')
                                                                                delete memory[sessionID]
                                                                        }
                                                                        if (memory[sessionID]['boardType'] == '2') {
                                                                                emitToUser(client, literals.message.LINK + 'KA')
                                                                                delete memory[sessionID]
                                                                        }
                                                                        if (memory[sessionID]['boardType'] == '3') {
                                                                                emitToUser(client, literals.message.LINK + 'TN')
                                                                                delete memory[sessionID]
                                                                        }
                                                                }
                                                                else {
                                                                        LOG.info('setting up boardType:' + body)
                                                                        memory[sessionID]['boardType'] = body
                                                                        if (memory[sessionID]['boardType'] == '1') {
                                                                                emitToUser(client, literals.message.LINK + 'AP')
                                                                                delete memory[sessionID]
                                                                        }
                                                                        if (memory[sessionID]['boardType'] == '2') {
                                                                                emitToUser(client, literals.message.LINK + 'KA')
                                                                                delete memory[sessionID]
                                                                        }
                                                                        if (memory[sessionID]['boardType'] == '3') {
                                                                                emitToUser(client, literals.message.LINK + 'TN')
                                                                                delete memory[sessionID]
                                                                        }
                                                                }
                                                        } else {
                                                                emitToUser(client, literals.message.BOARD_NOT_HANDLED)
                                                        }
                                                }
                                                else {
                                                        if (body == '1') {
                                                                LOG.info('setting up board:' + body)
                                                                memory[sessionID]['board'] = body
                                                                emitToUser(client, literals.message.LINK + 'CBSE')
                                                                delete memory[sessionID]
                                                        } else if (body == '2') {
                                                                LOG.info('setting up board:' + body)
                                                                memory[sessionID]['board'] = body
                                                                emitToUser(client, literals.message.CHOOSE_STATE)
                                                        } else {
                                                                emitToUser(client, literals.message.BOARD_NOT_HANDLED)

                                                        }
                                                }
                                        }
                                        else {
                                                LOG.info('setting up educationLvl:' + body)
                                                memory[sessionID]['educationLvl'] = body
                                                if (body == '2') {
                                                        emitToUser(client, literals.message.LINK)
                                                        delete memory[sessionID]
                                                } else {
                                                        emitToUser(client, literals.message.CHOOSE_BOARD)
                                                }
                                        }
                                }
                                else {
                                        LOG.info('setting up role:' + body)
                                        memory[sessionID]['role'] = body
                                        emitToUser(client, literals.message.EDUCATION_LEVEL)
                                }
                        } else {
                                memory[sessionID] = {}
                                emitToUser(client, literals.message.MENU)
                        }
                })



        });
        LOG.info(APP_CONFIG)

        function emitToUser(client, text) {
                LOG.info('emitToUser called')
                data = {}
                data['text'] = text
                data['intent'] = 'template_ans_demo'
                data['type'] = 'response'
                client.emit('bot_uttered', data, (err, res) => {
                        if (err) {
                                LOG.info(err)
                        } else {
                        }
                })
        }

        server.listen(config.SOCKET.HTTP.PORT, function () {
                LOG.info("starting the application at [%s]", config.REST.HTTP.PORT)
        });

	serverHTTPS.listen(config.SOCKET.HTTPS.PORT, function () {
                LOG.info("starting the application at [%s]", config.SOCKET.HTTPS.PORT)
        });
}


