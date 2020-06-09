var chatflow = {
};

var teacher = {
    step1: {
        messageKey: "START_TEACHER",
        responseVariable: "userType",
    },
    step1_1: {
        messageKey: "CHOOSE_BOARD",
        responseVariabl: "userLevel",
    },
    step1_1_1: {
        messageKey: "EDUCATION_LEVEL",
        responseVariabl: "userBoard",
    },
    step1_wrong_input: {
        messageKey: "SORRY",
        responseVariable: ""
    }
};
var student = {
    step1: {
        messageKey: "START_STUDENT",
        responseVariable: "userType",
    },
    step1_1: {
        messageKey: "CHOOSE_BOARD",
        responseVariabl: "userLevel",
    },
    step1_1_1: {
        messageKey: "EDUCATION_LEVEL",
        responseVariabl: "userBoard",
    },
    step1_wrong_input: {
        messageKey: "SORRY",
        responseVariable: ""
    }
};


module.exports.chatflow = student;
module.exports.teacher = teacher
module.exports.student = student;