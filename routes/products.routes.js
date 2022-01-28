const express = require('express')

// Controllers
const {
        createProduct,
        getAllProducts,
        getProductDetails,
        updateProduct,
        disableProduct,
        getUserProducts
} = require('../controllers/products.controller')

// Middlewares
const { verifyJWT, isProductOwner } = require('../middlewares/auth.middleware')
const { createProductValidations, validateResult } = require('../middlewares/validators.middleware')

const router = express.Router()

router.use(verifyJWT)

// Get all products
// Create new product
router.route('/')
        .get(getAllProducts)
        .post(createProductValidations, validateResult, createProduct)
        // .get(verifyJWT, getAllProducts)
        // .post(verifyJWT, createProduct)

router.get('/listing', getUserProducts)
        
// Get products detail
// Update
// Remove
router.route('/:id')
        .get(getProductDetails)
        .patch(isProductOwner, updateProduct)
        .delete(isProductOwner, disableProduct)

module.exports = { productsRouter: router }