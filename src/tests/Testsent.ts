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

// var transport = nodemailer.createTransport({
//     host: "sandbox.smtp.mailtrap.io",
//     port: 2525,
//     auth: {
//       user: "e226b5ee73dcdc",
//       pass: "d171146ae7420f"
//     }
//   });

//! sentManyPort
// const sentManyPort: RequestHandler = async (req, res, next) => {
//     const { SMS_IDs }: { SMS_IDs: any[] } = req.body;

//     // ตรวจสอบว่า SMS_IDs เป็นอาร์เรย์และมีข้อมูลหรือไม่
//     if (!Array.isArray(SMS_IDs) || SMS_IDs.length === 0) {
//         return res.status(400).json({ error: 'Invalid SMS_IDs' });
//     }

//     // ใช้ Promise.all เพื่อดำเนินการตรวจสอบและประมวลผลทุก SMS_ID พร้อมกัน
//     const results = await Promise.all(
//         SMS_IDs.map(async (SMS_ID) => {
//             // ค้นหาข้อมูล SMS ด้วย SMS_ID
//             const sms: any = await prisma.sMSManagement.findUnique({
//                 where: {
//                     SMS_ID: SMS_ID,
//                 },
//             });

//             // ถ้า SMS ไม่พบ ให้คืนผลลัพธ์บอกว่าไม่พบ SMS
//             if (!sms) {
//                 console.error(`SMS_ID ${SMS_ID} not found`);
//                 return { SMS_ID, success: false, error: 'SMS not found' };
//             }

//             // ค้นหาข้อมูล User ด้วย UserID จาก SMS
//             const user: any = await prisma.userManagement.findUnique({
//                 where: {
//                     UserID: sms.UserID,
//                 },
//             });

//             // ถ้า User ไม่พบ ให้คืนผลลัพธ์บอกว่าไม่พบ User
//             if (!user) {
//                 console.error(`User not found for SMS_ID ${SMS_ID}`);
//                 return { SMS_ID, success: false, error: 'User not found' };
//             }

//             // สร้าง transport ใหม่สำหรับแต่ละ SMS_ID
//             const transport = nodemailer.createTransport({
//                 host: 'sandbox.smtp.mailtrap.io',
//                 port: 2525,
//                 auth: {
//                     user: user.Username,
//                     pass: user.Answer,
//                 },
//             });

//             // ตรวจสอบ transport
//             const verificationResult: { success: boolean; error?: any } = await new Promise((resolve) => {
//                 transport.verify((error, success) => {
//                     if (error) {
//                         console.error(`Mailtrap connection error for SMS_ID ${SMS_ID}:`, error);
//                         resolve({ success: false, error: error });
//                     } else {
//                         console.log(`Mailtrap connection successful for SMS_ID ${SMS_ID}`);
//                         resolve({ success: true });
//                     }
//                 });
//             });

//             // ถ้าตรวจสอบไม่ผ่าน ให้คืนผลลัพธ์บอกว่าเกิดข้อผิดพลาด
//             if (!verificationResult.success) {
//                 return { SMS_ID, success: false, error: verificationResult.error };
//             }

