// var createError = require('http-errors');
// var express = require('express');
// var path = require('path');
// var cookieParser = require('cookie-parser');
// var logger = require('morgan');

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');

// var app = express();

// // view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs');

// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

// module.exports = app;

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