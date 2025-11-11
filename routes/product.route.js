const express = require('express')
const { ProductModel } = require('../models/product.model')

const ProductRouter = express.Router()

ProductRouter.get('/', async(req, res) =>{
    try{
        const data = await ProductModel.find();
        res.status(200).send({"data": data})
    }catch{
        res.status(500).send({"message": "Server Error"})
    }
})

ProductRouter.post('/create', async(req, res) =>{
    const data = req.body
    try{
        const createProduct = new ProductModel(data)
        await createProduct.save()
        res.status(200).send({"message": "The product has been created!"})
    }catch(err){
        res.status(500).send({"Error": err})
    }
})


ProductRouter.patch("/update/:id", async(req, res) => {
    const { id }= req.params
    const data = req.body
    try{
        const updateProduct = await ProductModel.findByIdAndUpdate({_id: id}, data)
        res.status(200).send({"message": "The product has been updatedSuccessfully!", "updated_product": updateProduct})
    }catch(err){
        res.status(500).send({"Error": err})
    }
})

ProductRouter.delete("/delete", async(req, res) => {
    const {id} = req.query
    try{
        await ProductModel.findByIdAndDelete({_id: id})
        res.status(200).send({"message": `The product ${id} has been deleted...`})
    }catch(err) {
        res.status(500).send({"Error": err})

    }
})


module.exports = {ProductRouter}