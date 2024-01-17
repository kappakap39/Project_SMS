import { RequestHandler } from 'express';
import { Request, Response, NextFunction } from 'express';
import Joi, { date } from 'joi';
import nodemailer from 'nodemailer';
import prisma from '../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const expirationTime = process.env.EXPIRATION_TIME;
import { createEmailHtmlContent } from '../Utils/Object';
import { isPast, parseISO, format, addHours, isValid, startOfDay, addDays } from 'date-fns';
import { th } from 'date-fns/locale/th';
import dayjs from 'dayjs';
let data: any, sms: any, user: any;

//! sentSMS and Create
const sentSMSCreate: RequestHandler = async (req, res, next) => {
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
            user: 'b0147891f258c2',
            pass: '4ff23679f73610',
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
        ScheduleDate: Joi.date().iso(),
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
    const scheduleDate = body.ScheduleDate ? parseISO(body.ScheduleDate) : null;
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
        if (scheduleDate) {
            // - 7 hours to scheduleDate เพื่อเก็บการส่งเป็นเวลาโกบอล
            scheduleDate.setHours(scheduleDate.getHours() - 7);
            if (!isPast(scheduleDate)) {
                // !isPast(scheduleDate) ไม่ใช่อดีต

                // ถ้า ScheduleDate ถูกกำหนดและไม่ได้อยู่ในอดีต
                // คำนวณเวลาที่ต้องการส่งอีเมล์โดยหาความแตกต่างของเวลาปัจจุบันกับ ScheduleDate
                const millisecondsUntilScheduledTime = scheduleDate.getTime() - Date.now();
                const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
                // ประกาศ Timezone ที่ต้องการใช้
                // const timeZoneOffsetInHours = 7; // UTC+7 for Bangkok
                // แปลง scheduleDate เป็นเวลาใน timezone ที่ต้องการ
                // const scheduleDateInLocalTimezone = addHours(scheduleDate, timeZoneOffsetInHours);
                // สร้าง string ที่แสดงเวลาในรูปแบบที่ต้องการ (เช่น "วันที่ 1 มกราคม 2565 เวลา 10:00 น.")
                // const formattedScheduleDate = format(scheduleDateInLocalTimezone, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'", {
                //     locale: th,
                // });
                const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
                // const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'", {
                //     locale: th,
                // });

                setTimeout(async () => {
                    // ส่งอีเมล์ที่นี่
                    const info = await transport.sendMail({
                        from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                        to: user.Email,
                        subject: user.Firstname,
                        text: `Sender is: ${user.Username}`,
                        html: emailHtmlContent,
                    });
                }, millisecondsUntilScheduledTime);
                // ส่งคำตอบเมื่อส่งอีเมล์เสร็จสมบูรณ์
                return res
                    .status(201)
                    .json({ Management, Message: 'Messages created and email scheduled successfully time future' });
            }
            const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);

            // ส่งอีเมล์ทันที
            const info = await transport.sendMail({
                from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                to: user.Email,
                subject: user.Firstname,
                text: `Sender is: ${user.Username}`,
                html: emailHtmlContent,
            });
            // ส่งคำตอบเมื่อส่งอีเมล์เสร็จสมบูรณ์
            return res
                .status(201)
                .json({ Management, Message: 'Messages created and email sent successfully time past' });
        } else {
            if (scheduleDate && isPast(scheduleDate)) {
                // const scheduleDateInLocalTimezone = addHours(scheduleDate, 7);
                // สร้าง string ที่แสดงเวลาในรูปแบบที่ต้องการ (เช่น "วันที่ 1 มกราคม 2565 เวลา 10:00 น.")
                const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'", {
                    locale: th,
                });
                console.log('Scheduled time is in the past', formattedScheduleDate);
                // return res.status(400).json({ error: 'Scheduled time is in the past' });
            }
            const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);

            // ถ้า ScheduleDate ไม่ได้ระบุ
            // ส่งอีเมล์ทันที
            const info = await transport.sendMail({
                from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                to: user.Email,
                subject: user.Firstname,
                text: `Sender is: ${user.Username}`,
                html: emailHtmlContent,
            });
            // ส่งคำตอบเมื่อส่งอีเมล์เสร็จสมบูรณ์
            return res
                .status(201)
                .json({ Management, Message: 'Messages created and email sent successfully time current' });
        }
    });
};

