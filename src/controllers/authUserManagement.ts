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

const getUserORAdmin: RequestHandler = async (req, res) => {
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
const getUserAdminByID: RequestHandler = async (req, res) => {
    const prisma = new PrismaClient();

    try {
        const { IDUserOrAdmin } = req.query;
        console.log('IDUserOrAdmin: ' + IDUserOrAdmin);
        if(IDUserOrAdmin){
            const ByID = await prisma.userManagement.findUnique({
                where: {
                    IDUserOrAdmin: IDUserOrAdmin as string, // ระบุเงื่อนไขการค้นหาข้อมูลที่ต้องการด้วยฟิลด์ที่เป็น unique
                },
            });
            if (!ByID) {
                return res.status(404).json({ error: 'IDUserOrAdmin not User' });
            }
            return res.json(ByID);
        } else{
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
const addUserOrAdmin: RequestHandler = async (req, res) => {
    // สร้าง schema object
    const schema = Joi.object({
        //!Tab1
        UserName: Joi.string().min(1).max(255).required(),
        Password: Joi.string().min(1).max(255).required(),
        Pincode: Joi.string(),
        UserLevel: Joi.string(),
        EffectiveDate: Joi.date(),
        ExpiredDate: Joi.date(),
        InvalidPasswordCount: Joi.number(),
        SecretQuestion: Joi.string(),
        Answer: Joi.string(),
        Status: Joi.boolean(),

        //!Tab2
        Title: Joi.string(),
        FirstName: Joi.string(),
        LastName: Joi.string(),
        AbbreviateName: Joi.string(),
        Email: Joi.string(),
        Telephone: Joi.string(),
        CitiZenID: Joi.string(),
        Picture: Joi.string(),

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
        AmountFormat: Joi.number()
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
                OR: [{ Email: { contains: validatedData.Email } },],
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

        const payloadUser = {
            //!Tab1
            UserName: validatedData.UserName,
            Password: hashedPassword,
            Pincode: validatedData.Pincode,
            UserLevel: validatedData.UserLevel,
            EffectiveDate: validatedData.EffectiveDate,
            ExpiredDate: validatedData.ExpiredDate,
            InvalidPasswordCount: validatedData.InvalidPasswordCount,
            SecretQuestion: validatedData.SecretQuestion,
            Answer: validatedData.Answer,
            Status: validatedData.Status,
            //!Tab2
            Title: validatedData.Title,
            FirstName: validatedData.FirstName,
            LastName: validatedData.LastName,
            // AbbreviateName: validatedData.AbbreviateName,
            Email: validatedData.Email,
            Telephone: validatedData.Telephone,
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

        const userOrAdmin = await prisma.userManagement.create({
            data: payloadUser,
        });

        return res.status(201).json(userOrAdmin);
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
const deleteUserOrAdmin: RequestHandler = async (req, res) => {
    const schema = Joi.object({
        IDUserOrAdmin: Joi.string().uuid().required(),
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
                IDUserOrAdmin: query.IDUserOrAdmin,
            },
        });
        return res.json(deletePeople);
    });
};

//!Update User
const updateUserOrAdmin: RequestHandler = async (req, res) => {
    const schema = Joi.object({
        IDUserOrAdmin: Joi.string().uuid().required(),
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

        const checkUserAdmin = await tx.userManagement.findFirst({
            where: {
                IDUserOrAdmin: body.IDUserOrAdmin,
            },
        });
        if (!checkUserAdmin) {
            return res.status(422).json({ error: 'checkUser not found' });
        }

        //!Tab1
        if (body.UserName) {
            payload['UserName'] = body.UserName;
        }
        if (body.Password) {
            payload['Password'] = body.Password;
        }
        if (body.Pincode) {
            payload['Pincode'] = body.Pincode;
        }
        if (body.UserLevel) {
            payload['UserLevel'] = body.UserLevel;
        }
        if (body.EffectiveDate) {
            payload['EffectiveDate'] = body.EffectiveDate;
        }
        if (body.ExpiredDate) {
            payload['ExpiredDate'] = body.ExpiredDate;
        }
        if (body.InvalidPasswordCount) {
            payload['InvalidPasswordCount'] = body.InvalidPasswordCount;
        }
        if (body.SecretQuestion) {
            payload['SecretQuestion'] = body.SecretQuestion;
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
        if (body.FirstName) {
            payload['FirstName'] = body.FirstName;
        }
        if (body.LastName) {
            payload['LastName'] = body.LastName;
        }
        if (body.AbbreviateName) {
            payload['AbbreviateName'] = body.AbbreviateName;
        }
        if (body.Email) {
            payload['Email'] = body.Email;
        }
        if (body.Telephone) {
            payload['Telephone'] = body.Telephone;
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
                IDUserOrAdmin: body.IDUserOrAdmin,
            },
            data: payload,
        });

        return res.json(update);
    });
};

//! ตรวจสอบ token และบันทึก log เมื่อหมดอายุ
const handleTokenExpiration = async (token: string, userOrAdmin: string) => {
    const tokenExists = await prisma.tokenUser.findFirst({
        where: {
            TokenValue: token,
        },
    });
    if (!tokenExists) {
        return console.log('None Token delete Login');
    }
    if (tokenExists.IDUserOrAdmin) {
        // บันทึก LogOut โดยอัตโนมัติ
        await prisma.loggetsUser.create({
            data: {
                IDUserOrAdmin: userOrAdmin,
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

//! Add Token
const LoginManagement = async (req: Request, res: Response) => {
    try {
        //!start Add Token
        const { Email, Password } = req.body;

        // ตรวจสอบความถูกต้องของข้อมูลที่รับมา
        const schema = Joi.object({
            Email: Joi.string().email().min(1).max(255).required(),
            Password: Joi.string().min(1).max(255).required(),
        });

        // กำหนดตัวเลือกสำหรับการตรวจสอบข้อมูล
        const optionsError = {
            abortEarly: false, // แสดงทุกข้อผิดพลาด
            allowUnknown: true, // ละเว้น properties ที่ไม่รู้จัก
            stripUnknown: true, // ลบ properties ที่ไม่รู้จัก
        };

        // ทำการตรวจสอบข้อมูล
        const { error } = schema.validate(req.body, optionsError);

        if (error) {
            return res.status(422).json({
                status: 422,
                Message: 'Unprocessable Entity',
                data: error.details,
            });
        }

        // แปลงทุกตัวอักษรใน Email และ Password เป็นตัวพิมเล็ก
        const lowercasedEmail = Email.toLowerCase();
        // const lowercasedPassword = Password.string().toLowerCase();
        // const lowercasedEmail = Email ? Email.toLocaleLowerCase() : '';
        // const lowercasedPassword = Password ? Password.toLocaleLowerCase() : '';

        // ตรวจสอบรูปแบบของ Email โดยใช้ regular expression
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(lowercasedEmail)) {
            return res.status(403).json({ error: 'Check: Invalid email format' });
        }

        // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
        const userOrAdmin = await prisma.userManagement.findUnique({
            where: {
                Email: lowercasedEmail,
            },
        });

        if (userOrAdmin) {
            // ตรวจสอบความถูกต้องของรหัสผ่านที่ได้จากฐานข้อมูล
            const isPasswordValid = bcrypt.compareSync(Password, userOrAdmin.Password);

            if (isPasswordValid) {
                // รหัสผ่านถูกต้อง
                console.log('User authenticated successfully.');

                //! Check token user and delete token
                if (userOrAdmin.IDUserOrAdmin) {
                    // // ตรวจสอบความถูกต้องของรหัสผ่าน
                    // const passwordMatch = await bcrypt.compare(Password, user.Password);

                    // if (!passwordMatch) {
                    //     return res.status(403).json({ error: 'Password incorrect' });
                    // }

                    // // ตรวจสอบว่า Email และ Password ถูกส่งมาหรือไม่
                    // if (!lowercasedEmail || !Password) {
                    //     return res.status(403).json({ error: 'Check: Email or Password not found' });
                    // }
                    const tokenExists = await prisma.tokenUser.findFirst({
                        where: {
                            IDUserOrAdmin: userOrAdmin.IDUserOrAdmin,
                        },
                    });

                    if (!tokenExists) {
                        console.log('None user Add Token');
                        // กำหนดคีย์ลับสำหรับการสร้าง Token
                        const SECRET_KEY = process.env.SECRET_KEY || 'default_secret_key';

                        // กำหนดข้อมูลที่จะใส่ใน Token
                        const payloadUser = {
                            IDUserOrAdmin: userOrAdmin.IDUserOrAdmin,
                        };

                        // กำหนดตัวเลือกในการสร้าง Token
                        // const options = {
                        //     expiresIn: '1h',
                        // };

                        // สร้าง Token
                        const token = jwt.sign(payloadUser, SECRET_KEY, { expiresIn: expirationTime });

                        if (token) {
                            // บันทึก Token ลงในฐานข้อมูล
                            await prisma.tokenUser.create({
                                data: {
                                    TokenValue: token,
                                    IDUserOrAdmin: userOrAdmin.IDUserOrAdmin,
                                    Expiration: new Date(Date.now() + Number(expirationTime)),
                                },
                            });

                            await prisma.loggetsUser.create({
                                data: {
                                    IDUserOrAdmin: userOrAdmin.IDUserOrAdmin,
                                    TypeLogger: 'LogIn',
                                },
                            });

                            //! ตั้งเวลาในการเรียกฟังก์ชันที่ทำการบันทึก LogOut โดยอัตโนมัติ
                            setTimeout(async () => {
                                await handleTokenExpiration(token, userOrAdmin.IDUserOrAdmin); // เรียกใช้ handleTokenExpiration ที่เราเพิ่มมา
                            }, Number(expirationTime));
                        } else {
                            return res.status(402).json({ message: 'None found token' });
                        }

                        // ยืนยัน Token และดึงข้อมูลที่ถอดรหัสได้
                        let decoded = null;
                        try {
                            decoded = jwt.verify(token, SECRET_KEY);
                        } catch (err) {
                            console.log(err);
                        }
                        console.log('decoded:', decoded);
                        // ส่งข้อมูล Token และข้อมูลที่ถอดรหัสได้กลับ
                        return res.status(200).json({ Token: token, Decoded: decoded });
                    }
                    if (tokenExists.IDUserOrAdmin) {
                        //! refresh token
                        await prisma.loggetsUser.create({
                            data: {
                                IDUserOrAdmin: userOrAdmin.IDUserOrAdmin,
                                TypeLogger: 'Refresh ExpirationTime',
                            },
                        });
                        // หา token แล้วให้ทำการลบ
                        await prisma.tokenUser.delete({
                            where: {
                                TokenID: tokenExists.TokenID,
                            },
                        });
                        // กำหนดคีย์ลับสำหรับการสร้าง Token
                        const SECRET_KEY = process.env.SECRET_KEY || 'default_secret_key';

                        // กำหนดข้อมูลที่จะใส่ใน Token
                        const payloadUser = {
                            IDUserOrAdmin: userOrAdmin.IDUserOrAdmin,
                        };

                        // กำหนดตัวเลือกในการสร้าง Token
                        // const options = {
                        //     expiresIn: '1h',
                        // };

                        // สร้าง Token
                        const token = jwt.sign(payloadUser, SECRET_KEY, { expiresIn: expirationTime });

                        if (token) {
                            // บันทึก Token ลงในฐานข้อมูล
                            await prisma.tokenUser.create({
                                data: {
                                    TokenValue: token,
                                    IDUserOrAdmin: userOrAdmin.IDUserOrAdmin,
                                    Expiration: new Date(Date.now() + Number(expirationTime)),
                                },
                            });

                            await prisma.loggetsUser.create({
                                data: {
                                    IDUserOrAdmin: userOrAdmin.IDUserOrAdmin,
                                    TypeLogger: 'LogIn',
                                },
                            });

                            //! ตั้งเวลาในการเรียกฟังก์ชันที่ทำการบันทึก LogOut โดยอัตโนมัติ
                            setTimeout(async () => {
                                await handleTokenExpiration(token, userOrAdmin.IDUserOrAdmin); // เรียกใช้ handleTokenExpiration ที่เราเพิ่มมา
                            }, Number(expirationTime));
                        } else {
                            return res.status(402).json({ message: 'None found token' });
                        }

                        // ยืนยัน Token และดึงข้อมูลที่ถอดรหัสได้
                        let decoded = null;
                        try {
                            decoded = jwt.verify(token, SECRET_KEY);
                        } catch (err) {
                            console.log(err);
                        }
                        console.log('decoded:', decoded);
                        // ส่งข้อมูล Token และข้อมูลที่ถอดรหัสได้กลับ
                        return res.status(200).json({ Token: token, Decoded: decoded });
                    }
                }
            } else {
                // รหัสผ่านไม่ถูกต้อง
                return res.status(400).json({ error: 'Invalid password.' });
            }
        } else {
            // ไม่พบผู้ใช้
            return console.log('User not found.');
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        // ปิดการเชื่อมต่อกับฐานข้อมูล
        await prisma.$disconnect();
    }
};

const verifyToken = (tokenCheck: string, SECRET_KEY: string) => {
    try {
        const decoded = jwt.verify(tokenCheck, SECRET_KEY);
        return decoded;
    } catch (error) {
        console.error('Error verifying token:', error);
        return null;
    }
};

//!Delete token
const LogoutManagement = async (req: Request, res: Response) => {
    try {
        const SECRET_KEY = process.env.SECRET_KEY || 'default_secret_key';
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(403).json({ error: 'Token not found' });
        }

        // ให้ถือว่า Token ถูกต้องเพื่อให้ได้ decodedToken
        const decodedToken = verifyToken(token, SECRET_KEY) as { IDUserOrAdmin: string };

        // ตรวจสอบความถูกต้องของ token ที่ค้นหาได้
        const tokenuser = await prisma.tokenUser.findFirst({
            where: {
                TokenValue: token,
            },
        });

        if (!tokenuser) {
            return res.status(403).json({ error: 'Invalid Token' });
        }
        // ตรวจสอบความถูกต้องของ decodedToken
        if (decodedToken && decodedToken.IDUserOrAdmin) {
            // ตรวจสอบว่า UserID ตรงกับค่าที่คุณต้องการหรือไม่
            if (decodedToken.IDUserOrAdmin === tokenuser.IDUserOrAdmin) {
                // หา token แล้วให้ทำการลบ
                await prisma.tokenUser.delete({
                    where: {
                        TokenID: tokenuser.TokenID,
                    },
                });

                await prisma.loggetsUser.create({
                    data: {
                        IDUserOrAdmin: tokenuser.IDUserOrAdmin,
                        TypeLogger: 'LogOut',
                    },
                });

                // รับรองว่า Token ถูกต้องและถูกลบ
                return res.status(200).json({ success: 'Logout successfully', decodedToken });
            } else {
                return res.status(403).json({ error: 'Invalid Token User' });
            }
        } else {
            return res.status(403).json({ error: 'Invalid Token' });
        }
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

export { getUserORAdmin, addUserOrAdmin, deleteUserOrAdmin, updateUserOrAdmin, getUserAdminByID, LoginManagement, LogoutManagement };
