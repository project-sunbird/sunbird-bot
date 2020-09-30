var LOG = require('../log/logger');
var API = require('../api/rasa.core/botwebhook')
const _ = require("lodash")

/**
 * @description handle data received on 'user_uttered' channel
 * @param arg1: data, received from 'user'
 * @param arg2: userId
 * @param arg3: clientId, client id allocated to the connected session
 * @param arg4: cb, callback function
 */
function processUserData(data, cb) {
        webHookData = {
                text: data["message"],
                endpoint: data["endpoint"]
        }
        API.BOTWebHookAPI(webHookData,data.customData.userId, data.customData.deviceId, data.channel , (err, res) => {
                if (err) {
                        LOG.error(`BOTWebHookAPI failed: ${err}`)
                        return cb(err, null)
                } else {
                        return cb(null, res)
                }
        })
}


/**
 * @description send data to user
 * @param arg1: client, client identifier
 * @param arg2: data, data to send
 * @param arg3: cb, callback function
 */
function sendDataToUser(client, data, cb) {

        client.emit('bot_uttered', data, (err, res) => {
                if (err) {
                        sendCustomTextToUser(client, err, () => { })
                        LOG.err('could not emit to client')
                } else {
                        return cb()
                }
        })
}

/**
 * @description send data to user
 * @param arg1: client, client identifier
 * @param arg2: cb, callback function
 */
function sendCustomTextToUser(client, text, cb) {
        data = {}
        data['text'] = 'Sorry, could not respond properly.'
        data['intent'] = 'text'
        data['type'] = 'response'

        client.emit('bot_uttered', data, () => {
                return cb()
        })
}

module.exports.processUserData = processUserData;
module.exports.sendDataToUser = sendDataToUser
module.exports.sendCustomTextToUser = sendCustomTextToUser
