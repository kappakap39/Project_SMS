import Joi from 'joi';
import bcrypt from 'bcrypt';
import { RequestHandler } from 'express';
import prisma from '../lib/db';
import nodemailer from 'nodemailer';
import { addDays, startOfDay } from 'date-fns';
// import * as otpGenerator from 'otp-generator';

const searchUsers: RequestHandler = async (req, res) => {
    try {
        const { query } = req.query as { query: string };
        const dateQuery = startOfDay( addDays(new Date(query), +1));
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
            { Expireddate: { equals: dateQuery } }
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

export { searchUsers };