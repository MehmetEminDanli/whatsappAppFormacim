require('dotenv').config();
const path = require('path');
const fs = require('fs');
const http = require('http');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { initGemini, askGemini, resetChatSession } = require('./gemini');

// Yapılandırma kontrolleri
const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const ignoreGroups = process.env.IGNORE_GROUPS !== 'false';
const ignoreMe = process.env.IGNORE_ME !== 'false';
const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10);

console.log('==================================================');
console.log('   Formacım (formaciim.com) WhatsApp AI Botu');
console.log('   [Motor: Baileys - Ultra Hafif & 7/24 Bulut]');
console.log('==================================================');

// Gemini AI başlatma
try {
  initGemini(apiKey, modelName);
} catch (err) {
  console.error('\n❌ BAŞLATMA HATASI:', err.message);
  console.log('Lütfen .env dosyasını açıp geçerli GEMINI_API_KEY değerini girin.\n');
  process.exit(1);
}

let latestQR = null;
let isBotReady = false;
let currentSock = null;

// Bulut ortamları (Render, Hugging Face vb.) için 7/24 Sağlık Kontrolü ve Canlı Web QR Paneli
const port = process.env.PORT || 7860;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

  if (isBotReady) {
    return res.end(`
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Formacım Bot - Aktif</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px 20px; background: #0b141a; color: #e9edef; }
          .card { background: #111b21; max-width: 480px; margin: 0 auto; padding: 40px 20px; border-radius: 16px; border: 1px solid #222e35; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .badge { display: inline-block; background: #00a884; color: #fff; padding: 8px 18px; border-radius: 20px; font-weight: bold; margin-bottom: 20px; font-size: 16px; }
          h2 { margin: 0 0 10px; color: #fff; }
          p { color: #8696a0; font-size: 15px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">● BOT AKTİF VE BAĞLI</div>
          <h2>Formacım WhatsApp Botu</h2>
          <p>Yapay zeka asistanı WhatsApp Business hesabınıza bağlıdır ve gelen müşteri mesajlarını 7/24 otomatik yanıtlamaktadır. ⚽✨</p>
        </div>
      </body>
      </html>
    `);
  }

  if (latestQR) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=15&data=${encodeURIComponent(latestQR)}`;
    return res.end(`
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Formacım WhatsApp QR Kod</title>
        <meta http-equiv="refresh" content="20">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px 15px; background: #f0f2f5; color: #111b21; }
          .card { background: #ffffff; max-width: 440px; margin: 0 auto; padding: 30px 20px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          h2 { margin-top: 0; color: #111b21; font-size: 22px; }
          p { color: #54656f; font-size: 15px; margin: 10px 0 20px; }
          .qr-box { background: #fff; border: 2px solid #e9edef; border-radius: 12px; display: inline-block; padding: 10px; }
          .qr-box img { display: block; max-width: 100%; height: auto; }
          .tip { font-size: 13px; color: #8696a0; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>⚽ Formacım WhatsApp Giriş</h2>
          <p>Telefonunuzdan <b>WhatsApp &gt; Bağlı Cihazlar &gt; Cihaz Bağla</b> seçeneğine dokunup aşağıdaki karekodu okutun:</p>
          <div class="qr-box">
            <img src="${qrImageUrl}" alt="WhatsApp QR Kod" width="300" height="300" />
          </div>
          <p class="tip">🔄 Karekod her 20 saniyede bir otomatik yenilenir.</p>
        </div>
      </body>
      </html>
    `);
  }

  res.end(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="refresh" content="5">
      <title>Yükleniyor...</title>
      <style>body { font-family: sans-serif; text-align: center; padding-top: 60px; background: #f0f2f5; color: #111b21; }</style>
    </head>
    <body>
      <h2>⏳ WhatsApp Başlatılıyor...</h2>
      <p>Karekod hazırlanıyor, sayfa 5 saniye içinde otomatik yenilenecektir...</p>
    </body>
    </html>
  `);
});

server.listen(port, () => {
  console.log(`[Web Sunucu] Port ${port} üzerinde web paneli dinleniyor.`);
});

// İnsan benzeri bekleme yardımcısı
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Kullanıcı başına spam önleme takibi
const userLastReplied = new Map();

/**
 * WhatsApp Bağlantısını Başlatan Ana Fonksiyon (Baileys)
 */
async function startWhatsApp() {
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
  } = await import('@whiskeysockets/baileys');

  const authDir = path.join(__dirname, 'baileys_auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
    version: [2, 3000, 1015901307],
    isLatest: true
  }));

  console.log(`[WhatsApp] Baileys sürümü: ${version.join('.')} (En güncel: ${isLatest})`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.windows('Desktop'),
    syncFullHistory: false, // RAM tasarrufu için geçmiş mesajları çekmez
    generateHighQualityLinkPreview: true,
    markOnlineOnConnect: true
  });

  currentSock = sock;

  // Kimlik ve Oturum Dosyalarını Kaydet
  sock.ev.on('creds.update', saveCreds);

  // Bağlantı Durumu Değişiklikleri
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQR = qr;
      isBotReady = false;
      console.log('\n[WhatsApp] Giriş için QR kod oluşturuldu:');
      console.log('Lütfen telefonunuzdan WhatsApp uygulamasını açın:');
      console.log('1. Ayarlar / Seçenekler (Üç nokta) menüsüne gidin');
      console.log('2. "Bağlı Cihazlar" seçeneğine dokunun');
      console.log('3. "Cihaz Bağla" diyerek aşağıdaki QR kodu taratın:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      isBotReady = false;
      latestQR = null;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`[WhatsApp] ⚠️ Bağlantı kapandı (Kod: ${statusCode}). Yeniden bağlanıyor: ${shouldReconnect}`);

      if (shouldReconnect) {
        console.log('[WhatsApp] 🔄 3 saniye içinde yeniden bağlanılıyor...');
        setTimeout(startWhatsApp, 3000);
      } else {
        console.log('[WhatsApp] ❌ Oturum kapatıldı (Logged Out). Yeni karekod için logout.js çalıştırabilirsiniz.');
      }
    } else if (connection === 'open') {
      isBotReady = true;
      latestQR = null;
      console.log('\n==================================================');
      console.log('🚀 BOT AKTİF VE ÇALIŞIYOR!');
      console.log('Müşteri mesajları bekleniyor ve Gemini ile yanıtlanacak...');
      console.log('==================================================\n');
    }
  });

  // Gelen Mesajları Dinleme ve Yanıtlama
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg.message) continue;

        // 1. Kendi gönderdiğimiz mesajları atla
        if (ignoreMe && msg.key.fromMe) continue;

        const jid = msg.key.remoteJid;
        if (!jid) continue;

        // 2. Durum güncellemelerini (Story / Broadcast) atla
        if (jid === 'status@broadcast') continue;

        // 3. Grup mesajlarını atla (isteğe bağlı)
        const isGroup = jid.endsWith('@g.us');
        if (ignoreGroups && isGroup) continue;

        // Mesaj metnini farklı mesaj tiplerinden ayıkla
        const messageText = (
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          ''
        ).trim();

        const senderNumber = jid.split('@')[0];
        const senderName = msg.pushName || senderNumber;

        // Medya var ama metin yoksa kibarca uyar
        const hasMedia = Boolean(msg.message.imageMessage || msg.message.videoMessage || msg.message.audioMessage || msg.message.documentMessage);
        if (!messageText && hasMedia) {
          console.log(`[Mesaj] ${senderName} (${senderNumber}): Medya gönderdi.`);
          const mediaWarn = 'Şu anda görselleri veya ses kayıtlarını otomatik işleyemiyorum. Sorularınızı lütfen yazılı olarak iletebilir misiniz? ⚽';
          await sock.sendMessage(jid, { text: mediaWarn });
          continue;
        }

        if (!messageText) continue;

        console.log(`\n[Gelen Mesaj] Kimden: ${senderName} (${senderNumber})`);
        console.log(`[İçerik]: ${messageText}`);

        // Özel komut: Sohbet hafızasını sıfırlama
        if (messageText.toLowerCase() === '!sifirla' || messageText.toLowerCase() === '!reset') {
          resetChatSession(jid);
          const resetMsg = '🔄 Sohbet geçmişimiz sıfırlandı. Size formaciim.com hakkında nasıl yardımcı olabilirim? ⚽';
          await sock.sendMessage(jid, { text: resetMsg });
          console.log(`[Sohbet Sıfırlandı]: ${senderName} (${jid})`);
          continue;
        }

        // Anti-Ban Koruması: Peş peşe atılan mesajlarda doğal bekleme
        const now = Date.now();
        const lastReply = userLastReplied.get(jid) || 0;
        if (now - lastReply < 2500) {
          console.log(`[Anti-Spam] ${senderName} peş peşe yazdı, bekleniyor...`);
          await sleep(2000);
        }
        userLastReplied.set(jid, Date.now());

        // WhatsApp "Yazıyor..." (typing) simülasyonu
        try {
          await sock.sendPresenceUpdate('composing', jid);
        } catch (_) {}

        // Gemini'den yanıt al
        const aiResponse = await askGemini(jid, messageText, sessionTimeout);

        try {
          await sock.sendPresenceUpdate('paused', jid);
        } catch (_) {}

        // Eğer bot yanıt üretemediyse, donduysa veya zaman aşımına uğradıysa SESSİZ KAL
        if (!aiResponse || !aiResponse.trim()) {
          console.log(`[Sessiz Mod] Yanıt üretilemedi veya zaman aşımı. Müşteriye mesaj atılmadı.`);
          continue;
        }

        // Anti-Ban & İnsan Simülasyonu: 2.5 - 4.5 saniye arası doğal düşünme/yazma gecikmesi
        const humanDelay = Math.floor(Math.random() * 2000) + 2500;
        console.log(`[Doğal Yanıt Beklemesi] ${humanDelay}ms...`);
        await sleep(humanDelay);

        // Müşteriye yanıt gönder
        await sock.sendMessage(jid, { text: aiResponse.trim() });
        console.log(`[Cevap Gönderildi -> ${senderName}]:\n${aiResponse.trim()}\n`);

      } catch (err) {
        console.error('[Mesaj İşleme Hatası]:', err);
      }
    }
  });
}

// Botu başlat
startWhatsApp().catch((err) => {
  console.error('[WhatsApp Başlatma Hatası]:', err);
});
