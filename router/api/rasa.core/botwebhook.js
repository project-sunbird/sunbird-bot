var axios = require("axios")
var APP_CONFIG = require('../../config/config')
var LOG = require('../../log/logger')


function processResponse(res, userId, clientId, message, channel, cb) {
  var botRes = 'unknown_option_freeFlow'
  var knownIntent = ''
  if (res && res.data && res.data.length > 0) {
    let quick_replies = []
    let intent = ''
    let resp = res.data.map((item) => {
      if (item.text) {
        LOG.info('inside item.text')
        if (item.text.split('-----').length > 1) {
          intent = item.text.split('-----')[1]
          item.text = item.text.split('-----')[0]
        }
        if (item.buttons) {
          for (var i = 0; i < (item.buttons).length; i++) {
            item.buttons[0]['content_type'] = 'text';
          }
          quick_replies = item.buttons
        }
        knownIntent = intent
        return {
          "text": item.text,
          "quick_replies": quick_replies,
          "intent": intent
        }
      } else if (item.custom) {
        console.log("inside item.custom")
        if (item.custom.blocks) {
          console.log("inside item.custom.blocks")
          quick_replies = item.custom
          text = item.text
          type = ''
          entities = []
          if (item.custom.blocks[0] && item.custom.blocks[0].intent) {
            intent = item.custom.blocks[0].intent
          }
          if (item.custom.blocks[0] && item.custom.blocks[0].text) {
            if (channel == 'whatsapp') {
              text = {
                "data": {
                  "text": item.custom.blocks[0].text_whatsapp
                }
              }
            } else {
              text = {
                "data": {
                  "text": item.custom.blocks[0].text,
                  "buttons": item.custom.blocks[0].buttons
                }
              }

            }

          }
          if (item.custom.blocks[0] && item.custom.blocks[0].type) {
            type = item.custom.blocks[0].type
          }
          if (item.custom.blocks[0] && item.custom.blocks[0].entities) {
            entities = item.custom.blocks[0].entities
          }
          knownIntent = intent
          return {
            "text": text,
            "quick_replies": quick_replies,
            "intent": intent,
            "type": type,
            "entities": entities
          }
        }
        else {
          console.log("inside else item.custom")
          quick_replies = item.custom

          console.log("item.custom[0]-->", item.custom[0])
          console.log("item.custom[0].blocks[0].text-->", item.custom[0].blocks[0].text)

          text = item.text
          type = ''
          entities = []
          if (item.custom[0].intent) {
            intent = item.custom[0].intent
          }
          if (item.custom[0].blocks[0] && item.custom[0].blocks[0].text) {
            console.log("inside item.custom[0].blocks[0]")
            buttons = item.custom[0].blocks[0].buttons? item.custom[0].blocks[0].buttons : ''
            console.log("fetching buttons from domain-->")
            text = {
              "data": {
                "text": item.custom[0].blocks[0].text,
                "buttons": item.custom[0].blocks[0].buttons
              }
            }
            if (item.custom[0].blocks[0].buttons) {
              console.log("item.custom.blocks[0].buttons-->", item.custom[0].blocks[0].buttons)
              // text = {
              //   "data": {
              //     "text": item.custom[0].blocks[0].text,
              //     "buttons": item.custom[0].blocks[0].buttons
              //   }
              // }
            }
          }

          if (item.custom[0].text) {
            text = item.custom[0].text
          }
          if (item.custom[0].type) {
            type = item.custom[0].type
          }
          if (item.custom[0].entities) {
            entities = item.custom[0].entities
          }
          knownIntent = intent
          return {
            "text": text,
            "quick_replies": quick_replies,
            "intent": intent,
            "type": type,
            "entities": entities,
            // "buttons": buttons
          }

        }
      } else {
        console.log("inside else ")
        if (item.button) {
          quick_replies.push(item.button)
        }
        knownIntent = intent
        return {
          "text": '',
          "quick_replies": (item.button ? [] : []),
          "intent": intent
        }
      }

    })
    consolidatedLog(userId, clientId, message, knownIntent, channel)
    return cb(null, {
      res: resp
    })
  }
  return cb(null, {
    res: [{
      "text": '',
      "quick_replies": [],
    }]
  })

}

function consolidatedLog(userId, clientId, message, knownIntent, channel) {
  if (knownIntent != "low_confidence") {
    if (channel == 'whatsapp') {
      botResponseIdentifier = "whatsapp_Free_flow_intent_detected"
    } else {
      botResponseIdentifier = "Free_flow_intent_detected"
    }
    LOG.info("UserId: " + userId + "," + " DeviceId: " + clientId + "," + " UserQuery: " + message + "," + " Bot_Response_identifier: " + botResponseIdentifier + "," + " BotResponse: " + knownIntent)

  }
}


function getBody(text, clientId) {
  return {
    "message": text,
    "sender": clientId,
  };
}

function getHeaders() {
  return {
    "Content-Type": "application/json"
  };
}

function getCustomHeaders(timeout) {
  return {
    timeout: timeout
  }
}

function getRasaEndpoint(type) {
  return APP_CONFIG.RASA_CORE_ENDPOINT;
}

exports.BOTWebHookAPI = function (data, userId, clientId, channel, cb) {
  axios.create(getCustomHeaders(APP_CONFIG.RASA_API_TIMEOUT))
    .post(getRasaEndpoint(data.endpoint), getBody(data.text, clientId), getHeaders())
    .then(res => {
      processResponse(res, userId, clientId, data.text, channel, (err, resp) => {
        if (err) {
          LOG.error('error in call to bot')
          cb(err, null)
        } else {
          cb(null, resp)
        }
      })
    })
    .catch(err => {
      cb(err, null);
    });
}

