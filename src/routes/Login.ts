import express from 'express';
import { LoginUser, LogoutUser } from '../controllers/Login';
const root = express.Router();

root.post('/LoginUser', LoginUser);
root.post('/LogoutUser', LogoutUser);


export default root;