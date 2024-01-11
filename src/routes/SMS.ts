import express from 'express';
import { sentSMS, getSMSByID, getSMSWithMessages, getSMSByUserID } from '../controllers/authSMS';
import { authToken } from '../middleware/authUser';
const root = express.Router();

root.post('/sentSMS', authToken, sentSMS);
root.get('/getSMSByID', getSMSByID);
root.get('/getSMSWithMessages', getSMSWithMessages);
root.get('/getSMSByUserID', getSMSByUserID);

export default root;