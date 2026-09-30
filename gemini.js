const { GoogleGenerativeAI } = require('@google/generative-ai');
const { SYSTEM_INSTRUCTION } = require('./prompt');
const { buildProductContext } = require('./productSearch');

let genAI = null;
let model = null;

// Kullanıcı sohbet geçmişi hafızası: contactId -> { chatSession, lastActive }
const sessions = new Map();

/**
 * Gemini servisini başlatır
 */
function initGemini(apiKey, modelName = 'gemini-3.5-flash-lite') {
  if (!apiKey || apiKey === 'BURAYA_GEMINI_API_KEY_YAZIN' || apiKey.trim() === '') {
    throw new Error('Geçerli bir GEMINI_API_KEY bulunamadı! Lütfen .env dosyasını doldurun.');
  }

  genAI = new GoogleGenerativeAI(apiKey.trim());
  model = genAI.getGenerativeModel({
    model: modelName.trim(),
    systemInstruction: SYSTEM_INSTRUCTION
  });

  console.log(`[Gemini] Model hazır: ${modelName}`);
}

/**
 * Kullanıcı için mevcut veya yeni sohbet oturumunu getirir
 */
function getChatSession(contactId, timeoutMinutes = 30) {
  const now = Date.now();
  const timeoutMs = timeoutMinutes * 60 * 1000;

  if (sessions.has(contactId)) {
    const session = sessions.get(contactId);
    if (now - session.lastActive < timeoutMs) {
      session.lastActive = now;
      return session.chatSession;
    }
  }

  // Yeni oturum oluştur
  const chatSession = model.startChat({
    history: []
  });

  sessions.set(contactId, {
    chatSession,
    lastActive: now
  });

  return chatSession;
}

/**
 * Kullanıcının sohbet hafızasını sıfırlar
 */
function resetChatSession(contactId) {
  sessions.delete(contactId);
}

// Zaman aşımı koruma yardımcısı (Donmaları önler)
function withTimeout(promise, ms = 15000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('REQUEST_TIMEOUT: Gemini yanıt süresi 15 saniyeyi aştı.')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

/**
 * Gemini'ye kullanıcı mesajını iletir ve yanıt üretir
 */
async function askGemini(contactId, userMessage, timeoutMinutes = 30) {
  try {
    const chat = getChatSession(contactId, timeoutMinutes);

    // Müşteri mesajına göre sitemizdeki ürün ve linkleri tara
    const productContext = buildProductContext(userMessage);
    const messageToSend = productContext ? `${userMessage}\n${productContext}` : userMessage;

    // 15 saniye zaman aşımı ile çalıştır
    const result = await withTimeout(chat.sendMessage(messageToSend), 15000);
    const response = await result.response;
    const text = response.text();
    return text ? text.trim() : null;
  } catch (error) {
    console.error(`[Gemini Hatası / Zaman Aşımı] (${contactId}):`, error.message);
    // Bot donduğunda veya hata aldığında müşteriye gereksiz hata mesajı atma (temsilci devralsın)
    return null;
  }
}

module.exports = {
  initGemini,
  askGemini,
  resetChatSession
};

