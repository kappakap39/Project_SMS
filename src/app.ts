import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config';
import errorHandler from './middleware/errorHandler';
import fourOhFour from './middleware/fourOhFour';
import User from './routes/UserManagement';
import Token from './routes/Login';
import sms from './routes/SMS';
import search from './routes/Search';
import test from './tests/Router';
import excel from './routes/Excel';
import overview from './routes/overviewRoutes';
// main.js (หรือไฟล์ที่เป็นตัวรันแอป)
import './tests/sentMailBull'; // เรียก Worker สำหรับ Bull Queue


//! AE router
import user from './routes/user';
import multer from 'multer';

const app = express();

// Apply most middleware first
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        // @ts-ignore
        origin: config.clientOrigins[config.nodeEnv],
    }),
);
app.use(helmet());
app.use(morgan('tiny'));

// Apply routes before error handling
app.use('/authUser', User );
app.use('/user', user );
app.use('/Token', Token);
app.use('/sms', sms);
app.use('/search', search);
app.use('/overview', overview);

//!/api test
app.use('/test', test);
app.use('/excel', excel);

app.use(
    multer({
        limits: {
            fileSize: 8000000, // Compliant: 8MB
        },
    }).none(),
);

// Apply error handling last
app.use(fourOhFour);
app.use(errorHandler);

export default app;