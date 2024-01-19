
import { RequestHandler } from 'express';
import Queue from 'bull';

const gettestbull: RequestHandler = async (req, res) => {
    try {
        // สร้างคิว
        const myQueue = new Queue('my queue');

        // เพิ่มงานลงในคิว
        myQueue.add({ message: 'text! ' });
        myQueue.add({ message: 'message ' });
        myQueue.add({ message: 'Test yarn ' });
        myQueue.add({ message: 'install ' });
        myQueue.add({ message: 'Bull!' });

        // กำหนดวิธีประมวลผลงาน
        myQueue.process(async job => {
            console.log(`Processing job with data: ${JSON.stringify(job.data)}`);
            // ทำงานอะไรสักอย่าง...
            return new Promise(resolve => {
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

export { gettestbull };
