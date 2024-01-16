import express, { Request, Response, NextFunction } from 'express';
import multer, { Multer } from 'multer';
import path from 'path';
import prisma from '../lib/db';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
// import {UpFile} from '../controllers/authFileController';

const storage = multer.diskStorage({
    destination: './assets/uploads',
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
});

const imageFilter = (req: any, file: any, cb: any) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload: Multer = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 150 }, // 150 MB
    fileFilter: imageFilter, // Apply the image filter
});

// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 1024 * 1024 * 150 }, // 150 MB
//   }).array('file'); // ใช้ .array('file') เพื่อรองรับการอัพโหลดหลายไฟล์

const generateFileKey = () => {
    const timestamp = Date.now().toString(36); // Convert timestamp to base36 string
    const randomString = Math.random().toString(36).substr(5,10); // Generate a random string
    return `bomb-${timestamp}-${randomString}-$`;
};


export { upload, generateFileKey };
