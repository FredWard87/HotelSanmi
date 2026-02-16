const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Intento de login:', email);
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password required' 
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ Usuario no encontrado:', email);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }
    
    const match = await user.comparePassword(password);
    
    if (!match) {
      console.log('❌ Contraseña incorrecta para:', email);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }
    
    const payload = { 
      id: user._id, 
      email: user.email, 
      role: user.role, 
      name: user.name 
    };
    
    const token = jwt.sign(
      payload, 
      process.env.JWT_SECRET || 'devsecret', 
      { expiresIn: '8h' }
    );
    
    console.log('✅ Login exitoso:', email, '| Rol:', user.role);
    
    res.json({ 
      success: true,
      token, 
      user: payload 
    });
  } catch (err) {
    console.error('❌ Error en login:', err);
    next(err);
  }
};

// 🆕 Agregar endpoint para obtener usuario actual
exports.getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    next(error);
  }
};
