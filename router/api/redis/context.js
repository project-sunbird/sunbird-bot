var redis = require('redis');
var LOG = require('../../log/logger')

function createRedisClient() {
    //configure redis client on port 6379
    const port_redis = config.REDIS_PORT || 6379;
    return redis.createClient(port_redis);
}

function setRedisKeyValue(client, key, value, expireTime) {
    client.setex(key, expireTime, value);
}

function removeRedisKeyValue(client, key) {
    client.del(key, (err, res) => {
        if (err) {
            LOG.err(err)
        }
    })
}

function getRedisKeyValue(client, key) {
    client.get(key, (err, data) => {
        if (data != null) {
            // Key is already exist and hence assiging data which is already there at the posted key
            return data;
        } else {
            obj = { sessionId: key, role: '', educationLvl: '', board: '', boardType: '' };
            // Adding data in redis for the key
            setRedisKeyValue(client, key, JSON.stringify(obj), 3600);
            return obj;
        }
    });
}

module.exports.createRedisClient     = createRedisClient;
module.exports.removeRedisKeyValue   = removeRedisKeyValue;
module.exports.getRedisKeyValue      = getRedisKeyValue;
module.exports.setRedisKeyValue      = setRedisKeyValue;

