// api/test.js - Simple test endpoint
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.json({ 
    success: true,
    message: 'API is working!',
    method: req.method,
    timestamp: new Date().toISOString(),
    env_check: {
      stripe_key_exists: !!process.env.STRIPE_SECRET_KEY,
      stripe_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || 'missing'
    }
  });
};