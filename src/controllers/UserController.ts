/* eslint-disable @typescript-eslint/no-unused-vars */
import Joi, { equal } from 'joi';
import bcrypt from 'bcrypt';
import { RequestHandler } from 'express';
import prisma from '../lib/db';
import fs from 'fs';
import { generateFileKey } from '../Utils/Upload';
import jwt from 'jsonwebtoken';

const getUser: RequestHandler = async (req, res) => {
    const users = await prisma.userManagement.findMany({
        orderBy: {
            CreatedAt: 'desc',
        },
    });
    return res.json(users);
};

const getUserByID: RequestHandler = async (req, res) => {
    const query: any = req.query;
    console.log('query', query);
    const users = await prisma.userManagement.findFirst({
        where: {
            UserID: query.query,
        },
    });
    return res.json(users);
};
const GetUserToken: RequestHandler = async (req, res) => {
    const SECRET_KEY = process.env.SECRET_KEY || 'default_secret_key';

    // Extract the 'token' query parameter from req.query and ensure it's a string
    const TokenValue = req.query.TokenValue as string | undefined;

    if (!TokenValue) {
        return res.status(403).json({ error: 'Token not found' });
    }

    // ให้ถือว่า Token ถูกต้องเพื่อให้ได้ decodedToken
    let decodedToken;
    try {
        decodedToken = jwt.verify(TokenValue, SECRET_KEY) as { UserID: string };
    } catch (error) {
        return res.status(403).json({ error: 'Invalid Token' });
    }

    // ตรวจสอบความถูกต้องของ token ที่ค้นหาได้
    const tokenuser = await prisma.tokenUser.findFirst({
        where: {
            TokenValue: TokenValue,
        },
    });

    if (!tokenuser) {
        return res.status(403).json({ error: 'Invalid Token' });
    }

    console.log('query', decodedToken.UserID);

    const users = await prisma.userManagement.findFirst({
        where: {
            UserID: decodedToken.UserID,
        },
    });

    return res.json(users);
};

const addUser: RequestHandler = async (req, res) => {
    const body = req.body;

    // create schema object
    const schema = Joi.object({
        Username: Joi.string().min(1).max(255).required(),
        Password: Joi.string().min(1).max(255).required(),
        Userlevel: Joi.string().min(1).max(255),
        EffectiveDate: Joi.date().iso(),
        ExpiredDate: Joi.date().iso(),
        Question: Joi.string().min(1).max(255).required(),
        Answer: Joi.string().min(1).max(255).required(),
        Statused: Joi.boolean().required(),
        Title: Joi.string().min(1).max(55).required(),
        Firstname: Joi.string().min(1).max(255).required(),
        Lastname: Joi.string().min(1).max(255).required(),
        Abbreviatename: Joi.string().min(1).max(255).required(),
        Email: Joi.string().min(1).max(255).required(),
        Tel: Joi.string().min(1).max(10).required(),
        CitiZenID: Joi.string().min(1).max(13).required(),
        // Picture: Joi.string().min(1).max(255).required(),
    });

    // schema options
    const options = {
        abortEarly: false, // include all errors
        allowUnknown: true, // ignore unknown props
        stripUnknown: true, // remove unknown props
    };

    // validate request body against schema
    const { error } = schema.validate(body, options);

    if (error) {
        return res.status(422).json({
            status: 422,
            message: 'Unprocessable Entity',
            data: error.details,
        });
    }

    const duplicateUser = await prisma.userManagement.findMany({
        where: {
            Email: body.Email,
        },
    });

    if (duplicateUser && duplicateUser.length > 0) {
        return res.status(422).json({
            status: 422,
            message: 'Username or email is duplicate in database.',
            data: {
                Username: body.Username,
                Email: body.Email,
            },
        });
    }

    // เข้ารหัสรหัสผ่านก่อนบันทึก
    const hashedPassword = await bcrypt.hash(body.Password, 10);

    const payload: any = {
        Username: body.Username,
        Password: hashedPassword,
        Userlevel: body.Userlevel,
        Effectivedate: new Date(body.Effectivedate),
        Expireddate: new Date(body.Expireddate),
        Question: body.Question,
        Answer: body.Answer,
        Statused: body.Statused,
        Title: body.Title,
        Firstname: body.Firstname,
        Lastname: body.Lastname,
        Abbreviatename: body.Abbreviatename,
        Email: body.Email,
        Tel: body.Tel,
        CitiZenID: body.CitiZenID,
        Picture: body.Picture,
    };

    const user = await prisma.userManagement.create({
        data: payload,
    });

    return res.status(201).json(user);
};

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

    const identifer = await prisma.userManagement.findFirst({
        where: {
            UserID: body.UserID,
        },
    });

    if (identifer === null || identifer === undefined) {
        return res.status(422).json({
            status: 422,
            message: 'User not found',
        });
    }

    const payload: any = {};
    // const hashedPassword = await bcrypt.hash(body.Password, 10);

    if (body.Password) {
        const hashedPassword = await bcrypt.hash(body.Password, 10);
        payload['Password'] = hashedPassword;
    }

    if (body.Username) {
        payload['Username'] = body.Username;
    }

    // if (body.Password) {
    //     payload['Password'] = hashedPassword;
    // }

    if (body.Userlevel) {
        payload['Userlevel'] = body.Userlevel;
    }

    if (body.Effectivedate) {
        payload['Effectivedate'] = new Date(body.Effectivedate);
    }

    if (body.Expireddate) {
        payload['Expireddate'] = new Date(body.Expireddate);
    }

    if (body.Question) {
        payload['Question'] = body.Question;
    }

    if (body.Answer) {
        payload['Answer'] = body.Answer;
    }

    if (body.Statused !== undefined) {
        payload['Statused'] = body.Statused;
    }

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

    // if (body.Picture) {
    //     payload['Picture'] = body.Picture;
    // }

    const update = await prisma.userManagement.update({
        where: {
            UserID: body.UserID,
        },
        data: payload,
    });

    return res.json(update);
};

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

    const identifer = await prisma.userManagement.findFirst({
        where: {
            UserID: query.UserID,
        },
    });

    if (identifer === null || identifer === undefined) {
        return res.status(422).json({
            status: 422,
            message: 'User not found',
        });
    }

    const deleteUser = await prisma.userManagement.delete({
        where: {
            UserID: query.UserID,
        },
    });
    return res.json(deleteUser);
};

