const filterObj = (obj, ...allowedValues) => {
    const newObj = {}
  
    Object.keys(obj).forEach((el) => {
      if (allowedValues.includes(el)) newObj[el] = obj[el]
    })
  
    return newObj
  }

  module.exports = { filterObj }