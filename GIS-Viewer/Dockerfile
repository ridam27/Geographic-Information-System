FROM node:20

WORKDIR /app

COPY package*.json ./
# react-leaflet-draw@0.20.6 still declares a react@^18 peer dep even though
# this app is on react@19 — npm's default resolver ERESOLVEs on that even
# though the committed lockfile already reflects a working install.
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

# HOST=0.0.0.0 is required so the gateway/other containers can reach this
# dev server -- CRA's dev server only binds to localhost otherwise.
CMD ["sh", "-c", "HOST=0.0.0.0 npm start"]
