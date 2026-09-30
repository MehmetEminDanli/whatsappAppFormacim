require('dotenv').config();
const { initGemini, askGemini } = require('./gemini');

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  console.log('--- Google Gemini ve Formacım Test Başlatılıyor ---');
  
  if (!apiKey || apiKey === 'BURAYA_GEMINI_API_KEY_YAZIN') {
    console.error('❌ Hata: .env dosyasında GEMINI_API_KEY bulunamadı veya değiştirilmedi!');
    console.log('Lütfen .env dosyasını açıp gerçek API anahtarınızı yapıştırın.');
    process.exit(1);
  }

  try {
    initGemini(apiKey, modelName);
    
    const testQuestions = [
      'Merhaba, formaciim.com dan retro forma almak istiyorum, beden kalıpları nasıl?',
      'Boyum 1.78, kilom 75. Hangi bedeni almalıyım?',
      'Formanın arkasına isim ve numara bastırabilir miyim, baskılı ürünlerde iade var mı?',
      'Sizde F1 Ferrari yarış forması var mı, linkini atar mısınız?'
    ];

    const dummyUser = 'test_user_123';

    for (const q of testQuestions) {
      console.log(`\n👤 [Müşteri]: ${q}`);
      const answer = await askGemini(dummyUser, q);
      console.log(`🤖 [Formacım Bot]:\n${answer}`);
    }

    console.log('\n✅ Test başarıyla tamamlandı! Yapay zeka ve sistem talimatları sorunsuz çalışıyor.');
  } catch (error) {
    console.error('\n❌ Test sırasında hata oluştu:', error);
  }
}

test();

