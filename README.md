# Chatbot-core
Core dialogue engine for chatbots


# Router Module
- "npm install" to install dependencies
- "config/config.js" can be modified to change ports
- "node appRest" to start the REST endpoint
- "node appSocket" to start Socket endpoint

# Bot module
- activate appropriate environment (conda)
- start RASA core server by running "rasa run -m pm_models -p 5006 --enable-api --cors "*" -vv"
- start RASA action endpoint server by running "rasa run actions -vv -p 5056"