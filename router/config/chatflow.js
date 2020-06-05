var chatflow = {
    step1: {
        messageKey: "START",
        responseVariable: "userType",
    },
    step1_1: {
        messageKey: "EDUCATION_LEVEL",
        responseVariabl: "userLevel",
    },
    step1_1_1: {
        messageKey: "CHOOSE_BOARD",
        responseVariabl: "userBoard",
    },
    step1_wrong_input: {
        messageKey: "SORRY",
        responseVariable: ""
    }
};

module.exports.chatflow = chatflow;