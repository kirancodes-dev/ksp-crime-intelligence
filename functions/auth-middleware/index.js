module.exports = (req, res, next) => {
  // Simple role propagation from headers to mock active user session
  const userId = req.headers['x-user-id'] || 'INV-1001';
  const role = req.headers['x-user-role'] || 'Investigator';

  req.user = {
    userId,
    role
  };
  
  next();
};
