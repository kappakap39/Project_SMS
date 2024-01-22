import { RequestHandler } from 'express';
import Queue from 'bull';

const gettestbull: RequestHandler = async (req, res) => {
    try {
        // สร้างคิว
        const myQueue = new Queue('my bomb');

        // เพิ่มงานลงในคิว
        myQueue.add({ message: 'Test Bull! ' });
        myQueue.add({ message: 'Queue!' });

        // กำหนดวิธีประมวลผลงาน
        myQueue.process(async (job) => {
            console.log(`Processing job with data: ${JSON.stringify(job.data)}`);
            // ทำงานอะไรสักอย่าง...
            return new Promise((resolve) => {
                setTimeout(() => {
                    console.log(`Job completed for data: ${JSON.stringify(job.data)}`);
                    resolve();
                }, 2000);
            });
        });

        return res.status(200).json({ myQueue: myQueue });
    } catch (error) {
        console.error('Error in gettestbull:', error);
        res.status(500).json({ error: 'Error in gettestbull' });
    }
};

const getbullsent: RequestHandler = async (req, res) => {
    try {
        // สร้างคิว
        const myQueue = new Queue('my bomb');

        const addedJobs = [];

        // เพิ่มงานลงในคิว
        myQueue.add({ message: 'Test Bull! ' });
        myQueue.add({ message: 'Queue!' });
        addedJobs.push({ message: 'Test Bull! ' });
        addedJobs.push({ message: 'Queue!' });

        // กำหนดวิธีประมวลผลงาน
        myQueue.process(async (job) => {
            console.log(`Processing job with data: ${JSON.stringify(job.data)}`);
            // ทำงานอะไรสักอย่าง...
            return new Promise((resolve) => {
                setTimeout(() => {
                    console.log(`Job completed for data: ${JSON.stringify(job.data)}`);
                    resolve();
                }, 2000);
            });
        });

        return res.status(200).json({
            myQueue: myQueue,
            addedJobs: addedJobs,
            explanation: 'รายการนี้แสดงข้อมูลเกี่ยวกับคิวและงานที่ถูกเพิ่มลงในคิว',
        });
    } catch (error) {
        console.error('Error in gettestbull:', error);
        res.status(500).json({ error: 'Error in gettestbull' });
    }
};



export { gettestbull, getbullsent };
