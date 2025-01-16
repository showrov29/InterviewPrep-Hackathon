import express from 'express';
import path from 'path';
import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import phonemeProcessor from './src/phonemeServe.js';
import http from 'http';
import pronouncing from 'pronouncing';

// Convert the import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const wordCache = {};

// WebSocket connection handler
io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("sendWord", async (data) => {
    console.log(data);
    try {
      await phonemeProcessor(data, wordCache, pronouncing, io);
    } catch (error) {
      console.error("Error in phonemeProcessor:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

async function start() {
  try {
    // Create a Vite server instance
    const vite = await createServer({
      server: { middlewareMode: 'html' }, // Correct middleware mode
    });

    // Use Vite's middleware for handling requests
    app.use(vite.middlewares);

    // Serve static files
    app.use(express.static(path.join(__dirname, 'public')));

    // Serve index.html at the root route
    app.get('/', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'index.html'));
    });

    // Start the server
    server.listen(3300, () => {
      console.log('Server running at http://localhost:3300');
    });
  } catch (error) {
    console.error("Error starting the server:", error);
  }
}

start();
