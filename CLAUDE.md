# 給 Claude 的專案說明

即時運算的 3D 壁爐網頁：WebGL2 光線步進 + Web Audio 即時合成，沒有素材檔、沒有相依套件。使用者用繁體中文溝通。

## 結構與流程
- 開發入口 `index.html` 以 ES 模組載入 `src/js/main.js`，著色器由 `src/js/shaders.js` 從 `src/shaders/` 讀取並串接：
  場景 = `common.glsl` + `scene/` 七段（順序寫在 shaders.js 的 `SCENE_PARTS`）；後製 = `common.glsl` + `post/*.frag`。
- `node tools/build.mjs` 打包成 `dist/fireplace.html`（內嵌 CSS、著色器、去掉 import/export 串接模組）。
  **改完程式要重新打包並一起 commit。** 各模組最上層的名稱不能重複，腳本會檢查。
- 場景座標單位 = 爐口寬；爐口在 z=0 平面，爐膛往 +z。材質編號列在 `scene/sdf.glsl` 開頭。

## 一定要遵守（踩過的坑）
- **Windows（ANGLE → D3D）會把迴圈攤平**：所有迴圈從 `uniform int ZERO` 開始；含 `map()` 的函式（陰影、法線）在程式碼裡只能有一個呼叫點。材質函式只回傳反照率／自發光／光澤，打光統一在 `main.glsl` 做一次。不要在材質分支裡呼叫打光或陰影。
- **中間畫面可能是 RGBA16F，存得下負數**：寫入前一律夾到 ≥0，`dec()` 先 clamp 再取次方，最後輸出前過濾 NaN／Inf。否則 Mac、Android 會整片白。
- 細紋理要乘上 `df(頻率)` 依像素涵蓋範圍淡化，否則低解析度下會出現色塊。
- 測試環境的軟體繪圖（SwiftShader）抓不到上面兩類問題，改動著色器結構後要請使用者在 Windows／Mac／Android 實機確認。
