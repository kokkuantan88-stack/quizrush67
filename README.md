# ACS Math Quest

A math practice app for P6, Sec 1 and Sec 2 students. Finish quizzes to earn tokens and Arcade time, then spend tokens on chess hints, avatars and Blooket-style sabotages on friends.

## Features

- **Quiz**: endless generated questions across MOE-style topics at three difficulties (Easy, Medium, Hard), with worked solutions and a review list for wrong answers.
- **Arcade**: Number Rush, 2048 Blitz, Minesweeper, Snake Arena and Memory Match, played with Arcade time earned from quizzes.
- **Chess**: a bot with five levels (Pawn to Queen), promotion, hints and undo.
- **Friends**: sabotages (Ink Splat, Upside Down, Freeze, Shuffle, Fog, Glitch Theme, Boss Fight), preset messages and stickers, shields, plus RoboRival, a practice bot to sabotage.
- **Shop**: avatars and shields.

## Files

- `index.html` — the built, self-contained page. Open it in a browser.
- `src/` — the source: `chess.js` (rules and bot), `quiz.js` (question generators), `games.js` (arcade games), `app.js` (the app), `template.html` (layout and styles).
- `build.py` — rebuilds `index.html` from `src/`: `python3 build.py`.

Live friends, sabotages between players and saved progress use the Claude artifact runtime; opened as a plain file, the app works solo with progress kept in the browser.
