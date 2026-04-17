// src/index.js — Backend AZAMED (3 frontends)
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes       = require('./routes/auth');
const structureRoutes  = require('./routes/structures');
const pharmacieRoutes  = require('./routes/pharmacies');
const laboRoutes       = require('./routes/laboratoires');
const hopitalRoutes    = require('./routes/hopitaux');
const postRoutes       = require('./routes/posts');
const searchRoutes     = require('./routes/search');
const abonnementRoutes = require('./routes/abonnements');
const adminRoutes      = require('./routes/admin');
const analyticsRoutes  = require('./routes/analytics');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── CORS — 3 frontends autorisés ────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',   // Site grand public
  'http://localhost:5174',   // Espace établissements
  'http://localhost:5175',   // Site administration
  process.env.PUBLIC_URL,
  process.env.STRUCTURES_URL,
  process.env.ADMIN_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqué pour : ${origin}`));
  },
  credentials: true,
}));

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' },
}));
app.use('/api/auth/', rateLimit({
  windowMs: 60 * 60 * 1000, max: 30,
  message: { error: 'Trop de tentatives de connexion.' },
}));

app.use('/api/auth',         authRoutes);
app.use('/api/structures',   structureRoutes);
app.use('/api/pharmacies',   pharmacieRoutes);
app.use('/api/laboratoires', laboRoutes);
app.use('/api/hopitaux',     hopitalRoutes);
app.use('/api/posts',        postRoutes);
app.use('/api/search',       searchRoutes);
app.use('/api/abonnements',  abonnementRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/analytics',    analyticsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', app: 'AZAMED API', timestamp: new Date().toISOString() }));
app.use('*', (req, res) => res.status(404).json({ error: `Route non trouvée : ${req.originalUrl}` }));
app.use((err, req, res, next) => {
  console.error('❌', err.message);
  if (err.message?.includes('CORS')) return res.status(403).json({ error: err.message });
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Erreur serveur' : err.message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 AZAMED API → http://localhost:${PORT}`);
  console.log(`📡 CORS autorisé → ${allowedOrigins.join(' | ')}`);
  console.log(`👤 Admin → admin@azamed.com / Admin@AZAMED2024\n`);
});
