"use strict"

const redis  = require('redis');
const client = redis.createClient();

client.on('error', function(err){
    console.log('Something went wrong ', err)
});
client.set('my test key', 'my test value', redis.print);
client.get('my test key', function(error, result) {
    if (error) throw error;
    console.log('GET result ->', result)
});
client.hset('HSET record', 'key', 'value', redis.print);
client.hset('HSET record', 'second key', 'second value', redis.print);

class RedisClient {

}