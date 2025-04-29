const express = require('express');
const cors = require('cors')
const {Server } = require('socket.io')
const http = require('http')
const { connection } = require('./connection/db');

const PORT = process.env.PORT || 8080;

const app = express();

const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
})

app.use(express.json())

app.get('/', (req,res) => {
    res.status(200).send("Hello World")
})

io.on('connection', (socket ) => {
    console.log('io connected...')
    console.log('ID', socket.id)

    // socket.emit('Welcome' , "Welcome to the Server")

    socket.on("message", (data) => {
        console.log(data)
        socket.to(data.room).emit('receive_message' , data.message)
    })

    socket.on('join-room', (roomName) => {
        socket.join(roomName)
        console.log('user joined room')
    })
    socket.on('disconnect' ,() => {
        console.log(`User Disconnected: ${socket.id}`)
    })
})


server.listen(PORT, async() => {
    try{
        await connection
        console.log(`MongoDB is running on ${PORT}`)
        console.log('MongoDB atlas is connected...')
    }catch(err) {
        console.log("Error:", err)
    }
})