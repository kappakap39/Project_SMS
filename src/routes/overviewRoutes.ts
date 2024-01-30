import express from 'express';
import { GetOverviewSMS, GetOverviewSchedue } from '../controllers/overviewController';
import {
    searchdateSC,
    SMSShowhistory,
    UserByIDShowhistory,
    UserByIDpending,
    SMSShowpending,
    UserByIDpendingSc,
    SMSSpendingSc,
    searchdateSCS,
    searchdateSCW,

} from '../controllers/overviewController';

const root = express.Router();

root.get('/OverviewSMS', GetOverviewSMS);
root.get('/OverviewSchedue', GetOverviewSchedue);

root.get('/SMSShowhistory', SMSShowhistory);
root.get('/UserByIDShowhistory', UserByIDShowhistory);
root.get('/UserByIDpending', UserByIDpending);
root.get('/SMSShowpending', SMSShowpending);
root.get('/UserByIDpendingSc', UserByIDpendingSc);
root.get('/SMSSpendingSc', SMSSpendingSc);

root.post('/searchdateSC', searchdateSC);
root.post('/searchdateSCS', searchdateSCS);
root.post('/searchdateSCW', searchdateSCW);

export default root;
