import Redis from 'ioredis';
import config from '../config';

export const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port
});

export const testRedis = async () => {
  try {
    await redisClient.set('test', 'ok');
    const v = await redisClient.get('test');
    console.log('Redis connected:', v === 'ok');
  } catch (err) {
    console.error('Redis connection error:', err);
    process.exit(1);
  }
};