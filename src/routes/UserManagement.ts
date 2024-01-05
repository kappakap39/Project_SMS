import express from 'express';
import { getUser, addUser, deleteUser, updateUser, getUserByID, } from '../controllers/authUserManagement';
const root = express.Router();

root.get('/getUser', getUser);
root.get('/getUserByID', getUserByID);
root.post('/addUser', addUser);
root.delete('/deleteUser', deleteUser);
root.patch('/updateUser', updateUser);

export default root;