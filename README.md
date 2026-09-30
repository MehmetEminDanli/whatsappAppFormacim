# ⚽ Formacım (formaciim.com) WhatsApp AI Müşteri Temsilcisi Botu

Bu proje, **formaciim.com** müşterilerinin sorularını (forma kalıpları, beden tavsiyesi, retro ve yeni sezon modeller, kişiselleştirme/baskı, kargo süreci, iade koşulları vb.) **Google AI Studio (Gemini)** yapay zekası ile otomatik yanıtlayan bir WhatsApp botudur.

> **Önemli Avantaj:** WhatsApp Business API veya Meta Geliştirici hesabı **gerektirmez**. Kişisel WhatsApp hesabınızı telefonunuzdan QR kod okutarak bağlayabilir ve hemen kullanmaya başlayabilirsiniz.

---

## 📁 Proje Dosya Yapısı

- `index.js`: WhatsApp Web istemcisini başlatan, QR kod oluşturan ve gelen mesajları dinleyen ana dosya.
- `gemini.js`: Google Gemini API bağlantısı, oturum yönetimi ve müşteri sohbet geçmişi (hafıza) modülü.
- `productSearch.js`: Müşterinin sorduğu forma/ürünleri arayan, en alakalı ürün linklerini ve kategorileri Gemini'ye ileten arama motoru.
- `indexer.js`: Siteden formaları otomatik çeken veya ürün eklemeyi/listelemeyi sağlayan CLI yönetim aracı.
- `products.json`: formaciim.com'dan indekslenmiş ürünlerin (başlık, link, fiyat, kategori) tutulduğu veritabanı.
- `prompt.js`: Formacım'a özel bilgi bankası, beden tablosu, ürün bilgileri ve botun kuralları (istediğiniz zaman kolayca düzenleyebilirsiniz).
- `test-gemini.js`: WhatsApp'ı bağlamadan önce Gemini API anahtarınızı ve cevap kalitesini konsolda test edebileceğiniz script.
- `.env`: API anahtarı ve bot ayarlarının tutulduğu dosya.

---

## 🚀 Kurulum ve Başlatma Adımları

### 1. Adım: Gerekli Paketleri Yükleyin
Proje klasöründe bir terminal (Komut İstemi veya PowerShell) açıp şu komutu çalıştırın:

```bash
npm install
```

### 2. Adım: Google AI Studio API Anahtarınızı Alın
1. [Google AI Studio](https://aistudio.google.com/app/apikey) sayfasına gidin.
2. Google hesabınızla giriş yapıp **"Create API Key"** butonuna tıklayın.
3. Üretilen API anahtarını kopyalayın.

### 3. Adım: `.env` Dosyasını Düzenleyin
Klasördeki `.env` dosyasını açın ve kopyaladığınız anahtarı ekleyin:

```env
GEMINI_API_KEY=AIzaSy...BURAYA_ANAHTARINIZI_YAZIN
GEMINI_MODEL=gemini-2.5-flash
IGNORE_GROUPS=true
IGNORE_ME=true
SESSION_TIMEOUT_MINUTES=30
```

### 4. Adım (İsteğe Bağlı): Yapay Zekayı Konsolda Test Edin
WhatsApp'ı başlatmadan önce API anahtarınızın çalıştığını doğrulamak için:

```bash
node test-gemini.js
```

### 5. Adım: WhatsApp Botunu Başlatın ve QR Kodu Okutun
Aşağıdaki komutla botu başlatın:

```bash
npm start
```

1. Terminalde bir **QR Kod** belirecektir.
2. Telefonunuzdan **WhatsApp** uygulamasını açın.
3. **Ayarlar** (veya sağ üstteki 3 nokta) > **Bağlı Cihazlar** > **Cihaz Bağla** seçeneğine dokunun.
4. Terminaldeki QR kodu telefonunuzun kamerasıyla taratın.
5. Birkaç saniye içinde terminalde `🚀 BOT AKTİF VE ÇALIŞIYOR!` yazısını göreceksiniz. Artık kişisel WhatsApp hesabınıza gelen müşteri mesajlarına yapay zeka otomatik yanıt verecektir!

---

## 🛒 Ürün İndeksleme ve Otomatik Link Gönderimi

Bot, müşterinin mesajını inceler (örn: *"Alonso F1 tshirt var mı?"*, *"Maradona forması ne kadar?"*, *"Galatasaray 2000 forması"*). Sitedeki ürün kataloğunu tarayarak **doğrudan satın alma linkini, fiyatını ve açıklamasını** WhatsApp mesajı olarak tıkla-incele şeklinde gönderir.

### Ürün Kataloğunu Yönetme Komutları (`indexer.js`):

1. **Siteden Otomatik Tüm Ürünleri Çekme / Güncelleme:**
   ```bash
   node indexer.js crawl
   ```
   *(Bu komut formaciim.com'a bağlanarak tüm kategorilerdeki ürünleri, başlıkları, fiyatları ve direkt linkleri otomatik olarak `products.json` dosyasına kaydeder.)*

2. **Kayıtlı Ürünleri Arama Testi:**
   ```bash
   node indexer.js search "Alonso"
   node indexer.js search "F1"
   ```

3. **Manuel Yeni Ürün / Link Ekleme:**
   ```bash
   node indexer.js add "Aston Martin Alonso F1 Tshirt 2025" "https://formaciim.com/F1?product_id=2367" "1.650,00 TL" "F1" "Özel tasarım yarış tişörtü"
   ```

4. **Tüm İndekslenmiş Ürünleri Listeleme:**
   ```bash
   node indexer.js list
   ```

---

## ⚙️ Özellikler ve İpuçları

1. **Kalıcı Oturum (Tekrar Tekrar QR Okutmaya Gerek Yok):**
   - QR kodu bir kez tarattıktan sonra oturum bilgileri yerel olarak `.wwebjs_auth` klasöründe saklanır. Botu kapatıp tekrar açtığınızda otomatik bağlanır.

2. **Müşteri Sohbet Hafızası:**
   - Müşteri "Boyum 180 kilom 80" deyip ardından "Peki bu bedende Real Madrid retro var mı?" dediğinde Gemini önceki mesajı hatırlar ve bağlamı korur.
   - Hafıza 30 dakika hareketsizlikten sonra otomatik sıfırlanır (ayarlanabilir).
   - Müşteri isterse `!sifirla` yazarak kendi sohbet geçmişini sıfırlayabilir.

3. **Grup Mesajlarını Engelleme:**
   - `IGNORE_GROUPS=true` ayarı sayesinde kişisel gruplarınızdaki mesajlara bot müdahale etmez, sadece birebir özel sohbetlere yanıt verir.

4. **Kendi Gönderdiğiniz Mesajlar:**
   - `IGNORE_ME=true` sayesinde sizin yazdığınız mesajlara bot cevap vermez; araya girip müşteriye kendiniz yazabilirsiniz.

5. **"Yazıyor..." Efekti:**
   - Bot yanıt hazırlarken müşteriye WhatsApp'ta "yazıyor..." göstergesi çıkararak doğal bir deneyim sunar.

6. **Bilgi Bankasını Güncelleme:**
   - Yeni ürün, kampanya veya kargo politikası eklemek için tek yapmanız gereken `prompt.js` dosyasındaki metni güncellemektir.

