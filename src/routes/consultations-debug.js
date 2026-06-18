// PATCH pour consultations.js — ajouter logs d'erreur détaillés
// Remplacez le handler POST '/' par celui-ci pour débugger

// Dans consultations.js, modifier le catch du POST '/' :
// } catch (err) {
//   console.error('Consultation POST error:', err.message, err.stack);
//   res.status(500).json({ error: err.message });
// }

// Le problème le plus probable est l'authentification.
// Vérifier que le token est bien envoyé depuis l'app mobile dans api.js

// src/utils/api.js mobile doit inclure le token :
// api.interceptors.request.use((config) => {
//   const token = useUserStore.getState().token;
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });
