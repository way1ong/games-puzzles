# games-puzzles

Free, ad-free puzzle games by way1ong — no tracking, work offline.

Безкоштовні ігри-головоломки way1ong: без реклами, без стеження, без акаунтів, працюють без інтернету. Перша гра — головоломка з блоками (робоча назва «way1ong Blocks»), друга — затишний детектив із пошуком предметів і доказів (робоча назва «way1ong Detective»); описи — `docs/<гра>/SPEC.md`.

- Правила для Claude Code — `CLAUDE.md`; рішення — `docs/DECISIONS.md`; стан — `docs/STATUS.md`.
- Сайт: way1ong.eu (персональні застосунки й сайти на замовлення).

## Команди
- `npm install` — залежності (Node 22).
- `npm run dev` — ігри на `http://localhost:5173/blocks/` і `http://localhost:5173/detective/`.
- `npm run verify` — типи, тести, збірка в `dist/`; `npm run preview` — переглянути збірку.
- `npm run build:claude` — кожна гра одним файлом для тестової сторінки claude.ai; `npm run audit` — перевірка зібраних ігор у браузері.
- Хостинг — Cloudflare Workers (static assets), викладає Workers Builds з гілки `main`: `docs/cloudflare.md`.
