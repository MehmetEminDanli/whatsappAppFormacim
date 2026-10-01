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
const handoffTimeoutMinutes = parseInt(process.env.HANDOFF_TIMEOUT_MINUTES || '120', 10);

console.log('==================================================');
console.log('   Formacım (formaciim.com) WhatsApp AI Botu');
console.log('   [Motor: Baileys - Hibrit Temsilci Destekli]');
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

// ==========================================
// 🛡️ HİBRİT TEMSİLCİ YÖNETİMİ (HANDOFF SİSTEMİ)
// ==========================================
const HANDOFF_FILE = path.join(__dirname, 'handoff_sessions.json');
const pausedChats = new Map(); // jid -> resumeTimestamp

function loadHandoffSessions() {
  try {
    if (fs.existsSync(HANDOFF_FILE)) {
      const data = JSON.parse(fs.readFileSync(HANDOFF_FILE, 'utf8'));
      const now = Date.now();
      for (const [jid, expireTime] of Object.entries(data)) {
        if (typeof expireTime === 'number' && expireTime > now) {
          pausedChats.set(jid, expireTime);
        }
      }
      if (pausedChats.size > 0) {
        console.log(`[Handoff] Kayıtlı ${pausedChats.size} aktif temsilci oturumu hafızaya yüklendi.`);
      }
    }
  } catch (err) {
    console.error('[Handoff] Oturum dosyası okunurken hata:', err.message);
  }
}

