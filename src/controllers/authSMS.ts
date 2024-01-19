import { RequestHandler } from 'express';
import { Request, Response, NextFunction } from 'express';
import Joi, { date } from 'joi';
import nodemailer from 'nodemailer';
import prisma from '../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const expirationTime = process.env.EXPIRATION_TIME;

import { isPast, parseISO, format, addHours, isValid, startOfDay, addDays } from 'date-fns';
import { th } from 'date-fns/locale/th';
import dayjs from 'dayjs';

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

const getSMSByUserID: RequestHandler = async (req, res) => {
    try {
        const { UserID }: any = req.query;

        let smsSearchResults;

        if (UserID) {
            // Search for SMSManagement data by UserID
            smsSearchResults = await prisma.sMSManagement.findMany({
                where: {
                    UserID: UserID,
                },
                orderBy: { CreatedAt: 'desc' },
            });
        } else {
            // If no UserID provided, retrieve all SMSManagement data
            smsSearchResults = await prisma.sMSManagement.findMany({
                orderBy: { CreatedAt: 'desc' },
            });
        }

        // Combine and send the results
        res.status(200).json({ smsResults: smsSearchResults });
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

//! add Sms
const addSMS: RequestHandler = async (req, res, next) => {
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

    // create schema object
    const schema = Joi.object({
        UserID: Joi.string(),
        SMS_ID: Joi.string(),
        Sender: Joi.string(),
        Tel: Joi.string(),
        Result: Joi.string(),
        Contact: Joi.string(),
        ScheduleDate: Joi.date().iso(),
        Option: Joi.string(),
        Description: Joi.string(),
        UserEmail: Joi.string(),
        PassEmail: Joi.string(),
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
    const scheduleDate = body.ScheduleDate ? parseISO(body.ScheduleDate) : null;

    // Convert the scheduleDate to UTC+7
    // const scheduleDate = body.ScheduleDate ? addHours(body.ScheduleDate, 7) : null;

    return await prisma.$transaction(async function (tx) {
        const payload: any = {
            UserID: decodedToken.UserID,
            Sender: body.Sender,
            Tel: body.Tel,
            Result: body.Result,
            Contact: body.Contact,
            ScheduleDate: scheduleDate,
            Option: body.Option,
            Description: body.Description,
            UserEmail: body.UserEmail,
            PassEmail: body.PassEmail,
        };
        const Management = await tx.sMSManagement.create({
            data: payload,
        });

        const splitRow = body.Message.match(/.{1,140}/g) || []; // ตัดข้อความเป็นชุดตามรูปแบบที่กำหนด

        // วนลูปเพื่อสร้างและบันทึกข้อความที่ถูกตัดแล้วในฐานข้อมูล
        for (let i = 0; i < splitRow.length; i++) {
            // const charactersWithoutSpaces = splitRow[i].replace(/\s/g, '').length;

            const payloadMessage: any = {
                SMS_ID: Management.SMS_ID,
                Message: splitRow[i], // ใช้ชุดข้อความที่ถูกตัดแล้วในแต่ละรอบของลูป
                // CharactersWithoutSpaces: charactersWithoutSpaces,
            };
            await tx.sMSMessage.create({
                data: payloadMessage,
            });
        }

        // ส่งคำตอบเมื่อส่งอีเมล์เสร็จสมบูรณ์
        return res.status(201).json({ Management, Message: 'Messages created successfully' });
    });
};

//! update
const updateSMS: RequestHandler = async (req, res) => {
    //todo1: Token
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

    //todo2: Check user
    // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
    const user = await prisma.userManagement.findUnique({
        where: {
            UserID: decodedToken.UserID,
        },
    });
    if (!user) {
        return res.status(403).json({ error: 'None User' });
    }

    // todo 3 :  validate

    const body = req.body;

    const payload: any = {};

    // todo 4 : add data to payload
    if (decodedToken.UserID) {
        payload['UserID'] = decodedToken.UserID;
    }

    if (body.Sender) {
        payload['Sender'] = body.Sender;
    }

    if (body.Tel) {
        payload['Tel'] = body.Tel;
    }

    if (body.Result) {
        payload['Result'] = body.Result;
    }

    if (body.Contact) {
        payload['Contact'] = body.Contact;
    }

    if (body.ScheduleDate) {
        payload['ScheduleDate'] = body.ScheduleDate;
    }

    if (body.Option) {
        payload['Option'] = body.Option;
    }

    if (body.Description) {
        payload['Description'] = body.Description;
    }

    if (body.UserEmail) {
        payload['UserEmail'] = body.UserEmail;
    }

    if (body.PassEmail) {
        payload['PassEmail'] = body.PassEmail;
    }

    // todo 5 : save to database

    const updatedSMSManagement = await prisma.sMSManagement.update({
        where: {
            SMS_ID: body.SMS_ID,
        },
        data: {
            ...payload,
            // ลบข้อมูล SMSMessage ที่เชื่อมโยงกับ SMSManagement
            smsMessage: {
                deleteMany: {
                    SMS_ID: body.SMS_ID,
                },
            },
        },
    });
    // ตัดข้อความเป็นชุดๆ ขนาด 140 ตัวอักษร
    const splitRow = body.Message.match(/.{1,140}/g);
    const createdMessages = [];

    // วนลูปเพื่อบันทึกข้อความที่ถูกตัดลงในฐานข้อมูล
    for (let i = 0; i < splitRow.length; i++) {
        const payloadMessage: any = {
            SMS_ID: updatedSMSManagement.SMS_ID,
            Message: splitRow[i], // ใช้ชุดข้อความที่ถูกตัดแล้วในแต่ละรอบของลูป
        };

        createdMessages.push(payloadMessage);

        // บันทึกข้อมูล SMSMessage ใหม่
        await prisma.sMSMessage.create({
            data: payloadMessage,
        });
    }

    console.log('อัปเดต', updatedSMSManagement);
    console.log('payload', payload);
    console.log('payload', createdMessages);

    return res.json({ updatedSMSManagement, createdMessages });
};


//! deleteSMS
const deleteSMS: RequestHandler = async (req, res) => {
    const schema = Joi.object({
        SMS_ID: Joi.string().uuid().required(),
    });

    const options = {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true,
    };

    const { error } = schema.validate(req.query, options);

    if (error) {
        return res.status(422).json({
            status: 422,
            message: 'Unprocessable Entity',
            data: error.details,
        });
    }

    const query: any = req.query;

    const identifer = await prisma.sMSManagement.findFirst({
        where: {
            SMS_ID: query.SMS_ID,
        },
    });

    if (identifer === null || identifer === undefined) {
        return res.status(422).json({
            status: 422,
            message: 'User not found',
        });
    }

    const deleteSMS = await prisma.sMSManagement.delete({
        where: {
            SMS_ID: query.SMS_ID,
        },
    });
    return res.json(deleteSMS);
};


export { getSMSByID, getSMSWithMessages, getSMSByUserID, addSMS, updateSMS, deleteSMS };
