import express from 'express';
import { getSMSByID, getSMSWithMessages, getSMSByUserID } from '../controllers/authSMS';
import { sentSMSCreate, addSMS, sentMail, } from '../controllers/Sentmail';
import { authToken } from '../middleware/authUser';
const root = express.Router();

root.post('/sentSMSCreate', authToken, sentSMSCreate);
root.post('/addSMS', authToken, addSMS);
root.post('/sentMail', authToken, sentMail);
root.get('/getSMSByID', getSMSByID);
root.get('/getSMSWithMessages', getSMSWithMessages);
root.get('/getSMSByUserID', getSMSByUserID);

export default root;