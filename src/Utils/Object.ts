import { Request, Response, NextFunction } from 'express';

// ประกาศ checkHeader ใน Request object ของ Express
declare global {
    namespace Express {
        interface Request {
            checkHeader?: string;
        }
    }
}