const express = require('express')
const { authMiddleware } = require('../middleware/auth.middleware')
const { GroupModel, GroupMemberModel, MessageModel } = require('../models/message.model')

const MessageRouter = express.Router()

MessageRouter.post('/create-group', authMiddleware, async(req, res) => {
    const  {name, description } = req.body
    try{
        const checkGroupName =  await GroupModel.findOne({name})
        if(checkGroupName) {
            res.status(400).send({ "message" : `The group name: ${name} is already exist!`})
        }else {
            const group = new GroupModel({
                name: name,
                description : description || '',
                createdBy: req.userId
            })
            await group.save()
            res.status(200).send({"message" : `The group name: ${name} has been created..`, "group" : group})
        }
    }catch(err) {
        res.status(500).send({ "Error" : err})
    }
})

MessageRouter.post('/add-people', authMiddleware, async(req, res) => {
    const  {group } = req.body
    try{
        const checkMemberExist =  await GroupMemberModel.findOne({ user: req.userId})
        if(checkMemberExist) {
            res.status(400).send({ "message" : `The member: ${req.userId} is already exist!`})
        }else {
            const groupDetails = await GroupModel.findOne({name:group})
            const newMemeber = new GroupMemberModel({
                group: groupDetails._id,
                user: req.userId
            })
            await newMemeber.save()
            res.status(200).send({"message" : `The member: ${req.userId} has been added to the group!`, "memberDetails" : newMemeber})
        }
    }catch(err) {
        console.log(err)
        res.status(500).send({ "Error" : err})
    }
})

MessageRouter.get('/messages/:groupId', async (req, res) => {
  try {
    const group = await GroupModel.findOne({name: req.params.groupId})
    const messages = await MessageModel.find({ toGroup: group._id })
      .populate("sender", "firstName lastName avatar")
      .sort({ createdAt: 1 });

    res.status(200).send(messages);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = { MessageRouter }