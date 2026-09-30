require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { initGemini, askGemini, resetChatSession } = require('./gemini');

// Yapılandırma kontrolleri
const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const ignoreGroups = process.env.IGNORE_GROUPS !== 'false';
const ignoreMe = process.env.IGNORE_ME !== 'false';
const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10);

console.log('==================================================');
console.log('   Formacım (formaciim.com) WhatsApp AI Botu');
console.log('==================================================');

// Gemini AI başlatma
try {
  initGemini(apiKey, modelName);
} catch (err) {
  console.error('\n❌ BAŞLATMA HATASI:', err.message);
  console.log('Lütfen .env dosyasını açıp geçerli GEMINI_API_KEY değerini girin.\n');
  process.exit(1);
}

const fs = require('fs');
const http = require('http');

let latestQR = null;
let isBotReady = false;

// Bulut ortamları (Render vb.) için 7/24 Sağlık Kontrolü ve Canlı Web QR Paneli
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
          <p>Telefonunuzdan <b>WhatsApp Business &gt; Bağlı Cihazlar &gt; Cihaz Bağla</b> seçeneğine dokunup aşağıdaki karekodu okutun:</p>
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
      <style>body { font-family: sans-serif; text-align: center; padding-top: 60px; background: #f0f2f5; }</style>
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

// Windows üzerinde yüklü Chrome veya Edge'i otomatik tespit etme
function getBrowserExecutablePath() {
  const possiblePaths = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`[Tarayıcı] Bulunan tarayıcı kullanılıyor: ${p}`);
      return p;
    }
  }
  return undefined;
}

// WhatsApp Web İstemcisini Yapılandırma
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth'
  }),
  puppeteer: {
    headless: true,
    executablePath: getBrowserExecutablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  },
  webVersionCache: {
    type: 'none'
  }
});

// QR Kodu Terminalde ve Web Sayfasında Gösterme
client.on('qr', (qr) => {
  latestQR = qr;
  isBotReady = false;
  console.log('\n[WhatsApp] Giriş için QR kod oluşturuldu:');
  console.log('Lütfen telefonunuzdan WhatsApp uygulamasını açın:');
  console.log('1. Ayarlar / Seçenekler (Üç nokta) menüsüne gidin');
  console.log('2. "Bağlı Cihazlar" seçeneğine dokunun');
  console.log('3. "Cihaz Bağla" diyerek aşağıdaki QR kodu taratın:\n');
  qrcode.generate(qr, { small: true });
});

// Kimlik Doğrulama Başarılı
client.on('authenticated', () => {
  console.log('[WhatsApp] ✅ Oturum başarıyla doğrulandı.');
});

// Kimlik Doğrulama Hatası
client.on('auth_failure', (msg) => {
  console.error('[WhatsApp] ❌ Kimlik doğrulama başarısız:', msg);
});

// Bot Hazır Duruma Geldiğinde
client.on('ready', () => {
  isBotReady = true;
  latestQR = null;
  console.log('\n==================================================');
  console.log('🚀 BOT AKTİF VE ÇALIŞIYOR!');
  console.log('Müşteri mesajları bekleniyor ve Gemini ile yanıtlanacak...');
  console.log('==================================================\n');
});

// Bağlantı Kesildiğinde
client.on('disconnected', (reason) => {
  console.log('[WhatsApp] ⚠️ Bağlantı kesildi. Sebep:', reason);
});

// İnsan benzeri bekleme yardımcısı
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Kullanıcı başına spam önleme takibi
const userLastReplied = new Map();

// Gelen Mesajları Dinleme
client.on('message', async (msg) => {
  try {
    // 1. Kendi gönderdiğimiz mesajları atla
    if (ignoreMe && msg.fromMe) {
      return;
    }

    // 2. Durum güncellemelerini (Story) atla
    if (msg.from === 'status@broadcast') {
      return;
    }

    // 3. Grup mesajlarını atla (isteğe bağlı)
    const isGroup = msg.from.endsWith('@g.us');
    if (ignoreGroups && isGroup) {
      return;
    }

    const sender = msg.from;
    const senderName = msg._data?.notifyName || sender.replace('@c.us', '');
    const messageText = (msg.body || '').trim();

    // Medya mesajı gelmiş ve metin boşsa
    if (!messageText && msg.hasMedia) {
      console.log(`[Mesaj] ${senderName} (${sender}): Medya gönderdi.`);
      const mediaWarn = 'Şu anda görselleri veya ses kayıtlarını otomatik işleyemiyorum. Sorularınızı lütfen yazılı olarak iletebilir misiniz? ⚽';
      try {
        await msg.reply(mediaWarn);
      } catch (_) {
        await client.sendMessage(sender, mediaWarn);
      }
      return;
    }

    if (!messageText) {
      return;
    }

    console.log(`\n[Gelen Mesaj] Kimden: ${senderName} (${sender})`);
    console.log(`[İçerik]: ${messageText}`);

    // Özel komut: Sohbet hafızasını sıfırlama
    if (messageText.toLowerCase() === '!sifirla' || messageText.toLowerCase() === '!reset') {
      resetChatSession(sender);
      const resetMsg = '🔄 Sohbet geçmişimiz sıfırlandı. Size formaciim.com hakkında nasıl yardımcı olabilirim? ⚽';
      try {
        await msg.reply(resetMsg);
      } catch (_) {
        await client.sendMessage(sender, resetMsg);
      }
      console.log(`[Sohbet Sıfırlandı]: ${sender}`);
      return;
    }

    // Anti-Ban Koruması: Peş peşe atılan mesajlarda doğal bekleme
    const now = Date.now();
    const lastReply = userLastReplied.get(sender) || 0;
    if (now - lastReply < 2500) {
      console.log(`[Anti-Spam] ${senderName} peş peşe yazdı, insan davranışı için bekleniyor...`);
      await sleep(2000);
    }
    userLastReplied.set(sender, Date.now());

    // Gemini'den yanıt al
    const aiResponse = await askGemini(sender, messageText, sessionTimeout);

    // Eğer bot yanıt üretemediyse, donduysa veya zaman aşımına uğradıysa SESSİZ KAL (mesaj gönderme)
    if (!aiResponse || !aiResponse.trim()) {
      console.log(`[Sessiz Mod] Yanıt üretilemedi veya sistem zaman aşımına uğradı. Müşteriye mesaj atılmadı.`);
      return;
    }

    // Anti-Ban & İnsan Simülasyonu: 2.5 - 4.5 saniye arası doğal düşünme/yazma gecikmesi
    // WhatsApp'ın robot tespit algoritmalarını tamamen engeller
    const humanDelay = Math.floor(Math.random() * 2000) + 2500;
    console.log(`[Doğal Yanıt Beklemesi] ${humanDelay}ms...`);
    await sleep(humanDelay);

    // Müşteriye yanıt gönder (Önce alıntılı yanıt denenir, hata verirse doğrudan gönderilir)
    try {
      await msg.reply(aiResponse);
    } catch (replyErr) {
      console.log(`[Bilgi] msg.reply yerine doğrudan sendMessage kullanılıyor: ${replyErr.message}`);
      await client.sendMessage(sender, aiResponse);
    }
    console.log(`[Cevap Gönderildi -> ${senderName}]:\n${aiResponse}\n`);

  } catch (err) {
    console.error('[Mesaj İşleme Hatası]:', err);
  }
});

// İstemciyi başlat
client.initialize();

