# 🦇 IANENIGMA MD BOT - Pairing Server

> _"I am vengeance. I am the night."_

A free self-hosted pairing server for IANENIGMA MD BOT.

## 🚀 Deploy on Render (Free)

1. Push this folder to a new GitHub repo
2. Go to [render.com](https://render.com) and sign up free
3. Click **New → Web Service**
4. Connect your GitHub repo
5. Set these settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
6. Click **Deploy**
7. Copy your Render URL e.g. `https://ianenigma-pair.onrender.com`

## 🔗 Update Your Bot

In your bot's `commands/pair.js` replace:
```
https://knight-bot-paircode.onrender.com/code?number=
```
With your new Render URL:
```
https://ianenigma-pair.onrender.com/code?number=
```

## 📡 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /` | Pairing website |
| `GET /code?number=256XXXXXXX` | Get pairing code |
| `GET /health` | Server status |

## 👑 IAN ENIGMA EMPIRE · UGANDA
