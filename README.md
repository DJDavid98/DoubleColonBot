# DoubleColonBot

Twitch chatbot with functionality tailored to my specific needs

Links:

* [Bot channel](https://twitchbot.djdavid98.art)
* [Authorization URL](https://twitchbot.djdavid98.art/authorize)
* [Chat Overlay] Server URL: `https://twitchbot.djdavid98.art:8443`

[Chat Overlay]: https://github.com/DJDavid98/Beat-Saber-Overlay

## Features

### Chat commands

| Command                          | Description                                                                                                               | Permissions           |
|----------------------------------|---------------------------------------------------------------------------------------------------------------------------|-----------------------|
| `!game name`<br>`!category name` | Set the currently played game/category for the stream<br/>Be sure to enter the full name of the game (not case-sensitive) | Streamer & moderators |
| `!chat`                          | List all available settings for the chat overlay                                                                          | Everyone              |
| `!chat name_color #hex`          | Changes the name color displayed on the chat overlay to a custom hex color instead of your default Twitch chat color      | Everyone              |
| `!chat reset`                    | Reset all chat overlay settings                                                                                           | Everyone              |
| `!chat reset`                    | Reset all chat overlay settings                                                                                           | Everyone              |
| `!pronouns`                      | Get the streamer's pronouns from the [Twitch pronouns API]                                                                | Everyone              |
| `!pronouns username`             | Get a specific user's pronouns from the [Twitch pronouns API]                                                             | Everyone              |

[Twitch pronouns API]: https://pronouns.alejo.io

### WebSocket data

The bot creates a socket.io server which can be connected to via its client library. The socket server supports sending
the following events:

* `chat` - sent when a regular chat message is received in the channel from someone other than the bot (messages
  prefixed with `!` are ignored)
  * `name: string` - the display name of the user, or if it's not available, the login name
  * `message: string` - the message text
  * `pronouns: string | null` - human-readable pronoun name from the [Twitch pronouns API]
  * `tags: ChatUserstate` - information about the message and the user sending it, comes directly from the underlying
    library ([tmi.js Chat event]) with the `color` key potentially replaced based on the user's settings
* `clearChat` - sent when the chat is cleared

[tmi.js Chat event]: https://github.com/tmijs/docs/blob/b97a887ff5f09ed9c6e5c522b4745d440e8f5ad6/_posts/v1.4.2/2019-03-03-Events.md#chat
