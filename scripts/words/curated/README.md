# Hand-made corrections of the word lists

`npm run words:build` applies these after the rules of `scripts/words/lists.ts`, for words the sources do not
mark well enough. One word per line; `#` starts a comment. Words players report with "Позначити слово" go here
after a look.

- `<lang>-blocked.txt` — never accepted and never a crossword word (offensive, or offensive in effect).
- `<lang>-not-answers.txt` — accepted when found, but never a crossword word (odd, rare in effect, not for a family game).
