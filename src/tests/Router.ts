import express from 'express';
import { gettestbull } from '../tests/BullTest';
import { sentMailTest } from '../tests/Testsent';
const test = express.Router();

test.get('/gettestbull', gettestbull);
test.post('/sentMailTest', sentMailTest);

export default test;