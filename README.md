# oncall-slackbot

## Quick Description:

This bot integrates #slack (https://slack.com/) with PagerDuty (https://www.pagerduty.com/).  

Mention `@oncall` on it's own in a #slackroom and the bot will summon those who are currently in active PagerDuty rotation to join the room.  Mention `@oncall` with a message afterwards (ie. `@oncall Can you take a look?`) and it will repeat the message with those in rotation prefixed to the message.  

## Why?

Seems only logical to share the duties instead of people always asking specific people to solve a problem.  Our front line customer service team has a dedicated channel to identify possible issues and allowing them to have a spefific "user/bot" to ping speeds up the response time.  

## Supported commands

* **help** : displays the commands that are possible
* **who** : will state who is currently in PagerDuty rotation
* **version** : states the version of the bot that is deployed.

In a specific channel, these commands are broadcast to those in it (ie. `@oncall who`). When chatting directly with the bot, the interaction is simply between the user and the bot.

Support exists for other bots to reference this bot as well.

## Other
This was built to solve our problem.  Feel free to improve and fix it if you find issues - we all win.
