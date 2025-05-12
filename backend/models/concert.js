const mongoose = require("mongoose");

const concertSchema = new mongoose.Schema({
    tit: {
        type: String,
        required: true
    },
    sdt: {
        type: [String],  // 陣列（Array）類型
        set: v => (v.length === 0 ? [" -"] : v) // 如果傳入的是空陣列，替換為預設值
    },
    prc: {
        type: [Number],  // 陣列（Array）類型
        default: []
    },
    pdt: {
        type: [String],  // 陣列（Array）類型
        set: v => (v.length === 0 ? [" -"] : v) // 如果傳入的是空陣列，替換為預設值
    },
    loc: {
        type: [String],  // 陣列（Array）類型
        set: v => (v.length === 0 ? [" -"] : v) // 如果傳入的是空陣列，替換為預設值
    },
    cit: {
        type: String,
        set: v => (v.length === 0 ? "-" : v) // 如果傳入的是空陣列，替換為預設值
    },
    int: {
        type: String
    },
    web: {
        type: String
    },
    url: {
        type: String
    },
    pin: {
        type: String
    },
    tim: {
        type: Date,
    }
});

module.exports = mongoose.model('Concert', concertSchema, 'data');
