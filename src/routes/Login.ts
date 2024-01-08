import express from 'express';
import { LoginUser, LogoutUser } from '../controllers/Login';
import { SentMailPwd, VerifyToken } from '../controllers/MailPwd';
const root = express.Router();

root.post('/LoginUser', LoginUser);
root.post('/LogoutUser', LogoutUser);
root.post('/SentMailPwd', SentMailPwd);
root.post('/CheckToken', VerifyToken);


export default root;