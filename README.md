# cse-210-pixelboard
CSE 210 Pixel Board

## Setup

Install [Node.js](https://nodejs.org) 24 or newer, then run:

```bash
npm install
```

## Theme server

Start the backend with:

```sh
node backend/server.js
```

`GET http://127.0.0.1:3000/api/theme` returns JSON such as `{"theme":"Space"}`.
The server selects a random theme on startup and changes it every 24 hours. Restarting
the server resets the timer and the list of used themes.
There is no editor on this branch to request or display the theme yet.

`POST http://127.0.0.1:3000/api/submit` accepts a JSON body with an AT URI `boardLink` string:

```json
{ "boardLink": "at://did:example:alice/cloud.pixelboard.imageBoard/example" }
```

The server keeps the most recently submitted link in memory and returns it as `boardLink`.

## Commands

| Command | What it does |
|---|---|
| `npm run lint` | Check the code style |
| `npm run lint:fix` | Fix the style problems that can be fixed automatically |
| `npm test` | Run every `*.test.js` and `*.test.ts` file |

Put each test file next to the file it tests, for example `board.js` and `board.test.js`.

## Commit messages

```
type(scope): short description
```

The scope is optional. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.

The format is checked when you commit and again on every pull request, along with the PR title.
