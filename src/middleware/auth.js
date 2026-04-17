// src/middleware/auth.js
const jwt     = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma  = new PrismaClient();

// ─── protect — vérifie le JWT ─────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Accès non autorisé. Token manquant.' });
    }
    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        structure: {
          include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Compte désactivé ou introuvable.' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    }
    return res.status(401).json({ error: 'Token invalide.' });
  }
};

// ─── adminOnly — réservé aux ADMIN ────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  next();
};

// ─── structureOnly — réservé aux STRUCTURE ───────────────────
const structureOnly = (req, res, next) => {
  if (req.user?.role !== 'STRUCTURE' && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux établissements de santé.' });
  }
  next();
};

// ─── ownStructure — vérifie que la structure appartient à l'user
const ownStructure = (req, res, next) => {
  if (req.user?.role === 'ADMIN') return next();
  const structureId = req.params.id || req.params.structureId;
  if (req.user?.structure?.id !== structureId) {
    return res.status(403).json({ error: 'Accès non autorisé à cette structure.' });
  }
  next();
};

module.exports = { protect, adminOnly, structureOnly, ownStructure };
