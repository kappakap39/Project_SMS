// import { RequestHandler } from 'express';
// import { Request, Response, NextFunction } from 'express';
// import Joi, { date } from 'joi';
// import nodemailer from 'nodemailer';
// import prisma from '../lib/db';
// import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
// import { handleTokenExpiration, generateOTP } from '../Utils/Object';

// require('dotenv').config();
// const expirationTime = process.env.EXPIRATION_TIME;

// const SentMail: RequestHandler = async (req, res, next) => {
//     // const { Email, Password } = req.body;
//     const { Email } = req.body;
//     try {
//         const schema = Joi.object({
//             Email: Joi.string().email().min(1).max(255).required(),
//             // Password: Joi.string().min(1).max(255).required(),
//         });
        
//         // กำหนดตัวเลือกสำหรับการตรวจสอบข้อมูล
//         const optionsError = {
//             abortEarly: false, // แสดงทุกข้อผิดพลาด
//             allowUnknown: true, // ละเว้น properties ที่ไม่รู้จัก
//             stripUnknown: true, // ลบ properties ที่ไม่รู้จัก
//         };
//         // ทำการตรวจสอบข้อมูล
//         const { error } = schema.validate(req.body, optionsError);
//         if (error) {
//             return res.status(422).json({
//                 status: 422,
//                 Message: 'Unprocessable Entity',
//                 data: error.details,
//             });
//         }
        
//         //! check user
//         const lowercasedEmail = Email.toLowerCase();
//         // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
//         const user = await prisma.userManagement.findUnique({
//             where: {
//                 Email: lowercasedEmail,
//             },
//         });
//         if (!user) {
//             return res.status(403).json({ error: 'None User' });
//         }
//         // สร้าง OTP
//         const otp = await generateOTP();

//         //! กำหนดค่าการกำหนดค่าสำหรับ Nodemailer
//         const transport = nodemailer.createTransport({
//             // host: 'sandbox.smtp.mailtrap.io',
//             host: 'smtp.mailtrap.io',
//             port: 2525,
//             auth: {
//                 user: '0f64a4a99b6aed',
//                 pass: '2b0449004b7be8',
//             },
//             // auth: {
//             //     user: '733fc6ca983083',
//             //     pass: '0505857f096d3c',
//             // },
//         });

//         // สร้างข้อมูลอีเมล
//         const info = await transport.sendMail({
//             from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
//             to: `theerwat@gmail.com`,
//             subject: `Mr.Phuwadon`,
//             text: `Sent Message Mail From Mailler AND Your OTP is: ${otp}`,
//             html: `<div style="background-color: black; color: white; text-align: center; padding: 20px;">
//             <h3>Hello, Your user login code is ? </h3>
//             <h3 style="color: white;">sent mail to ${user.Firstname} ${user.Lastname}</h3>
//             <h3>Your OTP is: <strong style="color: red;">${otp}</strong></h3>
//             <h6 style="color: yellow;">OTP expired: ${user.OtpExpired}</h6>
//             </div>`,
//         });

//         //! update otp to user ID
//         // กำหนดข้อมูลที่จะใส่ใน Token
//         const currentTime = new Date();
//         const OtpToUser = {
//             UserID: user.UserID,
//             Otp: otp,
//             OtpExpired: new Date(currentTime.getTime() + 15 * 60 * 1000), // เพิ่ม 15 นาที
//         };
//         return await prisma.$transaction(async function (tx) {
//             const payload: any = {};

//             const checkUser = await tx.user.findFirst({
//                 where: {
//                     UserID: OtpToUser.UserID,
//                 },
//             });
//             // if (!checkUser) {
//             //     return res.status(422).json({ error: 'checkUser not found' });
//             // }

//             if (OtpToUser.Otp) {
//                 payload['Otp'] = OtpToUser.Otp;
//             }

//             if (OtpToUser.OtpExpired) {
//                 payload['OtpExpired'] = OtpToUser.OtpExpired;
//             }

//             const update = await tx.user.update({
//                 where: {
//                     UserID: OtpToUser.UserID,
//                 },
//                 data: payload,
//             });
//             return res.status(200).json({ success: true, message: 'OTP sent successfully to UserID' });
//             // console.log({ success: true, message: 'OTP sent successfully to UserID', OtpToUser, info, update });
//             // next();
//         });

//         // ส่งตอบกลับว่าสำเร็จ
//         // return res.status(200).json({ success: true, message: 'OTP sent successfully to UserID', OtpToUser, info });
//     } catch (error) {
//         console.error('Error:', error);
//         return res.status(500).json({ error: 'Internal Server Error' });
//     }
// };

