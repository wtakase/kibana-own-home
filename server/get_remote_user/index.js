import getFromHeader from './get_from_header';
import getFromSession from './get_from_session';
import getFromJwt from './get_from_jwt';

export default function (server, request) {
  if (server.config().get('own_home.get_username_from_session.enabled')) {
    return getFromSession(server, request);
  } else if (server.config().get('own_home.jwt.enabled')) {
    return getFromJwt(server, request);
  } {
    return getFromHeader(server, request);
  }
};
