require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { findBeauty } = require('./func/findBeauty');
const LineClient = require('./lineClient');

const app = express();
const PORT = process.env.PORT || 8080; // Cloud Run default port

// 設定 LINE config
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// 檢查必要的環境變數
if (!config.channelAccessToken || !config.channelSecret) {
  console.error('❌ Missing required environment variables:');
  console.error('  CHANNEL_ACCESS_TOKEN:', config.channelAccessToken ? '✓ set' : '✗ missing');
  console.error('  CHANNEL_SECRET:', config.channelSecret ? '✓ set' : '✗ missing');
} else {
  console.log('✓ Environment variables are set correctly');
}

// 初始化自訂 LINE 客戶端
const client = new LineClient(config);

// 保存原始請求體用於簽章驗證
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// 驗證 LINE 簽章的中介軟體
const validateLineSignature = (req, res, next) => {
  try {
    const signature = req.get('X-Line-Signature') || '';
    const channelSecret = config.channelSecret;
    
    if (!channelSecret) {
      console.error('CHANNEL_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const body = req.rawBody || JSON.stringify(req.body);
    
    const hash = crypto
      .createHmac('SHA256', channelSecret)
      .update(body)
      .digest('base64');
    
    if (hash !== signature) {
      console.error('Invalid signature');
      console.error('Expected:', signature);
      console.error('Got:', hash);
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    next();
  } catch (error) {
    console.error('Error validating signature:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 處理 GET 請求（LINE 驗證 webhook 時使用）
app.get('/webhook', (req, res) => {
  console.log('Webhook GET request received');
  res.status(200).send('OK');
});

// 解析 webhook 請求
app.post('/webhook', validateLineSignature, (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch(err => {
      console.error('Webhook Error:', err);
      res.status(500).end();
    });
});

// 處理訊息事件
async function handleEvent(event) {
    try {
        if (event.type !== 'message' || event.message.type !== 'text') {
            return null;
        }
      
        // 處理 "看妹子" 指令
        if (event.message.text.trim() === '看妹子') {
            const context = {
                reply: async (messages) => {
                    try {
                        const messageArray = Array.isArray(messages) ? messages : [messages];
                        await client.replyMessage(event.replyToken, messageArray.map(msg => {
                            if (msg.type === 'text') {
                                return {
                                    type: 'text',
                                    text: msg.text
                                };
                            } else if (msg.type === 'image') {
                                return {
                                    type: 'image',
                                    originalContentUrl: msg.originalContentUrl,
                                    previewImageUrl: msg.previewImageUrl || msg.originalContentUrl
                                };
                            }
                            return null;
                        }).filter(Boolean));
                    } catch (error) {
                        console.error('Error in reply:', error);
                        throw error;
                    }
                }
            };
            
            // 調用 findBeauty 函數
            return await findBeauty(context);
        }
        
        // 預設回應
        const reply = {
          type: 'text',
          text: `你說的是：${event.message.text}`
        };
      
        return client.replyMessage(event.replyToken, reply);
    } catch (error) {
        console.error('Error in handleEvent:', error);
        throw error;
    }
}

// 推播 API （GET）
app.get('/push', async (req, res) => {
  const userId = process.env.USER_ID; // 使用環境變數中的 USER_ID
  const message = {
    type: 'text',
    text: '這是一條推播訊息！',
  };
  try {
    await client.pushMessage(userId, message);
    res.json({ success: true });
  } catch (error) {
    console.error('推播失敗:', error);
    res.status(500).json({ success: false, error: '推播失敗', details: error.message });
  }
});

// 靜態文件
app.use(express.static('public'));

// API 獲取表特版圖片
app.get('/api/beauty', async (req, res) => {
  try {
    // 創建一個模擬的 context 物件來包裝 LINE 的 reply 方法
    const context = {
      reply: (messages) => {
        return new Promise((resolve, reject) => {
          try {
            // 找出圖片和連結
            const imageMessage = messages.find(m => m.type === 'image');
            const textMessage = messages.find(m => m.type === 'text');
            
            const result = {
              success: true,
              imageUrl: imageMessage ? imageMessage.originalContentUrl : null,
              postUrl: textMessage ? textMessage.text : null
            };
            
            res.json(result);
            resolve();
          } catch (error) {
            console.error('處理回調時出錯:', error);
            reject(error);
          }
        });
      }
    };

    // 調用 findBeauty 函數
    await findBeauty(context);
  } catch (error) {
    console.error('API 錯誤:', error);
    res.status(500).json({
      success: false,
      error: '獲取圖片時發生錯誤'
    });
  }
});

// 處理 SPA 路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
