// emailQueueAndSentMailBull.ts
import { RequestHandler } from 'express';
import Queue from 'bull';
import nodemailer from 'nodemailer';
import prisma from '../lib/db';

// สร้าง instance ของ nodemailer transport ที่ reusable
const transport = nodemailer.createTransport({
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    auth: {
        user: 'b0147891f258c2',
        pass: '4ff23679f73610',
    },
});

// สร้าง instance ของ Bull queue ที่ reusable
const emailQueue = new Queue('emailQueue', {
    redis: {
        host: 'http://localhost',
        port: 6379,
        // host: 'sandbox.smtp.mailtrap.io',
        // port: 2525,
    },
});

// ตรวจสอบการเชื่อมต่อกับอีเมล
transport.verify()
    .then(() => console.log('Mailtrap connection successful'))
    .catch((error) => {
        console.error('Mailtrap connection error:', error);
        process.exit(1); // ถ้าการเชื่อมต่อไม่สำเร็จ ให้ออกจากแอปพลิเคชัน
    });

// กำหนดกระบวนการสำหรับ job 'sendEmail' นอกจาก request handler
emailQueue.process('sendEmail', async (job) => {
    const { user, htmlContent } = job.data;
    try {
        // ใช้ 'transport' อย่างถูกต้อง
        const result = await transport.sendMail({
            from: `sent mail to ${user.Firstname} ${user.Lastname} ${user.Email}`,
            to: user.Email,
            subject: user.Firstname,
            text: `Sender is: ${user.Username}`,
            html: htmlContent,
        });
        return result;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error; // โยน error ไปที่ calling code เพื่อจัดการ
    }
});

// กำหนด request handler สำหรับการส่งอีเมลโดยใช้ Bull
const sentMailBull: RequestHandler = async (req, res) => {
    try {
        const { SMS_ID }: any = req.query;
        const sms: any = await prisma.sMSManagement.findUnique({
            where: {
                SMS_ID: SMS_ID,
            },
        });

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

        // เพิ่ม jobs ใน Bull queue สำหรับแต่ละข้อความ
        await Promise.all(
            messages.map(async (data: any) => {
                try {
                    const emailHtmlContent = `<p>${user.Firstname} ${user.Lastname}, ${data.Message}</p>`;
                    await emailQueue.add('sendEmail', { user, htmlContent: emailHtmlContent });
                } catch (error) {
                    console.error('Error adding job to the queue:', error);
                    throw error; // โยน error ไปที่ calling code เพื่อจัดการ
                }
            }),
        );

        return res.status(201).json({ Message: 'ส่งข้อความและอีเมลสำเร็จ' });
    } catch (error) {
        console.error('Error in sentMailBull:', error);
        return res.status(500).json({ error: 'Error in sentMailBull' });
    }
};

export { sentMailBull };

