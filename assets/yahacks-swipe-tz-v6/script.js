// Замените значение на публичную ссылку вашего Telegram Mini App.
const MINI_APP_URL = "https://t.me/YaHacksBot?startapp";

document.querySelectorAll(".telegram-link").forEach((link) => {
  link.href = MINI_APP_URL;
});
