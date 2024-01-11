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

export { handleTokenExpiration, generateOTP };
