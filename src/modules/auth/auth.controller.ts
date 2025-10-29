import { Request, Response } from 'express';
import { registerUser, loginUser, logoutUser } from './auth.service';


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
        const { token } = await loginUser(email, password);
        res.json({ token });
    } catch (err: any) {
        res.status(401).json({ error: err.message });
    }
};


export const logout = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        await logoutUser(userId);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};