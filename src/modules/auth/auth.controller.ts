import { Request, Response } from 'express';
import { registerUser, loginUser, logoutUser } from './auth.service';
import { destroySession } from '../../security/session';


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
        console.log("REQQQ", req.user)
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