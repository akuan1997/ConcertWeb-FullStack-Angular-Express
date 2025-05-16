const concertModel = require("../models/concert");
const asyncWrapper = require("../middleware/async");

const getRawData = asyncWrapper(async (req, res) => {
    // 不做任何的分頁以及查詢
    const data = await concertModel.find()
        .sort({"tim": -1}) // 依 tim 降序排列，也就是說按照最新到最舊

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

// 假設你有這兩個輔助函數 (如果沒有，你需要實作它們)
// 它的作用是將 "YYYYMMDD" 格式的查詢參數轉換為 Date 物件
function parseQueryDateParam(dateStr) {
    if (!dateStr || !/^\d{8}$/.test(dateStr)) {
        return null;
    }
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1; // 月份是 0-indexed
    const day = parseInt(dateStr.substring(6, 8), 10);
    const date = new Date(year, month, day);
    // 驗證日期是否有效 (例如 20230230 是無效的)
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return null;
    }
    return date;
}

// 它的作用是將 pdt 陣列中的日期字串轉換為 Date 物件
// 你需要根據 pdt 中實際儲存的日期格式來調整此函數
function parsePdtDateString(pdtDateStr) {
    // 範例：假設 pdt 中的日期是 ISO 格式字串
    const date = new Date(pdtDateStr);
    return isNaN(date.getTime()) ? null : date; // 如果解析失敗返回 null
}

const getDateSearchData = asyncWrapper(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const { start_date, end_date } = req.query;

    let startDateObj = null;
    if (start_date) {
        startDateObj = parseQueryDateParam(start_date);
        if (startDateObj) {
            startDateObj.setHours(0, 0, 0, 0); // 確保是當天的開始
        } else {
            return res.status(400).json({ message: "無效的 start_date 格式。請使用 YYYYMMDD。" });
        }
    }

    let endDateObj = null;
    if (end_date) {
        endDateObj = parseQueryDateParam(end_date);
        if (endDateObj) {
            endDateObj.setHours(23, 59, 59, 999); // 確保是當天的結束
        } else {
            return res.status(400).json({ message: "無效的 end_date 格式。請使用 YYYYMMDD。" });
        }
    }

    // 如果提供了兩個日期，且 start_date 晚於 end_date
    if (startDateObj && endDateObj && startDateObj > endDateObj) {
        return res.status(400).json({ message: "start_date 不能晚於 end_date。" });
    }

    // 如果 start_date 和 end_date 都沒有提供
    if (!startDateObj && !endDateObj) {
        // 回退到類似 getAllData 的行為，或返回錯誤
        // return res.status(400).json({ message: "請至少提供 start_date 或 end_date。" });
        const allData = await concertModel.find()
            .sort({"tim": -1}) // 假設 'tim' 仍然是主要的排序欄位
            .skip(skip)
            .limit(limit);
        const totalItems = await concertModel.countDocuments();
        return res.status(200).json({
            data: allData,
            page,
            totalPages: Math.ceil(totalItems / limit),
            nbHits: totalItems
        });
    }

    // 先獲取所有文件。
    // 對於非常大的集合，這樣效率不高。
    // 如果效能是個問題，可以考慮使用 MongoDB 聚合框架進行伺服器端過濾。
    const allItems = await concertModel.find({}); // 獲取所有資料

    const filteredByDate = allItems.filter(item => {
        // *** 主要修改處：從 sdt 改為 pdt ***
        if (!item.pdt || !Array.isArray(item.pdt) || item.pdt.length === 0) {
            return false; // 跳過沒有 pdt 或 pdt 為空的項目
        }

        // *** 檢查 pdt 陣列中的任何一個日期是否在範圍內 ***
        return item.pdt.some(pdtStr => {
            const pdtDate = parsePdtDateString(pdtStr); // 使用新的解析函數
            if (!pdtDate) { // 如果此特定 pdt 項目解析失敗
                return false;
            }

            let isInRange = true;
            if (startDateObj && pdtDate < startDateObj) {
                isInRange = false;
            }
            if (endDateObj && pdtDate > endDateObj) {
                isInRange = false;
            }
            return isInRange;
        });
    });

    // 對 JavaScript 過濾後的陣列依 'tim' 排序
    const sortedData = filteredByDate.sort((a, b) => {
        // 假設 'tim' 是一個可以轉換為 Date 的欄位
        const dateA = a.tim ? new Date(a.tim) : new Date(0); // 如果 tim 不存在則使用一個很早的日期
        const dateB = b.tim ? new Date(b.tim) : new Date(0);
        return dateB - dateA; // tim 降冪排序 (新的在前)
    });

    const totalFilteredItems = sortedData.length;

    // 對排序後的陣列應用分頁
    const paginatedData = sortedData.slice(skip, skip + limit);

    res.status(200).json({
        data: paginatedData,
        page,
        totalPages: Math.ceil(totalFilteredItems / limit),
        nbHits: totalFilteredItems // 符合日期條件的總項目數
    });
});

module.exports = {
    getRawData,
    getAllData,
    getKeywordSearchData,
    getCitySelectionData,
    getDateSearchData
}