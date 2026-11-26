import { createServer } from 'node:http';
import { selectRandomTheme } from './theme.js';

const PORT = 3000;
const THEME_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 1024;
let currentTheme = selectRandomTheme();
let saved_board = null; // eslint-disable-line camelcase

setInterval(() => {
  currentTheme = selectRandomTheme();
  console.log(`New theme: ${currentTheme}`);
}, THEME_INTERVAL_MS);

/**
 * for handling /api/submit POST requests, specifically to save link to a board.
 * @param {*} request passed in
 * @param {*} response passed in
 */
function handleSubmission(request, response) {
  let body = '';
  let bodyBytes = 0;
  let tooLarge = false;
  request.setEncoding('utf8');
  request.on('data', (chunk) => {
    bodyBytes += new TextEncoder().encode(chunk).length;
    if (bodyBytes > MAX_BODY_BYTES) {
      if (!tooLarge) {
        tooLarge = true;
        response.writeHead(413);
        response.end(JSON.stringify({ error: 'Request body is too large' }));
      }
      return;
    }
    body += chunk;
  });
  request.on('end', () => {
    if (tooLarge) return;

    let submission;
    try {
      submission = JSON.parse(body);
    } catch {
      response.writeHead(400);
      response.end(JSON.stringify({ error: 'Request body must be valid JSON' }));
      return;
    }

    if (typeof submission?.boardLink !== 'string' || !submission.boardLink.trim()) {
      response.writeHead(400);
      response.end(JSON.stringify({ error: 'boardLink must be a non-empty string' }));
      return;
    }

    if(!saved_board) {
      saved_board = submission.boardLink.trim(); 
    }
    else{
      //pair boards
      createBoardPairPost(saved_board, submission.boardLink.trim(), currentTheme);
      saved_board = null;
    }
    response.writeHead(200);
    response.end(JSON.stringify({ boardLink: saved_board })); 
  });
}

const server = createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');

  const path = new URL(request.url, 'http://localhost').pathname;

  //get the current theme
  if (path === '/api/theme') {
    if (request.method === 'GET') {
      response.writeHead(200);
      response.end(JSON.stringify({ theme: currentTheme }));
    } else {
      response.setHeader('Allow', 'GET');
      response.writeHead(405);
      response.end(JSON.stringify({ error: 'Method not allowed' }));
    }
    return;
  }

  //submit a board link for the current theme. The board itself should be in the user's PDS
  if (path === '/api/submit') {
    if (request.method === 'POST') {
      handleSubmission(request, response);
    } else {
      response.setHeader('Allow', 'POST');
      response.writeHead(405);
      response.end(JSON.stringify({ error: 'Method not allowed' }));
    }
    return;
  }

  response.writeHead(404);
  response.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server listening at http://127.0.0.1:${PORT}`);
});
