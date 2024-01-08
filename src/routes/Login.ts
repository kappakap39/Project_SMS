import express from 'express';
import { LoginUser, LogoutUser } from '../controllers/Login';
import { SentMailPwd, CheckOTP } from '../controllers/MailPwd';
const root = express.Router();

root.post('/LoginUser', LoginUser);
root.post('/LogoutUser', LogoutUser);
root.post('/SentMailPwd', SentMailPwd);
root.post('/CheckOTP', CheckOTP);


export default root;