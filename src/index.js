// src/index.js — Backend AZAMED (Optimisé pour la Production)
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

// ─── CONNEXION BASE DE DONNÉES ───────────────────────────────
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Test de connexion à la base de données
prisma.$connect()
  .then(() => console.log('✅ Connexion à la base de données (Prisma) réussie'))
  .catch((err) => console.error('❌ Erreur de connexion Prisma:', err));

const authRoutes = require('./routes/auth');
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

// ─── CONFIGURATION DES CORS ───────────────────────────────────
// On garde localhost pour le développement ET les variables pour la production
const allowedOrigins = [
  'http://localhost:5173',   
  'http://localhost:5174',   
  'http://localhost:5175',   
  process.env.PUBLIC_URL,    
  process.env.STRUCTURES_URL,
  process.env.ADMIN_URL,
].filter(Boolean); // Supprime les entrées vides si les variables .env ne sont pas encore définies

app.use(cors({
  origin: (origin, callback) => {
    // Autorise les requêtes sans origine (comme Postman ou les apps mobiles)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // En production, on refuse les origines non répertoriées
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
}));

// ─── SÉCURITÉ ET MIDDLEWARES ──────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── LIMITATION DE REQUÊTES ───────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 300,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

// ─── ROUTES ───────────────────────────────────────────────────
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

// Route de santé pour Render
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString() 
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route non trouvée : ${req.originalUrl}` });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('❌ Erreur :', err.message);
  const statusCode = err.status || 500;
  res.status(statusCode).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Une erreur interne est survenue' 
      : err.message 
  });
});

// ─── DÉMARRAGE ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 AZAMED API opérationnelle sur le port ${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📡 Origines autorisées : ${allowedOrigins.join(' | ')}`);
  }
});