// //! กำหนดฟังก์ชั่นสำหรับตรวจสอบ verifyToken Token
// // ให้ฟังก์ชัน verifyToken รับค่าเป็น union type
// const verifyOTP = (OTP: string, OTPCheck: string) => {
//     return OTP === OTPCheck;
// };

// //!Verify to Add Token
// const VerifyAddToken = async (req: Request, res: Response, next: NextFunction) => {
//     const { Email, OTP } = req.body;
//     try {
//         // ตรวจสอบความถูกต้องของข้อมูลที่รับมา
//         const schema = Joi.object({
//             Email: Joi.string().email().min(1).max(255).required(),
//             OTP: Joi.string().min(1).max(255).required(),
//         });

//         // กำหนดตัวเลือกสำหรับการตรวจสอบข้อมูล
//         const optionsError = {
//             abortEarly: false, // แสดงทุกข้อผิดพลาด
//             allowUnknown: true, // ละเว้น properties ที่ไม่รู้จัก
//             stripUnknown: true, // ลบ properties ที่ไม่รู้จัก
//         };

//         // ทำการตรวจสอบข้อมูล
//         const { error } = schema.validate(req.body, optionsError);

//         if (error) {
//             return res.status(422).json({
//                 status: 422,
//                 Message: 'Unprocessable Entity',
//                 data: error.details,
//             });
//         }

//         // แปลงทุกตัวอักษรใน Email และ Password เป็นตัวพิมเล็ก
//         const lowercasedEmail = Email.toLowerCase();
//         // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
//         const user = await prisma.user.findUnique({
//             where: {
//                 Email: lowercasedEmail,
//             },
//         });
//         if (!user) {
//             return res.status(403).json({ error: 'None User' });
//         }
//         //! ตรวจสอบ OTP ด้วยฟังก์ชั่น verify
//         const OTPCheck = user.Otp;
//         // ตรวจสอบว่า OTPCheck ไม่ใช่ null ก่อนนำไปใช้
//         if (OTPCheck !== null) {
//             if (verifyOTP(OTP, OTPCheck)) {
//                 // OTP ถูกต้อง
//                 console.log('OTP is valid', OTPCheck);
//                 // ต่อไปทำงานตามที่ต้องการ
//             } else {
//                 // OTP ไม่ถูกต้อง
//                 console.log('Invalid OTP');
//                 return res.status(402).json({ error: 'Invalid OTP' });
//             }
//         } else {
//             // Handle the case when OTPCheck is null
//             return res.status(403).json({ error: 'OTP is null' });
//         }

//         //! ถ้า OTP หมดอายุแล้วให้ทำการ แจ้ง
//         const otpExpired = user.OtpExpired;
//         //เป็นการเช็คว่า otpExpired มีค่าเป็น null ไหม ถ้าไม่ให้ไปเช็คต่อว่า new Date() > otpExpired
//         if (otpExpired && new Date() > otpExpired) {
//             // ถ้า OTP หมดอายุแล้วให้ทำการแจ้งเตือน
//             return res.status(403).json({ error: 'OTP expired' });
//         }

//         //! start to add token
//         // กำหนดคีย์ลับสำหรับการสร้าง Token
//         const SECRET_KEY = process.env.SECRET_KEY || 'default_secret_key';

//         // กำหนดข้อมูลที่จะใส่ใน Token
//         const payloadUser = {
//             UserID: user.UserID,
//         };
//         // สร้าง Token
//         const token = jwt.sign(payloadUser, SECRET_KEY, { expiresIn: expirationTime });

//         if (token) {
//             // บันทึก Token ลงในฐานข้อมูล
//             await prisma.token.create({
//                 data: {
//                     TokenValue: token,
//                     UserID: user.UserID,
//                     Expiration: new Date(Date.now() + Number(expirationTime)),
//                 },
//             });
//         } else {
//             return res.status(402).json({ message: 'None found token' });
//         }

//         // ยืนยัน Token และดึงข้อมูลที่ถอดรหัสได้
//         let decoded = null;
//         try {
//             decoded = jwt.verify(token, SECRET_KEY);
//         } catch (err) {
//             console.log(err);
//         }

//         // ส่งข้อมูล Token และข้อมูลที่ถอดรหัสได้กลับ
//         return res.status(200).json({ Token: token, Decoded: decoded, 'otpExpired:': otpExpired, OTPCheck });
//     } catch (error) {
//         console.error('Error:', error);
//         return res.status(500).json({ error: 'Internal Server Error' });
//     } finally {
//         // ปิดการเชื่อมต่อกับฐานข้อมูล
//         await prisma.$disconnect();
//     }
// };

// export { SentMail, VerifyAddToken };