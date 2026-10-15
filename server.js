import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { createApp } from './project-api.js';
import { db } from './database.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API routes
app.use(createApp(db));

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

export default app;