const { AppError } = require('../utils/appError')

const sendErrorDev = (err, req, res, next) => {
	return res.status(err.statusCode).json({
		status: err.status,
		error: err,
		message: err.message,
		stack: err.stack,
	})
}

const sendErrorProd = (err, req, res, next) => {
	return res.status(err.statusCode).json({
		status: err.status,
		message: err.message || 'Something went wrong!',
	})
}

const handleDuplicateValues = err => {
	return new AppError('Email is already taken', 400)
}

const handleJWTinvalidSignature = () => {
	return new AppError('Log again', 401)
}

const handleJWTexpiration = () => {
	return new AppError('Session expired. Log again', 403)
}

const globalErrorHandler = (err, req, res, next) => {
	err.statusCode = err.statusCode || 500
	err.status = err.status || 'error'

	if (process.env.NODE_ENV === 'production') {
		let error = { ...err };

		// Known errors
		if (err.name === 'SequelizeUniqueConstraintError') error = handleDuplicateValues()
		if (err.error.name === 'JsonWebTokenError') error = handleJWTinvalidSignature() 
		if (err.error.name === 'TokenExpiredError') error = handleJWTexpiration() 

		sendErrorProd(error, req, res, next);

	} else sendErrorDev(err, req, res, next);

}

module.exports = { globalErrorHandler }