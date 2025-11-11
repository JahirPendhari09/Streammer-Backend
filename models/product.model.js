const mongoose = require('mongoose')

const productSchema = mongoose.Schema({
    name: { type: String, required: true},
    price: { type: Number, required: true},
    description: { type: String, required: false}
}, {
    versionKey: false
})

const ProductModel = mongoose.model("product", productSchema)

module.exports ={ ProductModel }