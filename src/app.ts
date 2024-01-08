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
import multer from 'multer';

//! AE router
import user from './routes/user';

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
// app.use('/', test);


// Apply error handling last
app.use(fourOhFour);
app.use(errorHandler);

export default app;