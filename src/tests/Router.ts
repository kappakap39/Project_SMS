import express from 'express';
import { gettestbull } from '../tests/BullTest';
const test = express.Router();

test.get('/gettestbull', gettestbull);

export default test;