import Joi, { any } from 'joi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { CustomHelpers } from 'joi';
import nodemailer from 'nodemailer';
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import prisma from '../lib/db';
import { handleTokenExpiration } from '../Utils/Object';
const expirationTime = process.env.EXPIRATION_TIME;

//! Add Token
const LoginUser = async (req: Request, res: Response) => {
    try {
        //!start Add Token
        const { Email, Password } = req.body;

        console.log('Email', Email, 'password', Password, 'key', process.env.SECRET_KEY);

        // ตรวจสอบความถูกต้องของข้อมูลที่รับมา
        const schema = Joi.object({
            Email: Joi.string().email().min(1).max(255).required(),
            Password: Joi.string().min(1).max(255).required(),
        });

        // กำหนดตัวเลือกสำหรับการตรวจสอบข้อมูล
        const optionsError = {
            abortEarly: false, // แสดงทุกข้อผิดพลาด
            allowUnknown: true, // ละเว้น properties ที่ไม่รู้จัก
            stripUnknown: true, // ลบ properties ที่ไม่รู้จัก
        };

        // ทำการตรวจสอบข้อมูล
        const { error } = schema.validate(req.body, optionsError);

        if (error) {
            return res.status(422).json({
                status: 422,
                Message: 'Unprocessable Entity',
                data: error.details,
            });
        }
        // แปลงทุกตัวอักษรใน Email และ Password เป็นตัวพิมเล็ก
        const lowercasedEmail = Email.toLowerCase();
        // ตรวจสอบรูปแบบของ Email โดยใช้ regular expression
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(lowercasedEmail)) {
            return res.status(403).json({ error: 'Check: Invalid email format' });
        }

        // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
        const user = await prisma.userManagement.findUnique({
            where: {
                Email: lowercasedEmail,
            },
        });

        if (user) {
            // ตรวจสอบความถูกต้องของรหัสผ่านที่ได้จากฐานข้อมูล
            const isPasswordValid = bcrypt.compareSync(Password, user.Password);
            if (isPasswordValid) {
                // รหัสผ่านถูกต้อง
                console.log('User authenticated successfully.');

                //! Check token user and delete token
                if (user.UserID) {
                    const tokenExists = await prisma.tokenUser.findFirst({
                        where: {
                            UserID: user.UserID,
                        },
                    });

                    if (!tokenExists) {
                        console.log('None user Add Token');
                        // กำหนดคีย์ลับสำหรับการสร้าง Token
                        const SECRET_KEY = process.env.SECRET_KEY || 'default_secret_key';

                        // กำหนดข้อมูลที่จะใส่ใน Token
                        const payloadUser = {
                            UserID: user.UserID,
                        };
                        // สร้าง Token
                        const token = jwt.sign(payloadUser, SECRET_KEY, { expiresIn: expirationTime });

                        if (token) {
                            // บันทึก Token ลงในฐานข้อมูล
                            await prisma.tokenUser.create({
                                data: {
                                    TokenValue: token,
                                    UserID: user.UserID,
                                    Expiration: new Date(Date.now() + Number(expirationTime)),
                                },
                            });

                            await prisma.log_History.create({
                                data: {
                                    UserID: user.UserID,
                                    TypeLogger: 'LogIn',
                                },
                            });

                            //! ตั้งเวลาในการเรียกฟังก์ชันที่ทำการบันทึก LogOut โดยอัตโนมัติ
                            setTimeout(async () => {
                                await handleTokenExpiration(token, user.UserID); // เรียกใช้ handleTokenExpiration ที่เราเพิ่มมา
                            }, Number(expirationTime));
                        } else {
                            return res.status(402).json({ message: 'None found token' });
                        }

                        let decoded: string | null = null;
                        try {
                            decoded = jwt.verify(token, SECRET_KEY) as string;
                        } catch (err) {
                            console.log(err);
                        }
                        // ตรวจสอบค่า decoded ว่าเป็นแบบใด
                        if (decoded !== null) {
                            // กรณีที่ decoded เป็น JwtPayload
                            console.log('decoded:', decoded);
                        } else {
                            // กรณีที่ decoded เป็น null
                            console.log('Token is invalid or expired.');
                        }

                        // ส่งข้อมูล Token และข้อมูลที่ถอดรหัสได้กลับ
                        return res.status(200).json({ Token: token, Decoded: decoded });
                    }
                    if (tokenExists.UserID) {
                        //! refresh token
                        await prisma.log_History.create({
                            data: {
                                UserID: user.UserID,
                                TypeLogger: 'Refresh ExpirationTime',
                            },
                        });
                        // หา token แล้วให้ทำการลบ
                        await prisma.tokenUser.delete({
                            where: {
                                TokenID: tokenExists.TokenID,
                            },
                        });
                        // กำหนดคีย์ลับสำหรับการสร้าง Token
                        const SECRET_KEY = process.env.SECRET_KEY || 'default_secret_key';

                        // กำหนดข้อมูลที่จะใส่ใน Token
                        const payloadUser = {
                            UserID: user.UserID,
                        };
                        // สร้าง Token
                        const token = jwt.sign(payloadUser, SECRET_KEY, { expiresIn: expirationTime });

                        if (token) {
                            // บันทึก Token ลงในฐานข้อมูล
                            await prisma.tokenUser.create({
                                data: {
                                    TokenValue: token,
                                    UserID: user.UserID,
                                    Expiration: new Date(Date.now() + Number(expirationTime)),
                                },
                            });

                            await prisma.log_History.create({
                                data: {
                                    UserID: user.UserID,
                                    TypeLogger: 'LogIn',
                                },
                            });

                            //! ตั้งเวลาในการเรียกฟังก์ชันที่ทำการบันทึก LogOut โดยอัตโนมัติ
                            setTimeout(async () => {
                                await handleTokenExpiration(token, user.UserID); // เรียกใช้ handleTokenExpiration ที่เราเพิ่มมา
                            }, Number(expirationTime));
                        } else {
                            return res.status(402).json({ message: 'None found token' });
                        }
                        let decoded: string | null = null;
                        try {
                            decoded = jwt.verify(token, SECRET_KEY) as string;
                        } catch (err) {
                            console.log(err);
                        }
                        // ตรวจสอบค่า decoded ว่าเป็นแบบใด
                        if (decoded !== null) {
                            // กรณีที่ decoded เป็น JwtPayload
                            console.log('decoded:', decoded);
                        } else {
                            // กรณีที่ decoded เป็น null
                            console.log('Token is invalid or expired.');
                        }
                        // ส่งข้อมูล Token และข้อมูลที่ถอดรหัสได้กลับ
                        return res.status(200).json({ Token: token, Decoded: decoded });
                    }
                }
            } else {
                // รหัสผ่านไม่ถูกต้อง
                return res.status(400).json({ error: 'Invalid password.' });
            }
        } else {
            // ไม่พบผู้ใช้
            console.log('User not found.');
            return res.status(400).json({ error: 'User not found.' });
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        // ปิดการเชื่อมต่อกับฐานข้อมูล
        await prisma.$disconnect();
    }
};

