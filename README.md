# YaHacksTG

React-фронтенд Telegram Mini App для подбора хакатонов и участников команд. Интерфейс следует [прототипу YaHacks Swipe TZ v6](assets/yahacks-swipe-tz-v6/README.md). Подсказки к свайпам также работают как кнопки.

## Запуск

Требуется Node.js 20.19+ или 22.12+.

```sh
npm ci
npm run dev
npm run build
```

В браузере по умолчанию используются демоданные. Настройки сохраняются локально, приглашения имитируются в текущем сеансе.

## Подключение сервера и Telegram

[openapi.yaml](openapi.yaml) описывает согласуемый контракт для сессии Telegram, профиля, рекомендаций и приглашений. Чтобы включить HTTP-режим, укажите в `.env.local` переменную `VITE_API_BASE_URL`, например `/api`. Для отдельного домена серверу нужно разрешить CORS для origin фронтенда и заголовков `Authorization` и `Content-Type`.

Разместите сборку `dist/` по HTTPS и укажите её URL в настройках Mini App бота. В HTTP-режиме фронтенд передаёт серверу `Telegram.WebApp.initData` для проверки и получает токен сессии. Сервер реализуется по контракту отдельно. [Документация Telegram](https://core.telegram.org/bots/webapps)
