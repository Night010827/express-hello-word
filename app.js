import express from 'express'
import expressWs from 'express-ws'
import { fileURLToPath } from 'url'
import path from 'path'

const app = express()
const wsInstance = expressWs(app)
const aWss = wsInstance.getWss()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use(express.static(path.join(__dirname, 'public')))

// サーバー側で各メッセージのリアクション数を記録するオブジェクト
const serverReactions = {}

app.ws('/ws', (ws, req) => {
  console.log('Client connected')

  ws.on('message', (msg) => {
    try {
      const decodedMsg = msg.toString();
      const data = JSON.parse(decodedMsg);

      // チャット送信
      if (data.type === 'chat') {
        const chatPayload = JSON.stringify(data)
        aWss.clients.forEach((client) => {
          if (client.readyState === 1) client.send(chatPayload)
        })
      } 
      
      // リアクション集計処理
      else if (data.type === 'reaction') {
        const { msgId, emoji, action, userId } = data

        // メッセージごとの保存枠がなければ作成
        if (!serverReactions[msgId]) {
          serverReactions[msgId] = {}
        }
        // 絵文字ごとのカウント初期化
        if (serverReactions[msgId][emoji] === undefined) {
          serverReactions[msgId][emoji] = 0
        }

        // アクションに応じてカウントを増減
        if (action === 'add') {
          serverReactions[msgId][emoji] += 1
        } else if (action === 'remove') {
          serverReactions[msgId][emoji] = Math.max(0, serverReactions[msgId][emoji] - 1)
        }

        // 確定した合計数を全員にブロードキャスト
        const responseData = JSON.stringify({
          type: 'reaction',
          msgId: msgId,
          emoji: emoji,
          action: action,
          userId: userId,
          count: serverReactions[msgId][emoji]
        })

        aWss.clients.forEach((client) => {
          if (client.readyState === 1) client.send(responseData)
        })
      }
    } catch (e) {
      console.error("Server processing error:", e);
    }
  })

  ws.on('close', () => console.log('Client disconnected'))
})

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})