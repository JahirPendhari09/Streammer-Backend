const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true 
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true 
    },
    message: {
        type: String,
        required: true
    },

    type: {               
        type: String,  
        enum : ["message","like","comment","follow","system"],
        default: "message"
    },

    isRead: {            
        type: Boolean,
        default: false
    },

    link : {             
        type: String,
        default: null
    }
}, { timestamps:true })

const NotificationModel = mongoose.model("Notification", notificationSchema)

module.exports = { NotificationModel }
