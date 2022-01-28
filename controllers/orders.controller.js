// Models
const { Product } = require('../models/product.model')
const { Cart } = require('../models/cart.model')
const { ProductInCart } = require('../models/productInCart.model')
const { Order } = require('../models/order.model')
const { ProductInOrder } = require('../models/productInOrder.model')

// Utils
const { catchAsync } = require('../utils/catchAsync')
const { filterObj } = require('../utils/filterObj')
const { AppError } = require('../utils/appError')
const { formatUserCart } = require('../utils/queryFormat')

exports.getUserCart = catchAsync(async (req, res, next) => {
	const { currentUser } = req

	const cart = await Cart.findOne({
		attributes: { exclude: ['userId', 'status'] },
		where: { userId: currentUser.id, }, // status: 'onGoing' 
		include: [
			{
				model: ProductInCart,
				attributes: { exclude: ['cartId', 'status'] },
				// where: { status: 'active' },
				include: [{ model: Product }],
				include: [
					{
						model: Product,
						attributes: {
							exclude: ['id', 'userId', 'price', 'quantity', 'status'],
						},
					},
				],
			},
		],
	})

	// const formattedCart = formatUserCart(cart)

	res.status(200).json({
		status: 'success',
		data: { cart } //: formattedCart },
	})
})

exports.addProductToCart = catchAsync(async (req, res, next) => {
	const { item } = req.body
	const { currentUser } = req

	const filteredObj = filterObj(
		item,
		'id',
		'quantity',
	)

	// 1 - Validate if quantity is less or equal to existing quantity - Product in STOCK
	const itemExists = await Product.findOne({
		where: { id: filteredObj.id, status: 'active' },
	})

	if (!itemExists || filteredObj.quantity > itemExists.quantity) {
		return next(
			new AppError('Product does not exists or it exceeds the available quantity', 400)
		)
	}

	// 2 - Check if current user already has a cart
	const cart = await Cart.findOne({
		where: { userId: currentUser.id, status: 'onGoing' },
	})

	// 3A - if its the first item create new cart
	if (!cart) {
		const totalPrice = +filteredObj.quantity * +itemExists.price

		const newCart = await Cart.create({ userId: currentUser.id, totalPrice })

		await ProductInCart.create({
			cartId: newCart.id,
			productId: filteredObj.id,
			quantity: filteredObj.quantity,
			price: itemExists.price,
		})
	}

	// 3B - if theres a cart with items already Update the cart
	if (cart) {
		// Check if product already exists on the cart
		const itemInCartExists = await ProductInCart.findOne({
			where: { 
				cartId: cart.id,
				productId: filteredObj.id,
				status: 'active'
			}
		})

		// if exists
		if (itemInCartExists) return next(new AppError('already in the cart', 400))
			
	}

	// Add it to the cart
	await ProductInCart.create({
		cartId: cart.id,
		productId: filteredObj.id,
		quantity: filteredObj.quantity,
		price: itemExists.price,
	})

	// Calculate totalprice
	const updatedCartTotalPrice = +cart.totalPrice + filteredObj.quantity * itemExists.price

	await cart.update({ totalPrice: updatedCartTotalPrice })

	res.status(201).json({ status: 'success' })
})

exports.updateCart = catchAsync(async (req, res, next) => {
	const { currentUser } = req
	const { itemId, newQuantity } = req.body
	
	const userCart = await Cart.findOne({
		where: { userId: currentUser.id, status: 'onGoing' }
	})

	if (!userCart) return next(new AppError('Invalid cart', 400))

	const itemInCart = await ProductInCart.findOne({
		where: {
			id: itemId,
			cartId: userCart.id,
			status: 'active'
		},
		include: [{ model: Product }]
	})

	if (!itemInCart) return next(new AppError('invalid product', 400))

	// PROBAR
	const test = +itemInCart.product.quantity
	console.log(test)
	if (newQuantity > test) return next(new AppError(`item only has ${test}`, 400))
	if (newQuantity === itemInCart.quantity) return next(new AppError('You already have that quantity in that product', 400))
	
	let updatedTotalPrice

	// Check if user added or removed from the selected product
	// If user send 0 quantity to product, remove it from the cart
	if (newQuantity === 0) {
		updatedTotalPrice =
			+userCart.totalPrice - +itemInCart.quantity * +itemInCart.price

		// Update quantity to product in cart
		await itemInCart.update({ quantity: 0, status: 'removed' })
	} else if (newQuantity > +itemInCart.quantity) {
		// New items were added
		updatedTotalPrice =
			+userCart.totalPrice +
			(newQuantity - +itemInCart.quantity) * +itemInCart.price

		// Update quantity to product in cart
		await itemInCart.update({ quantity: newQuantity })
	} else if (newQuantity < +itemInCart.quantity) {
		// Items were removed from the cart
		updatedTotalPrice =
			+userCart.totalPrice -
			(+itemInCart.quantity - newQuantity) * +itemInCart.price

		// Update quantity to product in cart
		await itemInCart.update({ quantity: newQuantity })
	}

	// Calculate new total price
	await userCart.update({ totalPrice: updatedTotalPrice })
	
	res.status(204).json({ status: 'success' })
})

exports.purchaseOrder = catchAsync(async (req, res, next) => {
	const { currentUser } = req

	// Get user's cart and get the products of the cart
	const userCart = await Cart.findOne({
		attributes: { exclude: ['userId'] }, 
		where: { userId: currentUser.id,  }, //status: 'onGoing'
		include: [
			{
				model: ProductInCart,
				attributes: { exclude: ['id', 'cartId'] }, // status > gonna be purchased
				// where: { status: 'active' },
				include: [
					{
						model: Product,
						attributes: {
							exclude: ['id', 'userId', 'price', 'quantity', 'status'],
						},
					},
				],
			},
		],
	})

	// Set Cart status to 'purchased'
	await userCart.update({ status: 'TO-UP' }) // 'purhcased' cart goes here'

	// Create a new order
	// const userOrder = await Order.create({
	// 	userId: currentUser.id,
	// 	totalPrice: userCart.totalPrice,
	// 	date: new Date().toLocaleString(),
	// })





		const test = await ProductInCart.findAll({ where: { cartId: userCart.id }})
			.then(async (products) => {
				products.map(async (el) => {
					// Set productInCart status to 'purchased', search for cartId and productId
					await el.update({ status: 'TO-UPx' },) //{where: { cartId: userCart.id, productId: X }
		
					// Look for the Product (productId), substract and update the requested qty from the product's qty
					await Product.findAll({ where: { id: el.id } })
						.then( res =>  console.log(res.id, el.id))
						// .then(res => {res.update({ status: 'TO-UP' })})
						// .then(res => {res.update({ quantity: el.quantity - res.quantity })})
				})
			})

			
		// Create productInOrder, pass orderId, productId, qty, price
		// const p3 = await ProductInOrder.create({
		// 	orderId: userOrder.id,
		// 	productId: ,
		// 	price: userCart.totalPrice,
		// 	quantity: userCart.quantity,
		// })

	// await Promise.all([
	// 	p1,
	// 	p2,
	// 	p3,
	// ]
	// ).then(() => { 
	// 	console.log('it works');
	// }).catch(reason => { 
	// 	console.log(reason)
	// })


	res.status(200).json({ status: 'success', data: {userCart} })
})