const env = process.env

var config = {};
config.RASA_API_TIMEOUT              = 200000
config.RASA_CORE_ENDPOINT            = env.RASA_CORE_ENDPOINT || 'http://localhost:5005/webhooks/rest/webhook'
config.SOCKET_HTTP_PORT              = 4005
config.REST_HTTP_PORT                = env.HTTP_PORT || 8000
config.SOCKET_HTTPS_PORT             = 4001
config.REST_HTTPS_PORT               = 8443
config.TELEGRAM_HTTPS_PORT           = 4009

config.HTTPS_PATH_KEY                = env.HTTPS_PATH_KEY || ''
config.HTTPS_PATH_CERT               = env.HTTPS_PATH_CERT || ''
config.HTTPS_PATH_CA                 = env.HTTPS_PATH_CA || ''

config.TELEMETRY_ENDPOINT          = env.telemetry_endpoint || 'v1/telemetry'
config.TELEMETRY_SYNC_BATCH_SIZE   = env.telemetry_sync_batch_size || 1
config.API_AUTH_TOKEN              = env.sunbird_api_auth_token || ''
config.TELEMETRY_SERVICE_URL       = env.telemetry_service_url || ''
config.TELEMETRY_DATA_VERSION      = env.telemetry_version || '1.1'
config.TELEMETRY_DATA_PID          = env.telemetry_pid || 'dikshavani.botclient'
config.TELEMETRY_DATA_PID_WHATSAPP = env.telemetry_pid || 'whatsapp'
config.TELEMETRY_DATA_ENV_WHATSAPP = env.telemetry_pid || 'diksha.whatsapp'
config.TELEMETRY_DATA_CHANNELID_WHATSAPP = env.WHATSAPP_TELEMETRY_CHANNEL || 'DEFAULT_ORG.CHANNELID'
config.SECRET_KEY                  = env.WHATSAPP_SECRET_KEY || 'secretkey'

config.REDIS_PORT					 = 6379
config.REDIS_HOST					 = env.REDIS_HOST || 'localhost'
config.ELASTIC_HOST                  = 'http://<user>:<password><IP>:<Port>'
config.ELASTIC_INDEX_NAME            = 'indx_name'
config.ELASTIC_INDEX_TYPE            = 'indx_type'

config.WHATSAPP_URL                = 'https://waapi.pepipost.com/api/v2/message/'
config.WHATSAPP_AUTHORIZATION      = env.WHATSAPP_AUTH_TOKEN || 'authtoken'
config.WHATSAPP_MESSAGE_TYPE       = 'text'
config.WHATSAPP_SOURCE             = env.WHATSAPP_SOURCE || 'source'
config.WHATSAPP_RECIPIENT_TYPE     = 'individual'
config.WHATSAPP_API_HEADER         = 'custom_data'

config.WHATSAPP                              = 'whatsapp'
config._WHATSAPP                              = '_whatsapp'
config.WHATSAPP_INTENT_DETECTED              = 'whatsapp_intent_detected'
config.WHATSAPP_INTENT_NOT_DETECTED          = 'whatsapp_intent_not_detected'
config.INTENT_DETECTED                       = 'intent_detected'
config.INTENT_NOT_DETECTED                   = 'intent_not_detected'
config.WHATSAPP_FREEFLOW_INTENT_DETECTED     = 'whatsapp_Free_flow_intent_detected'
config.WHATSAPP_FREEFLOW_INTENT_NOT_DETECTED = 'whatsapp_Free_flow_intent_not_detected'
config.FREEFLOW_INTENT_DETECTED              = 'Free_flow_intent_detected'
config.FREEFLOW_INTENT_NOT_DETECTED          = 'Free_flow_intent_not_detected'
config.WHATSAPP_MENU_INTENT_DETECTED         = 'whatsapp_Menu_intent_detected'
config.WHATSAPP_MENU_INTENT_NOT_DETECTED     = 'whatsapp_Menu_intent_not_detected'
config.MENU_INTENT_DETECTED                  = 'Menu_intent_detected'
config.MENU_INTENT_NOT_DETECTED              = 'Menu_intent_not_detected'
config.WHATSAPP_UNKNOWN_OPTION_FREEFLOW      = 'whatsapp_unknown_option_freeFlow'
config.UNKNOWN_OPTION_FREEFLOW               = 'unknown_option_freeFlow'
config.UNKNOWN_OPTION                        = 'unknown_option'

config.TELEGRAM_BOT_ENDPOINT         = 'https://api.telegram.org/bot<bot_secret_key>/sendMessage'

config.CONFIG_BLOB_PATH = env.CONFIG_BLOB_PATH

module.exports = config;
