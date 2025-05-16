const concertModel = require("../models/concert");
const asyncWrapper = require("../middleware/async");

const getRawData = asyncWrapper(async (req, res) => {
    // 不做任何的分頁以及查詢
    const data = await concertModel.find()

    res.status(200).json({
        data,
        nbHits: data.length
    });
});

const getAllData = asyncWrapper(async (req, res) => {
    const page = parseInt(req.query.page) || 1; // 預設第一頁
    const limit = parseInt(req.query.limit) || 30; // 每頁 30 筆
    const skip = (page - 1) * limit;

    const data = await concertModel.find()
        .sort({"tim": -1}) // 依 tim 降序排列，也就是說按照最新到最舊
        .skip(skip) // 跳過前面幾筆
        .limit(limit); // 取出指定數量的資料

    const total = await concertModel.countDocuments(); // 總筆數
    const totalPages = Math.ceil(total / limit); // 總頁數

    res.status(200).json({
        data,
        page,
        totalPages,
        nbHits: data.length
    });
});

const getKeywordSearchData  = asyncWrapper(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const searchText = req.query.text ? req.query.text.trim() : "";

    const query = {};

    if (searchText) {
        query.$or = [
            { tit: { $regex: searchText, $options: 'i' } },
            { int: { $regex: searchText, $options: 'i' } }
        ];
    }

    const data = await concertModel.find(query)
        .sort({ "tim": -1 }) // 依 tim 降序排列，也就是說按照最新到最舊
        .skip((page - 1) * limit)
        .limit(limit);

    const totalItems = await concertModel.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
        data,
        page,
        totalPages,
        nbHits: totalItems
    });
});

const getCitySelectionData = asyncWrapper(async (req, res) => {
    const page = parseInt(req.query.page) || 1; // 預設第一頁
    const limit = parseInt(req.query.limit) || 30; // 每頁 30 筆
    const skip = (page - 1) * limit;

    const { cit } = req.query; // 從 req.query 中解構出 cit
    const queryObject = {}; // 初始化一個空的查詢物件
    if (cit) { // 如果請求的 query 中包含了 cit 參數
        queryObject.cit = cit;  // 將 cit 添加到查詢條件中，這會查找 cit 欄位完全等於提供的 cit 值的文檔
    }

    // 使用 queryObject 來執行查詢
    const data = await concertModel.find(queryObject)
        .sort({"tim": -1}) // 依 tim 降序排列，也就是說按照最新到最舊
        .skip(skip) // 跳過前面幾筆
        .limit(limit); // 取出指定數量的資料;

    // 3. 獲取符合 queryObject 條件的總文檔數 (用於前端計算總頁數)
    //    這個 countDocuments 應該在 .skip() 和 .limit() 之前，或者對原始 queryObject 進行
    const totalItems = await concertModel.countDocuments(queryObject);

    // 4. 返回分頁後的數據和總數
    res.status(200).json({
        data,             // 這是分頁後的數據
        nbHits: totalItems, // 這是符合 cit 條件的總數據量
        page: page,       // 可以選擇性地返回當前頁碼
        totalPages: Math.ceil(totalItems / limit) // 可以選擇性地返回總頁數
    });
});

module.exports = {
    getRawData,
    getAllData,
    getKeywordSearchData,
    getCitySelectionData,
}