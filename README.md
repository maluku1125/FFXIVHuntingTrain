# FFXIV Hunting Train Dashboard (FFXIV繁中狩獵車)

FFXIV Hunting Train Dashboard 是一個專為《Final Fantasy XIV》繁體中文社群設計的即時狩獵車輔助工具，讓車長能輕鬆規劃與帶領狩獵車，同時讓一般玩家（訪客）能零延遲地追蹤當前點位內容。

## 🌟 功能特色

### 🚂 車長後台
- **Discord 一鍵登入**：車長專屬登入通道，驗證身分並管理車次。
- **直覺的路線規劃 (準備階段)**：
  - 支援跨版本 (2.0 - 7.0) 怪物與地圖資料庫 (`gameData.js`)。
  - 即時地圖預覽搭配準星系統，座標點選自動帶入 (`X: --, Y: --`)。
  - 清單卡片管理，可隨時刪除調整點位。
  - 草稿自動記憶：不怕瀏覽器意外重整，點位紀錄存在本地 `localStorage`。
- **清晰的發車面板 (開車階段)**：
  - 地圖、目標怪獸、下一站點資訊完美整合。
  - **自動遊戲內巨集產生器**：點擊即可複製帶有準確座標與怪物的宣傳巨集 (例：`/sh 下一站為： <地圖> <怪物> 座標：<座標>`)，支援前 5 行自訂格式，並透過瀏覽器自動記憶。
  - 單鍵「廣播下個點位」自動連動所有訪客頁面。

### 👥 乘客視角 (免登入)
- **實時更新**：運用 Supabase 的 WebSockets (`Realtime`)，車長一旦點擊下一站，所有乘客的畫面於毫秒內同步更新！
- **免刷新追蹤**：乾淨俐落的介面，手機與電腦雙平台適配，無論是在雙螢幕或是手機上，皆能隨時追看目前列車的目的地、水晶點及精確座標。

## 🛠️ 技術架構
- **前端語言**：純 HTML5, CSS3, JavaScript (Vanilla JS)。不依賴厚重的框架，輕量且載入極快。
- **後端服務**：[Supabase](https://supabase.com/) (BaaS)
  - `PostgreSQL` 資料庫 (存放列車狀態與房間列表)
  - `Supabase Auth` (Discord OAuth 驗證)
  - `Supabase Realtime` (廣播列車當前狀態變更給所有乘客)

## 🚀 快速開始

### 1. Supabase 設定
1. 前往 Supabase 建立新專案。
2. 啟用 Discord OAuth 登入提供者，並在 Discord Developer Portal 中設定回傳 URIs。
3. 建立 PostgreSQL 資料表：
   ```sql
   CREATE TABLE rooms (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       name TEXT NOT NULL,
       creator_id UUID REFERENCES auth.users NOT NULL,
       servers TEXT[] NOT NULL,
       points JSONB NOT NULL,
       current_point_index INTEGER DEFAULT -1,
       status TEXT DEFAULT 'active',
       is_published BOOLEAN DEFAULT false,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '4 hours'
   );
   ```
4. **設定 Row Level Security (RLS)** 政策，確保僅有 `creator_id` 等於 `auth.uid()` 的人能修改自己的房間，並且允許所有人 `SELECT` 撈取 `status = 'active'` 的房間。

### 2. 環境變數設定
開啟 `main.js` 並將最上方的 Supabase 設定替換為您的專案資訊：
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
```

### 3. 本地端執行
因使用到 ES Module 或 WebSockets 服務，建議使用 Live Server (如 VSCode 的 Live Server 擴充功能) 或是任意本機端伺服器 (如 `python -m http.server`) 運行，請勿直接雙擊 `index.html` 以避免 CORS 錯誤。

## 🛡️ 資安與安全須知
本專案已針對潛在的前端漏洞 (如 Stored Cross-Site Scripting, XSS) 進行字串逃脫修補，但不代表完全免於風險，正式上線時應注意以下確保：
- **Supabase RLS**：這是唯一保護不會有惡意玩家透過 API 強制竄改別人發車資料的後端防線！請務必正確實作 RLS！
- **API Keys**：`supabaseKey` 作為 Anon Public Key 曝露在前端是正常的，但請務必限制 Supabase 的 CORS Origins 僅允許您的網域存取。

## 📝 授權與社群貢獻
歡迎對 `gameData.js` 補充更詳盡的地圖坐標或是怪物名稱！
