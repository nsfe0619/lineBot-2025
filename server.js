require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 設定 LINE config
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// 解析 webhook 請求
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch(err => {
      console.error('Webhook Error:', err);
      res.status(500).end();
    });
});

// 處理訊息事件
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const reply = {
    type: 'text',
    text: `你說的是：${event.message.text}`
  };

  return client.replyMessage(event.replyToken, reply);
}

// 推播 API （GET）
app.get('/push', async (req, res) => {
  const userId = 'YOUR_USER_ID'; // 換成你自己的 LINE 使用者 ID
  const message = {
    type: 'text',
    text: '這是伺服器主動推播訊息 📢'
  };

  try {
    await client.pushMessage(userId, message);
    res.send('✅ 推播成功');
  } catch (err) {
    console.error('Push error:', err);
    res.status(500).send('❌ 推播失敗');
  }
});

// ✅ 靜態前端路由（保留未來 Angular 等 UI 空間）
app.use('/', express.static(path.join(__dirname, 'public')));

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
