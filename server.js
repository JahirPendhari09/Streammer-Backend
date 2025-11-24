const express = require('express');
const cors = require('cors')
const { Server } = require('socket.io')
const http = require('http')
const { connection } = require('./connection/db');
const { AuthRouter } = require('./routes/auth.route');
const { ProductRouter } = require('./routes/product.route');
const { MessageRouter } = require('./routes/message.route');
const { MessageModel, GroupModel } = require('./models/message.model');

const PORT = process.env.PORT || 8080;

const app = express();

app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(express.json());


app.get('/', (req,res) => {
    res.status(200).send("Welcome to the Streammer Server...")
})

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Receive and save message
  socket.on("message", async (data) => {
    try {
      const group = await GroupModel.findOne({ name: data.group });
      if (!group) {
        console.log("Group not found");
        return;
      }

      const newMessage = new MessageModel({
        sender: data.user._id,
        message: data.message,
        toGroup: group._id,
        type: "text"
      });
      await newMessage.save();

      io.to(data.group).emit("receive_message", {
        message: data.message,
        sender: data.user,
        createdAt: newMessage.createdAt,
      });
    } catch (err) {
      console.log("Error saving message:", err);
    }
  });

  socket.on("message_delete", async (data) => {
    try {
      const message = await MessageModel.findById(data.id);
      if (!message) {
        console.log("Message not found");
        return;
      }
      await MessageModel.findByIdAndDelete(data.id);
      
      // Broadcast delete event to room
      io.to(data.group).emit("user_message_deleted", {
        id: data.id,
      });
      console.log("Message deleted:", data.id);
    } catch (err) {
      console.log("Error deleting message:", err);
    }
  });

  // Join room
  socket.on('join-group', (roomName) => {
    socket.join(roomName);
    console.log('User joined room:', roomName);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.use('/auth', AuthRouter)
app.use('/product', ProductRouter)
app.use('/chat', MessageRouter)

server.listen(PORT, async() => {
    try{
        await connection
        console.log(`MongoDB is running on ${PORT}`)
        console.log('MongoDB atlas is connected...')
    }catch(err) {
        console.log("Error:", err)
    }
})