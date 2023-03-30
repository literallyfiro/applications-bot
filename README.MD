
# Applications-Bot
A new and simple way to create your own bot for applications: completely modular and easy to use!

## How To Run Locally
- Clone the project
```bash
  git clone https://github.com/ImOnlyFire/applications-bot.git
```
- Go to the project directory
```bash
  cd applications-bot
```
- Copy the example env file to a new one and fill it with your data (instead of nano, you can use your favourite text editor )
```bash
  cp .env.example .env && nano .env
```
- Modify the bot options by editing the config.yml file (instead of nano, you can use your favourite text editor )
```bash
  cd config && nano config.yml
``` 
- Install dependencies
```bash
  npm install
```
- Run the Project
```bash
  node .
```

## How To Run With Docker
- Clone the project
```bash
  git clone https://github.com/ImOnlyFire/applications-bot.git
```
- Go to the project directory
```bash
  cd applications-bot
```
- Copy the example env file to a new one and fill it with your data (instead of nano, you can use your favourite text editor )
```bash
  cp .env.example .env
```
- Modify the bot options by editing the config.yml file (instead of nano, you can use your favourite text editor )
```bash
  cd config && nano config.yml
``` 
- Run in Docker
```bash
  docker-compose up
```

## Environment Variables
To succesfully run the project, you'll need to compile your new env with the correct infos!

`BOT_TOKEN` - Telegram bot token

`MONGODB_USER` - MongoDB username

`MONGODB_PASSWORD` - MongoDB password

`MONGODB_URI` - MongoDB actual URI

`PASTEE_KEY` Pastee developer key (Create an account on https://paste.ee/)

`LOG_GROUP_ID` - Chat ID used for sending new applications

`ADMIN_GROUP_ID` - Chat ID used for the admin commands

<b>This ReadMe was made by [Repressoh](https://github.com/Repressoh) with love and a slice of pizza ;)
