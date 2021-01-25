module.exports = {
    botResponse:{
        "type": "button",
        "data": {
            "text": " Hello, I am Tara!<br>I am your DIKSHA guide<br>Please select your preference from the options I provide or type your query directly.",
            "buttons": [
                {
                    "text": "Digital content",
                    "value": "1"
                },
                {
                    "text": "Courses",
                    "value": "2"
                },
                {
                    "text": "DIKSHA mobile app",
                    "value": "3"
                },
                {
                    "text": "Content contribution",
                    "value": "4"
                },
                {
                    "text": "Other DIKSHA queries",
                    "value": "5"
                }
            ]
        }
    },
    whatsappResponse:{
        "text": "Hi, I’m TARA, your DIKSHA assistant. How may I help you today? \n Select from one of the following options. Send the number corresponding to your choice \n 1- To find and play content \n 2- To download/update the DIKSHA mobile app \n 3- Other Queries",
        "intent": "greet",
        "type": "buttons",
        "buttons": []
    },
    refreshAPIResponse: {
        "msg": "ENV configuration blob path is not defined"
    },
    postRes: {
        "code": "ok",
        "payload": {}
    },
    errorResponse: {
        "code": "params-missing",
        "message": "Something was wrong with the request payload you passed in. | Required parameters were missing from this API call, please see the \"params\" property",
        "params": {}
    },
   errorMessage: {
    "code": "not-found",
    "message": "Invalid API call",
    "params": {}
} 
}