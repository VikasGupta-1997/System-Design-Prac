# backend/docker/Dockerfile
FROM node:22-alpine

# set working dir in container
WORKDIR /app

# copy package files first (caches npm install)
COPY ../package*.json ./

# install dependencies
RUN npm install

# install tsx globally (if you use tsx CLI) — optional if in deps
# RUN npm install -g tsx

# create node_modules volume mount point
RUN mkdir -p /app/node_modules

# expose port used by your app
EXPOSE 8000

# default command (docker-compose overrides with command: npm run dev)
CMD ["npm", "run", "dev"]