//!Delete token
const LogoutUser = async (req: Request, res: Response) => {
    try {
        const SECRET_KEY = process.env.SECRET_KEY || 'default_secret_key';
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(403).json({ error: 'Token not found' });
        }

        // ให้ถือว่า Token ถูกต้องเพื่อให้ได้ decodedToken
        const decodedToken = jwt.verify(token, SECRET_KEY) as { UserID: string };

        // ตรวจสอบความถูกต้องของ token ที่ค้นหาได้
        const tokenuser = await prisma.tokenUser.findFirst({
            where: {
                TokenValue: token,
            },
        });

        if (!tokenuser) {
            return res.status(403).json({ error: 'Invalid Token' });
        }
        // ตรวจสอบความถูกต้องของ decodedToken
        if (decodedToken && decodedToken.UserID) {
            // ตรวจสอบว่า UserID ตรงกับค่าที่คุณต้องการหรือไม่
            if (decodedToken.UserID === tokenuser.UserID) {
                // หา token แล้วให้ทำการลบ
                await prisma.tokenUser.delete({
                    where: {
                        TokenID: tokenuser.TokenID,
                    },
                });

                await prisma.log_History.create({
                    data: {
                        UserID: tokenuser.UserID,
                        TypeLogger: 'LogOut',
                    },
                });

                // รับรองว่า Token ถูกต้องและถูกลบ
                return res.status(200).json({ success: 'Logout successfully', decodedToken });
            } else {
                return res.status(403).json({ error: 'Invalid Token User' });
            }
        } else {
            return res.status(403).json({ error: 'Invalid Token' });
        }
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            // กรณี Token หมดอายุ
            return res.status(401).json({ error: 'Token expired' });
        } else if (error instanceof jwt.JsonWebTokenError) {
            // กรณี Token ไม่ถูกต้องหรือมีปัญหาอื่นๆ
            return res.status(403).json({ error: 'Invalid Token' });
        } else {
            // กรณีอื่นๆ ที่เกี่ยวข้องกับการ verify Token
            console.error('Verify Token Error:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

export { LoginUser, LogoutUser };
