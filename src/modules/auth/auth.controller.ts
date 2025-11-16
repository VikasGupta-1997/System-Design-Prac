import { Request, Response } from 'express';
import { registerUser, loginUser, logoutUser } from './auth.service';
import { AuthedRequest, createSession, destroySession } from '../../security/session';
import { redisClient } from '../../db/redis';


export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;
        const user = await registerUser({ username, email, password });
        res.status(201).json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};


export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const data = await loginUser(email, password, res);
        res.json(data);
    } catch (err: any) {
        res.status(401).json({ error: err.message });
    }
};


export const logout = async (req: Request, res: Response) => {
    try {
        // const userId = (req as any).user.id;
        // console.log("userIduserId", userId)
        const session = (req as any).session;
        if (!session?.userId) return res.status(401).json({ message: 'Unauthorized' });

        // await logoutUser(userId);
        await destroySession(req, res);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

// Session check
export async function getMe(req: Request, res: Response) {
    const authedReq = req as AuthedRequest;
    if (!authedReq.session?.userId) return res.status(401).json({ message: 'Unauthenticated' });
    res.json({ userId: authedReq.session.userId  });
};

export async function updateBio(req: Request, res: Response) {
    const authedReq = req as AuthedRequest;
    if (!authedReq.session?.userId) return res.status(401).json({ message: 'Unauthenticated' });
    const { bio } = req.body;
    if (typeof bio !== 'string') {
        return res.status(400).json({ error: "Bio must be a string" });
    }
    const User = (await import('../../db/postgres/models/auth.model')).default;
    const user = await User.findByPk(authedReq.session.userId);
    console.log("user", user)
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    user.bio = bio;
    await user.save();
    res.json({ userId: authedReq.session.userId  });
};

export async function refreshSession(req: Request, res: Response) {
    try {
        const rid = req.cookies["refresh_token"];
        if (!rid) return res.status(401).json({ message: "No refresh token" });
        const dataRaw = await redisClient.get(`refresh:${rid}`);
        if (!dataRaw) return res.status(401).json({ message: "Invalid refresh token" });
        const data = JSON.parse(dataRaw);
        console.log("data", data)
        // issue new short-lived session
        await createSession(res, { userId: data.userId });
        res.json({ ok: true, message: "Session refreshed" });
    } catch (error) {
        res.status(401).json({ message: "Session refresh failed" });
    }
}