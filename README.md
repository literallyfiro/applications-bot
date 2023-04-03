# Applications Bot
A new and simple way to create your own staff applications: completely modular and easy to use! 

#### Table of contents
* Installation:
	* [How to run locally (Without docker)](https://github.com/ImOnlyFire/applications-bot/#how-to-run-locally-without-docker)
	* [How to run locally (With docker)](https://github.com/ImOnlyFire/applications-bot/#how-to-run-locally-with-docker)
* Configuration:
	* [Environment Variables](https://github.com/ImOnlyFire/applications-bot/#-environment-variables)
	* [Gibberish detection](https://github.com/ImOnlyFire/applications-bot/#-gibberish-detection)



# Installation
### How to run locally (Without docker)

1. Clone the repository with `git clone https://github.com/ImOnlyFire/applications-bot.git && cd applications-bot`
2. Copy the example env file and fill it with your personal data (instead of nano, you can use your favourite text editor):  `cp .env.example .env && nano .env`
3. Now, configure the bot to your liking: `nano config/config.yml`
4. Install all npm dependencies with `npm install .`
5. Finally, run the bot with `node .`


### How to run locally (With docker)

1. Clone the repository with `git clone https://github.com/ImOnlyFire/applications-bot.git && cd applications-bot`
2. Copy the example env file and fill it with your personal data (instead of nano, you can use your favourite text editor):  `cp .env.example .env && nano .env`
3. Now, configure the bot to your liking: `nano config/config.yml`
4. Create the docker image with docker-compose and run the bot:  `docker-compose up`

# Configuration
### 📩 Environment Variables
To succesfully run the project, you'll need to compile your new env with the correct infos!

`BOT_TOKEN` - Telegram bot token

`MONGODB_USER` - MongoDB username

`MONGODB_PASSWORD` - MongoDB password

`MONGODB_URI` - MongoDB actual URI

`PASTEE_KEY` Pastee developer key (Create an account on https://paste.ee/)

`LOG_GROUP_ID` - Chat ID used for sending new applications

`ADMIN_GROUP_ID` - Chat ID used for the admin commands

### 🤬 Gibberish Detection
Gibberish Detection is a peculiar feature of this bot. Tired of troll staff applications being sent from some users? Well, now you don't have to anymore. The bot uses a Markov Chain algorithm to check the input text of every answer sent from the users. If a user's answer to a staff application question matches a gibberish sentence too closely, it will be flagged as potential gibberish and the bot will ask the user to send an actual answer to the question. This helps prevent trolls from submitting nonsensical or inappropriate responses to staff applications.
