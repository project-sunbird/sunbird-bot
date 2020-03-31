var config = {};

config.RASA_API_TIMEOUT              = 200000
config.RASA_CORE_ENDPOINT            = 'http://localhost:5005/webhooks/rest/webhook'
config.SOCKET.HTTP.PORT              = 4005
config.REST.HTTP.PORT                = 4000
config.SOCKET.HTTPS.PORT             = 4001
config.REST.HTTPS.PORT               = 8443

config.HTTPS.PATH.KEY                = ''
config.HTTPS.PATH.CERT               = ''
config.HTTPS.PATH.CA                 = ''


module.exports = config;
