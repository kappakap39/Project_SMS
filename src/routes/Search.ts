import express from 'express';
import { searchUsers, searchSMS, searchSMSUserID, searchSMSUser } from '../controllers/Search';

const root = express.Router();

root.post('/searchUsers', searchUsers);
root.post('/searchSMS', searchSMS);
root.post('/searchSMSUserID', searchSMSUserID);
root.post('/searchSMSUser', searchSMSUser);

export default root;