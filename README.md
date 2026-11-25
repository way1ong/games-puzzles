# games-puzzles

Free, ad-free puzzle games by way1ong — no tracking, work offline.

Безкоштовні ігри-головоломки way1ong: без реклами, без стеження, без акаунтів, працюють без інтернету. Перша гра — головоломка з блоками (робоча назва «way1ong Blocks»), друга — затишний детектив із пошуком предметів і доказів (робоча назва «way1ong Detective»), третя — класичне судоку («way1ong Sudoku»), четверта — гра в слова («way1ong Words»: слова з літер на колі заповнюють кросворд; українська, угорська, англійська); описи — `docs/<гра>/SPEC.md`.

- Правила для Claude Code — `CLAUDE.md`; рішення — `docs/DECISIONS.md`; стан — `docs/STATUS.md`.
- Сайт: way1ong.eu (персональні застосунки й сайти на замовлення).

## Команди
- `npm install` — залежності (Node 22).
- `npm run dev` — ігри на `http://localhost:5173/blocks/`, `http://localhost:5173/detective/`, `http://localhost:5173/sudoku/` і `http://localhost:5173/words/`.
- `npm run verify` — типи, тести, збірка в `dist/`; `npm run preview` — переглянути збірку.
- `npm run build:claude` — кожна гра одним файлом для тестової сторінки claude.ai; `npm run audit` — перевірка зібраних ігор у браузері.
- `npm run words:fetch`, `npm run words:build` — джерела словників Words і складання списків слів (`games/words/dict/`; джерела й ліцензії — `docs/words/SPEC.md`).
- Хостинг — Cloudflare Workers (static assets), викладає Workers Builds з гілки `main`: `docs/cloudflare.md`.
