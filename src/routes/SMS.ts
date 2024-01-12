import express from 'express';
import { getSMSByID, getSMSWithMessages, getSMSByUserID, addSMS, updateSMS, deleteSMS, } from '../controllers/authSMS';
import { sentSMSCreate, sentMail, sentMail140 } from '../controllers/Sentmail';
import { authToken } from '../middleware/authUser';
const root = express.Router();

root.post('/sentSMSCreate', authToken, sentSMSCreate);
root.post('/addSMS', authToken, addSMS);
root.post('/sentMail', authToken, sentMail);
root.post('/sentMail140', authToken, sentMail140);
root.get('/getSMSByID', getSMSByID);
root.get('/getSMSWithMessages', getSMSWithMessages);
root.get('/getSMSByUserID', getSMSByUserID);
root.patch('/updateSMS', updateSMS);
root.delete('/deleteSMS', deleteSMS);

export default root;