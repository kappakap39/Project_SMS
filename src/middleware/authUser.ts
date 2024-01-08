import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { RequestHandler } from 'express';
import { ErrorRequestHandler } from 'express';
import config from '../config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/db';
import Joi, { any } from 'joi';

// Middleware สำหรับตรวจสอบ Token ใน Header
const authToken: RequestHandler = async (req, res, next) => {
    // ตรวจสอบการมี Header Authorization ใน Request
    const checkHeader = req.headers.authorization;

    if (!checkHeader) {
        return res.status(403).json({ error: 'Header not found' });
    }

    try {
        // แยก Token จาก Header
        const tokenCheck = checkHeader.split(' ')[1];
        // const [, tokenCheck] = checkHeader.split(' ');

        if (!tokenCheck) {
            return res.status(403).json({ error: 'Token not provided' });
        }

        //!verifyToken

        // กำหนดคีย์ลับสำหรับการสร้างและตรวจสอบ Token
        const SECRET_KEY = process.env.SECRET_KEY || 'default_secret_key';

        // console.log('Token:', JSON.stringify(tokenCheck));
        // console.log('SECRET_KEY:', JSON.stringify(SECRET_KEY));

        // ตรวจสอบ Token ด้วยฟังก์ชั่น verifyToken
        const decodedToken = jwt.verify(tokenCheck, SECRET_KEY) as { UserID: string; exp: number };
        console.log('decodedToken:', decodedToken.UserID);

        // หาก Token ถูกต้อง มีในฐานข้อมูล
        if (decodedToken) {
            // if (tokenCheck === SECRET_KEY) {
            console.log('Decoded Token:', decodedToken);
            // ส่งต่อไปยัง middleware ถัดไป
        } else {
            // Token ไม่ถูกต้องหรือหมดอายุ
            return res.status(403).json({ error: 'Invalid Token Database', decodedToken });
        }

        // เช็คว่าเป็น token ใคร
        const tokenUser = await prisma.tokenUser.findFirst({
            where: {
                TokenValue: tokenCheck,
                UserID: decodedToken.UserID,
                Expiration: {
                    gte: new Date(),
                },
            },
        });

        if (!tokenUser) {
            return res.status(403).json({ error: 'Invalid Token', details: 'Invalid token User' });
        }

        // ตรวจสอบ Expired Time
        if (tokenUser.Expiration < new Date()) {
            return res.status(403).json({ error: 'Expired Token' });
        }

        if (tokenUser) {
            console.log('tokenUser.Expiration:', tokenUser.Expiration);
        }

        //หาชั่วโมง และนาทีที่จะหมดอายุ
        if (decodedToken.exp) {
            const expiresInMilliseconds = decodedToken.exp * 1000 - Date.now();
            // const expiresInHours = expiresInMilliseconds / (1000 * 60 * 60);
            const expiresInMinutes = Math.floor(expiresInMilliseconds / (1000 * 60));
            const hours = Math.floor(expiresInMinutes / 60); // หารเพื่อหาจำนวนชั่วโมง
            const remainingMinutes = expiresInMinutes % 60; // นาทีที่เหลือ

            console.log('Token will expire in', hours, 'hours and', remainingMinutes, 'minutes');
        }

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            console.error('JWT Error:', error.message);
            res.status(403).json({ error: 'Invalid token' });
        } else if (error instanceof jwt.TokenExpiredError) {
            console.error('Token Expired:', error.message);
            res.status(403).json({ error: 'Token expired' });
        } else {
            console.error('Unknown Error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
export { authToken };
