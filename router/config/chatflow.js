var chatflow = {
    step1: {
        messageKey: "START",
        responseVariable: "userIntent"
    },
    step1_error: {
        messageKey: "UNKNOWN_OPTION",
        responseVariable: ""
    },
    step1_1: {
        messageKey: "CHOOSE_DIGITAL_CONTENT",
        responseVariable: "userBoard"
    },
    step1_1_1: {
        messageKey: "CHOOSE_BOARD",
        responseVariable: "userBoard"
    },
    step1_1_error: {
        messageKey: "WRONG_INPUT_AT_FIRST_LEVEL",
        responseVariable: ""
    },
    step1_1_1_1: {
        messageKey: "CBSE_MESSAGE",
        responseVariable: ""
    },
    step1_1_1_2: {
        messageKey: "CHOOSE_STATE_BOARD",
        responseVariable: "stateBoard"
    },
    step1_1_1_2_error: {
        messageKey: "WRONG_INPUT_AT_SECOND_LEVEL",
        responseVariable: ""
    },
    step1_1_1_2_1: {
        messageKey: "TN_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_2: {
        messageKey: "KA_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_3: {
        messageKey: "GJ_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_4: {
        messageKey: "UP_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_5: {
        messageKey: "PB_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_6: {
        messageKey: "RJ_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_7: {
        messageKey: "MN_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_8: {
        messageKey: "CG_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_9: {
        messageKey: "MITRA_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_10: {
        messageKey: "BR_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_11: {
        messageKey: "OD_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_12: {
        messageKey: "AS_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_13: {
        messageKey: "MP_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_14: {
        messageKey: "HR_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_15: {
        messageKey: "NL_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_16: {
        messageKey: "GA_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_17: {
        messageKey: "TS_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_18: {
        messageKey: "APEKX_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_19: {
        messageKey: "ML_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_20: {
        messageKey: "NCERT_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_21: {
        messageKey: "JH_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_22: {
        messageKey: "SK_BOARD",
        responseVariable: ""
    },
    step1_1_1_2_23: {
        messageKey: "CH_BOARD",
        responseVariable: ""
    },

    step1_1_2: {
        messageKey: "WEEKLY_CRITICAL_THINKING",
        responseVariable: ""
    },
    step1_1_2_error: {
        messageKey: "WRONG_INPUT_AT_FIRST_LEVEL",
        responseVariable: ""
    },
    step1_2: {
        messageKey: "TRAINING",
        responseVariable: ""
    },
    step1_2_error: {
        messageKey: "WRONG_INPUT_AT_FIRST_LEVEL",
        responseVariable: ""
    },
    step1_2_1: {
        messageKey: "CHOOSE_STATE_TRAINING_BOARD",
        responseVariable: ""
    }, step1_2_1_1: {
        messageKey: "TRAINING_CBSE_BOARD",
        responseVariable: ""
    },
    step1_2_1_2: {
        messageKey: "TRAINING_UP_BOARD",
        responseVariable: ""
    },
    step1_2_1_3: {
        messageKey: "TRAINING_MP_BOARD",
        responseVariable: ""
    },
    step1_2_1_4: {
        messageKey: "TRAINING_GJ_BOARD",
        responseVariable: ""
    },
    step1_2_1_5: {
        messageKey: "TRAINING_OTHERS_BOARD",
        responseVariable: ""
    },
    step1_2_1_1_error: {
        messageKey: "WRONG_INPUT_AT_FIRST_LEVEL",
        responseVariable: ""
    },
    step1_2_2: {
        messageKey: "CHOOSE_IGOT_TRAINING_OPTION",
        responseVariable: ""
    },
    step1_2_2_error: {
        messageKey: "WRONG_INPUT_AT_FIRST_LEVEL",
        responseVariable: ""
    },
    step1_2_2_1: {
        messageKey: "IGOT_TRAINING",
        responseVariable: ""
    },
    step1_2_2_2: {
        messageKey: "CERTIFICATE_ISSUE",
        responseVariable: ""
    },
    step1_2_3: {
        messageKey: "NISHTHA_TRAINING",
        responseVariable: ""
    },
    step1_2_3_1: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (tamil nadu)",name: "TAMILNADU"}},
        responseVariable: ""
    },
    step1_2_3_2: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (karnataka)",name: "KARNATAKA"}},
        responseVariable: ""
    },
    step1_2_3_3: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (gujarat)",name: "GUJARAT"}},
        responseVariable: ""
    },
    step1_2_3_4: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (uttar pradesh)",name: "UTTAR PRADESH"}},
        responseVariable: ""
    },
    step1_2_3_5: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (punjab)",name: "PUNJAB"}},
        responseVariable: ""
    },
    step1_2_3_6: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (rajasthan)",name: "RAJASTAN"}},
        responseVariable: ""
    },
    step1_2_3_7: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (manipur)",name: "MANIPUR"}},
        responseVariable: ""
    },
    step1_2_3_8: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (chhattisgarh)",name: "CHHATTISGARH"}},
        responseVariable: ""
    },
    step1_2_3_9: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (maharashtra)",name: "MAHARASTHTRA"}},
        responseVariable: ""
    },
    step1_2_3_10: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (bihar)",name: "BIHAR"}},
        responseVariable: ""
    },
    step1_2_3_11: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (odisha)",name: "ODISHA"}},
        responseVariable: ""
    },
    step1_2_3_12: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (assam)",name: "ASSAM"}},
        responseVariable: ""
    },
    step1_2_3_13: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (madhya pradesh)",name: "MADHYA PRADESH"}},
        responseVariable: ""
    },
    step1_2_3_14: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (haryana)",name: "HARYANA"}},
        responseVariable: ""
    },
    step1_2_3_15: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (nagaland)",name: "NAGALAND"}},
        responseVariable: ""
    },
    step1_2_3_16: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (goa)",name: "GOA"}},
        responseVariable: ""
    },
    step1_2_3_17: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (telangana)",name: "TELENGANA"}},
        responseVariable: ""
    },
    step1_2_3_18: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (andhra pradesh)",name: "ANDHRA PRADESH"}},
        responseVariable: ""
    },
    step1_2_3_19: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (meghalaya)",name: "MEGHALAYA"}},
        responseVariable: ""
    },
    step1_2_3_20: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "NCERT",name: "NCERT"}},
        responseVariable: ""
    },
    step1_2_3_21: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (jharkhand)",name: "JHARKHAND"}},
        responseVariable: ""
    },
    step1_2_3_22: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (sikkim)",name: "SIKKIM"}},
        responseVariable: ""
    },
    step1_2_3_23: {
        messageKey: "NISHTHA_BOARD",
        data: {replaceLabels: {key: "Nishtha 2020", board: "state (chandigarh)",name: "CHANDIGARH"}},
        responseVariable: ""
    },
    step1_2_2_error: {
        messageKey: "WRONG_INPUT_AT_FIRST_LEVEL",
        responseVariable: ""
    },
    step1_2_error: {
        messageKey: "WRONG_INPUT_AT_FIRST_LEVEL",
        responseVariable: ""
    },
    step1_3: {
        messageKey: "PLAYSTORE",
        responseVariable: ""
    },
    step1_4: {
        messageKey: "CONTRIBUTE_CONTENT",
        responseVariable: ""
    },
    step1_5: {
        messageKey: "OTHER_OPTIONS",
        responseVariable: "other_options"
    },
    step1_5_1: {
        messageKey: "SCAN_QRCODE",
        responseVariable: ""
    },
    step1_5_2: {
        messageKey: "UNABLE_LOGIN",
        responseVariable: ""
    },
    step1_5_3: {
        messageKey: "FORGOT_PASSWORD",
        responseVariable: ""
    },
    step1_5_4: {
        messageKey: "OTHERS",
        responseVariable: ""
    },
    step1_5_error: {
        messageKey: "WRONG_INPUT_AT_SECOND_LEVEL",
        responseVariable: ""
    },
    step1_wrong_input: {
        messageKey: "UNKNOWN_OPTION",
        responseVariable: ""
    }
};

module.exports.chatflow = chatflow;