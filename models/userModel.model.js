const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },

    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },

    avatar: String,
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] 
}, 
{ timestamps: true, versionKey: false });

const UserModel = mongoose.model('User', userSchema);

module.exports = { UserModel };

