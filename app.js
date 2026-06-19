import express from 'express'
import expressWs from 'express-ws'
import { fileURLToPath } from 'url'
import path from 'path'

const app = express()
expressWs(app)

// ➔ 修正：Render上での404エラーを完全に防ぐための絶対パス設定
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use(express.static(path.join(__dirname, 'public')))

// 誰かが接続したときの処理
app.ws('/ws', (ws, req) => {
  console.log('Client connected')

  ws.on('message', (msg) => {
    // 届いたデータを「接続している全員」に転送する処理
    const aWss = expressWs(app).getWss('/ws')
    aWss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(msg)
      }
    })
  })

  ws.on('close', () => {
    console.log('Client disconnected')
  })
})

const port = process.env.PORT || 10000 // Renderのポートに対応
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})