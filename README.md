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

# Integration Instructions

- REST integration
    Method: Post
    Endpoint: http://<IP>:<PORT>/bot
    Body:
    {
    "Body": "Hi",
    "From": "AC6436e7066283ef84c88a05392cc0fcd6"
    }
    Header:
    {'content-type': 'application/json'}

    *Body - User message
    *From - session id (uuid or some Session/ User identifier)

    - Response:  Text based response

    - Curl request for the same:

        curl -X POST \
        http://<IP>:<PORT>/bot \
        -H 'content-type: application/json' \
        -d '{
        "Body": "Hi",
        "From": "AC6436e7066283ef84c88a05392cc0fcd6"
        }'


- Socket Integration
    - Socket message body sample(using socket.io):
    - Request:
        Url: http://52.173.240.27:4005
        Body:
        ["user_uttered",{"message":"what are the timelines for portal?","customData":{"userId":"123"}}]
    - Response: 
        ["bot_uttered",{"text":"please choose from CBSE or State Board, other bords are not handled as of yet. 1. CBSE \n 2. State Board","intent":"template_ans_demo","type":"response"}]
