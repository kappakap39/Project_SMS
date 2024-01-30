import express from 'express';
import { createAndSaveExcelFile, } from '../tests/ExportExcel';
const root = express.Router();

root.post('/createExcelFile', createAndSaveExcelFile);

export default root;
