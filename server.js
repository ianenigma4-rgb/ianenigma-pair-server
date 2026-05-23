const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const pino = require('pino')

const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    delay
} = require('@whiskeysockets/baileys')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// Store active pairing sessions
const sessions = new Map()

// Clean up old sessions every 5 minutes
setInterval(() => {
    const now = Date.now()
    for (const [id, session] of sessions.entries()) {
        if (now - session.createdAt > 5 * 60 * 1000) {
            try {
                session.sock?.end()
                // Clean up session folder
                const sessionDir = path.join(__dirname, 'sessions', id)
                if (fs.existsSync(sessionDir)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true })
                }
            } catch (_) {}
            sessions.delete(id)
        }
    }
}, 5 * 60 * 1000)

// ── GET /code?number=256XXXXXXXXX ────────────────────────────────────────────
app.get('/code', async (req, res) => {
    let number = (req.query.number || '').replace(/[^0-9]/g, '').trim()

    if (!number || number.length < 7 || number.length > 20) {
        return res.status(400).json({
            success: false,
            error: 'Invalid phone number. Include country code e.g. 256700000000'
        })
    }

    // Prevent duplicate requests for same number
    if (sessions.has(number)) {
        const existing = sessions.get(number)
        if (existing.code) {
            return res.json({ success: true, code: existing.code })
        }
        return res.status(429).json({
            success: false,
            error: 'Pairing already in progress for this number. Wait 30 seconds.'
        })
    }

    const sessionDir = path.join(__dirname, 'sessions', number)
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })

    let sock
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ['IANENIGMA-PAIR', 'Chrome', '4.0.0'],
            generateHighQualityLinkPreview: false,
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 30000,
        })

        sessions.set(number, { sock, code: null, createdAt: Date.now() })

        sock.ev.on('creds.update', saveCreds)

        // Wait for socket to be ready then request code
        await delay(2000)

        if (!sock.authState.creds.registered) {
            const code = await sock.requestPairingCode(number)
            const formatted = code?.match(/.{1,4}/g)?.join('-') || code

            // Store code
            const session = sessions.get(number)
            if (session) session.code = formatted

            // Clean up after 2 minutes
            setTimeout(() => {
                try {
                    sock?.end()
                    if (fs.existsSync(sessionDir)) {
                        fs.rmSync(sessionDir, { recursive: true, force: true })
                    }
                } catch (_) {}
                sessions.delete(number)
            }, 2 * 60 * 1000)

            return res.json({ success: true, code: formatted })
        } else {
            sessions.delete(number)
            return res.status(400).json({
                success: false,
                error: 'This number already has an active session.'
            })
        }

    } catch (err) {
        console.error('Pairing error:', err.message)
        try { sock?.end() } catch (_) {}
        try {
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true })
            }
        } catch (_) {}
        sessions.delete(number)

        return res.status(500).json({
            success: false,
            error: 'Failed to generate pairing code. Try again.'
        })
    }
})

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        bot: 'IANENIGMA MD BOT',
        sessions: sessions.size,
        uptime: Math.floor(process.uptime()) + 's'
    })
})

// ── Serve frontend ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.listen(PORT, () => {
    console.log(`🦇 IANENIGMA Pair Server running on port ${PORT}`)
})
