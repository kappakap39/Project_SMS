import Joi from 'joi';
import bcrypt from 'bcrypt';
import { RequestHandler } from 'express';
import prisma from '../lib/db';
import nodemailer from 'nodemailer';
import { addDays, startOfDay } from 'date-fns';
// import * as otpGenerator from 'otp-generator';

// กำหนดค่า nodemailer
const transport = nodemailer.createTransport({
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    auth: {
        user: '733fc6ca983083',
        pass: '0505857f096d3c',
    },
});

// const sendmail: RequestHandler = async (req, res) => {
//     const { Email } = req.body;

//     const schema = Joi.object({
//         Email: Joi.string().email().min(1).max(255).required(),
//     });

//     const optionsError = {
//         abortEarly: false, // include all errors
//         allowUnknown: true, // ignore unknown props
//         stripUnknown: true, // remove unknown props
//     };

//     const { error } = schema.validate(req.body, optionsError);

//     if (error) {
//         return res.status(422).json({
//             status: 422,
//             message: 'Unprocessable Entity',
//             data: error.details,
//         });
//     }

//     const lowercaseEmail = Email.toLowerCase();

//     const user = await prisma.userManagement.findUnique({
//         where: {
//             Email: lowercaseEmail,
//         },
//     });

//     // user not in database
//     if (!user) {
//         return res.status(404).json({ message: 'User not found in database' });
//     }

//     // const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

//     // Example: Generate a 6-digit numeric OTP
//     const otpCode: string = otpGenerator.generate(6, { digits: true, specialChars: false });

//     console.log('Generated OTP:', otpCode);

//     try {
//         if (otpCode) {
//             await transport.sendMail({
//                 from: `${user?.Email}`,
//                 to: 'bar@example.com, baz@example.com',
//                 subject: 'test Mail',
//                 text: 'test message Mail',
//                 html: `Email: ${user?.Email} <br> Name: ${user?.Lastname}<br> <b>OTP  ${otpCode}</b>`,
//             });

//             // await prisma.userManagement.update({
//             //     where: {
//             //         UserID: user.UserID,
//             //     },
//             //     data: {
//             //         Otp: otpCode,
//             //         OtpExpired: new Date(Date.now() + 10 * 60 * 1000), // หมดอายุใน 10 นาที
//             //     },
//             //     select: {
//             //         Otp: true,
//             //     },
//             // });

//             // console.log(user.Otp);

//             // return res.status(200).json(message:"ssss",user.Otp);
//             return res.status(200).json({
//                 message: 'Message sent: successfully',
//                 // Otp: user.Otp,
//             });
//         } else {
//             return res.status(401).json({ user, message: 'Message sent: fail' });
//         }
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'Internal Server Error' });
//     }
// };

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
        Picture: Joi.string().min(1).max(255).required(),
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

    // if (!body.Password) {
    //     return res.status(422).json({
    //         status: 422,
    //         message: 'Password is required',
    //     });
    // }

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

    if (body.Picture) {
        payload['Picture'] = body.Picture;
    }

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

export { getUser, addUser, updateUser, deleteUser, getUserByID, searchUsers };
