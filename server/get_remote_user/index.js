import getFromHeader from './get_from_header';
import getFromSession from './get_from_session';

export default function (server, request) {
  if (server.config().get('own_home.get_username_from_session.enabled')) {
    return getFromSession(server, request);
  } else {
    return getFromHeader(server, request);
  }
};
