import getFromAuthorization from './get_from_authorization';
import getFromHeader from './get_from_header';
import getFromSession from './get_from_session';

export default function (server, request) {
  var method = server.config().get('own_home.remote_user');
  // Backward compatibility.
  if (method === undefined) {
    if (server.config().get('own_home.get_username_from_session.enabled')) {
      method = 'session';
    } else {
      method = 'header';
    }
  }

  if (method === 'authorization') {
    return getFromAuthorization(server, request);
  } else if (method === 'session') {
    return getFromSession(server, request);
  } else if (method == 'header') {
    return getFromHeader(server, request);
  }
};
