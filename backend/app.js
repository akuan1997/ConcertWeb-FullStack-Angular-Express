require('dotenv').config();
require('express-async-errors');
const express = require('express');
const app = express();
const path = require('path');

const ConcertRouter = require('./routes/concert'); // 假設這是你的 API 路由
const connectDB = require('./db/connect');

const cors = require("cors");

// 從環境變數讀取 port 或預設 3000
const port = process.env.PORT || 3000;

// --- Middleware ---
// 1. CORS
app.use(cors()); // 建議放在路由處理之前

// 2. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API 路由 ---
// 將所有 API 路由放在一個基礎路徑下，例如 /api
// 這樣可以更容易區分 API 請求和前端靜態文件請求
app.use("/api", ConcertRouter);
// 如果有其他 API 路由，也類似地掛載
// app.use("/api/users", userRouter);

// --- 服務 Angular 靜態文件 ---
// 假設你的 Dockerfile 會將 Angular build 的輸出 (例如 dist/your-angular-project-name)
// 複製到 backend/public/frontend 目錄下
const angularAppPath = path.join(__dirname, 'public', 'frontend');
app.use(express.static(angularAppPath));

// --- Catch-all 路由：處理所有前端路由，將它們導向 Angular 的 index.html ---
// 這個路由必須放在所有 API 路由和 express.static 之後
app.get('*', (req, res) => {
    // 確保只對非 API 請求返回 index.html
    // 如果 API 路由沒有被上面的 app.use("/api", ...) 匹配到，
    // 並且請求路徑看起來不像 API (可選的更嚴謹檢查)
    // 但通常只要 API 路由在前，這裡直接發送 index.html 是安全的
    if (!req.originalUrl.startsWith('/api')) {
        res.sendFile(path.join(angularAppPath, 'index.html'));
    } else {
        // 如果是一個未匹配的 /api/... 請求，可以返回 404
        // 或者讓 express-async-errors 捕獲後續的錯誤
        res.status(404).send('API route not found');
    }
});


// --- 啟動伺服器 ---
const start = async () => {
    try {
        // connectDB
        if (process.env.MONGO_URI) { // 檢查是否有 MONGO_URI
            await connectDB(process.env.MONGO_URI);
            console.log('Connected to MongoDB');
        } else {
            console.warn('MONGO_URI not found in .env. Skipping DB connection for now.');
        }

        app.listen(port, "0.0.0.0", () => { // "0.0.0.0" 讓 Docker 容器能正確監聽
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to start the server:', error);
        process.exit(1); // 發生嚴重錯誤時退出
    }
};

start();