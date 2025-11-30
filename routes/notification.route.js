const express = require('express')
const { authMiddleware } = require('../middleware/auth.middleware')
const { NotificationModel } = require('../models/notification.model')

const NotificationRouter = express.Router()


NotificationRouter.get('/get/:id', async(req, res) => {
    try{
        const notifications = await NotificationModel.find({ receiver: req.params.id })
        res.status(200).send(notifications);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
})


NotificationRouter.delete('/delete/:receiverId', async (req, res) => {
    try {
        const deleted = await NotificationModel.findOneAndDelete({ receiver: req.params.receiverId });
        if (!deleted) {
            return res.status(404).send({ message: "No notification found for this receiver." });
        }
        res.status(200).send({ message: "Notification deleted successfully", deleted });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});


module.exports = { NotificationRouter }