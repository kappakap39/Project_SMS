import Joi from 'joi';
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
const fs = require('fs');

require('dotenv').config();
const expirationTime = process.env.EXPIRATION_TIME;

const getUser: RequestHandler = async (req, res) => {
    const prisma = new PrismaClient(); // สร้าง PrismaClient instance
    try {
        const UserOrAdmin = await prisma.userManagement.findMany({
            orderBy: {
                CreatedAt: 'desc', // Order by CreatedAt field in descending order (newest first)
            },
        }); // ดึงข้อมูลผู้ใช้หรือผู้ดูแลระบบจากฐานข้อมูล
        if (UserOrAdmin.length === 0) {
            // ถ้าไม่มีข้อมูลผู้ใช้หรือผู้ดูแลระบบ
            return res.status(404).json({ users: 'None users' }); // ส่ง HTTP status 404 พร้อมข้อความว่า "None users"
        }
        return res.json(UserOrAdmin); // ส่งข้อมูลผู้ใช้หรือผู้ดูแลระบบกลับไป
    } catch (error) {
        console.error('Error:', error); // แสดงข้อผิดพลาดในกรณีที่เกิดข้อผิดพลาด
        return res.status(500).json({ error: 'Internal Server Error' }); // ส่ง HTTP status 500 พร้อมข้อความว่า "Internal Server Error"
    } finally {
        await prisma.$disconnect(); // ปิดการเชื่อมต่อกับฐานข้อมูล PrismaClient
    }
};

