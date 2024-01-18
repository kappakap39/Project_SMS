import { RequestHandler } from 'express';
import prisma from '../lib/db';
import Nexmo, { MessageError, MessageRequestResponse } from 'nexmo';

const sentMailTest: RequestHandler = async (req, res, next) => {
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

        // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
        const user: any = await prisma.userManagement.findUnique({
            where: {
                UserID: sms.UserID,
            },
        });
        if (!user) {
            return res.status(403).json({ error: 'ไม่พบผู้ใช้' });
        }

        // ค้นหาข้อมูล Message จากฐานข้อมูล
        const messagesdata: any = await prisma.sMSMessage.findMany({
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
        if (!messagesdata || messagesdata.length === 0) {
            return res.status(403).json({ error: 'None message' });
        }

        //!https://dashboard.nexmo.com/getting-started/sms
        const nexmo = new Nexmo({
            apiKey: 'b9632e38',
            apiSecret: 'oAJQAmShIYLhTB60',
        });
        const from = '0963634420';
        
        // Encode Thai characters correctly
        const thaiMessage = `สวีดัส สวัสดี ฉันชื่อ ${user.Firstname} ${user.Lastname} หรือเรียกสั่นๆว่า บอม ฉันเป็นโปรแกรมเมอร์. ฉันกำลังทดสอบระบบการส่ง SMS นี้คือข้อความทดสอบส่ง SMS CPF!`;

        const messages = [
            // { to: '66645191918', text: thaiMessage },
            { to: '66963634420', text: thaiMessage },
        ];

        const sentMessages = await Promise.all(
            messages.map(async (message) => {
                try {
                    const sentSms: MessageRequestResponse = await new Promise<MessageRequestResponse>(
                        (resolve, reject) => {
                            nexmo.message.sendSms(
                                from,
                                message.to,
                                message.text,
                                { type: 'unicode' }, // Specify Unicode encoding for Thai characters
                                (err: MessageError, data: MessageRequestResponse) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(data);
                                    }
                                },
                            );
                        },
                    );
                    return { success: true, message: sentSms };
                } catch (nexmoError: any) {
                    console.error('Nexmo error:', nexmoError);

                    if (nexmoError.body && nexmoError.body.messages) {
                        const errorMessage = nexmoError.body.messages[0].errorText;

                        if (errorMessage.includes('16')) {
                            // จัดการกรณีหมายเลขที่ยืนยันไม่ถูกต้อง
                            return { success: false, error: 'หมายเลขที่ยืนยันไม่ถูกต้อง' };
                        } else {
                            // จัดการ Nexmo errors อื่น ๆ
                            return { success: false, error: 'Nexmo error' };
                        }
                    } else {
                        // จัดการกับข้อผิดพลาดอื่น ๆ ที่ไม่รู้จัก
                        return { success: false, error: 'ข้อผิดพลาดที่ไม่รู้จัก' };
                    }
                }
            }),
        );

        console.log('Sent Messages:', sentMessages);

        return res.status(201).json({ sentMessages });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'ข้อผิดพลาดภายในเซิร์ฟเวอร์' });
    }
};

export { sentMailTest };
