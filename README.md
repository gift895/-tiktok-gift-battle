# TikTok Gift Battle

Готовая мини-игра для OBS/стрима: подарки из TikTok LIVE начисляют очки двум командам.

## По умолчанию
- 🌹 Rose / Роза → ДЕВОЧКИ + количество подарков
- ⚽ Football / Мяч → МАЛЬЧИКИ + количество подарков
- Побеждает команда с большим счётом.
- Для streak-подарков очки начисляются только на финальном событии streak, чтобы не было двойного счёта.

## Запуск на Windows
1. Установи Node.js 20+.
2. Распакуй архив.
3. В папке проекта открой CMD/PowerShell.
4. Выполни:
   npm install
   npm start
5. Открой в браузере:
   http://localhost:3000

Для OBS добавь Browser Source с URL:
http://localhost:3000

## Подключение TikTok LIVE
Сейчас страница игры сама является overlay, а подключение к TikTok выполняется через серверный адаптер. В `server.js` можно вызвать `/api/connect` из панели управления.

Пример POST:
{
  "username": "ТВОЙ_TIKTOK_USERNAME",
  "girlsGift": "rose",
  "boysGift": "football",
  "girlsGiftLabel": "🌹 Роза",
  "boysGiftLabel": "⚽ Мяч"
}

Для удобства можно использовать curl:
curl -X POST http://localhost:3000/api/connect ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"ТВОЙ_USERNAME\",\"girlsGift\":\"rose\",\"boysGift\":\"football\"}"

## Тест без TikTok
Пока не подключая LIVE:
curl -X POST http://localhost:3000/api/test -H "Content-Type: application/json" -d "{\"team\":\"girls\",\"points\":1,\"giftName\":\"Rose\"}"

И для мальчиков:
curl -X POST http://localhost:3000/api/test -H "Content-Type: application/json" -d "{\"team\":\"boys\",\"points\":1,\"giftName\":\"Football\"}"

Сброс:
curl -X POST http://localhost:3000/api/reset

## Важно
`TikTokLiveConnector` — неофициальный клиент, который получает события TikTok LIVE через внутренний Webcast-сервис. TikTok может менять этот сервис, поэтому подключение иногда требует обновления пакета.
