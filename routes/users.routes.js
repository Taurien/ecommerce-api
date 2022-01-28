const express = require('express')

// Controllers
const {
	createUser,
	getUserById,
	updateUser,
	disableUserAccount,
	loginUser
} = require('../controllers/users.controller')

// Middlewares
const { verifyJWT, isAccountOwner } = require('../middlewares/auth.middleware')
const {
	createUserValidations,
	updateUserValidations,
	validateResult,
	loginUserValidations
} = require('../middlewares/validators.middleware')

const router = express.Router()

// Post - Create new user
router.post('/', createUserValidations, validateResult, createUser)

router.post('/login', loginUserValidations, validateResult, loginUser)

// Get - Get user profile
// Get - Get user by id
// Patch - Update user profile (email, name)
// Delete - Disable user account
router.
	use(verifyJWT)
	.route('/:id')
		.get(getUserById)
		.patch(isAccountOwner, updateUserValidations, validateResult, updateUser)
		.delete(isAccountOwner, disableUserAccount)

module.exports = { userRouter: router }
