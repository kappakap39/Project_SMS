import Joi, { any } from 'joi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { CustomHelpers } from 'joi';
import nodemailer from 'nodemailer';
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import prisma from '../lib/db';
const expirationTime = process.env.EXPIRATION_TIME;

//! ตรวจสอบ token และบันทึก log เมื่อหมดอายุ
const handleTokenExpiration = async (token: string, user: string) => {
    const tokenExists = await prisma.tokenUser.findFirst({
        where: {
            TokenValue: token,
        },
    });
    if (!tokenExists) {
        return console.log('None Token delete Login');
    }
    if (tokenExists.UserID) {
        // บันทึก LogOut โดยอัตโนมัติ
        await prisma.log_History.create({
            data: {
                UserID: user,
                TypeLogger: 'LogOut ExpirationTime',
            },
        });
        // หา token แล้วให้ทำการลบ
        await prisma.tokenUser.delete({
            where: {
                TokenID: tokenExists.TokenID,
            },
        });
    }
};

function generateOTP() {
    // สร้าง OTP 6 หลัก
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
}

function chunkArray(arr: any[], batchSize: number) {
    const result = [];
    for (let i = 0; i < arr.length; i += batchSize) {
        const batch = arr.slice(i, i + batchSize);
        result.push(batch);
    }
    return result;
}

const createEmailHtmlContent = (user: any, sms: any, message: string) => {
    return `
        <div style="background-color: #adb9bd; color: #fff; font-family: Arial, sans-serif; padding: 20px;">
            <div style="text-align: center; padding-bottom: 20px;">
                <h2 style="color: #ffcc00;">Sent Mail to ${user.Firstname} ${user.Lastname}</h2>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; padding-bottom: 10px;">
                <div style="flex-basis: 48%;">
                    <h4>Tel: ${user.Tel} or ${sms.Tel}</h4>
                    <h4>Option: ${sms.Option}</h4>
                    <h4>Result: ${sms.Result}</h4>
                    <h4>Contact: ${sms.Contact}</h4>
                </div>
                <div style="flex-basis: 48%; text-align: right;">
                    <h4>Description: ${sms.Description}</h4>
                </div>
            </div>
            <hr style="border: 1px solid #555; margin: 20px 0;">
            <div>
                <h3>Message:</h3>
                <p>${message}</p>
            </div>
        </div>
    `;
};

export { handleTokenExpiration, generateOTP, chunkArray, createEmailHtmlContent };
