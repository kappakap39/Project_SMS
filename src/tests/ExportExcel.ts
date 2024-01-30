/* eslint-disable @typescript-eslint/no-unused-vars */
import ExcelJS, { ValueType } from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { Response, Request } from 'express';
import prisma from '../lib/db';

// Function to check if a file exists
const fileExists = async (filePath: string): Promise<boolean> => {
    try {
        await fs.access(filePath);
        return true;
    } catch (error) {
        return false;
    }
};

// ฟังก์ชันสร้างไฟล์ Excel
const exportExcelFile = async (data: any[], sheetName: string, outputFile: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.properties.defaultRowHeight = 30;
    console.log("data: " , data);
    // ตั้งค่าหัวตารางด้วยขอบสีดำและพื้นหลังสีน้ำเงินเฉพาะที่มีข้อมูล
    const headerRow = worksheet.getRow(1);

    // ตั้งค่าจำนวนแถว
    headerRow.getCell(14);
    // ตั้งค่าพื้นหลังสีน้ำเงิน และ ตั้งค่าสีของตัวอักษรในแต่ละเซลล์
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '000080' }, // พื้นหลังสีน้ำเงิน
        };
        cell.font = {
            color: { argb: 'FFFFFF' }, // สีขาว
        };
    });

    // ตั้งค่าฟอนท์สีขาว
    headerRow.font = {
        name: 'normal',
        family: 6,
        size: 12,
        bold: true,
        color: { argb: 'FFFFFFFF' }, // สีขาว
    };

    worksheet.columns = [
        {
            header: 'SMS_ID',
            key: 'SMS_ID',
            width: 35,
        },
        {
            header: 'UserID',
            key: 'UserID',
            width: 35,
        },
        {
            header: 'DateLog',
            key: 'DateLog',
            width: 10,
        },
        {
            header: 'TypeLogger',
            key: 'TypeLogger',
            width: 10,
        },
        {
            header: 'Sender',
            key: 'Sender',
            width: 15,
        },
        {
            header: 'Tel',
            key: 'Tel',
            width: 25,
        },
        {
            header: 'Option',
            key: 'Option',
            width: 8,
        },
        {
            header: 'ScheduleDate',
            key: 'ScheduleDate',
            width: 10,
        },
        {
            header: 'Contact',
            key: 'Contact',
            width: 10,
        },
        {
            header: 'Result',
            key: 'Result',
            width: 10,
        },
        {
            header: 'Description',
            key: 'Description',
            width: 10,
        },
        {
            header: 'CreatedAt',
            key: 'CreatedAt',
            width: 10,
        },
        {
            header: 'UpdatedAt',
            key: 'UpdatedAt',
            width: 10,
        },
        {
            header: 'combinedMessage',
            key: 'combinedMessage',
            width: 150,
        },
    ];

    data?.map((item: any) => {
        worksheet.addRow({
            SMS_ID: item.SMS_ID,
            UserID: item.UserID,
            DateLog: item.DateLog,
            TypeLogger: item.TypeLogger,
            Sender: item.Sender,
            Tel: item.Tel,
            Option: item.Option,
            ScheduleDate: item.ScheduleDate,
            Contact: item.Contact,
            Result: item.Result,
            Description: item.Description,
            CreatedAt: item.CreatedAt,
            UpdatedAt: item.UpdatedAt,
            combinedMessage: item.combinedMessage,
        });
    });

    try {
        // ระบุที่เก็บไฟล์ Excel
        const outputPath = path.join('./assets/Import');
        const baseFileName = path.basename(outputFile, path.extname(outputFile));
        const extension = path.extname(outputFile);

        let counter = 0;
        let finalFileName = outputFile;

        while (await fileExists(path.join(outputPath, finalFileName))) {
            counter++;
            finalFileName = `${baseFileName}(${counter})${extension}`;
        }

        // บันทึกไฟล์ Excel
        const buffer: Buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
        await fs.writeFile(path.join(outputPath, finalFileName), buffer);

        // แสดงข้อความบันทึกไฟล์สำเร็จ
        console.log(`ไฟล์ Excel ถูกสร้างและบันทึกเรียบร้อยแล้ว (${finalFileName})`);
        return { success: true, finalFileName };
    } catch (error: any) {
        console.error('เกิดข้อผิดพลาดในการสร้างและบันทึกไฟล์ Excel:', error);
        return { success: false, error: error.message, finalFileName: undefined };
    }
};

