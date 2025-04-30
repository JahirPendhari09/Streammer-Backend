const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
    email: { type: String, required: true},
    password: { type: String, required: true},
    firstName: { type: String, required: true},
    lastName: { type: String, required: true}
}, {
    versionKey: false
})

const UserModal = mongoose.model('user', userSchema)

module.exports = { UserModal }