# ---- Stage 1: Build Angular Frontend ----
FROM node:18-alpine AS angular-builder
LABEL stage="angular-builder"

WORKDIR /usr/src/app/frontend

# 複製 package.json 和 package-lock.json (或 yarn.lock)
COPY frontend/package*.json ./

# 安裝前端依賴
RUN npm install

# 複製前端所有程式碼
COPY frontend/ ./

# 建置 Angular 專案 (通常是 --prod)
# 確保你的 package.json scripts 中有 "build" 命令, 通常是 "ng build --configuration production"
# ng build 的輸出通常在 dist/<project-name>
# 請根據你的 angular.json 中的 "outputPath" 或實際情況確認
# 例如, 如果你的專案名是 my-app, 輸出會在 dist/my-app
RUN npm run build
# ↑↑↑ 如果你的 Angular 專案名是 'my-angular-app', 則 build 後的輸出會在 dist/my-angular-app

# ---- Stage 2: Setup Express Backend and Serve Frontend ----
FROM node:18-alpine
LABEL stage="express-server"

WORKDIR /usr/src/app

# 複製後端 package.json 和 package-lock.json
COPY backend/package*.json ./backend/

# 進入後端目錄並安裝生產環境依賴
RUN cd backend && npm install --only=production

# 複製所有後端程式碼
COPY backend/ ./backend/

# 從 angular-builder 階段複製建置好的前端靜態文件
# 到 Express 設定的靜態文件夾 (backend/public/frontend)
# !!! 非常重要: 'dist/your-angular-project-name' 必須替換成你 Angular build 後的實際資料夾名稱 !!!
# 例如: 如果你的 angular.json "outputPath": "dist/my-awesome-app", 就用 dist/my-awesome-app
# 如果你直接用 ng build, 預設可能是 dist/frontend (如果你的 Angular 專案目錄就叫 frontend)
COPY --from=angular-builder /usr/src/app/frontend/dist/frontend/browser ./backend/public/frontend/
# ↑↑↑ 注意: 上面的 'dist/frontend' 是假設你的 Angular 專案在 `frontend` 目錄下，且 `angular.json` 中的 `outputPath` 是 `dist/frontend`
# 如果你的 Angular 專案有一個特定的名字，例如 'my-ng-app', 則路徑可能是 `dist/my-ng-app`。
# 你可以先在本機執行 `cd frontend && npm run build` 看看 `dist/` 下面生成的資料夾名稱是什麼。

# 設定工作目錄到後端
WORKDIR /usr/src/app/backend

# 你的 Express 應用程式監聽的 port
EXPOSE 3000

# 啟動 Express 伺服器的命令
CMD ["node", "app.js"]