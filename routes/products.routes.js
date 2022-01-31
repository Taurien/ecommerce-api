const express = require('express')

const { multerUpload } = require('../utils/multer')

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
        .post(
                // multerUpload.single('productImg'), //to upload one
                multerUpload.fields([
                        { name: 'productImgs', maxCount: 2 },  // define/set # of imgs to upload
                ]),
                createProductValidations,
                validateResult,
                createProduct)
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