import { RequestHandler } from 'express';
import { Request, Response, NextFunction } from 'express';
import Joi, { date } from 'joi';
import nodemailer from 'nodemailer';
import prisma from '../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const expirationTime = process.env.EXPIRATION_TIME;

//! sentSms
const sentSMS: RequestHandler = async (req, res, next) => {
    const SECRET_KEY = process.env.SECRET_KEY || 'default_secret_key';
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Token ', token);
    if (!token) {
        return res.status(403).json({ error: 'Token not found' });
    }
    // ให้ถือว่า Token ถูกต้องเพื่อให้ได้ decodedToken
    const decodedToken = jwt.verify(token, SECRET_KEY) as { UserID: string };
    if (!decodedToken.UserID) {
        return res.status(403).json({ error: 'decodedToken not found' });
    }
    console.log('decodedToken: ', decodedToken);

    //! check user
    // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
    const user = await prisma.userManagement.findUnique({
        where: {
            UserID: decodedToken.UserID,
        },
    });
    if (!user) {
        return res.status(403).json({ error: 'None User' });
    }
    //! กำหนดค่าการกำหนดค่าสำหรับ Nodemailer
    const transport = nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth: {
            user: 'eb96c9bf8c2ce8',
            pass: 'cfb075837bf7c1',
        },
    });
    // เพิ่มการตรวจสอบขีดจำกัดของอีเมล์และเตือน
    transport.verify(function (error, success) {
        if (error) {
            console.error('Mailtrap connection error:', error);
            return res.status(201).json({ 'Mailtrap connection error:': error });
        } else {
            console.log('Mailtrap connection successful');
        }
    });

    // create schema object
    const schema = Joi.object({
        UserID: Joi.string(),
        SMS_ID: Joi.string(),
        Sender: Joi.string(),
        Tel: Joi.string(),
        Result: Joi.string(),
        Contact: Joi.string(),
        ScheduleDate: Joi.date(),
        Option: Joi.string(),
        Description: Joi.string(),
        Message: Joi.string(),
    });
    const options = {
        abortEarly: false, // include all errors
        allowUnknown: true, // ignore unknown props
        stripUnknown: true, // remove unknown props
    };
    const { error } = schema.validate(req.body, options);

    if (error) {
        return res.status(422).json({
            status: 422,
            message: 'Unprocessable Entity',
            data: error.details,
        });
    }
    const body = req.body;

    return await prisma.$transaction(async function (tx) {
        const payload: any = {
            UserID: decodedToken.UserID,
            Sender: body.Sender,
            Tel: body.Tel,
            Result: body.Result,
            Contact: body.Contact,
            ScheduleDate: body.ScheduleDate,
            Option: body.Option,
            Description: body.Description,
        };
        const Management = await tx.sMSManagement.create({
            data: payload,
        });

        const splitRow = body.Message.match(/.{1,140}/g); // ตัดข้อความเป็นชุดตามรูปแบบที่กำหนด
        // const rejoinedText = splitRow ? splitRow.join('') : ''; // นำชุดของตัวอักษรกลับมาต่อกันเหมือนเดิม
        // const numberOfChunks = splitRow ? splitRow.length : 0; // จำนวนของชุดของตัวอักษร
        // const totalLength = rejoinedText.length; // ความยาวของข้อความที่นำชุดของตัวอักษรกลับมาต่อกันได้

        // วนลูปเพื่อสร้างและบันทึกข้อความที่ถูกตัดแล้วในฐานข้อมูล
        for (let i = 0; i < splitRow.length; i++) {
            const payloadMessage: any = {
                SMS_ID: Management.SMS_ID,
                Message: splitRow[i], // ใช้ชุดข้อความที่ถูกตัดแล้วในแต่ละรอบของลูป
            };
            await tx.sMSMessage.create({
                data: payloadMessage,
            });
        }

        const info = await transport.sendMail({
            from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
            to: user.Email,
            // to: `theerwat@gmail.com`,
            subject: user.Firstname,
            text: `Sender is: ${user.Username}`,
            html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
            <div style=3D"color: yellow; text-align: center;" >
                <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
            </div>
            <div style=3D"display: flex; text-align: center;" >
                <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${body.Tel}</h5>
                <h5 style="margin-right: 10%;">Option is: ${body.Option}</h5>
                <h5 style="margin-right: 10%;">Result is: ${body.Result}</h5>
                <h5 style="margin-right: 10%;">Contact is: ${body.Contact}</h5>
                <h5 style="margin-right: 10%;">ScheduleDate is: ${body.ScheduleDate}</h5>
                <h5>Description is: ${body.Description}</h5>
            </div>
            <h6>Message is: ${body.Message}</h6>
            </div>`,
        });
        // ส่งข้อมูลกลับไปยังผู้ใช้พร้อมกับข้อความแจ้งผลการทำงาน
        return res.status(201).json({ Management, Message: 'Messages created successfully' });
    });
};

//!Get User and admin By ID
const getSMSByID: RequestHandler = async (req, res) => {
    try {
        const { SMS_ID } = req.query;
        console.log('SMS_ID: ' + SMS_ID);
        if (SMS_ID) {
            const ByID = await prisma.sMSManagement.findUnique({
                where: {
                    SMS_ID: SMS_ID as string, // ระบุเงื่อนไขการค้นหาข้อมูลที่ต้องการด้วยฟิลด์ที่เป็น unique
                },
                include: {
                    smsMessage: {
                        select: {
                            Message: true,
                        },
                    },
                },
            });
            if (!ByID) {
                return res.status(404).json({ error: 'SmsID not Sms' });
            }
            const combinedMessages = {
                ...ByID,
                combinedMessage: ByID.smsMessage.map((message) => message.Message).join(''),
            };
            return res.json(combinedMessages);
        } else {
            return res.status(404).json({ error: 'REQ.Params not found' });
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};

//!Get all
const getSMSWithMessages: RequestHandler = async (req, res) => {
    try {
        const smsManagement = await prisma.sMSManagement.findMany({
            orderBy: {
                CreatedAt: 'asc',
            },
            include: {
                smsMessage: {
                    select: {
                        Message: true,
                    },
                },
            },
        });

        if (smsManagement.length === 0) {
            return res.status(404).json({ smsManagement: 'No SMS found' });
        }

        // Combine messages with the same SmsID
        const combinedMessages = smsManagement.map((sms) => {
            const messages = sms.smsMessage.map((message) => message.Message).join('');
            return { ...sms, combinedMessage: messages };
        });

        return res.json(combinedMessages);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};

export { sentSMS, getSMSByID, getSMSWithMessages };
