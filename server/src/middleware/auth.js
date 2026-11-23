import jwt from 'jsonwebtoken';

export function requireAuth(request, response, next) {
  const authorization = request.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return response.status(401).json({ message: 'Please log in to continue' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    request.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return response.status(401).json({ message: 'Your login has expired. Please log in again' });
  }
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ message: 'You do not have permission to do this' });
    }
    return next();
  };
}
