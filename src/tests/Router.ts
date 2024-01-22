import express from 'express';
import { gettestbull, getbullsent } from '../tests/BullTest';
import { sentMailTest, } from '../tests/Testsent';
import { sentMailBull, } from '../tests/sentMailBull';
const test = express.Router();

test.get('/gettestbull', gettestbull);
test.post('/sentMailTest', sentMailTest);
test.get('/getbullsent', getbullsent);
test.post('/sentMailBull', sentMailBull);

export default test;