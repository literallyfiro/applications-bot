FROM node:latest

# Create bot directory
RUN mkdir -p /usr/src/bot

# Change working directory
WORKDIR /usr/src/bot

# Copy package.json and install dependencies
COPY package.json /usr/src/bot
RUN npm install

# Copy bot files
COPY . /usr/src/bot

# Run bot
CMD ["node", "."]
