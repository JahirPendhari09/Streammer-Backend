const mongoose = require('mongoose')

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { 
        type: String, 
        enum: ["group", "broadcast", "watch_party"], 
        default: "group" 
    }
},{ timestamps: true, versionKey: false });

const groupMemberSchema = new mongoose.Schema({
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    user:  { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    role: { 
        type: String, 
        enum: ["admin", "member"], 
        default: "member" 
    },
    status: {
        type: String,
        enum: ["joined", "left"],
        default: "joined"
    }
}, { timestamps: true });

groupMemberSchema.index({ group: 1, user: 1 }, { unique: true });


const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    toUser:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    toGroup: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    message: { type: String, required: true },
    type: { 
        type: String, 
        enum: ["text", "image", "video", "system"], 
        default: "text" 
    }
},{ timestamps: true });

messageSchema.index({ toGroup: 1, createdAt: 1 });
messageSchema.index({ toUser: 1, createdAt: 1 });


const GroupModel = mongoose.model('Group', groupSchema);

const GroupMemberModel = mongoose.model('GroupMember', groupMemberSchema);

const MessageModel = mongoose.model('Message', messageSchema);


module.exports = {MessageModel, GroupMemberModel, GroupModel}