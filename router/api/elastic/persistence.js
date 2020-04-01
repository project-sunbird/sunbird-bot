var elasticsearch = require('elasticsearch');
var config        = require('../../config/config')

var client = new elasticsearch.Client( {
  hosts: [
    config.ELASTIC_HOST
  ]
});

module.exports = client;
