/* eslint-disable @typescript-eslint/no-unused-vars */
import { RequestHandler } from 'express';
import prisma from '../lib/db';
import { addDays, isValid, startOfDay } from 'date-fns';
// import * as otpGenerator from 'otp-generator';

const searchUsers: RequestHandler = async (req, res) => {
    try {
        const { query } = req.query as { query: string };
        const parsedDate = new Date(query);
        const isValidDate = isValid(parsedDate);
        let dateQuery;
        if (isValidDate) {
            const nextDay = addDays(parsedDate, 1);
            dateQuery = {
                gte: startOfDay(parsedDate),
                lt: startOfDay(nextDay),
            };
        }
        const searchConditions: any[] = [
            { Username: { contains: query } },
            { Userlevel: { contains: query } },
            { Email: { contains: query.toLowerCase() } },
            { Tel: { contains: query } },
            { Statused: query.toLowerCase() === 'true' },
            { Question: { contains: query } },
            { Answer: { contains: query } },
            { Title: { contains: query } },
            { Firstname: { contains: query.toLowerCase() } },
            { Lastname: { contains: query.toLowerCase() } },
            { Abbreviatename: { contains: query.toLowerCase() } },
            { CitiZenID: { contains: query } },
            { Effectivedate: dateQuery },
            { Expireddate: dateQuery },
        ];

        console.log('searchConditions', searchConditions);

        const searchResults = await prisma.userManagement.findMany({
            where: {
                OR: searchConditions,
            },
            orderBy: {
                CreatedAt: 'desc',
            },
        });

        console.log('searchResults', searchResults);

        res.status(200).json({ results: searchResults });
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const searchSMS: RequestHandler = async (req, res) => {
    try {
        const { query } = req.query as { query: string };
        const parsedDate = new Date(query);
        const isValidDate = isValid(parsedDate);
        let dateQuery;
        if (isValidDate) {
            const nextDay = addDays(parsedDate, 1);
            dateQuery = {
                gte: startOfDay(parsedDate),
                lt: startOfDay(nextDay),
            };
        }

        // Search conditions for SMSManagement
        const smsSearchConditions = {
            OR: [
                { Sender: { contains: query } },
                { Tel: { contains: query } },
                { Result: { contains: query } },
                { Contact: { contains: query } },
                { Option: { contains: query } },
                { Description: { contains: query } },
                { ScheduleDate: dateQuery },
            ],
        };
        const smsSearchResults: any = await prisma.sMSManagement.findMany({
            where: smsSearchConditions,
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

const searchSMSUserID: RequestHandler = async (req, res) => {
    try {
        const { query } = req.query as { query: string };
        const { UserID }: any = req.query;
        const parsedDate = new Date(query);
        const isValidDate = isValid(parsedDate);
        let dateQuery;
        if (isValidDate) {
            const nextDay = addDays(parsedDate, 1);
            dateQuery = {
                gte: startOfDay(parsedDate),
                lt: startOfDay(nextDay),
            };
        }

        // Search conditions for SMSManagement
        const smsSearchConditions = {
            OR: [
                { Sender: { contains: query } },
                { Tel: { contains: query } },
                { Result: { contains: query } },
                { Contact: { contains: query } },
                { Option: { contains: query } },
                { Description: { contains: query } },
                { ScheduleDate: dateQuery },
            ],
        };

        // Search for SMSManagement data
        const smsSearchResults = await prisma.sMSManagement.findMany({
            where: {
                AND: [smsSearchConditions, { UserID: UserID }],
            },
            orderBy: { CreatedAt: 'desc' },
        });

        // Combine and send the results
        res.status(200).json({ smsResults: smsSearchResults });
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const searchSMSUser: RequestHandler = async (req, res) => {
    try {
        const { query } = req.query as { query: string };
        // const dateQuery = startOfDay(addDays(new Date(query), +1));

        const parsedDate = new Date(query);
        const isValidDate = isValid(parsedDate);
        let dateQuery;
        if (isValidDate) {
            const nextDay = addDays(parsedDate, 1);
            dateQuery = {
                gte: startOfDay(parsedDate),
                lt: startOfDay(nextDay),
            };
        }

        // Search conditions for UserManagement
        const userSearchConditions = {
            OR: [
                { Username: { contains: query } },
                { Userlevel: { contains: query } },
                { Email: { contains: query.toLowerCase() } },
                { Tel: { contains: query } },
                { Statused: query.toLowerCase() === 'true' },
                { Title: { contains: query } },
                { Firstname: { contains: query.toLowerCase() } },
                { Lastname: { contains: query.toLowerCase() } },
                { Abbreviatename: { contains: query.toLowerCase() } },
                { Effectivedate: dateQuery },
                { ScheduleDate: dateQuery },
            ],
        };

        const userSearchResults = await prisma.userManagement.findMany({
            where: userSearchConditions,
            orderBy: { CreatedAt: 'desc' },
        });

        const userIds = userSearchResults.map((user) => user.UserID);

        // Search conditions for SMSManagement
        const smsSearchConditions = {
            OR: [
                { Sender: { contains: query } },
                { Tel: { contains: query } },
                { Result: { contains: query } },
                { Contact: { contains: query } },
                { Option: { contains: query } },
                { Description: { contains: query } },
                { ScheduleDate: dateQuery },
            ],
        };
        //!
        if (userSearchResults.length === 0) {
            const { query } = req.query as { query: string };
            const parsedDate = new Date(query);
            const isValidDate = isValid(parsedDate);
            let dateQuery;
            if (isValidDate) {
                const nextDay = addDays(parsedDate, 1);
                dateQuery = {
                    gte: startOfDay(parsedDate),
                    lt: startOfDay(nextDay),
                };
            }
            // Search conditions for SMSManagement
            const smsSearchConditions = {
                OR: [
                    { Sender: { contains: query } },
                    { Tel: { contains: query } },
                    { Result: { contains: query } },
                    { Contact: { contains: query } },
                    { Option: { contains: query } },
                    { Description: { contains: query } },
                    { ScheduleDate: dateQuery },
                ],
            };

            const smsSearchResults = await prisma.sMSManagement.findMany({
                where: {
                    OR: smsSearchConditions,
                },
                orderBy: { CreatedAt: 'desc' },
                include: {
                    userManagement: {
                        select: {
                            Username: true,
                            Firstname: true,
                            Lastname: true,
                            Abbreviatename: true,
                        },
                    },
                },
            });

            res.status(200).json({ smsSearchResults: smsSearchResults });
        } else {
            const smsSearchResults = await prisma.sMSManagement.findMany({
                where: {
                    OR: [{ UserID: { in: userIds } }, smsSearchConditions],
                },
                orderBy: { CreatedAt: 'desc' },
                include: {
                    userManagement: {
                        select: {
                            Username: true,
                            Firstname: true,
                            Lastname: true,
                            Abbreviatename: true,
                        },
                    },
                },
            });
            res.status(200).json({ smsResults: smsSearchResults });
        }
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export { searchUsers, searchSMS, searchSMSUserID, searchSMSUser };
