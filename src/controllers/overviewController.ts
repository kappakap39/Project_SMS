/* eslint-disable @typescript-eslint/no-unused-vars */
import { RequestHandler } from 'express';
import Joi, { date } from 'joi';
import prisma from '../lib/db';
import jwt from 'jsonwebtoken';
import { addDays, startOfDay } from 'date-fns';
const expirationTime = process.env.EXPIRATION_TIME;

// ! GetOverviewSMS
const GetOverviewSMS: RequestHandler = async (req, res) => {
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
                userManagement: true,
            },
        });

        if (smsManagement.length === 0) {
            return res.status(404).json({ smsManagement: 'No SMS found' });
        }

        return res.json(smsManagement);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};

//! GetOverviewSchedue
const GetOverviewSchedue: RequestHandler = async (req, res) => {
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
                userManagement: true,
            },
        });

        if (smsManagement.length === 0) {
            return res.status(404).json({ smsManagement: 'No SMS found' });
        }

        return res.json(smsManagement);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};
//! ทำค้นหาเฉพราะวันที่เพียงอย่างเดียว ของ sms ScheduleDate แสดงทั้งหมด
const searchdateSC: RequestHandler = async (req, res) => {
    try {
        const { query } = req.query as { query: string; date: string };
        const parsedDate = query ? new Date(query) : null;

        let dateQuery;
        if (parsedDate) {
            const nextDay = addDays(parsedDate, 1);
            dateQuery = {
                gte: startOfDay(parsedDate),
                lt: startOfDay(nextDay),
            };
        }
        const smsSearchResults: any = await prisma.sMSManagement.findMany({
            where: { ScheduleDate: dateQuery },
            orderBy: { CreatedAt: 'desc' },
            include: {
                userManagement: {
                    select: {
                        Username: true,
                        Firstname: true,
                        Lastname: true,
                    },
                },
                smsMessage: {
                    select: {
                        Message: true,
                    },
                },
                log_Sent: {
                    select: {
                        TypeLogger: true,
                        DateLog: true,
                    },
                },
            },
        });
        const smsMessagesBySMSID: { [key: string]: string[] } = {};
        for (const sms of smsSearchResults) {
            const smsID = sms.SMS_ID;
            if (sms.smsMessage) {
                if (!smsMessagesBySMSID[smsID]) {
                    smsMessagesBySMSID[smsID] = sms.smsMessage.map((m: any) => m.Message);
                } else {
                    smsMessagesBySMSID[smsID].push(sms.smsMessage.map((m: any) => m.Message));
                }
            }
        }
        const enhancedSMSResults = smsSearchResults.map((sms: any) => {
            const { smsMessage, ...rest } = sms;
            return {
                ...rest,
                Messages: smsMessagesBySMSID[sms.SMS_ID] ? smsMessagesBySMSID[sms.SMS_ID].join('') : '', // รวม Messages เป็นข้อความเดียวกัน
            };
        });
        res.status(200).json({ enhancedSMSResults });
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

//! ทำค้นหาเฉพราะวันที่เพียงอย่างเดียว ของ sms ScheduleDate แสดงเฉพราะ sms.Result = 'successfully' 
const searchdateSCS: RequestHandler = async (req, res) => {
    try {
        const { query } = req.query as { query: string; date: string };
        const parsedDate = query ? new Date(query) : null;

        let dateQuery;
        if (parsedDate) {
            const nextDay = addDays(parsedDate, 1);
            dateQuery = {
                gte: startOfDay(parsedDate),
                lt: startOfDay(nextDay),
            };
        }
        const smsSearchResults: any = await prisma.sMSManagement.findMany({
            where: {
                ScheduleDate: dateQuery,
                Result: 'successfully', // เพิ่มเงื่อนไข Result ที่ต้องการ
            },
            orderBy: { CreatedAt: 'desc' },
            include: {
                userManagement: {
                    select: {
                        Username: true,
                        Firstname: true,
                        Lastname: true,
                    },
                },
                smsMessage: {
                    select: {
                        Message: true,
                    },
                },
                log_Sent: {
                    select: {
                        TypeLogger: true,
                        DateLog: true,
                    },
                },
            },
        });
        const smsMessagesBySMSID: { [key: string]: string[] } = {};
        for (const sms of smsSearchResults) {
            const smsID = sms.SMS_ID;
            if (sms.smsMessage) {
                if (!smsMessagesBySMSID[smsID]) {
                    smsMessagesBySMSID[smsID] = sms.smsMessage.map((m: any) => m.Message);
                } else {
                    smsMessagesBySMSID[smsID].push(sms.smsMessage.map((m: any) => m.Message));
                }
            }
        }
        const enhancedSMSResults = smsSearchResults.map((sms: any) => {
            const { smsMessage, ...rest } = sms;
            return {
                ...rest,
                Messages: smsMessagesBySMSID[sms.SMS_ID] ? smsMessagesBySMSID[sms.SMS_ID].join('') : '', // รวม Messages เป็นข้อความเดียวกัน
            };
        });
        res.status(200).json({ enhancedSMSResults });
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

//! ทำค้นหาเฉพราะวันที่เพียงอย่างเดียว ของ sms ScheduleDate แสดงเฉพราะ sms.Result != 'successfully'  **Waiting
const searchdateSCW: RequestHandler = async (req, res) => {
    try {
        const { query } = req.query as { query: string; date: string };
        const parsedDate = query ? new Date(query) : null;

        let dateQuery;
        if (parsedDate) {
            const nextDay = addDays(parsedDate, 1);
            dateQuery = {
                gte: startOfDay(parsedDate),
                lt: startOfDay(nextDay),
            };
        }
        const smsSearchResults: any = await prisma.sMSManagement.findMany({
            where: {
                ScheduleDate: dateQuery,
            },
            orderBy: { CreatedAt: 'desc' },
            include: {
                userManagement: {
                    select: {
                        Username: true,
                        Firstname: true,
                        Lastname: true,
                    },
                },
                smsMessage: {
                    select: {
                        Message: true,
                    },
                },
                log_Sent: {
                    select: {
                        TypeLogger: true,
                        DateLog: true,
                    },
                },
            },
        });
        const smsMessagesBySMSID: { [key: string]: string[] } = {};
        for (const sms of smsSearchResults) {
            const smsID = sms.SMS_ID;
            if (sms.smsMessage) {
                if (!smsMessagesBySMSID[smsID]) {
                    smsMessagesBySMSID[smsID] = sms.smsMessage.map((m: any) => m.Message);
                } else {
                    smsMessagesBySMSID[smsID].push(sms.smsMessage.map((m: any) => m.Message));
                }
            }
        }
        const filteredResults = smsSearchResults.filter((sms: any) => sms.Result !== 'successfully');
        const enhancedSMSResults = filteredResults.map((sms: any) => {
            const { smsMessage, ...rest } = sms;
            return {
                ...rest,
                Messages: smsMessagesBySMSID[sms.SMS_ID] ? smsMessagesBySMSID[sms.SMS_ID].join('') : '', // รวม Messages เป็นข้อความเดียวกัน
            };
        });
        res.status(200).json({ enhancedSMSResults });
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


//!Get User By ID Showhistory
const UserByIDShowhistory: RequestHandler = async (req, res) => {
    try {
        const { UserID } = req.query;
        console.log('UserID: ' + UserID);
        if (UserID) {
            // ค้นหาข้อมูล userManagement ด้วย UserID
            const userByID = await prisma.userManagement.findMany({
                where: {
                    UserID: UserID as string,
                },
                include: {
                    smsManagement: {
                        orderBy: {
                            CreatedAt: 'asc',
                        },
                        include: {
                            smsMessage: {
                                select: {
                                    Message: true,
                                },
                            },
                            log_Sent: {
                                select: {
                                    TypeLogger: true,
                                    DateLog: true,
                                },
                            },
                        },
                    },
                },
            });

            if (userByID.length === 0) {
                return res.status(404).json({ error: 'UserID not found' });
            }

            // กรองข้อมูลที่ Result เท่ากับ 'successfully'
            const filteredByResult = userByID.map((data) => ({
                // ...data,
                smsManagement: data.smsManagement.filter((sms) => sms.Result === 'successfully'),
            }));

            // ผสมข้อมูล
            const combinedMessages = filteredByResult.map((data) => ({
                ...data,
                combinedMessage: data.smsManagement
                    .map((sms) => sms.smsMessage.map((message) => message.Message).join(''))
                    .join(''),
            }));

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

//!Get all SMSShowhistory
const SMSShowhistory: RequestHandler = async (req, res) => {
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
                log_Sent: {
                    select: {
                        TypeLogger: true,
                        DateLog: true,
                    },
                },
            },
        });

        if (smsManagement.length === 0) {
            return res.status(404).json({ smsManagement: 'No SMS found' });
        }

        // เลือกเฉพาะข้อมูลที่ Result เท่ากับ 'successfully'
        const filteredSMS = smsManagement.filter((sms) => sms.Result === 'successfully');

        const combinedMessages = filteredSMS.map((sms) => {
            const messages = sms.smsMessage.map((message) => message.Message).join('');
            const TextCount = messages.replace(/\s/g, '').length;
            return { ...sms, combinedMessage: messages, TextCount };
        });

        return res.json(combinedMessages);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};

//!Get User By ID pending ScheduleDate
const UserByIDpendingSc: RequestHandler = async (req, res) => {
    try {
        const { UserID } = req.query;
        console.log('UserID: ' + UserID);
        if (UserID) {
            // ค้นหาข้อมูล userManagement ด้วย UserID
            const userByID = await prisma.userManagement.findMany({
                where: {
                    UserID: UserID as string,
                },
                include: {
                    smsManagement: {
                        orderBy: {
                            CreatedAt: 'asc',
                        },
                        include: {
                            smsMessage: {
                                select: {
                                    Message: true,
                                },
                            },
                            log_Sent: {
                                select: {
                                    TypeLogger: true,
                                    DateLog: true,
                                },
                            },
                        },
                    },
                },
            });

            if (userByID.length === 0) {
                return res.status(404).json({ error: 'UserID not found' });
            }

            const currentDate = new Date();
            const filteredByResult = userByID.map((data) => ({
                // ...data,
                smsManagement: data.smsManagement.filter(
                    (sms) =>
                        sms.Result !== 'successfully' &&
                        (sms.ScheduleDate === null || new Date(sms.ScheduleDate) >= currentDate),
                ),
            }));

            // ผสมข้อมูล
            const combinedMessages = filteredByResult.map((data) => ({
                ...data,
                combinedMessage: data.smsManagement
                    .map((sms) => sms.smsMessage.map((message) => message.Message).join(''))
                    .join(''),
            }));

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

//!Get all SMSShowpending ScheduleDate
const SMSSpendingSc: RequestHandler = async (req, res) => {
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
                log_Sent: {
                    select: {
                        TypeLogger: true,
                        DateLog: true,
                    },
                },
            },
        });

        if (smsManagement.length === 0) {
            return res.status(404).json({ smsManagement: 'No SMS found' });
        }

        // เลือกเฉพาะข้อมูลที่ Result เท่ากับ 'pending' และ ScheduleDate มีค่ามากกว่าหรือเท่ากับวันเวลาปัจจุบัน
        const currentDate = new Date();
        const filteredSMS = smsManagement.filter(
            (sms) =>
                sms.Result !== 'successfully' &&
                (sms.ScheduleDate === null || new Date(sms.ScheduleDate) >= currentDate),
        );

        const combinedMessages = filteredSMS.map((sms) => {
            const messages = sms.smsMessage.map((message) => message.Message).join('');
            const TextCount = messages.replace(/\s/g, '').length;
            return { ...sms, combinedMessage: messages, TextCount };
        });

        return res.json(combinedMessages);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};

//!Get User By ID pending
const UserByIDpending: RequestHandler = async (req, res) => {
    try {
        const { UserID } = req.query;
        console.log('UserID: ' + UserID);
        if (UserID) {
            // ค้นหาข้อมูล userManagement ด้วย UserID
            const userByID = await prisma.userManagement.findMany({
                where: {
                    UserID: UserID as string,
                },
                include: {
                    smsManagement: {
                        orderBy: {
                            CreatedAt: 'asc',
                        },
                        include: {
                            smsMessage: {
                                select: {
                                    Message: true,
                                },
                            },
                            log_Sent: {
                                select: {
                                    TypeLogger: true,
                                    DateLog: true,
                                },
                            },
                        },
                    },
                },
            });

            if (userByID.length === 0) {
                return res.status(404).json({ error: 'UserID not found' });
            }
            // กรองข้อมูลที่ Result เท่ากับ 'successfully'
            const filteredByResult = userByID.map((data) => ({
                // ...data,
                smsManagement: data.smsManagement.filter((sms) => sms.Result !== 'successfully'),
            }));

            // ผสมข้อมูล
            const combinedMessages = filteredByResult.map((data) => ({
                ...data,
                combinedMessage: data.smsManagement
                    .map((sms) => sms.smsMessage.map((message) => message.Message).join(''))
                    .join(''),
            }));

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

//!Get all SMSShowpending
const SMSShowpending: RequestHandler = async (req, res) => {
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
                log_Sent: {
                    select: {
                        TypeLogger: true,
                        DateLog: true,
                    },
                },
            },
        });

        if (smsManagement.length === 0) {
            return res.status(404).json({ smsManagement: 'No SMS found' });
        }
        // เลือกเฉพาะข้อมูลที่ Result เท่ากับ 'successfully'
        const filteredSMS = smsManagement.filter((sms) => sms.Result != 'successfully');

        const combinedMessages = filteredSMS.map((sms) => {
            const messages = sms.smsMessage.map((message) => message.Message).join('');
            const TextCount = messages.replace(/\s/g, '').length;
            return { ...sms, combinedMessage: messages, TextCount };
        });

        return res.json(combinedMessages);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};

export {
    GetOverviewSMS,
    GetOverviewSchedue,
    searchdateSC,
    SMSShowhistory,
    UserByIDShowhistory,
    UserByIDpending,
    SMSShowpending,
    UserByIDpendingSc,
    SMSSpendingSc,
    searchdateSCS,
    searchdateSCW,
};
