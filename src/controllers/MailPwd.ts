import { RequestHandler } from 'express';
import { Request, Response, NextFunction } from 'express';
import Joi, { date } from 'joi';
import nodemailer from 'nodemailer';
import prisma from '../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { handleTokenExpiration, generateOTP } from '../Utils/Object';

require('dotenv').config();
const expirationTime = process.env.EXPIRATION_TIME;

const SentMailPwd: RequestHandler = async (req, res, next) => {
    const { Email } = req.body;
    try {
        const schema = Joi.object({
            Email: Joi.string().email().min(1).max(255).required(),
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

        //! check user
        const lowercasedEmail = Email.toLowerCase();
        // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
        const user = await prisma.userManagement.findUnique({
            where: {
                Email: lowercasedEmail,
            },
        });

        if (!user) {
            return res.status(403).json({ error: 'None User' });
        }
        // สร้าง OTP
        const otp = await generateOTP();
        //! กำหนดค่าการกำหนดค่าสำหรับ Nodemailer
        const transport = nodemailer.createTransport({
            // host: 'sandbox.smtp.mailtrap.io',
            host: 'smtp.mailtrap.io',
            port: 2525,
            auth: {
                user: '0f64a4a99b6aed',
                pass: '2b0449004b7be8',
            },
        });
        //! update otp to user ID
        // กำหนดข้อมูลที่จะใส่ใน Token
        const currentTime = new Date();
        const OtpToUser = {
            UserID: user.UserID,
            OTP: otp,
            OtpExpired: new Date(currentTime.getTime() + 10 * 60 * 1000), // เพิ่ม 5 นาที
        };
        console.log('OtpExpired', OtpToUser.OtpExpired);
        return await prisma.$transaction(async function (tx) {
            const payload: any = {};

            if (OtpToUser.OTP) {
                payload['OTP'] = OtpToUser.OTP;
            }

            if (OtpToUser.OtpExpired) {
                payload['OtpExpired'] = OtpToUser.OtpExpired;
            }

            await tx.userManagement.update({
                where: {
                    UserID: OtpToUser.UserID,
                },
                data: payload,
            });
            // สร้างข้อมูลอีเมล
            const info = await transport.sendMail({
                from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                to: Email,
                // to: `theerwat@gmail.com`,
                subject: user.Firstname,
                text: `Sent Mail OTP to Edit Password is: ${OtpToUser.OTP}`,
                html: `<div style="background-color: black; color: white; text-align: center; padding: 20px;">
            <h3>Sent Mail OTP to Edit Password is ?</h3>
            <h3 style="color: white;">sent mail to ${user.Firstname} ${user.Lastname}</h3>
            <h3>Your OTP is: <strong style="color: red;">${OtpToUser.OTP}</strong></h3>
            <h6 style="color: yellow;">OTP expired: ${OtpToUser.OtpExpired}</h6>
            </div>`,
            });
            return res.status(200).json({ success: true, message: 'OTP sent successfully to UserID' });
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        // ปิดการเชื่อมต่อกับฐานข้อมูล
        await prisma.$disconnect();
    }
};

//!Verify to Add Token
const CheckOTP = async (req: Request, res: Response) => {
    const { Email, OTP } = req.body;
    try {
        // ตรวจสอบความถูกต้องของข้อมูลที่รับมา
        const schema = Joi.object({
            Email: Joi.string().email().min(1).max(255).required(),
            OTP: Joi.string().min(1).max(255).required(),
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
        // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
        const user = await prisma.userManagement.findUnique({
            where: {
                Email: lowercasedEmail,
            },
        });
        if (!user) {
            return res.status(403).json({ error: 'None User' });
        }
        //! ตรวจสอบ OTP ด้วยฟังก์ชั่น verify
        const OTPCheck = user.OTP;
        // ตรวจสอบว่า OTPCheck ไม่ใช่ null ก่อนนำไปใช้
        if (OTPCheck !== null) {
            if (OTP === OTPCheck) {
                // OTP ถูกต้อง
                console.log('OTP is valid', OTPCheck);
                // ต่อไปทำงานตามที่ต้องการ
            } else {
                // OTP ไม่ถูกต้อง
                console.log('Invalid OTP');
                return res.status(402).json({ error: 'Invalid OTP' });
            }
        } else {
            // Handle the case when OTPCheck is null
            return res.status(403).json({ error: 'OTP is null' });
        }
        //! ถ้า OTP หมดอายุแล้วให้ทำการ แจ้ง
        const otpExpired = user.OtpExpired;
        //เป็นการเช็คว่า otpExpired มีค่าเป็น null ไหม ถ้าไม่ให้ไปเช็คต่อว่า new Date() > otpExpired
        if (otpExpired && new Date() > otpExpired) {
            // ถ้า OTP หมดอายุแล้วให้ทำการแจ้งเตือน
            return res.status(403).json({ expirationTime: 'OTP expired' });
        }
        if (otpExpired === null) {
            // ถ้า OTP หมดอายุแล้วให้ทำการแจ้งเตือน
            console.log('otpExpired', otpExpired);
            return res.status(403).json({ expirationTime: 'OTP None' });
        }
        // ส่งข้อมูล Token และข้อมูลที่ถอดรหัสได้กลับ
        return res.status(200).json({'otpExpired:': otpExpired, "OTPCheck:": OTPCheck, "UserID": user.UserID});
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        // ปิดการเชื่อมต่อกับฐานข้อมูล
        await prisma.$disconnect();
    }
};

export { SentMailPwd, CheckOTP };
