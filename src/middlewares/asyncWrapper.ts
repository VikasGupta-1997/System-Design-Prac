// src/utils/asyncWrapper.ts
import { RequestHandler } from 'express';

export const asyncWrapper = (fn: RequestHandler): RequestHandler => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
