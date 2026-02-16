// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para verificar token JWT (REQUERIDO)
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Verificar si el token viene en el header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Verificar si no hay token
    if (!token) {
      console.log('⚠️ No se encontró token de autenticación');
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token no proporcionado'
      });
    }

    try {
      // Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
      
      // Obtener el usuario del token
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      console.log(`✅ Usuario autenticado: ${req.user.email} | Rol: ${req.user.role}`);
      next();
    } catch (error) {
      console.error('❌ Token inválido:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    next(error);
  }
};

// Middleware para verificar que el usuario sea admin
exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    console.log(`✅ Acceso de admin confirmado: ${req.user.email}`);
    next();
  } else {
    console.log(`❌ Acceso denegado - Usuario no es admin: ${req.user?.email || 'No autenticado'}`);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado - Se requiere rol de administrador'
    });
  }
};

// Middleware OPCIONAL - permite acceso tanto autenticado como no autenticado
// pero agrega req.user si hay token válido
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        req.user = await User.findById(decoded.id).select('-password');
        
        if (req.user) {
          console.log(`✅ Usuario detectado: ${req.user.email} | Rol: ${req.user.role}`);
        }
      } catch (error) {
        console.log('⚠️ Token inválido o expirado, continuando sin autenticación');
      }
    } else {
      console.log('ℹ️ No se proporcionó token, continuando sin autenticación');
    }

    next();
  } catch (error) {
    console.error('Error en optionalAuth:', error);
    next();
  }
};