//             // ดำเนินการตรวจสอบและประมวลผลเพิ่มเติมสำหรับแต่ละ SMS_ID
//             // ตามที่คุณได้ทำไว้
//             // ค้นหาข้อมูล Message จากฐานข้อมูล
//             const messages: any = await prisma.sMSMessage.findMany({
//                 where: {
//                     SMS_ID: sms.SMS_ID,
//                 },
//                 select: {
//                     Message: true,
//                 },
//                 orderBy: {
//                     CreatedAt: 'asc',
//                 },
//             });
//             if (!messages || messages.length === 0) {
//                 return res.status(403).json({ error: 'None message' });
//             }
//             const scheduleDate = new Date(sms.ScheduleDate);
//             // สร้างข้อความจาก messages
//             if (scheduleDate) {
//                 scheduleDate.setHours(scheduleDate.getHours() - 7);
//                 if (!isPast(scheduleDate)) {
//                     const millisecondsUntilScheduledTime = scheduleDate.getTime() - Date.now();
//                     const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
//                     // const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'", {
//                     //     locale: th,
//                     // });
//                     setTimeout(async () => {
//                         // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
//                         const emailPromises = messages.map(async (data: any) => {
//                             const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
//                             const info = await transport.sendMail({
//                                 from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
//                                 to: user.Email,
//                                 subject: user.Firstname,
//                                 text: `Sender is: ${user.Username}`,
//                                 html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
//                 <div style=3D"color: yellow; text-align: center;" >
//                     <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
//                 </div>
//                 <div style=3D"display: flex; text-align: center;" >
//                     <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${sms.Tel}</h5>
//                     <h5 style="margin-right: 10%;">Option is: ${sms.Option}</h5>
//                     <h5 style="margin-right: 10%;">Result is: ${sms.Result}</h5>
//                     <h5 style="margin-right: 10%;">Contact is: ${sms.Contact}</h5>
//                     <h5>Description is: ${sms.Description}</h5>
//                     <h5>date time is: ${formattedScheduleDate}</h5>
//                 </div>
//                 <h6>Message is: ${data.Message}</h6>
//                 </div>`,
//                             });
//                             return info;
//                         });
//                         // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
//                         await Promise.all(emailPromises);
//                     }, millisecondsUntilScheduledTime);
//                     return res
//                         .status(201)
//                         .json({ Message: 'Messages created and email scheduled successfully for future' });
//                 } else {
//                     // กำหนดเวลาที่ผ่านมาหรือไม่ได้ระบุ
//                     // ส่งอีเมล์ทันที
//                     // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
//                     const emailPromises = messages.map(async (data: any) => {
//                         const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
//                         const info = await transport.sendMail({
//                             from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
//                             to: user.Email,
//                             subject: user.Firstname,
//                             text: `Sender is: ${user.Username}`,
//                             html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
//                 <div style=3D"color: yellow; text-align: center;" >
//                     <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
//                 </div>
//                 <div style=3D"display: flex; text-align: center;" >
//                     <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${sms.Tel}</h5>
//                     <h5 style="margin-right: 10%;">Option is: ${sms.Option}</h5>
//                     <h5 style="margin-right: 10%;">Result is: ${sms.Result}</h5>
//                     <h5 style="margin-right: 10%;">Contact is: ${sms.Contact}</h5>
//                     <h5>Description is: ${sms.Description}</h5>
//                     <h5>date time is: ${formattedScheduleDate}</h5>
//                 </div>
//                 <h6>Message is: ${data.Message}</h6>
//                 </div>`,
//                         });
//                         return info;
//                     });

//                     // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
//                     await Promise.all(emailPromises);
//                     return res.status(201).json({ Message: 'Messages created and email sent successfully for past' });
//                 }
//             } else {
//                 // สร้าง promises สำหรับการส่งอีเมลล์แต่ละข้อความ
//                 const emailPromises = messages.map(async (data: any) => {
//                     const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
//                     const info = await transport.sendMail({
//                         from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
//                         to: user.Email,
//                         subject: user.Firstname,
//                         text: `Sender is: ${user.Username}`,
//                         html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
//                 <div style=3D"color: yellow; text-align: center;" >
//                     <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
//                 </div>
//                 <div style=3D"display: flex; text-align: center;" >
//                     <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${sms.Tel}</h5>
//                     <h5 style="margin-right: 10%;">Option is: ${sms.Option}</h5>
//                     <h5 style="margin-right: 10%;">Result is: ${sms.Result}</h5>
//                     <h5 style="margin-right: 10%;">Contact is: ${sms.Contact}</h5>
//                     <h5>Description is: ${sms.Description}</h5>
//                     <h5>date time is: ${formattedScheduleDate}</h5>
//                 </div>
//                 <h6>Message is: ${data.Message}</h6>
//                 </div>`,
//                     });
//                     return info;
//                 });
//                 // รอให้การส่งอีเมลล์ทั้งหมดเสร็จสมบูรณ์ก่อนที่จะส่งคำตอบ
//                 await Promise.all(emailPromises);
//                 return res.status(201).json({ Message: 'Messages created and email sent successfully for immediate' });
//             }
//         }),
//     );
//     // ส่งผลลัพธ์ทั้งหมดหลังจากประมวลผล SMS_ID ทุกตัว
//     return res.status(201).json({ results, Message: 'Messages emails scheduled/sent successfully.' });
// };

