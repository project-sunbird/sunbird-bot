var axios = require("axios")
var APP_CONFIG = require('../../config/config')
var LOG = require('../../log/logger')

function processResponse(res, cb) {
  if (res && res.data && res.data.length > 0) {
    let quick_replies = []
    let intent = ''
    let resp = res.data.map((item) => {
      LOG.info('item@processResponse@botwebhook:', JSON.stringify(item))
      if (item.text) {
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
        return {
          "text": item.text,
          "quick_replies": quick_replies,
          "intent": intent
        }
      } else if (item.custom) {
        if (item.custom.blocks) {
          quick_replies = item.custom
          text = item.text
          type = ''
          entities = []
          if (item.custom.blocks[0] && item.custom.blocks[0].intent) {
            intent = item.custom.blocks[0].intent
          }
          if (item.custom.blocks[0] && item.custom.blocks[0].text) {
            text = {
              "data": {
                "text": item.custom.blocks[0].text
              }
            }
          }
          if (item.custom.blocks[0] && item.custom.blocks[0].type) {
            type = item.custom.blocks[0].type
          }
          if (item.custom.blocks[0] && item.custom.blocks[0].entities) {
            entities = item.custom.blocks[0].entities
          }
          LOG.info("intent: ", intent)
          return {
            "text": text,
            "quick_replies": quick_replies,
            "intent": intent,
            "type": type,
            "entities": entities
          }
        }
        else {
          quick_replies = item.custom
          text = item.text
          type = ''
          entities = []
          if (item.custom[0].intent) {
            intent = item.custom[0].intent
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
          return {
            "text": text,
            "quick_replies": quick_replies,
            "intent": intent,
            "type": type,
            "entities": entities
          }

        }
      } else {
        if (item.button) {
          quick_replies.push(item.button)
        }
        return {
          "text": '',
          "quick_replies": (item.button ? [] : []),
          "intent": intent
        }
      }
    })
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

exports.BOTWebHookAPI = function (data, clientId, cb) {
  axios.create(getCustomHeaders(APP_CONFIG.RASA_API_TIMEOUT))
    .post(getRasaEndpoint(data.endpoint), getBody(data.text, clientId), getHeaders())
    .then(res => {
      processResponse(res, (err, resp) => {
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

