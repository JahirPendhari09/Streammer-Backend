const express = require('express');
const cors = require('cors')
const { Server } = require('socket.io')
const http = require('http')
const { connection } = require('./connection/db');
const { AuthRouter } = require('./routes/auth.route');
const { ProductRouter } = require('./routes/product.route')

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


app.use(express.json())

app.get('/', (req,res) => {
    res.status(200).send("Welcome to the Streammer Server...")
})

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle message event
  socket.on("message", (data) => {
    console.log('Message received:', data);
    io.to(data.room).emit('receive_message', data.message); 
  });

  // Join room
  socket.on('join-room', (roomName) => {
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

server.listen(PORT, async() => {
    try{
        await connection
        console.log(`MongoDB is running on ${PORT}`)
        console.log('MongoDB atlas is connected...')
    }catch(err) {
        console.log("Error:", err)
    }
})