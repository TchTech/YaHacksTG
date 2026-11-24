# YaHacksTG

React-фронтенд Telegram Mini App для подбора хакатонов и участников команд. Интерфейс следует [прототипу YaHacks Swipe TZ v6](assets/yahacks-swipe-tz-v6/README.md). Подсказки к свайпам также работают как кнопки.

[Публичный Frontend MVP](https://tchtech.github.io/YaHacksTG/) · [Исходный код](https://github.com/TchTech/YaHacksTG)

## Запуск

Требуется Node.js 20.19+ или 22.12+.

```sh
npm ci
npm run dev
npm test
npm run build
```

В браузере по умолчанию используются демоданные. Настройки сохраняются локально, приглашения имитируются в текущем сеансе.

## Сценарии MVP

- Открыть календарь, выбрать хакатон и посмотреть его описание и призовой фонд.
- Нажать «Найти команду» у хакатона, изучить профили кандидатов и отправить демо-приглашение для этого события.
- Обновить личные данные в профиле или поменять настройки рекомендаций в отдельной форме.

React Router хранит маршрут в URL. Прямые ссылки на [календарь](https://tchtech.github.io/YaHacksTG/#/calendar), [событие](https://tchtech.github.io/YaHacksTG/#/calendar/ai-weekend) и [настройки](https://tchtech.github.io/YaHacksTG/#/settings) работают на статическом хостинге. Redux Toolkit хранит профиль, календарь и подборки участников. Запросы выполняются через `createAsyncThunk`, состояния читаются через селекторы.

`npm test` запускает unit-тесты маршрутов и Redux и компонентные тесты пользовательских сценариев. GitHub Actions прогоняет тесты и публикует сборку на GitHub Pages после обновления `main`.

## Подключение сервера и Telegram

[openapi.yaml](openapi.yaml) описывает согласуемый контракт для сессии Telegram, профиля, рекомендаций и приглашений. Чтобы включить HTTP-режим, укажите в `.env.local` переменную `VITE_API_BASE_URL`, например `/api`. Для отдельного домена серверу нужно разрешить CORS для origin фронтенда и заголовков `Authorization` и `Content-Type`.

Разместите сборку `dist/` по HTTPS и укажите её URL в настройках Mini App бота. В HTTP-режиме фронтенд передаёт серверу `Telegram.WebApp.initData` для проверки и получает токен сессии. Сервер реализуется по контракту отдельно. [Документация Telegram](https://core.telegram.org/bots/webapps)
