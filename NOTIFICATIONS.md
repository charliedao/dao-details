# Telegram Notifications — Quote Form Submissions

When a customer submits the **Get a Quote** form, the site saves the inquiry to Firebase and sends a Telegram message to each configured owner chat ID.

## Setup

1. Open Telegram and message [@BotFather](https://t.me/BotFather).
2. Send `/newbot`, follow the prompts, and copy the **bot token** you receive.
3. Each owner must start a chat with the new bot (send any message), or add the bot to a shared group.
4. Get each **chat ID**:
   - Message the bot, then open `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser and find `"chat":{"id":...}` in the JSON, **or**
   - Use [@userinfobot](https://t.me/userinfobot) or [@RawDataBot](https://t.me/RawDataBot) for your personal ID (groups have negative IDs).
5. In **Netlify** → your site → **Site configuration** → **Environment variables**, add:
   - `TELEGRAM_BOT_TOKEN` — the token from BotFather
   - `TELEGRAM_CHAT_IDS` — comma-separated chat IDs, e.g. `123456789,987654321`
6. **Redeploy** the site (Deploys → Trigger deploy → Deploy site) so functions pick up the new variables.
7. Submit a test quote on the live site and confirm both owners receive the message.

## Behavior

- The form saves to Firebase first; the customer sees success as soon as that write completes (Telegram does not block the response).
- If either env var is missing, Telegram is skipped silently (useful for local/dev).
- If Firebase saves successfully but Telegram fails, the customer still sees success; errors are logged in Netlify function logs.
- Messages are from **Kyro the Dog** — each submission picks a random casual opening line (lowercase, dog emojis 🐕), then a blank line and inquiry details: service, price, name, phone, email, area, vehicle, when, notes.

## Netlify env vars (required for notifications)

| Variable | Example | Description |
|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | `7123456789:AAH...` | Bot token from BotFather |
| `TELEGRAM_CHAT_IDS` | `123456789,987654321` | One or more chat IDs, comma-separated |

Do not commit tokens or chat IDs to the repository.
