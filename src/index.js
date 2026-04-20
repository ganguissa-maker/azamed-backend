require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middlewares ───────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.PUBLIC_URL,
  process.env.STRUCTURES_URL,
  process.env.ADMIN_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(null, true);
  },
  credentials: true,
}));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', app: 'AZAMED API', timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────────
const authRoutes       = require('./routes/auth');
const userRoutes       = require('./routes/users');
const structureRoutes  = require('./routes/structures');
const pharmacieRoutes  = require('./routes/pharmacies');
const laboRoutes       = require('./routes/laboratoires');
const hopitalRoutes    = require('./routes/hopitaux');
const postRoutes       = require('./routes/posts');
const searchRoutes     = require('./routes/search');
const abonnementRoutes = require('./routes/abonnements');
const adminRoutes      = require('./routes/admin');
const analyticsRoutes  = require('./routes/analytics');

app.use('/api/auth',         authRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/structures',   structureRoutes);
app.use('/api/pharmacies',   pharmacieRoutes);
app.use('/api/laboratoires', laboRoutes);
app.use('/api/hopitaux',     hopitalRoutes);
app.use('/api/posts',        postRoutes);
app.use('/api/search',       searchRoutes);
app.use('/api/abonnements',  abonnementRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/analytics',    analyticsRoutes);

// ── 404 ──────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route non trouvée : ${req.originalUrl}` });
});

// ── Erreurs globales ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

// ── Démarrage ─────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 AZAMED API → http://0.0.0.0:${PORT}`);
  console.log(`✅ Routes : auth, users, structures, pharmacies, labos, hopitaux, posts, search, admin\n`);
});
