const _ = require('lodash')
var LOG = require('../../log/logger')
const Telemetry = require('sb_telemetry_util')
const TelemetryLogger = require('sb_logger_util')
var UUID = require('uuid')
const telemetry = new Telemetry()
module.exports = {
  ver  : '',
  pid : '',

  /**
   * this function helps to generate session start event
   */
  logSessionStart: function (sessionData) {
    var channelId = sessionData.channelId
    var appId = sessionData.appId
    var env = sessionData.env
    const edata = telemetry.startEventData('botsession')
    edata.uaspec = sessionData.uaspec;
    // var pdata = { id: appId, ver: config.TELEMETRY_DATA_VERSION, pid: 'dikshavani.botclient' };
    var pdata = {id: appId, ver:this.ver, pid:this.pid}
    const context = telemetry.getContextData({ channel: channelId, env: env, pdata: pdata})
    context.sid = sessionData.sessionId
    context.did = sessionData.deviceId
    context.rollup = telemetry.getRollUpData([])
    const actor = telemetry.getActorData(sessionData.userId, 'user')
    var headers = [];
    var channelIdHeader = { key: 'x-channel-id', value : channelId };
    headers.push(channelIdHeader);
    telemetry.start({
      edata: edata,
      headers: headers,
      context: context,
      actor: actor,
      tags: _.concat([], channelId)
    })
  },

  /**
   * this function helps to generate session start event
   */
  logInteraction: function (data) {
    try {
      var channelId = data.requestData.channelId
      var appId = data.requestData.appId
      var env = data.requestData.env
      // var pdata = { id: appId, ver: config.TELEMETRY_DATA_VERSION, pid: 'dikshavani.botclient' };
      var pdata = {id: appId, ver: this.ver, pid: this.pid}
      const context = telemetry.getContextData({ channel: channelId, env: env, pdata: pdata})
      context.sid = data.requestData.sessionId;
      context.did = data.requestData.deviceId;
      context.rollup = telemetry.getRollUpData([])
      const actor = telemetry.getActorData(data.requestData.userId, 'user')
      var options = { 
        context: context, // To override the existing context
        object: {}, // To override the existing object
        actor: actor, // To override the existing actor
        tags: _.concat([], channelId), // To override the existing tags
        runningEnv: "server" // It can be either client or server
      }
      var headers = [];
      var channelIdHeader = { key: 'x-channel-id', value : channelId };
      headers.push(channelIdHeader);
      telemetry.interact({
        data: data.interactionData,
        options: options,
        headers: headers
      });
    } catch(e) {
      LOG.error('Error while interaction event')
    }
  },

  initializeTelemetry: function(config) {
    this.pid = config.pid;
    this.ver = config.ver;
    try {
      telemetry.init({
        method: 'POST',
        version: '1.0',
        batchsize: config.batchSize,
        endpoint: config.endPoint,
        host: config.serviceUrl,
        headers: {
          // 'x-app-id': 'dikshavani.botclient', previously 
          'x-app-id' : this.pid,
          'Authorization':'Bearer ' + config.apiToken,
          'x-device-id' : ''
        }
      })
    } catch(e) {
      LOG.error('Error while initilising telemetry')
    }
  },

  /**
 * for log event
 * data object have these properties {'edata', context', 'object', 'tags'}
 */
telemetryLog : function (data, edata) {
  try {
    var channelId = data.channelId
    var appId = data.appId
    var env = data.env
    var rollup = telemetry.getRollUpData([])
    var did = data.deviceId
    var mid = 'LOG:' + UUID();
    let logData = {
      eid: "LOG",
      ets: new Date().getTime(),
      ver: "3.0",
      mid: mid,
      actor: telemetry.getActorData(data.userId, 'user'),
      context: telemetry.getContextData({ channel: channelId, env: env, pdata: {id: 'org.sunbird.chatbot.router'},cdata: [], rollup: rollup, did: did }),
      object: {},
      edata: edata
    };
    TelemetryLogger.info(logData);
  } catch (e) {
    LOG.error('Error while logger info event')
  }
}
} 