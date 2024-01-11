import express from 'express';
import { getUser, addUser, updateUser, deleteUser, getUserByID } from '../controllers/UserController';
import { searchUsers } from '../controllers/Search';

const root = express.Router();

root.get('/get', getUser);
root.get('/getByID', getUserByID);
root.post('/create', addUser);
root.patch('/update', updateUser);
root.delete('/delete', deleteUser);
root.post('/search', searchUsers);

export default root;
