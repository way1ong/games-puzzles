# games-puzzles

Free, ad-free puzzle games by way1ong — no tracking, work offline.

Безкоштовні ігри-головоломки way1ong: без реклами, без стеження, без акаунтів, працюють без інтернету. Перша гра — головоломка з блоками (робоча назва «way1ong Blocks»), опис — `docs/blocks/SPEC.md`.

- Правила для Claude Code — `CLAUDE.md`; рішення — `docs/DECISIONS.md`; стан — `docs/STATUS.md`.
- Сайт: way1ong.eu (персональні застосунки й сайти на замовлення).

## Команди
- `npm install` — залежності (Node 22).
- `npm run dev` — гра на `http://localhost:5173/blocks/`.
- `npm run verify` — типи, тести, збірка в `dist/`; `npm run preview` — переглянути збірку.
- `npm run build:claude` — гра одним файлом для тестової сторінки claude.ai.
- Хостинг — Cloudflare Workers (static assets), викладає Workers Builds з гілки `main`: `docs/cloudflare.md`.
