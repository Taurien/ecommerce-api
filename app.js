const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const xss = require('xss-clean')
const rateLimit = require('express-rate-limit')
const path = require('path')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan');

// Routers
const { userRouter } = require('./routes/users.routes')
const { productsRouter } = require('./routes/products.routes')
const { ordersRouter } = require('./routes/orders.routes')
const { viewsRouter } = require('./routes/views.routes')


// Controllers
const { globalErrorHandler } = require('./controllers/error.controller')

// Utils
const { AppError } = require('./utils/appError')

// Init app
const app = express()

app.enable('trust proxy');

app.set('view-engine', 'pug')
app.use(express.static( path.join(__dirname, 'views') ))

// Global Middlewares
// Implement CORS
app.use(cors()); //Access-Control-Allow-Origin *
app.use(cors({ credentials: true, origin: 'http://https://taurien.github.io' })); //Access-Control-Allow-Origin *
// app.use(cors({ credentials: true, origin: 'http://localhost:3000' })); //Access-Control-Allow-Origin *
app.options('*', cors());

// Set security HTTP headers
app.use(helmet())

// Development logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'))
else app.use(morgan('combined'))


// Limit requests from same API
app.use(
	rateLimit({
		max: 500,
		windowMs: 60 * 60 * 1000, // 1 hour
		message: 'Too many requests from this IP',
	})
)

// Body parser, reading data from the body into req.body
app.use(express.json())
// content-type: application/json DEFAULT V ->   multi
app.use(express.urlencoded({ extended: true })) 
app.use(cookieParser())

// Data sanitization against XSS
app.use(xss())

// Compress responses
app.use(compression())


// Endpoints
app.use('/', viewsRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/products', productsRouter)
app.use('/api/v1/orders', ordersRouter)


app.all('*', (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server`, 404))
})

app.use(globalErrorHandler)

module.exports = { app }
