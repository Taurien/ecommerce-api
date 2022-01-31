const express = require('express')


const {
    addProductToCart,
    getUserCart,
    updateCart,
    purchaseOrder,
    pastOrders
} = require('../controllers/orders.controller')

// Middlewares
const { verifyJWT } = require('../middlewares/auth.middleware')
const { updateCartValidations, validateResult } = require('../middlewares/validators.middleware')

const router = express.Router()

router.use(verifyJWT)

router.get('/cart', getUserCart)

router.post('/add-to-cart', addProductToCart)

router.patch('/update-cart', updateCartValidations, validateResult, updateCart)

router.patch('/buy', purchaseOrder)

router.get('/order-list', pastOrders)
// router.('', )

// router.('', )

// router.('', )

module.exports = { ordersRouter: router }