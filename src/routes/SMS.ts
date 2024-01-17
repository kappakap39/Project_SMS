import express from 'express';
import { getSMSByID, getSMSWithMessages, getSMSByUserID, addSMS, updateSMS, deleteSMS, } from '../controllers/authSMS';
import { sentSMSCreate, sentMail, sentMail140, sentManySMS, sentManyPort, sentManyPortSMS, sentOneSMSmanyPort } from '../controllers/Sentmail';
// import { sentManyPort } from '../tests/Testsent';
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
root.post('/sentManySMS', sentManySMS);
root.post('/sentManyPort', sentManyPort);
root.post('/sentManyPortSMS', sentManyPortSMS);
root.post('/sentOneSMSmanyPort', sentOneSMSmanyPort);

export default root;