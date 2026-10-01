FROM node:20-slim

WORKDIR /app

# Paket tanımlarını kopyala ve kur
COPY package*.json ./
RUN npm install --omit=dev

# Uygulama kodlarını kopyala
COPY . .

# Web paneli portu (Render / Hugging Face varsayılan)
EXPOSE 7860

# Başlat
CMD ["npm", "start"]