function saveHandoffSessions() {
  try {
    const obj = {};
    const now = Date.now();
    for (const [jid, expireTime] of pausedChats.entries()) {
      if (expireTime > now) {
        obj[jid] = expireTime;
      }
    }
    fs.writeFileSync(HANDOFF_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('[Handoff] Oturum kaydedilirken hata:', err.message);
  }
}

function pauseChat(jid, minutes = handoffTimeoutMinutes) {
  const expireTime = Date.now() + minutes * 60 * 1000;
  pausedChats.set(jid, expireTime);
  saveHandoffSessions();
}

function resumeChat(jid) {
  if (pausedChats.has(jid)) {
    pausedChats.delete(jid);
    saveHandoffSessions();
  }
}

function isChatPaused(jid) {
  if (!pausedChats.has(jid)) return false;
  const expireTime = pausedChats.get(jid);
  if (Date.now() > expireTime) {
    pausedChats.delete(jid);
    saveHandoffSessions();
    return false;
  }
  return true;
}

function getPauseRemainingMinutes(jid) {
  if (!pausedChats.has(jid)) return 0;
  const diff = pausedChats.get(jid) - Date.now();
  return diff > 0 ? Math.ceil(diff / (60 * 1000)) : 0;
}

loadHandoffSessions();

// Bulut ortamları (Render vb.) için 7/24 Sağlık Kontrolü ve Canlı Web QR Paneli
const port = process.env.PORT || 7860;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

  if (isBotReady) {
    const activePausedCount = pausedChats.size;
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
          .info-box { background: #182229; border-radius: 10px; padding: 12px; margin-top: 20px; font-size: 13px; color: #aebac1; text-align: left; }
          .info-box b { color: #00a884; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">● BOT AKTİF VE BAĞLI</div>
          <h2>Formacım WhatsApp Botu</h2>
          <p>Yapay zeka asistanı WhatsApp Business hesabınıza bağlıdır ve gelen müşteri mesajlarını 7/24 otomatik yanıtlamaktadır. ⚽✨</p>
          <div class="info-box">
            <b>🛡️ Akıllı Temsilci Koruması:</b><br>
            • Gerçek temsilci müşteriye yazdığında bot otomatik susar.<br>
            • Müşteri 'temsilci/yetkili' istediğinde bot temsilciye devreder.<br>
            • Komutlar: Temsilci sohbete <b>!dur</b> yazarak botu kapatabilir, <b>!bot</b> yazarak tekrar açabilir.<br>
            • Şu an temsilcide olan sohbet sayısı: <b>${activePausedCount}</b>
          </div>
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

        const jid = msg.key.remoteJid;
        if (!jid) continue;

        // Durum güncellemelerini (Story / Broadcast) atla
        if (jid === 'status@broadcast') continue;

        // Grup mesajlarını atla (isteğe bağlı)
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

        // =========================================================================
        // 1. DURUM: MESAJI BİZ (SATIŞ TEMSİLCİSİ) GÖNDERDİYSEK (msg.key.fromMe === true)
        // =========================================================================
        if (msg.key.fromMe) {
          const lowerText = messageText.toLowerCase();

          // Temsilci komutu: Botu yeniden aç (!bot, !ac, !basla)
          if (lowerText === '!bot' || lowerText === '!ac' || lowerText === '!basla') {
            resumeChat(jid);
            console.log(`\n[Temsilci Komutu] 🟢 Temsilci '${messageText}' yazdı. Bot bu müşteri (${senderNumber}) için YENİDEN DEVREYE ALINDI.`);
            continue;
          }

          // Temsilci komutu: Botu uzun süreli durdur (!dur, !sus, !bekle)
          if (lowerText === '!dur' || lowerText === '!sus' || lowerText === '!bekle') {
            pauseChat(jid, 24 * 60); // 24 saat durdur
            console.log(`\n[Temsilci Komutu] 🔴 Temsilci '${messageText}' yazdı. Bot bu müşteri (${senderNumber}) için 24 saat DURDURULDU.`);
            continue;
          }

          // Temsilci müşteriye normal bir mesaj yazdı -> Bot aradan çekilir (otomatik sessize alınır)
          if (ignoreMe) {
            pauseChat(jid, handoffTimeoutMinutes);
            console.log(`\n[Temsilci Devrede] 👤 Temsilci müşteriye (${senderNumber}) bizzat yazdı. Bot bu müşteri için ${handoffTimeoutMinutes} dk OTOMATİK SESSİZE ALINDI.`);
            continue;
          }
        }

        // =========================================================================
        // 2. DURUM: MESAJ MÜŞTERİDEN GELDİ
        // =========================================================================

        const senderName = msg.pushName || senderNumber;

        // A) Müşteri için bot şu anda sessizde mi (Temsilci ilgileniyor mu)?
        if (isChatPaused(jid)) {
          const remaining = getPauseRemainingMinutes(jid);
          console.log(`\n[Bot Sessizde] Müşteri (${senderName}): "${messageText}" yazdı. Ancak sohbet temsilcide (Kalan süre: ~${remaining} dk). Bot araya girmedi.`);
          continue;
        }

        // B) Medya kontrolü (fotoğraf, ses, video, belge)
        const hasMedia = Boolean(
          msg.message.imageMessage ||
          msg.message.videoMessage ||
          msg.message.audioMessage ||
          msg.message.documentMessage
        );
        if (!messageText && hasMedia) {
          console.log(`[Mesaj] ${senderName} (${senderNumber}): Medya gönderdi.`);
          const mediaWarn = 'Şu anda görselleri veya ses kayıtlarını otomatik işleyemiyorum. Sorularınızı lütfen yazılı olarak iletebilir misiniz? ⚽';
          await sock.sendMessage(jid, { text: mediaWarn });
          continue;
        }

        if (!messageText) continue;

        console.log(`\n[Gelen Mesaj] Kimden: ${senderName} (${senderNumber})`);
        console.log(`[İçerik]: ${messageText}`);

        // C) Özel komut: Sohbet hafızasını sıfırlama
        if (messageText.toLowerCase() === '!sifirla' || messageText.toLowerCase() === '!reset') {
          resetChatSession(jid);
          resumeChat(jid);
          const resetMsg = '🔄 Sohbet geçmişimiz sıfırlandı. Size formaciim.com hakkında nasıl yardımcı olabilirim? ⚽';
          await sock.sendMessage(jid, { text: resetMsg });
          console.log(`[Sohbet Sıfırlandı]: ${senderName} (${jid})`);
          continue;
        }

        // D) Müşteri temsilci / yetkili istiyor mu? (Akıllı Handoff Tespiti)
        const humanRequestRegex = /(müşteri temsilci|yetkili|canlı destek|insanla (görüş|konuş)|temsilciye bağla|yetkiliye bağla|yetkili biri|gerçek kişi|müşteri hizmetleri)/i;
        if (humanRequestRegex.test(messageText)) {
          const handoffMsg = 'Sizi yetkili satış temsilcimize aktarıyorum. Mesajınızı ilettim, ekibimiz en kısa sürede bizzat sizinle ilgilenecektir. Lütfen hatta kalın. ⚽';
          await sock.sendMessage(jid, { text: handoffMsg });
          pauseChat(jid, handoffTimeoutMinutes * 2); // 4 saat botu sessize al
          console.log(`[Müşteri Talebi] 🤝 ${senderName} (${senderNumber}) yetkili talep etti. Bot temsilciye devredildi ve sessize alındı.`);
          continue;
        }

        // E) Anti-Ban Koruması: Peş peşe atılan mesajlarda doğal bekleme
        const now = Date.now();
        const lastReply = userLastReplied.get(jid) || 0;
        if (now - lastReply < 2500) {
          console.log(`[Anti-Spam] ${senderName} peş peşe yazdı, bekleniyor...`);
          await sleep(2000);
        }
        userLastReplied.set(jid, Date.now());

        // F) WhatsApp "Yazıyor..." (typing) simülasyonu
        try {
          await sock.sendPresenceUpdate('composing', jid);
        } catch (_) {}

        // G) Gemini'den yanıt al
        const aiResponse = await askGemini(jid, messageText, sessionTimeout);

        try {
          await sock.sendPresenceUpdate('paused', jid);
        } catch (_) {}

        // Eğer bot yanıt üretemediyse, donduysa veya zaman aşımına uğradıysa SESSİZ KAL
        if (!aiResponse || !aiResponse.trim()) {
          console.log(`[Sessiz Mod] Yanıt üretilemedi veya zaman aşımı. Müşteriye mesaj atılmadı.`);
          continue;
        }

        // H) Anti-Ban & İnsan Simülasyonu: 2.5 - 4.5 saniye arası doğal düşünme/yazma gecikmesi
        const humanDelay = Math.floor(Math.random() * 2000) + 2500;
        console.log(`[Doğal Yanıt Beklemesi] ${humanDelay}ms...`);
        await sleep(humanDelay);

        // I) Müşteriye yanıt gönder
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