const createAndSaveExcelFile = async (req: Request, res: Response) => {
    const { SMS_ID }: { SMS_ID: any[] } = req.body;
    const sheetName = 'SMSManagement';
    const outputFile = 'SMS_Management.xlsx';

    try {
        // สร้างไฟล์ Excel
        const dataRows = await prisma.sMSManagement.findMany({
            where: {
                SMS_ID: {
                    in: SMS_ID.map((id) => id as string),
                },
            },
            include: {
                smsMessage: {
                    select: {
                        Message: true,
                        SMS_ID: true, // Add SMS_ID to select
                    },
                },
                log_Sent: {
                    select: {
                        TypeLogger: true,
                        DateLog: true,
                    },
                },
            },
        });

        if (!dataRows || dataRows.length === 0) {
            return res.status(404).json({ error: 'No matching SMS found' });
        }

        // Group messages by SMS_ID and concatenate them
        const groupedMessages = new Map<string, string>();
        dataRows.forEach((row) => {
            row.smsMessage.forEach((message) => {
                const { SMS_ID, Message } = message;
                if (SMS_ID && Message) {
                    const existingMessage = groupedMessages.get(SMS_ID) || '';
                    groupedMessages.set(SMS_ID, `${existingMessage} ${Message}`);
                }
            });
        });

        // Create a new array with the desired structure
        const newArray = Array.from(groupedMessages.entries()).map(([SMS_ID, combinedMessage]) => {
            const matchingRow = dataRows.find((row) => row.SMS_ID === SMS_ID);
            return {
                SMS_ID,
                combinedMessage,
                TypeLogger: matchingRow?.log_Sent[0]?.TypeLogger || null,
                DateLog: matchingRow?.log_Sent[0]?.DateLog || null,
                UserID: matchingRow?.UserID,
                Sender: matchingRow?.Sender,
                Tel: matchingRow?.Tel,
                Result: matchingRow?.Result,
                Contact: matchingRow?.Contact,
                ScheduleDate: matchingRow?.ScheduleDate,
                Option: matchingRow?.Option,
                Description: matchingRow?.Description,
                CreatedAt: matchingRow?.CreatedAt,
                UpdatedAt: matchingRow?.UpdatedAt,
            };
        });

        try {
            // สร้างไฟล์ Excel
            const result = await exportExcelFile(newArray, sheetName, outputFile);
            if (result.success) {
                // ส่ง JSON response กลับ
                return res.status(200).json({
                    message: 'ไฟล์ Excel ถูกสร้างและบันทึกเรียบร้อยแล้ว',
                    finalFileName: result.finalFileName,
                });
            } else {
                // ส่ง JSON response พร้อมข้อความผิดพลาด
                return res.status(500).json({ error: result.error });
            }
        } catch (error: any) {
            console.error('เกิดข้อผิดพลาดในการสร้างและบันทึกไฟล์ Excel:', error);
            return res.status(500).json({ error: error.message });
        }
        // ส่ง JSON response กลับ
        // return res.status(200).json({
        //     message: 'ไฟล์ Excel ที่จะบันทึก',
        //     newArray,
        // });
    } catch (error: any) {
        console.error('เกิดข้อผิดพลาดในการสร้างและบันทึกไฟล์ Excel:', error);
        return res.status(500).json({ error: error.message });
    }
};

//! ฟังก์ชันสร้างและบันทึกไฟล์ Excel
// const createAndSaveExcelFile = async (req: Request, res: Response) => {
//     const dataRows = req.body.dataRows;
//     //     const sheetName = req.body.sheetName || 'sheetName'; // Default to 'sheetName' if not provided
//     //     const outputFile = req.body.outputFile || 'output.xlsx'; // Default to 'output.xlsx' if not provided
//     const sheetName = 'SMSManagement';
//     const outputFile = 'SMS_Management.xlsx';