//!Get User and admin By ID
const getUserByID: RequestHandler = async (req, res) => {
    const prisma = new PrismaClient();

    try {
        const { UserID } = req.query;
        console.log('UserID: ' + UserID);
        if (UserID) {
            const ByID = await prisma.userManagement.findUnique({
                where: {
                    UserID: UserID as string, // ระบุเงื่อนไขการค้นหาข้อมูลที่ต้องการด้วยฟิลด์ที่เป็น unique
                },
            });
            if (!ByID) {
                return res.status(404).json({ error: 'IDUserOrAdmin not User' });
            }
            return res.json(ByID);
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

//!ADD Users
const addUser: RequestHandler = async (req, res) => {
    // สร้าง schema object
    const schema = Joi.object({
        //!Tab1
        Username: Joi.string().min(1).max(255).required(),
        Password: Joi.string().min(1).max(255).required(),
        Userlevel: Joi.string().min(1).max(255),
        Effectivedate: Joi.date().required(),
        Expireddate: Joi.date().required(),
        Question: Joi.string().max(255),
        Answer: Joi.string().max(255),
        Status: Joi.boolean(),

        //!Tab2
        Title: Joi.string().max(55).required(),
        Firstname: Joi.string().max(255).required(),
        Lastname: Joi.string().max(255).required(),
        Abbreviatename: Joi.string().max(255).required(),
        Email: Joi.string().max(255).required(),
        Tel: Joi.string().max(10).required(),
        CitiZenID: Joi.string().max(13).required(),
        Picture: Joi.string().max(255),

        //!Tab3
        EmpNo: Joi.string(),
        DeptCode: Joi.string(),
        CompanyCode: Joi.string(),
        OperationCode: Joi.string(),
        SubOperationCode: Joi.string(),
        CentralRefNo: Joi.string(),
        BusinessType: Joi.string(),
        DocIssueUnit: Joi.string(),
        LockLocation: Joi.string(),
        DeptFlag: Joi.string(),
        GrpSubOperation: Joi.string(),
        GrpOperationCode: Joi.string(),

        //!Tab3
        DefaultLanguage: Joi.string(),
        FontFamily: Joi.string(),
        FontSize: Joi.number(),
        DateFormat: Joi.string(),
        TimeZone: Joi.string(),
        AmountFormat: Joi.number(),
    });

    // ตัวเลือกของ schema
    const options = {
        abortEarly: false, // รวมข้อผิดพลาดทั้งหมด
        allowUnknown: true, // ละเว้น prop ที่ไม่รู้จัก
        stripUnknown: true, // ลบ prop ที่ไม่รู้จัก
    };

    // ตรวจสอบ request body ตาม schema
    const { error, value: validatedData } = schema.validate(req.body, options);

    if (error) {
        return res.status(422).json({
            status: 422,
            message: 'Unprocessable Entity',
            data: error.details,
        });
    }

    const prisma = new PrismaClient();

    try {
        const duplicateUser = await prisma.userManagement.findMany({
            where: {
                OR: [{ Email: { contains: validatedData.Email } }],
            },
        });

        if (duplicateUser && duplicateUser.length > 0) {
            return res.status(422).json({
                status: 422,
                message: 'Email is duplicate in the database.',
                data: {
                    Email: validatedData.Email,
                },
            });
        }

        // ใช้ Bcrypt เพื่อแฮชรหัสผ่าน
        const hashedPassword = await bcrypt.hash(validatedData.Password, 10);

        const payloadUser: any = {
            //!Tab1
            Username: validatedData.Username,
            Password: hashedPassword,
            Userlevel: validatedData.Userlevel,
            Effectivedate: validatedData.Effectivedate,
            Expireddate: validatedData.Expireddate,
            Question: validatedData.Question,
            Answer: validatedData.Answer,
            Status: validatedData.Status,
            //!Tab2
            Title: validatedData.Title,
            Firstname: validatedData.Firstname,
            Lastname: validatedData.Lastname,
            Abbreviatename: validatedData.Abbreviatename,
            Email: validatedData.Email,
            Tel: validatedData.Tel,
            CitiZenID: validatedData.CitiZenID,
            // Picture: validatedData.Picture,
            //!Tab3
            // EmpNo: validatedData.EmpNo,
            // DeptCode: validatedData.DeptCode,
            // CompanyCode: validatedData.CompanyCode,
            // OperationCode: validatedData.OperationCode,
            // SubOperationCode: validatedData.SubOperationCode,
            // CentralRefNo: validatedData.CentralRefNo,
            // BusinessType: validatedData.BusinessType,
            // DocIssueUnit: validatedData.DocIssueUnit,
            // LockLocation: validatedData.LockLocation,
            // DeptFlag: validatedData.DeptFlag,
            // GrpSubOperation: validatedData.GrpSubOperation,
            // GrpOperationCode: validatedData.GrpOperationCode,
            //!Tab4
            // DefaultLanguage: validatedData.DefaultLanguage,
            // FontFamily: validatedData.FontFamily,
            // FontSize: validatedData.FontSize,
            // DateFormat: validatedData.DateFormat,
            // TimeZone: validatedData.TimeZone,
            // AmountFormat: validatedData.AmountFormat,
        };

        const UserManagement = await prisma.userManagement.create({
            data: payloadUser,
        });

        return res.status(201).json(UserManagement);
    } catch (error) {
        console.error('Error creating userOrAdmin:', error);
        return res.status(500).json({
            status: 500,
            message: 'Internal Server Error',
            data: error,
        });
    }
};

//!delete
const deleteUser: RequestHandler = async (req, res) => {
    const schema = Joi.object({
        UserID: Joi.string().uuid().required(),
    });

    const options = {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true,
    };

    const { error } = schema.validate(req.query, options);

    if (error) {
        return res.status(422).json({
            status: 422,
            message: 'Unprocessable Entity',
            data: error.details,
        });
    }

    const query: any = req.query;
    const prisma = new PrismaClient();

    return await prisma.$transaction(async function (tx) {
        const deletePeople = await tx.userManagement.delete({
            where: {
                UserID: query.UserID,
            },
        });
        return res.json(deletePeople);
    });
};

//!Update User
const updateUser: RequestHandler = async (req, res) => {
    const schema = Joi.object({
        UserID: Joi.string().uuid().required(),
    });

    const options = {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true,
    };

    const { error } = schema.validate(req.body, options);

    if (error) {
        return res.status(422).json({
            status: 422,
            message: 'Unprocessable Entity',
            data: error.details,
        });
    }

    const body = req.body;
    const prisma = new PrismaClient();

    return await prisma.$transaction(async function (tx) {
        const payload: any = {};

        const checkUser = await tx.userManagement.findFirst({
            where: {
                UserID: body.UserID,
            },
        });
        if (!checkUser) {
            return res.status(422).json({ error: 'checkUser not found' });
        }

        //!Tab1
        if (body.Username) {
            payload['Username'] = body.Username;
        }
        if (body.Password) {
            payload['Password'] = body.Password;
        }
        if (body.Userlevel) {
            payload['Userlevel'] = body.Userlevel;
        }
        if (body.Effectivedate) {
            payload['Effectivedate'] = body.Effectivedate;
        }
        if (body.Expireddate) {
            payload['Expireddate'] = body.Expireddate;
        }
        if (body.Question) {
            payload['Question'] = body.Question;
        }
        if (body.Answer) {
            payload['Answer'] = body.Answer;
        }
        if (body.Status) {
            payload['Status'] = body.Status;
        }

        //!Tab2
        if (body.Title) {
            payload['Title'] = body.Title;
        }
        if (body.Firstname) {
            payload['Firstname'] = body.Firstname;
        }
        if (body.Lastname) {
            payload['Lastname'] = body.Lastname;
        }
        if (body.Abbreviatename) {
            payload['Abbreviatename'] = body.Abbreviatename;
        }
        if (body.Email) {
            payload['Email'] = body.Email;
        }
        if (body.Tel) {
            payload['Tel'] = body.Tel;
        }
        if (body.CitiZenID) {
            payload['CitiZenID'] = body.CitiZenID;
        }
        if (body.Picture) {
            payload['Picture'] = body.Picture;
        }

        //!Tab3
        if (body.EmpNo) {
            payload['EmpNo'] = body.EmpNo;
        }
        if (body.DeptCode) {
            payload['DeptCode'] = body.DeptCode;
        }
        if (body.EmpNo) {
            payload['CompanyCode'] = body.CompanyCode;
        }
        if (body.EmpNo) {
            payload['OperationCode'] = body.OperationCode;
        }
        if (body.EmpNo) {
            payload['SubOperationCode'] = body.SubOperationCode;
        }
        if (body.CentralRefNo) {
            payload['CentralRefNo'] = body.CentralRefNo;
        }
        if (body.BusinessType) {
            payload['BusinessType'] = body.BusinessType;
        }
        if (body.DocIssueUnit) {
            payload['DocIssueUnit'] = body.DocIssueUnit;
        }
        if (body.LockLocation) {
            payload['LockLocation'] = body.LockLocation;
        }
        if (body.DeptFlag) {
            payload['DeptFlag'] = body.DeptFlag;
        }
        if (body.GrpSubOperation) {
            payload['GrpSubOperation'] = body.GrpSubOperation;
        }
        if (body.GrpOperationCode) {
            payload['GrpOperationCode'] = body.GrpOperationCode;
        }

        //!Tab4
        if (body.DefaultLanguage) {
            payload['DefaultLanguage'] = body.DefaultLanguage;
        }
        if (body.FontFamily) {
            payload['FontFamily'] = body.FontFamily;
        }
        if (body.FontSize) {
            payload['FontSize'] = body.FontSize;
        }
        if (body.DateFormat) {
            payload['DateFormat'] = body.DateFormat;
        }
        if (body.TimeZone) {
            payload['TimeZone'] = body.TimeZone;
        }
        if (body.AmountFormat) {
            payload['AmountFormat'] = body.AmountFormat;
        }

        const update = await tx.userManagement.update({
            where: {
                UserID: body.UserID,
            },
            data: payload,
        });

        return res.json(update);
    });
};

export { getUser, addUser, deleteUser, updateUser, getUserByID };
