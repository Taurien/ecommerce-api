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
const { Email } = require('../utils/email')

exports.getUserCart = catchAsync(async (req, res, next) => {
	const { currentUser } = req

	const cart = await Cart.findOne({
		attributes: { exclude: ['userId', 'status'] },
		where: { userId: currentUser.id, status: 'onGoing' },
		include: [
			{
				model: ProductInCart,
				attributes: { exclude: ['cartId', 'status'] },
				where: { status: 'active' },
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

	
	if (cart) {
		const formattedCart = formatUserCart(cart)
		return res.status(200).json({
			status: 'success',
			data: { cart : formattedCart },
		})
	}

	if (!cart) return next(new AppError('theres no cart', 404))

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
	}

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

	if (newQuantity > +itemInCart.product.quantity) return next(new AppError(`item only has ${test}`, 400))

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

	
	res.status(200).json({
		status: 'success',
		data: itemInCart
	})
})

exports.purchaseOrder = catchAsync(async (req, res, next) => {
	const { currentUser } = req

	// Get user's cart and get the products of the cart
	const userCart = await Cart.findOne({
		attributes: { exclude: ['userId'] }, 
		where: { userId: currentUser.id, status: 'onGoing' },
		include: [
			{
				model: ProductInCart,
				attributes: { exclude: ['id', 'cartId', 'status'] },
				where: { status: 'active' },
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

	if (!userCart) return next(new AppError('theres no cart', 404))

	// Set Cart status to 'purchased'
	await userCart.update({ status: 'purchased' })
	
	// Create a new order
	const userOrder = await Order.create({
		userId: currentUser.id,
		totalPrice: userCart.totalPrice,
		date: new Date().toLocaleString(),
		status: 'sold'
	})
	
	// await ProductInCart.findAll({ where: { cartId: userCart.id }}) ////{where: { cartId: userCart.id, productId: X }
	// 	.then(async (products) => {
	// 		products.map(async (el) => {
				
	// 			// Set productInCart status to 'purchased', search for cartId and productId
	// 				await el.update({ status: 'purchased' }, {where: { productId: el.id }}) //{where: { cartId: userCart.id, productId: el.id }
		
	// 			// Look for the Product (productId), substract and update the requested qty from the product's qty
	// 				await Product.findAll({ where: { id: el.id } })
	// 					// .then( res =>  console.log(res[0].quantity, el.quantity))
	// 					.then(res => res[0].update({ quantity: res[0].quantity - el.quantity })) //STOCK minus requested qty

	// 			// Create productInOrder, pass orderId, productId, qty, price
	// 				await ProductInOrder.create({
	// 					orderId: userOrder.id,
	// 					productId: el.id,
	// 					price: el.price,
	// 					quantity: el.quantity,
	// 					status: 'sold'
	// 				})
	// 		})
	// 	})

	const orderPromises = userCart.productsInCarts.map(async (el) => {
		

	// Set productInCart status to 'purchased', search for cartId and productId
		// * await el.update({ status: 'purchased' })
		await ProductInCart.findOne({ where: { cartId: userCart.id, productId: el.productId } })
			.then(res => res.update({ status: 'purchased' }))
	
	// Look for the Product (productId), substract and update the requested qty from the product's qty
		await Product.findOne({ where: { id: el.productId } })
			.then(res => res.update({ quantity: res.quantity - el.quantity })) //STOCK minus requested qty

	// Create productInOrder, pass orderId, productId, qty, price
		await ProductInOrder.create({
			orderId: userOrder.id,
			productId: el.productId,
			price: el.price,
			quantity: el.quantity,
			status: 'sold'
		})

	})

	await Promise.all(orderPromises)

	// The email must contain the total price and the list of products that it purchased
	const purchasedItems = userCart.productsInCarts
	await new Email(currentUser.email).sendReceipt(currentUser.name, purchasedItems, userCart.totalPrice)
	
	res.status(204).json({ status: 'success'})
})

// Create a controller a function that gets all the user's orders
// The response must include all products that purchased 
exports.pastOrders = catchAsync(async (req, res, next) => {
	const { currentUser } = req

	const userPastOrders = await Order.findAll({
		where: { userId: currentUser.id },
		include: [
			{
				model: ProductInOrder,
				attributes: { exclude: [ 'id', 'orderId' ] },
				include: [
					{
						model: Product,
						attributes: {
							exclude: [ 'userId', 'quantity', 'status' ]
						}
					}
				]
			}
		]
	})

	if (!userPastOrders) return next(new AppError(`you haven't bought anything yet`, 404))

	res.status(200).json({
		status: 'success',
		data: { userPastOrders }
	})
})

exports.getOrderById = catchAsync(async (req, res, next) => {
	const { currentUser, params } = req
	
	// Find the order by a given ID
	// Must get the total price of the order and the prices of the products and how much the user bought
	const order = await Order.findOne({
		where: { id: params.id ,userId: currentUser.id },
		include: [
			{
				// Must include the products of that order
				model: ProductInOrder,
				attributes: { exclude: [ 'id', 'orderId' ] },
				include: [
					{
						model: Product,
						attributes: {
							exclude: [ 'userId', 'quantity', 'status' ]
						}
					}
				]
			}
		]
	})

	if (!order) return next(new AppError(`theres no order registered with the following id`, 404))

	res.status(200).json({
		status: 'success',
		data: { order }
	})
})