const addProfileUser: RequestHandler = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const file = req.file;
        // Extracting text data
        const {
            Username,
            Password,
            Userlevel,
            Effectivedate,
            Expireddate,
            Question,
            Answer,
            Statused,
            Title,
            Firstname,
            Lastname,
            Abbreviatename,
            Email,
            Tel,
            CitiZenID,
        } = req.body;
        // return res.status(201).json({
        //     body : req.body,
        //     file : req.file
        // });

        const user = {
            Username: Username,
            Password: Password,
            Userlevel: Userlevel,
            Effectivedate: Effectivedate,
            Expireddate: Expireddate,
            Question: Question,
            Answer: Answer,
            Statused: Statused,
            Title: Title,
            Firstname: Firstname,
            Lastname: Lastname,
            Abbreviatename: Abbreviatename,
            Email: Email,
            Tel: Tel,
            CitiZenID: CitiZenID,

            // If you have a 'picture' property in your User model, you can assign it like this:
            picture: file.filename,
        };

        const UserManagement = await prisma.userManagement.create({
            data: user,
        });

        // Extracting file data
        const uploadedFile = {
            OriginalName: file.originalname,
            Mimetype: file.mimetype,
            FileName: file.filename,
            FilePath: file.path,
            FileSize: file.size.toString(),
            FileKey: generateFileKey(),
            Ref_ID: UserManagement.UserID,
        };

        // บันทึกข้อมูลลงในฐานข้อมูล
        const createdFile = await prisma.allFile.create({
            data: uploadedFile,
        });
        // ตรวจสอบว่าข้อมูลถูกสร้างในฐานข้อมูลหรือไม่
        if (!createdFile) {
            console.log('File was not saved to the database');
            return res.status(500).json({ success: false, message: 'File was not saved to the database' });
        }
        if (!UserManagement) {
            console.log('UserManagement was not saved to the database');
            return res.status(500).json({ success: false, message: 'UserManagement was not saved to the database' });
        }
        // ส่ง JSON response แจ้งให้ทราบว่าไฟล์ถูกอัปโหลดสำเร็จ
        return res.status(200).json({ success: true, message: 'File and UserManagement uploaded successfully', uploadedFile, UserManagement });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export { getUser, addUser, updateUser, deleteUser, getUserByID, GetUserToken, addProfileUser };