// const sentManyPort: RequestHandler = async (req, res, next) => {
//     const { SMS_ID }: any = req.query;
//     const sms: any = await prisma.sMSManagement.findUnique({
//         where: {
//             SMS_ID: SMS_ID,
//         },
//     });
//     if (!sms) {
//         return res.status(403).json({ error: 'None SMS' });
//     }

//     // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
//     const user: any = await prisma.userManagement.findUnique({
//         where: {
//             UserID: sms.UserID,
//         },
//     });
//     if (!user) {
//         return res.status(403).json({ error: 'None User' });
//     }

//     // กำหนดค่าการกำหนดค่าสำหรับ Nodemailer
//     const transportMany = nodemailer.createTransport({
//         host: 'sandbox.smtp.mailtrap.io',
//         port: 2525,
//         auth: {
//             user: 'b0147891f258c2',
//             pass: '4ff23679f73610',
//         },
//     });

//     // เพิ่มการตรวจสอบขีดจำกัดของอีเมล์และเตือน
//     transportMany.verify(function (error, success) {
//         if (error) {
//             console.error('Mailtrap connection error:', error);
//             return res.status(201).json({ 'Mailtrap connection error:': error });
//         } else {
//             console.log('Mailtrap connection successful');
//         }
//     });
//     // ค้นหาข้อมูล Message จากฐานข้อมูล
//     const messages: any = await prisma.sMSMessage.findMany({
//         where: {
//             SMS_ID: sms.SMS_ID,
//         },
//         select: {
//             Message: true,
//         },
//         orderBy: {
//             CreatedAt: 'asc',
//         },
//     });
//     if (!messages || messages.length === 0) {
//         return res.status(403).json({ error: 'None message' });
//     }
//     const scheduleDate = new Date(sms.ScheduleDate);
//     // สร้างข้อความจาก messages
//     if (scheduleDate) {
//         scheduleDate.setHours(scheduleDate.getHours() - 7);
//         if (!isPast(scheduleDate)) {
//             const millisecondsUntilScheduledTime = scheduleDate.getTime() - Date.now();
//             // ปรับ Timeout เพิ่มเติมในการส่งอีเมลล์
//             const millisecondsUntilScheduledTimeWithBuffer = millisecondsUntilScheduledTime + 5000;
//             setTimeout(async () => {
//                 const batchSize = 2; // จำนวนอีเมลล์ที่จะส่งในแต่ละ Batch
//                 const batches: any = chunkArray(messages, batchSize);
//                 const emailPromises = batches.map(async (batch: any[]) => {
//                     const emailPromisesForRecipients = batch.map(async (data: any) => {
//                         const toEmails = [user.Email, 'another@example.com',];
//                         const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");
//                         const emailInfo = await Promise.all(
//                             toEmails.map(async (toEmail: string) => {
//                                 const info = await transportMany.sendMail({
//                                     from: `sent mail to ${user.Firstname} ${user.Lastname} ${toEmail}`,
//                                     to: toEmail,
//                                     subject: user.Firstname,
//                                     text: `Sender is: ${user.Username}`,
//                                     html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
//                 <div style=3D"color: yellow; text-align: center;" >
//                     <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
//                 </div>
//                 <div style=3D"display: flex; text-align: center;" >
//                     <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${sms.Tel}</h5>
//                     <h5 style="margin-right: 10%;">Option is: ${sms.Option}</h5>
//                     <h5 style="margin-right: 10%;">Result is: ${sms.Result}</h5>
//                     <h5 style="margin-right: 10%;">Contact is: ${sms.Contact}</h5>
//                     <h5>Description is: ${sms.Description}</h5>
//                     <h5>date time is: ${formattedScheduleDate}</h5>
//                 </div>
//                 <h6>Message is: ${data.Message}</h6>
//                 </div>`,
//                                 });
//                                 return info;
//                             }),
//                         );

//                         return emailInfo;
//                     });

//                     await Promise.all(emailPromisesForRecipients);
//                 });