//     try {
//         // สร้างไฟล์ Excel
//         const result = await exportExcelFile(dataRows, sheetName, outputFile);
//         if (result.success) {
//             // ส่ง JSON response กลับ
//             return res
//                 .status(200)
//                 .json({ message: 'ไฟล์ Excel ถูกสร้างและบันทึกเรียบร้อยแล้ว', finalFileName: result.finalFileName });
//         } else {
//             // ส่ง JSON response พร้อมข้อความผิดพลาด
//             return res.status(500).json({ error: result.error });
//         }
//     } catch (error: any) {
//         console.error('เกิดข้อผิดพลาดในการสร้างและบันทึกไฟล์ Excel:', error);
//         return res.status(500).json({ error: error.message });
//     }
// };

// ฟังก์ชันสร้างไฟล์ Excel
// const exportExcelFile = async (data: any[], sheetName: string, outputFile: string) => {
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet( sheetName );
//     // const worksheet = workbook.addWorksheet("sheetName");
//     worksheet.properties.defaultRowHeight = 25;

//     worksheet.columns = [
//         {
//             header: 'id',
//             key: 'id',
//             width: 15,
//         },
//         {
//             header: 'Title',
//             key: 'Title',
//             width: 15,
//         },
//         {
//             header: 'Message',
//             key: 'Message',
//             width: 15,
//         },
//     ];

//     data?.map((product: any) => {
//         worksheet.addRow({
//             id: product?.id,
//             Title: product?.Title,
//             Message: product?.Message,
//         });
//     });
//     try {
//         // ระบุที่เก็บไฟล์ Excel
//         const outputPath = path.join('./assets/Import');

//         // ตรวจสอบว่าโฟลเดอร์ uploads มีอยู่หรือไม่
//         try {
//             await fs.access(outputPath);
//         } catch (error) {
//             // ถ้าไม่มีให้สร้างโฟลเดอร์ uploads
//             await fs.mkdir(outputPath, { recursive: true });
//         }

//         // บันทึกไฟล์ Excel
//         const buffer: Buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
//         await fs.writeFile(path.join(outputPath, outputPath), buffer); // Use the provided outputFile
//         // await fs.writeFile(path.join(outputPath, "outputFile.xlsx"), buffer);

//         // แสดงข้อความบันทึกไฟล์สำเร็จ
//         console.log('ไฟล์ Excel ถูกสร้างและบันทึกเรียบร้อยแล้ว');
//         return { success: true };
//     } catch (error: any) {
//         console.error('เกิดข้อผิดพลาดในการสร้างและบันทึกไฟล์ Excel:', error);
//         return { success: false, error: error.message };
//     }
// };

// // ฟังก์ชันสร้างและบันทึกไฟล์ Excel
// const createAndSaveExcelFile = async (req: Request, res: Response) => {
//     const dataRows = req.body.dataRows;
//     const sheetName = req.body.sheetName || 'sheetName'; // Default to 'sheetName' if not provided
//     const outputFile = req.body.outputFile || 'output.xlsx'; // Default to 'output.xlsx' if not provided

//     try {
//         // สร้างไฟล์ Excel
//         const result = await exportExcelFile(dataRows, sheetName, outputFile);
//         if (result.success) {
//             // ส่ง JSON response กลับ
//             return res.status(200).json({ message: 'ไฟล์ Excel ถูกสร้างและบันทึกเรียบร้อยแล้ว' });
//         } else {
//             // ส่ง JSON response พร้อมข้อความผิดพลาด
//             return res.status(500).json({ error: result.error });
//         }
//     } catch (error: any) {
//         console.error('เกิดข้อผิดพลาดในการสร้างและบันทึกไฟล์ Excel:', error);
//         return res.status(500).json({ error: error.message });
//     }
// };

export { createAndSaveExcelFile };
