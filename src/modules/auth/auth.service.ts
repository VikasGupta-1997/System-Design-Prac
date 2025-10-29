import User from './auth.model';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import config from '../../config';
import { redisClient } from '../../db/redis';
import { Op } from 'sequelize';


const ACCESS_TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days in seconds


export const registerUser = async (payload: { username: string; email: string; password: string }) => {
    const { username, email, password } = payload;
    const existing = await User.findOne({ where: { [Op.or]: [{ email }, { username }] } } as any);
    if (existing) throw new Error('User with same email or username exists');


    const password_hash = await argon2.hash(password);
    const user = await User.create({ username, email, password_hash });
    return { id: user.id, username: user.username, email: user.email };
};


export const loginUser = async (email: string, password: string) => {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('Invalid credentials');


    const verify = await argon2.verify(user.password_hash, password);
    if (!verify) throw new Error('Invalid credentials');


    const token = jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });


    // store token in redis for session management
    await redisClient.set(`session:${user.id}`, token, 'EX', ACCESS_TOKEN_TTL);


    return { token };
};


export const verifyToken = async (token: string) => {
    try {
        const payload = jwt.verify(token, config.jwtSecret) as any;
        // verify token exists in redis
        const session = await redisClient.get(`session:${payload.sub}`);
        if (!session || session !== token) throw new Error('Invalid session');
        return payload;
    } catch (err) {
        throw new Error('Invalid token');
    }
};


export const logoutUser = async (userId: string) => {
    await redisClient.del(`session:${userId}`);
    return true;
};