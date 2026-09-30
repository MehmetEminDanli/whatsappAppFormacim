FROM node:20-slim

# Chromium ve gerekli sistem kütüphanelerini yükle
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Çalışma dizini
WORKDIR /app

# Paket dosyalarını kopyala ve yükle
COPY package*.json ./
RUN npm install

# Proje dosyalarını kopyala
COPY . .

# Puppeteer için Chromium yolunu ayarla
ENV CHROME_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Port açma (Hugging Face Spaces varsayılan 7860)
EXPOSE 7860

# Başlat
CMD ["npm", "start"]
