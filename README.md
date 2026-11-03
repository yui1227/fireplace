# 🔥 壁爐 Fireplace

一個完全**即時運算**的 3D 壁爐網頁：畫面用 WebGL2 光線步進（raymarching）每一格算出來，聲音用 Web Audio API 即時合成。沒有任何圖片、影片或音檔素材，也不依賴任何函式庫。

![最終版畫面](docs/final.jpg)

**線上體驗**：<https://claude.ai/artifact/4tpBBE29PYUFZQW3H1rVJS>
（也可以下載打包好的單一檔案 [`dist/fireplace.html`](dist/fireplace.html)，直接用瀏覽器打開）

## 特色

**畫面**
- 嵌在磚牆裡的壁爐、木壁爐台、兩盞壁燈、掛畫、花瓶、弧形鐵柵欄、地毯、備用柴，全部用距離場（SDF）描述，光線步進渲染
- 體積火焰：在 3D 空間沿視線累積發光，火舌會被木柴遮擋、從縫隙竄出
- 炭化木柴表面用 Voronoi 細胞雜訊做出「鱷魚皮」龜裂，裂縫依溫度發光閃爍
- 火光即時照亮房間，木柴、柵欄投下會晃動的軟陰影
- 煙、熱氣扭曲、窗外月光的窗格影子（冷暖對比）
- 後製：多層光暈、ACES 色調映射、時間累積抗鋸齒、底片顆粒
- 任何視窗比例都會自動調整取景

**聲音**（全部即時合成）
- 火焰呼嘯（濾波棕噪音，跟火勢同步）
- 每一聲木柴爆裂都是當下產生的新波形，和畫面上的火星同步
- 房間殘響（程式產生的脈衝響應）
- 窗外雨聲（可開關）

**互動**
- 點爐火：添柴／讓火變旺
- 拖曳畫面：轉動視角；雙擊回正
- ⚙ 設定面板：
  - 畫質（低／中／高）
  - 自然燃燒：火會在約 12 分鐘內慢慢燒完，木柴變細、變灰，需要添柴；新木柴會從上方掉進火堆
  - 壁燈（開關）
  - 鏡頭晃動
  - 窗外雨聲
  - 睡眠計時（15／30／60／90 分鐘後，火和聲音一起淡出）

<img src="docs/settings-mobile.jpg" width="280" alt="手機上的設定面板">

## 系統需求

需要支援 **WebGL2** 的瀏覽器。著色器運算量不小，獨立顯示卡或 Apple Silicon 會比較順；網頁會依實際流暢度自動調整解析度，也可以在設定裡手動選低畫質。

已測試：Windows（Edge、RTX 3060）、macOS（Mac mini M4）、Android（Zenfone 10，Chrome）。

## 演進過程

這個作品是跟 Claude 一來一往做出來的，完整過程寫在 [DEVLOG.md](DEVLOG.md)。`versions/` 資料夾保留了幾個中間版本：

| 版本 | 說明 |
|---|---|
| [`01-2d-procedural.html`](versions/01-2d-procedural.html) | 第一版：2D Canvas 畫壁爐，WebGL 著色器畫火焰 |
| [`02-realistic-closeup.html`](versions/02-realistic-closeup.html) | 擬真特寫實驗：只有火堆，沒有壁爐（後來沒採用） |
| [`03-2d-frame-3d-firebox.html`](versions/03-2d-frame-3d-firebox.html) | 2D 外框 + 透過爐口看進去的 3D 光線步進火堆 |
| [`src/`](src/)（[`dist/fireplace.html`](dist/fireplace.html)） | 最終版：整個場景全 3D |

舊版本保留原樣，沒有套用後來的相容性修正，在部分裝置上可能跑不順。

| 01 | 03 | 最終版 |
|---|---|---|
| ![v1](docs/v1.jpg) | ![v3](docs/v3.jpg) | ![final](docs/final.jpg) |

## 專案結構

```
index.html              頁面骨架（開發用，載入 src/）
src/
  style.css
  js/
    main.js             進入點與主迴圈
    renderer.js         WebGL2 渲染管線：場景 → 時間累積 → 光暈 → 合成
    shaders.js          讀取並組合著色器
    camera.js           鏡頭、投影、拖曳與晃動
    fire.js             火勢、自然燃燒、添柴、睡眠計時、隨機爆裂事件
    sparks.js           3D 火星粒子（畫在上層 2D 畫布）
    audio.js            Web Audio 即時合成音效
    ui.js               控制列與設定面板
    settings.js         使用者設定
    util.js             共用小工具
  shaders/
    common.glsl         共用：雜湊、雜訊、HDR 編碼
    fullscreen.vert
    scene/              場景著色器，依序串接：
      uniforms.glsl       uniform 與常數
      noise.glsl          3D 雜訊、Voronoi
      sdf.glsl            場景幾何（距離場）
      lighting.glsl       打光與陰影
      materials.glsl      材質
      fire.glsl           體積火焰
      main.glsl           主程式
    post/               後製：bright、blur、accumulate、composite
tools/build.mjs         打包成單一 HTML
dist/fireplace.html     打包結果（可直接開啟）
versions/               演進過程中的舊版本
```

## 開發

ES 模組和著色器檔案需要透過網頁伺服器讀取，不能直接點兩下 `index.html`：

```sh
npx serve .            # 或 python3 -m http.server
```

改完後打包成單一檔案（只用 Node 內建功能，不需要 `npm install`）：

```sh
node tools/build.mjs   # 輸出 dist/fireplace.html
```

格式化：JS／CSS 用 prettier，GLSL 用 clang-format（`npm run format`）。

## 技術筆記

幾個踩過的坑，記下來給有興趣的人：

- **Windows 上整個瀏覽器當掉**：Windows 的瀏覽器透過 ANGLE 把 GLSL 轉成 HLSL，再交給 DirectX 編譯，而 DirectX 會把迴圈全部攤平展開。如果著色器裡同一個含迴圈的函式（例如陰影）被呼叫很多次，程式碼會爆量，編譯時把顯示卡程序卡死。解法是改用 WebGL2，用一個值為 0 的 uniform 當迴圈起點，讓編譯器沒辦法攤平；同時重構成「先決定材質，最後只打一次光」，讓昂貴的函式在程式碼裡只出現一次。
- **Mac／Android 一片白**：中間畫面用 16-bit 浮點時可以存負數，抖動產生的微小負值取次方後變成 NaN，再被時間累積和光暈擴散到全畫面。所有中間值都要夾在合理範圍內。
- **暗部色塊**：8-bit 中間畫面在暗部的階數太少，RGB 各自跳階就變成色斑；改用 gamma 編碼加抖動儲存，或直接用浮點緩衝。
- **細紋理閃爍**：依每個像素在該距離的涵蓋範圍，自動淡化太細的雜訊（類似 mipmap 的概念）。

## 授權

[MIT](LICENSE)
