const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
const { Op } = require('sequelize');

// Models
const { User } = require('../models/user.model');
const { Product } = require('../models/product.model');

// Utils
const { catchAsync } = require("../utils/catchAsync");
const { AppError } = require("../utils/appError");

dotenv.config({ path: './config.env' })

exports.verifyJWT = catchAsync(async (req, res, next) => {
    let token

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
        return next(new AppError('Invalid session', 401))
    }
    
    const result = jwt.verify(token, process.env.JWT_KEY)

    const user = await User.findOne({
        attributes: { exclude: ['password'] },
        where: { id: result.id, status: 'available' }
    })

    if (!user) {
        return next(new AppError('User session is not longer valid' ,401))
    }

    // Add data to req
    req.currentUser = user

    next()
})

exports.isProductOwner = catchAsync(async (req, res, next) => {
    const { id } = req.params
    const { currentUser } = req

    const item = await Product.findOne({
        where: { id, status: { [Op.or]: ['active', 'soldOut'] }} 
    })

    if (!item) return next(new AppError('Product not found', 404))

    if (item.userId !== currentUser.id) return next(new AppError('Not owner', 401))

    req.item = item

    next()
})

exports.isAccountOwner = catchAsync(async (req, res, next) => {
    const { id } = req.params
    const { currentUser } = req //A

    // ----------------------------------------------------------------------

    // I could do this, but the active user has already been declared.

            // const user = await User.findOne({ //B
            //  // where A.id equals B.id
            //     where: {}
            //  // attributes: { exclude: ['password'] },
            // })

            // if (!user) {
            // 	return next(new AppError('No user found with this id', 404))
            // }

    // ----------------------------------------------------------------------

    // so, i do this instead
    // console.log(id, currentUser.id)
    if (+id !== +currentUser.id) return next(new AppError(`Youre trying to edit someone else's account`, 500))
    // -- READ userController
    
    next()
})