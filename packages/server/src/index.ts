import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@werewolf/shared';
import { setupSocketServer } from './socket/socketServer.js';
import { calculateBalanceScore } from './engine/balanceEngine.js';
import { generateSetup } from './engine/setupGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/balance/score', (req, res) => {
  const { roles, playerCount } = req.body;
  if (!roles || !playerCount) {
    return res.status(400).json({ error: 'roles dan playerCount wajib diisi.' });
  }
  const result = calculateBalanceScore(roles, Number(playerCount));
  res.json(result);
});

app.post('/api/balance/generate', (req, res) => {
  const { playerCount, recentRolesHistory } = req.body;
  if (!playerCount) {
    return res.status(400).json({ error: 'playerCount wajib diisi.' });
  }
  const result = generateSetup(Number(playerCount), recentRolesHistory || []);
  res.json(result);
});

// Serve client static build if exists (single service deploy)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

setupSocketServer(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Werewolf Server] Berjalan di http://localhost:${PORT}`);
});
