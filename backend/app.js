require('dotenv').config()
require('express-async-errors')
const express = require('express')
const app = express()
const path = require('path');

const ConcertRouter = require('./routes/concert')
const connectDB = require('./db/connect')

const cors = require("cors");
const port = 3000;

// middleware
// 設置 Express 服務靜態文件
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use("/api", ConcertRouter)

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const start = async () => {
    try {
        // connectDB
        await connectDB(process.env.MONGO_URI)
        app.listen(port, "0.0.0.0", () => {
            console.log(`Server started on port ${port} 0322`)
        })
    } catch (error) {
        console.log(error)
    }
}

start()