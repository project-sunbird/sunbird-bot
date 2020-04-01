var client     =     require('./connection')
var LOG        =     require('../../log/logger')
var config     =     require('../../config/config')



function saveToEDB(data, created_by, session_id, cb){
    client.cluster.health({},function(err,resp,status) {
        if(resp.status != 'red'){
           data['session_id'] = session_id
           data['created_by'] = created_by
           client.index({
                   index : config.ELASTIC_INDEX_NAME,
                   type  : config.ELASTIC_INDEX_TYPE,
                   body  : data
           },(err, resp, status)=>{
                   if(err){
                      LOG.error(err)
                   }
           });
        }else{
            LOG.err('Elasticsearch down, status: ' + resp.status)
        }
        LOG.info('saving to Elastic:: '+JSON.stringify(data))
        cb(null,resp)
      }); 
}


module.exports.saveToEDB    = saveToEDB;
