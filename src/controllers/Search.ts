import Joi from 'joi';
import bcrypt from 'bcrypt';
import { RequestHandler } from 'express';
import prisma from '../lib/db';
import nodemailer from 'nodemailer';
import { addDays, isValid, startOfDay } from 'date-fns';
// import * as otpGenerator from 'otp-generator';

const searchUsers: RequestHandler = async (req, res) => {
    try {
        const { query } = req.query as { query: string };
        const parsedDate = new Date(query);
        const isValidDate = isValid(parsedDate);
        let dateQuery;
        if (isValidDate) {
            dateQuery = startOfDay(addDays(parsedDate, 1));
        }

        const searchConditions: any[] = [
            { Username: { contains: query.toLowerCase() } },
            { Userlevel: { contains: query.toLowerCase() } },
            { Email: { contains: query.toLowerCase() } },
            { Tel: { contains: query.toLowerCase() } },
            { Statused: query.toLowerCase() === 'true' },
            { Question: { contains: query.toLowerCase() } },
            { Answer: { contains: query.toLowerCase() } },
            { Title: { contains: query.toLowerCase() } },
            { Firstname: { contains: query.toLowerCase() } },
            { Lastname: { contains: query.toLowerCase() } },
            { Abbreviatename: { contains: query.toLowerCase() } },
            { CitiZenID: { contains: query.toLowerCase() } },
            { Effectivedate: { equals: dateQuery } },
            { Expireddate: { equals: dateQuery } },
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
            dateQuery = startOfDay(addDays(parsedDate, 1));
        }

        // Search conditions for SMSManagement
        const smsSearchConditions = {
            OR: [
                { Sender: { contains: query.toLowerCase() } },
                { Tel: { contains: query.toLowerCase() } },
                { Result: { contains: query.toLowerCase() } },
                { Contact: { contains: query.toLowerCase() } },
                { Option: { contains: query.toLowerCase() } },
                { Description: { contains: query.toLowerCase() } },
                { ScheduleDate: { equals: dateQuery } }
            ]
        };

        // Search for SMSManagement data
        const smsSearchResults = await prisma.sMSManagement.findMany({
            where: smsSearchConditions,
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

        // Combine and send the results
        res.status(200).json({ smsResults: smsSearchResults });
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const searchSMSUserID: RequestHandler = async (req, res) => {
    try {
        const { query } = req.query as { query: string };
        const { UserID } : any = req.query ;
        const parsedDate = new Date(query);
        const isValidDate = isValid(parsedDate);
        let dateQuery;
        if (isValidDate) {
            dateQuery = startOfDay(addDays(parsedDate, 1));
        }

        // Search conditions for SMSManagement
        const smsSearchConditions = {
            OR: [
                { Sender: { contains: query.toLowerCase() } },
                { Tel: { contains: query.toLowerCase() } },
                { Result: { contains: query.toLowerCase() } },
                { Contact: { contains: query.toLowerCase() } },
                { Option: { contains: query.toLowerCase() } },
                { Description: { contains: query.toLowerCase() } },
                { ScheduleDate: { equals: dateQuery } }
            ]
        };

        
        // Search for SMSManagement data
        const smsSearchResults = await prisma.sMSManagement.findMany({
            where: {
                AND: [
                    smsSearchConditions,
                    { UserID: UserID }
                ]
            },
            orderBy: { CreatedAt: 'desc' }
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
            dateQuery = startOfDay(addDays(parsedDate, 1));
        }

        // Search conditions for UserManagement
        const userSearchConditions = {
            OR: [
                { Username: { contains: query.toLowerCase() } },
                { Userlevel: { contains: query.toLowerCase() } },
                { Email: { contains: query.toLowerCase() } },
                { Tel: { contains: query.toLowerCase() } },
                { Statused: query.toLowerCase() === 'true' },
                { Title: { contains: query.toLowerCase() } },
                { Firstname: { contains: query.toLowerCase() } },
                { Lastname: { contains: query.toLowerCase() } },
                { Abbreviatename: { contains: query.toLowerCase() } },
                { Effectivedate: { equals: dateQuery } },
                { Expireddate: { equals: dateQuery } },
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
                { Sender: { contains: query.toLowerCase() } },
                { Tel: { contains: query.toLowerCase() } },
                { Result: { contains: query.toLowerCase() } },
                { Contact: { contains: query.toLowerCase() } },
                { Option: { contains: query.toLowerCase() } },
                { Description: { contains: query.toLowerCase() } },
                { ScheduleDate: { equals: dateQuery } },
            ],
        };
        //!
        if (userSearchResults.length === 0) {

            const { query } = req.query as { query: string };
            const parsedDate = new Date(query);
            const isValidDate = isValid(parsedDate);
            let dateQuery;
            if (isValidDate) {
                dateQuery = startOfDay(addDays(parsedDate, 1));
            }
            // Search conditions for SMSManagement
            const smsSearchConditions = {
                OR: [
                    { Sender: { contains: query.toLowerCase() } },
                    { Tel: { contains: query.toLowerCase() } },
                    { Result: { contains: query.toLowerCase() } },
                    { Contact: { contains: query.toLowerCase() } },
                    { Option: { contains: query.toLowerCase() } },
                    { Description: { contains: query.toLowerCase() } },
                    { ScheduleDate: { equals: dateQuery } },
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
            // res.status(200).json({ userResults: userSearchResults, smsResults: smsSearchResults });
        }
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



export { searchUsers, searchSMS, searchSMSUserID, searchSMSUser, };
