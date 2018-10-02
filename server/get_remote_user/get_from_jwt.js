import getJwt from '../jwt/get_jwt';
import decodeJwt from '../jwt/decode_jwt';

export default function (server, request) {
  const token = getJwt(request);

  if (token) {
    const jwtTokenProperty = server.config().get('own_home.jwt.userclaim');

    const jwt = decodeJwt(token);
    return jwt[jwtTokenProperty];
  }

  return null;
}
