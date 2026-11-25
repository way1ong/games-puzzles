# Hand-made corrections of the word lists

`npm run words:build` applies these after the rules of `scripts/words/lists.ts`, for words the sources do not
mark well enough. One word per line; `#` starts a comment. Words players report with "Позначити слово" go here
after a look.

- `<lang>-blocked.txt` — never accepted and never a crossword word (offensive, or offensive in effect).
- `<lang>-not-answers.txt` — accepted when found, but never a crossword word (odd, rare in effect, not for a family game).

A crossword word is one an adult speaker knows without a dictionary (decision of 25.11, docs/words/SPEC.md,
«Значення слів»): rare, bookish, dialect and old words, narrow terms, short forms, slang, names, some peoples and
religions, and unpleasant words go to `<lang>-not-answers.txt`. Each word there changes the levels for everybody;
a level begun before keeps its crossword.
