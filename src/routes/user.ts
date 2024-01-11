import express from 'express';
import { getUser, addUser, updateUser, deleteUser, getUserByID } from '../controllers/UserController';

const root = express.Router();

root.get('/get', getUser);
root.get('/getByID', getUserByID);
root.post('/create', addUser);
root.patch('/update', updateUser);
root.delete('/delete', deleteUser);

export default root;
