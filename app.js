const express = require('express');
const webSockets = require('./appWS.js');
const { Game } = require('./appWS.js');
const database = require('./utilsMySQL.js');

const db = new database();
const ws = new webSockets();

// Start HTTP server
const app = express();
const PORT = process.env.PORT || 3000;

// Publish static files from 'public' folder
app.use(express.static('public'));

// Activate HTTP server
const httpServer = app.listen(PORT, () => {
  console.log(`Listening for HTTP queries on: http://localhost:${PORT}`);
});

const shutDown = () => {
  console.log('Received kill signal, shutting down gracefully');
  httpServer.close();
  db.end();
  ws.end();
  process.exit(0);
}

// Close connections when process is killed
process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

// Init objects
db.init({
  ...process.env,
  database: process.env.MYSQLDATABASE || 'test',
});


ws.init(httpServer, PORT, db);

/////////////////// WEB-SOCKETS /////////////////// 
const TARGET_FPS = 50;
const TARGET_MS = 1000 / TARGET_FPS;
let frameCount = 0;
let fpsStartTime = Date.now();
let currentFPS = 0;

function gameLoop() {
  const startTime = Date.now();

  if (currentFPS >= 1) {
    const MESSAGE_TYPE_PLAYERS = "currentStatePlayers";
    const MESSAGE_TYPE_BALL = "currentStateBall";

    ws.broadcast({
      type: MESSAGE_TYPE_PLAYERS,
      gameState: {
        player: {
          x: Game.player1.x,
          y: Game.player1.y
        },
        player2: {
          x: Game.player2.x,
          y: Game.player2.y
        }
      }
    });

    ws.broadcast({
      type: MESSAGE_TYPE_BALL,
      gameState: {
        ball: {
          x: Game.ball.x,
          y: Game.ball.y
        }
      }
    })

  }

  const endTime = Date.now();
  const elapsedTime = endTime - startTime;
  const remainingTime = Math.max(1, TARGET_MS - elapsedTime);

  frameCount++;
  const fpsElapsedTime = endTime - fpsStartTime;
  if (fpsElapsedTime >= 500) {
    currentFPS = (frameCount / fpsElapsedTime) * 1000;
    frameCount = 0;
    fpsStartTime = endTime;
  }
  setTimeout(() => {
    setImmediate(gameLoop);
  }, remainingTime);
}

gameLoop();

