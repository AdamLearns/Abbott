## Reason why this exists

For the code jam, I wanted the bot to be able to type commands in chat based on what I _say_, e.g. saying "check out the keyboard command" would type `!keyboard` in chat. In order for this to work, I need my main computer to have a way of interfacing with the bot. The web interface _seems_ like it would be the right approach, but we would still need a communication route between the web interface and the bot. That means that the bot needs its own server eventually, which is what this code is!