//                 await Promise.all(emailPromises);
//             }, millisecondsUntilScheduledTimeWithBuffer);

//             return res.status(201).json({ Message: 'Messages created and email scheduled successfully for future' });
//         } else {
//             const batchSize = 2; // จำนวนอีเมลล์ที่จะส่งในแต่ละ Batch
//             const batches: any = chunkArray(messages, batchSize);

//             const emailPromises = batches.map(async (batch: any[]) => {
//                 const emailPromisesForRecipients = batch.map(async (data: any) => {
//                     const toEmails = [user.Email, 'another@example.com',];
//                     const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");

//                     const emailInfo = await Promise.all(
//                         toEmails.map(async (toEmail: string) => {
//                             const info = await transportMany.sendMail({
//                                 from: `sent mail to ${user.Firstname} ${user.Lastname} ${toEmail}`,
//                                 to: toEmail,
//                                 subject: user.Firstname,
//                                 text: `Sender is: ${user.Username}`,
//                                 html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
//                 <div style=3D"color: yellow; text-align: center;" >
//                     <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
//                 </div>
//                 <div style=3D"display: flex; text-align: center;" >
//                     <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${sms.Tel}</h5>
//                     <h5 style="margin-right: 10%;">Option is: ${sms.Option}</h5>
//                     <h5 style="margin-right: 10%;">Result is: ${sms.Result}</h5>
//                     <h5 style="margin-right: 10%;">Contact is: ${sms.Contact}</h5>
//                     <h5>Description is: ${sms.Description}</h5>
//                     <h5>date time is: ${formattedScheduleDate}</h5>
//                 </div>
//                 <h6>Message is: ${data.Message}</h6>
//                 </div>`,
//                             });
//                             return info;
//                         }),
//                     );
//                     return emailInfo;
//                 });
//                 await Promise.all(emailPromisesForRecipients);
//             });
//             await Promise.all(emailPromises);
//             return res.status(201).json({ Message: 'Messages created and email sent successfully for past' });
//         }
//     } else {
//         const batchSize = 2; // จำนวนอีเมลล์ที่จะส่งในแต่ละ Batch
//         const batches: any = chunkArray(messages, batchSize);
//         const emailPromises = batches.map(async (batch: any[]) => {
//             const emailPromisesForRecipients = batch.map(async (data: any) => {
//                 const toEmails = [user.Email, 'another@example.com',];
//                 const formattedScheduleDate = format(scheduleDate, "วันที่ d MMMM yyyy 'เวลา' HH:mm 'น.'");

//                 const emailInfo = await Promise.all(
//                     toEmails.map(async (toEmail: string) => {
//                         const info = await transportMany.sendMail({
//                             from: `sent mail to ${user.Firstname} ${user.Lastname} ${toEmail}`,
//                             to: toEmail,
//                             subject: user.Firstname,
//                             text: `Sender is: ${user.Username}`,
//                             html: `<div style="background-color: black; color: white; text-align: left; padding: 10px;">
//                 <div style=3D"color: yellow; text-align: center;" >
//                     <h3>sent mail to ${user.Firstname} ${user.Lastname}</h3>
//                 </div>
//                 <div style=3D"display: flex; text-align: center;" >
//                     <h5 style="margin-right: 10%;">Tel is : ${user.Tel} or ${sms.Tel}</h5>
//                     <h5 style="margin-right: 10%;">Option is: ${sms.Option}</h5>
//                     <h5 style="margin-right: 10%;">Result is: ${sms.Result}</h5>
//                     <h5 style="margin-right: 10%;">Contact is: ${sms.Contact}</h5>
//                     <h5>Description is: ${sms.Description}</h5>
//                     <h5>date time is: ${formattedScheduleDate}</h5>
//                 </div>
//                 <h6>Message is: ${data.Message}</h6>
//                 </div>`,
//                         });
//                         return info;
//                     }),
//                 );
//                 return emailInfo;
//             });
//             await Promise.all(emailPromisesForRecipients);
//         });
//         await Promise.all(emailPromises);
//         return res.status(201).json({ Message: 'Messages created and email sent successfully for immediate' });
//     }
// };

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
