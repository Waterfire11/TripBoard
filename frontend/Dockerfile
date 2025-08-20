FROM node:22.17.1
LABEL authors="Cheng JR"

WORKDIR /app

# Copy package.json first and install the dependencies
COPY package*.json ./
RUN npm install

# Then copy the entire code directory
COPY . .

EXPOSE 3000

# Start Vite and listen for all addresses, port 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
