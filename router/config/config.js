var config = {};



config.RASA_API_TIMEOUT              = 200000
config.RASA_CORE_ENDPOINT            = 'http://localhost:5005/webhooks/rest/webhook'
config.SOCKET_HTTP_PORT              = 4005
config.REST_HTTP_PORT                = 4000
config.SOCKET_HTTPS_PORT             = 4001
config.REST_HTTPS_PORT               = 8443

config.HTTPS_PATH_KEY                = ''
config.HTTPS_PATH_CERT               = ''
config.HTTPS_PATH_CA                 = ''


module.exports = config;
