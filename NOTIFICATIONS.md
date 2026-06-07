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

- The form saves to Firebase first, then sends Telegram (up to 5 seconds). The customer still sees success quickly in normal conditions.
- If either env var is missing, Telegram is skipped; a message is written to Netlify function logs (useful for local/dev).
- If Firebase saves successfully but Telegram fails, the customer still sees success; errors are logged in Netlify function logs (no secrets exposed to the client).
- Messages are from **Kyro the Dog** — each submission picks a random casual opening line (lowercase, dog emojis 🐕), then a blank line and inquiry details: service, price, name, phone, email, area, vehicle, when, notes.

## Troubleshooting

Notifications not arriving? Work through this checklist:

1. **Both owners must `/start` the bot** — Open Telegram, find your bot, tap **Start** (or send `/start`). Telegram will not deliver messages to a user who has never started the bot.
2. **Chat IDs format** — In Netlify, set `TELEGRAM_CHAT_IDS` as comma-separated IDs with no spaces required, e.g. `7841856646,7866208442`. Each person gets their ID from `getUpdates` after messaging the bot (see Setup step 4).
3. **Redeploy after env vars** — Changing variables in Netlify does not update running functions until you redeploy: **Deploys → Trigger deploy → Deploy site**.
4. **Verify the bot token** — From a terminal (replace `TOKEN` with your real token):
   ```bash
   curl "https://api.telegram.org/botTOKEN/getMe"
   ```
   You should get `"ok":true` and bot details. If `"ok":false`, fix `TELEGRAM_BOT_TOKEN` in Netlify.
5. **Check Netlify function logs** — **Functions → submit-inquiry → Recent logs** (or the log stream for your deploy). Look for:
   - `Telegram skipped: TELEGRAM_BOT_TOKEN is not set` / `TELEGRAM_CHAT_IDS is not set` — env vars missing or deploy not run
   - `Telegram sendMessage failed for chat … HTTP 403` — user has not `/start`ed the bot
   - `Telegram sendMessage failed for chat … HTTP 400` — wrong chat ID format
6. **Form vs notifications** — If the customer sees success but no Telegram, Firebase saved fine; the issue is Telegram config or delivery. If the customer sees an error, check Firebase env vars and function logs for `submit-inquiry error`.

## Netlify env vars (required for notifications)

| Variable | Example | Description |
|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | `7123456789:AAH...` | Bot token from BotFather |
| `TELEGRAM_CHAT_IDS` | `123456789,987654321` | One or more chat IDs, comma-separated |

Do not commit tokens or chat IDs to the repository.
