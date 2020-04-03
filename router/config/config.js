var config = {};



config.RASA_API_TIMEOUT              = 200000
config.RASA_CORE_ENDPOINT            = 'http://localhost:5005/webhooks/rest/webhook'
config.SOCKET_HTTP_PORT              = 4005
config.REST_HTTP_PORT                = 4000
config.SOCKET_HTTPS_PORT             = 4001
config.REST_HTTPS_PORT               = 8443
config.TELEGRAM_HTTPS_PORT           = 4009

config.HTTPS_PATH_KEY                = ''
config.HTTPS_PATH_CERT               = ''
config.HTTPS_PATH_CA                 = ''


config.REDIS_PORT					 = 6379
config.ELASTIC_HOST                  = 'http://<user>:<password><IP>:<Port>'
config.ELASTIC_INDEX_NAME            = 'indx_name'
config.ELASTIC_INDEX_TYPE            = 'indx_type'

config.TELEGRAM_BOT_ENDPOINT         = 'https://api.telegram.org/bot<bot_secret_key>/sendMessage'


module.exports = config;
