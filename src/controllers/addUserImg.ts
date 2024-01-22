import Joi from 'joi';
import bcrypt from 'bcrypt';
import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

//!ADD Users to Img
const addUserProfile: RequestHandler = async (req, res) => {
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
        Statused: Joi.boolean(),

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
            Statused: validatedData.Statused,
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

export { addUserProfile };
