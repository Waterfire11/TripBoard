# frontend/Dockerfile
FROM node:18-alpine
LABEL authors="Cheng JR"

WORKDIR /app

# Copy the dependency list and install
COPY package*.json ./
RUN npm install

# Copy the code of project
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]