const express = require('express')
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

const { UserModal } = require('../models/userModel.model');
const { welcomeEmailJobQueue } = require('../message-queue/producer');

require("dotenv").config()

const AuthRouter = express.Router();

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || 10)
const jwtScretKey = process.env.JWT_SCRET_KEY || 'jwt_scret_key'

AuthRouter.post('/login', async(req, res) => {
    const { email, password } = req.body;
    try{
        const user = await UserModal.findOne({ email })
        if(!user) {
            res.status(200).send({ 'message': 'Incorrect credentials!'})
        }else{
            bcrypt.compare(password, user.password, (err, result) => {
                if(result) {
                    const jwtToken = jwt.sign({ user: user }, jwtScretKey , { expiresIn: 60 * 60 });  
                    res.status(200).send({ 'message': 'Login Success', 'token': jwtToken })
                }else {
                    res.status(200).send({ 'message': 'Invalid Password or invalid credentials' })
                }
            });
        }

    }catch(err) {
        res.status(500).send({"Error": err})
    }
})


AuthRouter.post('/register', async (req, res) => {
    const {email, password, firstName, lastName } = req.body
    try{
        const isUserExist = await UserModal.findOne({email})
        if(isUserExist) {
            res.status(200).send({ 'message': 'The provided email is already exist!'})
        }else{
            bcrypt.hash(password, SALT_ROUNDS, async (err, hash) => {
                if(hash) {
                    const newUser = new UserModal({
                        email, 
                        lastName, 
                        firstName,
                        password: hash
                    })
                    await newUser.save()
                    await welcomeEmailJobQueue.add('sendWelcomeEmail', {email} )
                    res.status(200).send({'message': `New user Successfully registerd.`, user: newUser})
                }else{
                    res.status(400).send({'error': err})
                }
            });
        }      
    }catch(err) {
        res.status(500).send({"Error": err})
    }
})


module.exports = { AuthRouter }