//! sentMail
const sentMail: RequestHandler = async (req, res, next) => {
    const { SMS_ID }: any = req.query;
    const sms: any = await prisma.sMSManagement.findUnique({
        where: {
            SMS_ID: SMS_ID,
        },
    });
    if (!sms) {
        return res.status(403).json({ error: 'None SMS' });
    }

    // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
    const user: any = await prisma.userManagement.findUnique({
        where: {
            UserID: sms.UserID,
        },
    });
    if (!user) {
        return res.status(403).json({ error: 'None User' });
    }

    // กำหนดค่าการกำหนดค่าสำหรับ Nodemailer
    const transport = nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth: {
            user: 'b0147891f258c2',
            pass: '4ff23679f73610',
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

    // ค้นหาข้อมูล Message จากฐานข้อมูล
    const messages: any = await prisma.sMSMessage.findMany({
        where: {
            SMS_ID: sms.SMS_ID,
        },
        select: {
            Message: true,
        },
        orderBy: {
            CreatedAt: 'asc',
        },
    });
    if (!messages || messages.length === 0) {
        return res.status(403).json({ error: 'None message' });
    }
    const scheduleDate = new Date(sms.ScheduleDate);
    // สร้างข้อความจาก messages
    const combinedMessageData = messages.map((data: any) => data.Message).join('');
    if (scheduleDate) {
        scheduleDate.setHours(scheduleDate.getHours() - 7);
        if (!isPast(scheduleDate)) {
            const millisecondsUntilScheduledTime = scheduleDate.getTime() - Date.now();
            const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
            // const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'", {
            //     locale: th,
            // });
            const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
            setTimeout(async () => {
                // ส่งอีเมล์ทันที
                const info = await transport.sendMail({
                    from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                    to: user.Email,
                    subject: user.Firstname,
                    text: `Sender is: ${user.Username}`,
                    html: emailHtmlContent,
                });
            }, millisecondsUntilScheduledTime);
            return res.status(201).json({ Message: 'Messages created and email scheduled successfully for future' });
        } else {
            const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
            // กำหนดเวลาที่ผ่านมาหรือไม่ได้ระบุ
            // ส่งอีเมล์ทันที
            const info = await transport.sendMail({
                from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                to: user.Email,
                subject: user.Firstname,
                text: `Sender is: ${user.Username}`,
                html: emailHtmlContent,
            });
            return res.status(201).json({ info, Message: 'Messages created and email sent successfully for past' });
        }
    } else {
        const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
        // ส่งอีเมล์ทันที
        const info = await transport.sendMail({
            from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
            to: user.Email,
            subject: user.Firstname,
            text: `Sender is: ${user.Username}`,
            html: emailHtmlContent,
        });
        return res.status(201).json({ info, Message: 'Messages created and email sent successfully for immediate' });
    }
};

//! sentMail140
const sentMail140: RequestHandler = async (req, res, next) => {
    const { SMS_ID }: any = req.query;
    const sms: any = await prisma.sMSManagement.findUnique({
        where: {
            SMS_ID: SMS_ID,
        },
    });
    if (!sms) {
        return res.status(403).json({ error: 'None SMS' });
    }

    // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
    const user: any = await prisma.userManagement.findUnique({
        where: {
            UserID: sms.UserID,
        },
    });
    if (!user) {
        return res.status(403).json({ error: 'None User' });
    }

    // กำหนดค่าการกำหนดค่าสำหรับ Nodemailer
    const transport = nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth: {
            user: 'b0147891f258c2',
            pass: '4ff23679f73610',
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

    // ค้นหาข้อมูล Message จากฐานข้อมูล
    const messages: any = await prisma.sMSMessage.findMany({
        where: {
            SMS_ID: sms.SMS_ID,
        },
        select: {
            Message: true,
        },
        orderBy: {
            CreatedAt: 'asc',
        },
    });
    if (!messages || messages.length === 0) {
        return res.status(403).json({ error: 'None message' });
    }
    const scheduleDate = new Date(sms.ScheduleDate);
    // สร้างข้อความจาก messages
    if (scheduleDate) {
        scheduleDate.setHours(scheduleDate.getHours() - 7);
        if (!isPast(scheduleDate)) {
            const millisecondsUntilScheduledTime = scheduleDate.getTime() - Date.now();
            const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
            // const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'", {
            //     locale: th,
            // });
            const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
            setTimeout(async () => {
                // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
                const emailPromises = messages.map(async (data: any) => {
                    const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
                    const info = await transport.sendMail({
                        from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                        to: user.Email,
                        subject: user.Firstname,
                        text: `Sender is: ${user.Username}`,
                        html: emailHtmlContent,
                    });
                    return info;
                });
                // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
                await Promise.all(emailPromises);
            }, millisecondsUntilScheduledTime);
            return res.status(201).json({ Message: 'Messages created and email scheduled successfully for future' });
        } else {
            const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
            // กำหนดเวลาที่ผ่านมาหรือไม่ได้ระบุ
            // ส่งอีเมล์ทันที
            // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
            const emailPromises = messages.map(async (data: any) => {
                const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
                const info = await transport.sendMail({
                    from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                    to: user.Email,
                    subject: user.Firstname,
                    text: `Sender is: ${user.Username}`,
                    html: emailHtmlContent,
                });
                return info;
            });

            // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
            await Promise.all(emailPromises);
            return res.status(201).json({ Message: 'Messages created and email sent successfully for past' });
        }
    } else {
        const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
        // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
        const emailPromises = messages.map(async (data: any) => {
            const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
            const info = await transport.sendMail({
                from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                to: user.Email,
                subject: user.Firstname,
                text: `Sender is: ${user.Username}`,
                html: emailHtmlContent,
            });
            return info;
        });
        // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
        await Promise.all(emailPromises);
        return res.status(201).json({ Message: 'Messages created and email sent successfully for immediate' });
    }
};

//! sentManySMS
const sentManySMS: RequestHandler = async (req, res, next) => {
    const { SMS_IDs }: { SMS_IDs: any[] } = req.body;
    // return res.status(200).json({ 'SMS_IDs:': SMS_IDs });

    // Check if SMS_IDs is an array and not empty
    if (!Array.isArray(SMS_IDs) || SMS_IDs.length === 0) {
        return res.status(400).json({ error: 'Invalid SMS_IDs' });
    }

    // กำหนดค่าการกำหนดค่าสำหรับ Nodemailer
    const transport = nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth: {
            user: 'b0147891f258c2',
            pass: '4ff23679f73610',
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

    for (const SMS_ID of SMS_IDs) {
        const sms: any = await prisma.sMSManagement.findUnique({
            where: {
                SMS_ID: SMS_ID,
            },
        });

        if (!sms) {
            console.error(`SMS_ID ${SMS_ID} not found`);
            // Handle error or continue to the next SMS_ID
            continue;
        }

        // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
        const user: any = await prisma.userManagement.findUnique({
            where: {
                UserID: sms.UserID,
            },
        });
        if (!user) {
            return res.status(403).json({ error: 'None User' });
        }

        // ค้นหาข้อมูล Message จากฐานข้อมูล
        const messages: any = await prisma.sMSMessage.findMany({
            where: {
                SMS_ID: sms.SMS_ID,
            },
            select: {
                Message: true,
            },
            orderBy: {
                CreatedAt: 'asc',
            },
        });
        if (!messages || messages.length === 0) {
            return res.status(403).json({ error: 'None message' });
        }
        const scheduleDate = new Date(sms.ScheduleDate);
        // สร้างข้อความจาก messages
        if (scheduleDate) {
            scheduleDate.setHours(scheduleDate.getHours() - 7);
            if (!isPast(scheduleDate)) {
                const millisecondsUntilScheduledTime = scheduleDate.getTime() - Date.now();
                const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
                // const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'", {
                //     locale: th,
                // });
                const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
                setTimeout(async () => {
                    // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
                    const emailPromises = messages.map(async (data: any) => {
                        const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
                        const info = await transport.sendMail({
                            from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                            to: user.Email,
                            subject: user.Firstname,
                            text: `Sender is: ${user.Username}`,
                            html: emailHtmlContent,
                        });
                        return info;
                    });
                    // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
                    await Promise.all(emailPromises);
                }, millisecondsUntilScheduledTime);
                // return res
                //     .status(201)
                //     .json({ Message: 'Messages created and email scheduled successfully for future' });
            } else {
                const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
                // กำหนดเวลาที่ผ่านมาหรือไม่ได้ระบุ
                // ส่งอีเมล์ทันที
                // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
                const emailPromises = messages.map(async (data: any) => {
                    const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
                    const info = await transport.sendMail({
                        from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                        to: user.Email,
                        subject: user.Firstname,
                        text: `Sender is: ${user.Username}`,
                        html: emailHtmlContent,
                    });
                    return info;
                });
                // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
                await Promise.all(emailPromises);
                // return res.status(201).json({ Message: 'Messages created and email sent successfully for past' });
            }
        } else {
            const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
            // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
            const emailPromises = messages.map(async (data: any) => {
                const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
                const info = await transport.sendMail({
                    from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                    to: user.Email,
                    subject: user.Firstname,
                    text: `Sender is: ${user.Username}`,
                    html: emailHtmlContent,
                });
                return info;
            });
            // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
            await Promise.all(emailPromises);
            // return res.status(201).json({ Message: 'Messages created and email sent successfully for immediate' });
        }
    }
    // ส่งคำตอบหลังจากประมวลผล SMS_ID ทั้งหมด
    return res.status(201).json({ Message: 'Messages emails scheduled/sent successfully.' });
};

//! sentManyPort
const sentManyPort: RequestHandler = async (req, res, next) => {
    const { SMS_IDs }: { SMS_IDs: any[] } = req.body;

    // ตรวจสอบว่า SMS_IDs เป็นอาร์เรย์และมีข้อมูลหรือไม่
    if (!Array.isArray(SMS_IDs) || SMS_IDs.length === 0) {
        return res.status(400).json({ error: 'Invalid SMS_IDs' });
    }

    // ใช้ Promise.all เพื่อดำเนินการตรวจสอบและประมวลผลทุก SMS_ID พร้อมกัน
    const results = await Promise.all(
        SMS_IDs.map(async (SMS_ID) => {
            // ค้นหาข้อมูล SMS ด้วย SMS_ID
            const sms: any = await prisma.sMSManagement.findUnique({
                where: {
                    SMS_ID: SMS_ID,
                },
            });

            // ถ้า SMS ไม่พบ ให้คืนผลลัพธ์บอกว่าไม่พบ SMS
            if (!sms) {
                console.error(`SMS_ID ${SMS_ID} not found`);
                return { SMS_ID, success: false, error: 'SMS not found' };
            }

            // ค้นหาข้อมูล User ด้วย UserID จาก SMS
            const user: any = await prisma.userManagement.findUnique({
                where: {
                    UserID: sms.UserID,
                },
            });

            // ถ้า User ไม่พบ ให้คืนผลลัพธ์บอกว่าไม่พบ User
            if (!user) {
                console.error(`User not found for SMS_ID ${SMS_ID}`);
                return { SMS_ID, success: false, error: 'User not found' };
            }

            // สร้าง transport ใหม่สำหรับแต่ละ SMS_ID
            const transport = nodemailer.createTransport({
                host: 'sandbox.smtp.mailtrap.io',
                port: 2525,
                auth: {
                    user: user.Username,
                    pass: user.Answer,
                },
            });

            // ตรวจสอบ transport
            const verificationResult: { success: boolean; error?: any } = await new Promise((resolve) => {
                transport.verify((error, success) => {
                    if (error) {
                        console.error(`Mailtrap connection error for SMS_ID ${SMS_ID}:`, error);
                        resolve({ success: false, error: error });
                    } else {
                        console.log(`Mailtrap connection successful for SMS_ID ${SMS_ID}`);
                        resolve({ success: true });
                    }
                });
            });

            // ถ้าตรวจสอบไม่ผ่าน ให้คืนผลลัพธ์บอกว่าเกิดข้อผิดพลาด
            if (!verificationResult.success) {
                return { SMS_ID, success: false, error: verificationResult.error };
            }

            // ดำเนินการตรวจสอบและประมวลผลเพิ่มเติมสำหรับแต่ละ SMS_ID
            // ตามที่คุณได้ทำไว้
            // ค้นหาข้อมูล Message จากฐานข้อมูล
            const messages: any = await prisma.sMSMessage.findMany({
                where: {
                    SMS_ID: sms.SMS_ID,
                },
                select: {
                    Message: true,
                },
                orderBy: {
                    CreatedAt: 'asc',
                },
            });
            if (!messages || messages.length === 0) {
                return res.status(403).json({ error: 'None message' });
            }
            const scheduleDate = new Date(sms.ScheduleDate);
            // สร้างข้อความจาก messages
            if (scheduleDate) {
                scheduleDate.setHours(scheduleDate.getHours() - 7);
                if (!isPast(scheduleDate)) {
                    const millisecondsUntilScheduledTime = scheduleDate.getTime() - Date.now();
                    const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
                    // const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'", {
                    //     locale: th,
                    // });
                    const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
                    setTimeout(async () => {
                        // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
                        const emailPromises = messages.map(async (data: any) => {
                            const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
                            const info = await transport.sendMail({
                                from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                                to: user.Email,
                                subject: user.Firstname,
                                text: `Sender is: ${user.Username}`,
                                html: emailHtmlContent,
                            });
                            return info;
                        });
                        // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
                        await Promise.all(emailPromises);
                    }, millisecondsUntilScheduledTime);
                    return res
                        .status(201)
                        .json({ Message: 'Messages created and email scheduled successfully for future' });
                } else {
                    const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
                    // กำหนดเวลาที่ผ่านมาหรือไม่ได้ระบุ
                    // ส่งอีเมล์ทันที
                    // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
                    const emailPromises = messages.map(async (data: any) => {
                        const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
                        const info = await transport.sendMail({
                            from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                            to: user.Email,
                            subject: user.Firstname,
                            text: `Sender is: ${user.Username}`,
                            html: emailHtmlContent,
                        });
                        return info;
                    });

                    // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
                    await Promise.all(emailPromises);
                    return res.status(201).json({ Message: 'Messages created and email sent successfully for past' });
                }
            } else {
                const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
                // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
                const emailPromises = messages.map(async (data: any) => {
                    const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
                    const info = await transport.sendMail({
                        from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                        to: user.Email,
                        subject: user.Firstname,
                        text: `Sender is: ${user.Username}`,
                        html: emailHtmlContent,
                    });
                    return info;
                });
                // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
                await Promise.all(emailPromises);
                return res.status(201).json({ Message: 'Messages created and email sent successfully for immediate' });
            }
        }),
    );
    // ส่งผลลัพธ์ทั้งหมดหลังจากประมวลผล SMS_ID ทุกตัว
    return res.status(201).json({ results, Message: 'Messages emails scheduled/sent successfully.' });
};

export { sentSMSCreate, sentMail, sentMail140, sentManySMS, sentManyPort };
