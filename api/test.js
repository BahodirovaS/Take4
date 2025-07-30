// api/test.js - Debug environment variables
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.json({ 
    success: true,
    message: 'API is working!',
    method: req.method,
    timestamp: new Date().toISOString(),
    env_check: {
      stripe_key_exists: !!process.env.STRIPE_SECRET_KEY,
      stripe_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || 'missing',
      firebase_project_id: process.env.FIREBASE_PROJECT_ID || 'missing',
      firebase_client_email: process.env.FIREBASE_CLIENT_EMAIL || 'missing',
      firebase_private_key_exists: !!process.env.FIREBASE_PRIVATE_KEY,
      firebase_private_key_prefix: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 30) || 'missing'
    }
  });
};