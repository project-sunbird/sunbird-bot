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