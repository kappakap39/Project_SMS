import express from 'express';
import { getUser, addUser, updateUser, deleteUser, getUserByID, GetUserToken, addProfileUser } from '../controllers/UserController';
import { upload } from '../Utils/Upload';

const root = express.Router();

root.get('/get', getUser);
root.get('/getByID', getUserByID);
root.get('/GetUserToken', GetUserToken);
root.post('/create', addUser);
root.patch('/update', updateUser);
root.delete('/delete', deleteUser);

root.post('/addProfileUser', upload.single('Picture'), addProfileUser);

export default root;