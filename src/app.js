require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const app = express();
const admin = require('firebase-admin');
const serviceAccount = require('./config/yora-b55bb-firebase-adminsdk-fbsvc-eb3375d5e0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// =======================================================
// Body parsers
// =======================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================================================
// Helmet & CORS (production / dev)
// =======================================================
if (process.env.NODE_ENV === 'production') {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https://i.pravatar.cc'],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
            }
        }
    }));

    app.use(helmet.hidePoweredBy());
    app.use(helmet.hsts({ maxAge: 31536000 }))

    app.use(cors({
        origin: [process.env.FRONTEND_URL],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true
    }));

} else {
    app.use(helmet({
        crossOriginOpenerPolicy: false,
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    }));

   app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

}

// Connect to DB
connectDB();


app.use('/uploads', express.static(path.join(__dirname, './../../apidata/uploads')));

// Routes
const api = '/api';
const auth = api + '/auth';
const user = api + '/users';
const post = api + '/posts';
const story = api + '/stories';
const notification = api + '/notifications';
const sup = api + '/subscriptions';

const authRoute = require('./routers/authRoute');
const tokenRoute = require('./routers/tokenRoute');
const userRoute = require('./routers/userRoute');
const postRoute = require('./routers/postRoutes');
const storyRoute = require('./routers/storyRoute');
const notificationRoutes = require('./routers/notificationRoute');

const messagesRoutes = require('./routers/messagesRoutes');

const subRoutes = require('./routers/subscriptionRoute');
app.use(sup, subRoutes);

app.use(user, messagesRoutes);
app.use(api, tokenRoute);
app.use(auth, authRoute);
app.use(user, userRoute);

app.use(post, postRoute);
app.use(story, storyRoute);
app.use(notification, notificationRoutes);


module.exports = app;