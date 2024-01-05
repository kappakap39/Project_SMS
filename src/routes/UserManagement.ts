import express from 'express';
import { getUserORAdmin, addUserOrAdmin, deleteUserOrAdmin, updateUserOrAdmin, getUserAdminByID, LoginManagement, LogoutManagement } from '../controllers/authUserManagement';
const root = express.Router();

root.get('/getUserORAdmin', getUserORAdmin);
root.get('/getUserAdminByID', getUserAdminByID);
root.post('/addUserOrAdmin', addUserOrAdmin);
root.post('/LoginManagement', LoginManagement);
root.post('/LogoutManagement', LogoutManagement);
root.delete('/deleteUserOrAdmin', deleteUserOrAdmin);
root.patch('/updateUserOrAdmin', updateUserOrAdmin);

export default root;