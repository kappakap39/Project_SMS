import { RequestHandler } from 'express';
import { chunkArray } from '../Utils/Object';
import Joi, { date } from 'joi';
import nodemailer from 'nodemailer';
import prisma from '../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const expirationTime = process.env.EXPIRATION_TIME;

import { isPast, parseISO, format, addHours, isValid, startOfDay, addDays } from 'date-fns';
import { th } from 'date-fns/locale/th';
import dayjs from 'dayjs';

//! sentMail
const sentMailTest: RequestHandler = async (req, res, next) => {
    // ดึงข้อมูล SMS_ID จาก req.query
    const { SMS_ID }: any = req.query;

    // ค้นหาข้อมูล SMS จากฐานข้อมูล
    const sms: any = await prisma.sMSManagement.findUnique({
        where: {
            SMS_ID: SMS_ID,
        },
    });
    
    // ถ้าไม่พบ SMS ในฐานข้อมูล
    if (!sms) {
        return res.status(403).json({ error: 'ไม่พบ SMS' });
    }

    // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
    const user: any = await prisma.userManagement.findUnique({
        where: {
            UserID: sms.UserID,
        },
    });

    // ถ้าไม่พบผู้ใช้ในฐานข้อมูล
    if (!user) {
        return res.status(403).json({ error: 'ไม่พบผู้ใช้' });
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

    // ถ้าไม่พบข้อความในฐานข้อมูล
    if (!messages || messages.length === 0) {
        return res.status(403).json({ error: 'ไม่พบข้อความ' });
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

    // ส่งอีเมลสำหรับทุกข้อความ
    await Promise.all(messages.map(async (data: any) => {
        return transport.sendMail({
            from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
            to: user.Email,
            subject: user.Firstname,
            text: `ผู้ส่ง: ${user.Username}`,
            html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
            <div style=3D"color: yellow; text-align: center;" >
                <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
            </div>
            <div style=3D"display: flex; text-align: center;" >
                <h5 style="margin-right: 10%;">เบอร์โทร: ${user.Tel} หรือ ${sms.Tel}</h5>
                <h5 style="margin-right: 10%;">Contact: ${sms.Contact}</h5>
                <h5>Description: ${sms.Description}</h5>
            </div>
            <h6>ข้อความ: ${data.Message}</h6>
            </div>`,
        });
    }));

    // ส่ง response ไปที่ client หลังจากที่ Email ถูกส่งทั้งหมดแล้ว
    return res.status(201).json({ Message: 'ข้อความและอีเมลถูกส่งเรียบร้อย' });
};

//! sentManySMSPort
const sentManySMSPort: RequestHandler = async (req, res, next) => {
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

export { sentManySMSPort };
