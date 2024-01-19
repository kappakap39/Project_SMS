import { RequestHandler } from 'express';
import Bull from 'bull';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function doSomething(_data: any): void | PromiseLike<void> {
    throw new Error('Function not implemented.');
}


const gettestbull: RequestHandler = async (req, res) => {
    try {
        // สร้างคิว
        const myFirstQueue = new Bull('my-first-queue');

        myFirstQueue.process(async (job) => {
            return doSomething(job.data);
        });
        // ส่ง response หลังจากที่ทุกอย่างเสร็จสิ้น
        res.status(200).json({ message: 'Bull jobs added and processed successfully.', myFirstQueue });
    } catch (error: any) {
        // หรือให้ชนิดข้อมูลเป็นที่เหมาะสม
        console.error('Error in gettestbull:', error);
        res.status(500).json({ error: 'Error in gettestbull', additionalDetails: error.message });
    }
};

export { gettestbull };

