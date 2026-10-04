# vendor/ 第三方函式庫（離線使用）

為了讓決賽現場在沒有網路時也能展示，以下函式庫已從 npm 下載後直接放在本資料夾，不需要 CDN。

| 檔案 | 套件 | 版本 | 授權 |
|---|---|---|---|
| `three.module.js`、`three.core.js` | three | 0.186.1 | MIT（見 `licenses/three-LICENSE.txt`） |
| `gsap.min.js` | gsap | 3.15.0 | GreenSock Standard "No Charge" License（https://gsap.com/standard-license ，可免費用於商業與非商業專案） |
| `echarts.min.js` | echarts | 6.1.0 | Apache-2.0（見 `licenses/echarts-LICENSE.txt`） |

更新方式：

```bash
mkdir /tmp/v && cd /tmp/v && npm init -y && npm install three gsap echarts
cp node_modules/three/build/three.module.js node_modules/three/build/three.core.js \
   node_modules/gsap/dist/gsap.min.js node_modules/echarts/dist/echarts.min.js  <repo>/system/vendor/
```

`three.module.js` 會以相對路徑匯入 `three.core.js`，兩個檔案必須放在一起。頁面透過 import map 把 `three` 對應到 `./vendor/three.module.js`。
