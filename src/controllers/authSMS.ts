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

//!Get User and admin By ID
const getSMSByID: RequestHandler = async (req, res) => {
    try {
        const { SMS_ID } = req.query;
        console.log('SMS_ID: ' + SMS_ID);
        if (SMS_ID) {
            const ByID = await prisma.sMSManagement.findUnique({
                where: {
                    SMS_ID: SMS_ID as string, // ระบุเงื่อนไขการค้นหาข้อมูลที่ต้องการด้วยฟิลด์ที่เป็น unique
                },
                include: {
                    smsMessage: {
                        select: {
                            Message: true,
                        },
                    },
                },
            });
            if (!ByID) {
                return res.status(404).json({ error: 'SmsID not Sms' });
            }
            const combinedMessages = {
                ...ByID,
                combinedMessage: ByID.smsMessage.map((message) => message.Message).join(''),
            };
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

//!Get all
const getSMSWithMessages: RequestHandler = async (req, res) => {
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
            },
        });

        if (smsManagement.length === 0) {
            return res.status(404).json({ smsManagement: 'No SMS found' });
        }

        // Combine messages with the same SmsID
        const combinedMessages = smsManagement.map((sms) => {
            const messages = sms.smsMessage.map((message) => message.Message).join('');
            return { ...sms, combinedMessage: messages };
        });

        return res.json(combinedMessages);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};

const getSMSByUserID: RequestHandler = async (req, res) => {
    try {
        const { UserID }: any = req.query;

        let smsSearchResults;

        if (UserID) {
            // Search for SMSManagement data by UserID
            smsSearchResults = await prisma.sMSManagement.findMany({
                where: {
                    UserID: UserID,
                },
                orderBy: { CreatedAt: 'desc' },
            });
        } else {
            // If no UserID provided, retrieve all SMSManagement data
            smsSearchResults = await prisma.sMSManagement.findMany({
                orderBy: { CreatedAt: 'desc' },
            });
        }

        // Combine and send the results
        res.status(200).json({ smsResults: smsSearchResults });
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



export { getSMSByID, getSMSWithMessages, getSMSByUserID };
