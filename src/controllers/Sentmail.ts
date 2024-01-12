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
                        html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
                    <div style=3D"color: yellow; text-align: center;" >
                        <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
                    </div>
                    <div style=3D"display: flex; text-align: center;" >
                        <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${body.Tel}</h5>
                        <h5 style="margin-right: 10%;">Option is: ${body.Option}</h5>
                        <h5 style="margin-right: 10%;">Result is: ${body.Result}</h5>
                        <h5 style="margin-right: 10%;">Contact is: ${body.Contact}</h5>
                        <h5 style="margin-right: 10%;">Date time thai is: ${formattedScheduleDate}</h5>
                        <h5>Description is: ${body.Description}</h5>
                    </div>
                    <h6>Message is: ${body.Message}</h6>
                    </div>`,
                    });
                }, millisecondsUntilScheduledTime);
                // ส่งคำตอบเมื่อส่งอีเมล์เสร็จสมบูรณ์
                return res
                    .status(201)
                    .json({ Management, Message: 'Messages created and email scheduled successfully time future' });
            }

            // ส่งอีเมล์ทันที
            const info = await transport.sendMail({
                from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                to: user.Email,
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
                    <h5>Description is: ${body.Description}</h5>
                </div>
                <h6>Message is: ${body.Message}</h6>
                </div>`,
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

            // ถ้า ScheduleDate ไม่ได้ระบุ
            // ส่งอีเมล์ทันที
            const info = await transport.sendMail({
                from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                to: user.Email,
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
                    <h5>Description is: ${body.Description}</h5>
                </div>
                <h6>Message is: ${body.Message}</h6>
                </div>`,
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
            setTimeout(async () => {
                // ส่งอีเมล์ทันที
                const info = await transport.sendMail({
                    from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                    to: user.Email,
                    subject: user.Firstname,
                    text: `Sender is: ${user.Username}`,
                    html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
                    <div style=3D"color: yellow; text-align: center;" >
                        <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
                    </div>
                    <div style=3D"display: flex; text-align: center;" >
                        <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${sms.Tel}</h5>
                        <h5 style="margin-right: 10%;">Option is: ${sms.Option}</h5>
                        <h5 style="margin-right: 10%;">Result is: ${sms.Result}</h5>
                        <h5 style="margin-right: 10%;">Contact is: ${sms.Contact}</h5>
                        <h5>Description is: ${sms.Description}</h5>
                        <h5>date time is: ${formattedScheduleDate}</h5>
                    </div>
                    <h6>Message is: ${combinedMessageData}</h6>
                    </div>`,
                });
            }, millisecondsUntilScheduledTime);
            return res
                    .status(201)
                    .json({ Message: 'Messages created and email scheduled successfully for future' });
        } else {
            // กำหนดเวลาที่ผ่านมาหรือไม่ได้ระบุ
            // ส่งอีเมล์ทันที
            const info = await transport.sendMail({
                from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                to: user.Email,
                subject: user.Firstname,
                text: `Sender is: ${user.Username}`,
                html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
                <div style=3D"color: yellow; text-align: center;" >
                    <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
                </div>
                <div style=3D"display: flex; text-align: center;" >
                    <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${sms.Tel}</h5>
                    <h5 style="margin-right: 10%;">Option is: ${sms.Option}</h5>
                    <h5 style="margin-right: 10%;">Result is: ${sms.Result}</h5>
                    <h5 style="margin-right: 10%;">Contact is: ${sms.Contact}</h5>
                    <h5>Description is: ${sms.Description}</h5>
                    <h5>date time is: date past</h5>
                </div>
                <h6>Message is: ${combinedMessageData}</h6>
                </div>`,
            });
            return res
                .status(201)
                .json({ info, Message: 'Messages created and email sent successfully for past' });
        }
    } else {
        // ส่งอีเมล์ทันที
        const info = await transport.sendMail({
            from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
            to: user.Email,
            subject: user.Firstname,
            text: `Sender is: ${user.Username}`,
            html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
            <div style=3D"color: yellow; text-align: center;" >
                <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
            </div>
            <div style=3D"display: flex; text-align: center;" >
                <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${sms.Tel}</h5>
                <h5 style="margin-right: 10%;">Option is: ${sms.Option}</h5>
                <h5 style="margin-right: 10%;">Result is: ${sms.Result}</h5>
                <h5 style="margin-right: 10%;">Contact is: ${sms.Contact}</h5>
                <h5>Description is: ${sms.Description}</h5>
                <h5>date time is: date immediate</h5>
            </div>
            <h6>Message is: ${combinedMessageData}</h6>
            </div>`,
        });
        return res
            .status(201)
            .json({ info, Message: 'Messages created and email sent successfully for immediate' });
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
            setTimeout(async () => {
                // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
                const emailPromises = messages.map(async (data: any) => {
                    const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
                    const info = await transport.sendMail({
                        from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                        to: user.Email,
                        subject: user.Firstname,
                        text: `Sender is: ${user.Username}`,
                        html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
                <div style=3D"color: yellow; text-align: center;" >
                    <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
                </div>
                <div style=3D"display: flex; text-align: center;" >
                    <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${sms.Tel}</h5>
                    <h5 style="margin-right: 10%;">Option is: ${sms.Option}</h5>
                    <h5 style="margin-right: 10%;">Result is: ${sms.Result}</h5>
                    <h5 style="margin-right: 10%;">Contact is: ${sms.Contact}</h5>
                    <h5>Description is: ${sms.Description}</h5>
                    <h5>date time is: ${formattedScheduleDate}</h5>
                </div>
                <h6>Message is: ${data.Message}</h6>
                </div>`,
                    });
                    return info;
                });
                // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
                await Promise.all(emailPromises);
            }, millisecondsUntilScheduledTime);
            return res.status(201).json({ Message: 'Messages created and email scheduled successfully for future' });
        } else {
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
                    html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
                <div style=3D"color: yellow; text-align: center;" >
                    <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
                </div>
                <div style=3D"display: flex; text-align: center;" >
                    <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${sms.Tel}</h5>
                    <h5 style="margin-right: 10%;">Option is: ${sms.Option}</h5>
                    <h5 style="margin-right: 10%;">Result is: ${sms.Result}</h5>
                    <h5 style="margin-right: 10%;">Contact is: ${sms.Contact}</h5>
                    <h5>Description is: ${sms.Description}</h5>
                    <h5>date time is: ${formattedScheduleDate}</h5>
                </div>
                <h6>Message is: ${data.Message}</h6>
                </div>`,
                });
                return info;
            });

            // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
            await Promise.all(emailPromises);
            return res.status(201).json({ Message: 'Messages created and email sent successfully for past' });
        }
    } else {
        // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
        const emailPromises = messages.map(async (data: any) => {
            const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
            const info = await transport.sendMail({
                from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                to: user.Email,
                subject: user.Firstname,
                text: `Sender is: ${user.Username}`,
                html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
                <div style=3D"color: yellow; text-align: center;" >
                    <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
                </div>
                <div style=3D"display: flex; text-align: center;" >
                    <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${sms.Tel}</h5>
                    <h5 style="margin-right: 10%;">Option is: ${sms.Option}</h5>
                    <h5 style="margin-right: 10%;">Result is: ${sms.Result}</h5>
                    <h5 style="margin-right: 10%;">Contact is: ${sms.Contact}</h5>
                    <h5>Description is: ${sms.Description}</h5>
                    <h5>date time is: ${formattedScheduleDate}</h5>
                </div>
                <h6>Message is: ${data.Message}</h6>
                </div>`,
            });
            return info;
        });
        // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
        await Promise.all(emailPromises);
        return res.status(201).json({ Message: 'Messages created and email sent successfully for immediate' });
    }
};


export { sentSMSCreate, sentMail, sentMail140,  };
