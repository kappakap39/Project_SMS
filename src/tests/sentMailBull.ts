/* eslint-disable @typescript-eslint/no-unused-vars */
import Queue from 'bull';
import prisma from '../lib/db';
import nodemailer from 'nodemailer';
import { RequestHandler } from 'express';
import { createEmailHtmlContent } from '../Utils/Object';

const sentMailBull: RequestHandler = async (req, res) => {
    // สร้าง instance ของ nodemailer transport ที่ reusable
    const transport = nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth: {
            user: 'b0147891f258c2',
            pass: '4ff23679f73610',
        },
    });

    // ตรวจสอบการเชื่อมต่อกับอีเมล
    try {
        await transport.verify();
        console.log('Mailtrap connection successful');
    } catch (error) {
        console.error('Mailtrap connection error:', error);
        return res.status(500).json({ error: 'Mailtrap connection error' });
    }

    try {
        const { SMS_ID }: any = req.query;
        const sms: any = await prisma.sMSManagement.findUnique({
            where: {
                SMS_ID: SMS_ID,
            },
        });

        // ใช้ guard clause แทนการ indent ของ code มากมาย
        if (!sms) {
            return res.status(403).json({ error: 'ไม่พบ SMS' });
        }

        const user: any = await prisma.userManagement.findUnique({
            where: {
                UserID: sms.UserID,
            },
        });

        if (!user) {
            return res.status(403).json({ error: 'ไม่พบผู้ใช้' });
        }

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
            return res.status(403).json({ error: 'ไม่พบข้อความ' });
        }

        // สร้าง instance ของ Bull queue ที่ reusable
        const emailQueue = new Queue('emailQueue', {
            redis: {
                host: '0.0.0.0',
                port: 6379,
                maxRetriesPerRequest: 5, // ตั้งค่าตามที่ต้องการ
            },
        });

        // เพิ่ม jobs ใน Bull queue สำหรับแต่ละข้อความ
        await Promise.all(
            messages.map(async (data: any) => {
                try {
                    const emailHtmlContent = createEmailHtmlContent(user, sms, data.Message);
                    // เพิ่ม job ลงใน queue
                    const job = await emailQueue.add('sendEmail', { user, htmlContent: emailHtmlContent });
                    // ล็อก ID ของ job
                    console.log(`Job added to the queue. Job ID: ${job.id}`);
                    // ส่งอีเมลโดยตรง (ตัวเลือก)
                    const info = await transport.sendMail({
                        from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
                        to: user.Email,
                        subject: user.Firstname,
                        text: `Sender is: ${user.Username}`,
                        html: emailHtmlContent,
                    });
                    // ล็อกผลลัพธ์หรือจัดการตามที่ต้องการ
                    console.log('Email sent:', info);
                    return info;
                } catch (error) {
                    console.error('Error adding job to the queue or sending email:', error);
                    // ตอบกลับด้วย error
                    res.status(500).json({ error: 'Error processing request' });
                    throw error;
                }
            }),
        );
        // ตอบกลับหลังจากที่ job ถูกเพิ่มลงใน queue สำเร็จ
        // res.status(201).json({ Message: 'Job added to the queue successfully' });
        // ไม่ต้องรอให้ jobs เสร็จก่อนที่จะตอบกลับ
        // ตอบกลับด้วยข้อความสำเร็จ
        return res.status(201).json({ Message: 'ส่งข้อความและอีเมลสำเร็จ' });
    } catch (error) {
        console.error('Error in sentMailBull:', error);

        // ตอบกลับด้วย error
        return res.status(500).json({ error: 'Error in sentMailBull' });
    }
};

export { sentMailBull };
