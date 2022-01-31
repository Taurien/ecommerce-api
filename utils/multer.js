const multer = require('multer')

const { AppError } = require('./appError')

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, )
//     },
//     filename: (req, file, cb) => {
//         const [ filename, extension ] = req.file.originalname.split('.') //[file] . [jpg]

//         const newFilename = `${filename}-${new Date.now()}.${filename}`
        
//         cb(null, newFilename)
//     }
// })

const multerstorage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith('image')) {
		return cb(new AppError('Invalid file', 400), false);
	}

    cb(null, true)
}

const multerUpload = multer({ storage: multerstorage, fileFilter })

module.exports = { multerUpload }