import express from 'express'
import expressWs from 'express-ws'
import { fileURLToPath } from 'url'
import path from 'path'

const app = express()

// ★ 修正：expressWs の初期化をここで行い、インスタンス（wsInstance）を受け取る
const wsInstance = expressWs(app)
// ★ 修正：接続全体を管理する wss（WebSocket Server）を外側で定義しておく
const aWss = wsInstance.getWss()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use(express.static(path.join(__dirname, 'public')))

// サーバー側で各メッセージのリアクション数を記録するオブジェクト
const serverReactions = {}

// WebSocket接続時の処理
app.ws('/ws', (ws, req) => {
  console.log('★ 新しいブラウザが接続しました！')

  ws.on('message', (msg) => {
    try {
      // msg を確実に文字列に変換してから JSON パース
      const decodedMsg = msg.toString();
      console.log('サーバーが受信した生データ:', decodedMsg);

      const data = JSON.parse(decodedMsg);

      // パターン1：通常のチャットメッセージが届いたとき
      if (data.type === 'chat') {
        const chatPayload = JSON.stringify(data)
        
        console.log(`現在接続中の人数: ${aWss.clients.size} 人に一斉送信します`);

        // ★ 修正：外側で定義した aWss.clients を使って全員に転送
        aWss.clients.forEach((client) => {
          if (client.readyState === 1) { // 1 = OPEN (接続中)
            client.send(chatPayload)
          }
        })
      } 
      
      // パターン2：リアクション（👍や❤️）が届いたとき
      else if (data.type === 'reaction') {
        const { msgId, emoji, action, userId } = data

        if (!serverReactions[msgId]) serverReactions[msgId] = {}
        if (!serverReactions[msgId][emoji]) serverReactions[msgId][emoji] = 0

        if (action === 'add') {
          serverReactions[msgId][emoji] += 1
        } else if (action === 'remove') {
          serverReactions[msgId][emoji] = Math.max(0, serverReactions[msgId][emoji] - 1)
        }

        const responseData = JSON.stringify({
          type: 'reaction',
          msgId: msgId,
          emoji: emoji,
          action: action,
          userId: userId,
          count: serverReactions[msgId][emoji]
        })

        aWss.clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(responseData)
          }
        })
      }
    } catch (e) {
      console.error("サーバー側での処理エラー:", e);
    }
  })

  ws.on('close', () => {
    console.log('ブラウザが切断しました')
  })
})

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})