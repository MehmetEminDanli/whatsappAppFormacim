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

// QR Kodu Terminalde Gösterme
client.on('qr', (qr) => {
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

