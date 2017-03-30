export default function (server, request) {
  const config = server.config();
  if (config.get('own_home.get_username_from_session.enabled')) {
    const yarKey = 'remote_user';
    if (request.auth && request.auth.isAuthenticated && request.auth.credentials && request.auth.credentials[config.get('own_home.get_username_from_session.key')]) {
      try {
        request.yar.set(yarKey, { key: request.auth.credentials[config.get('own_home.get_username_from_session.key')] });
      } catch (error) {
        server.log(['plugin:own-home', 'error'], 'Failed to store remote_user in session: ' + error);
      }
      return request.auth.credentials[config.get('own_home.get_username_from_session.key')];
    } else {
      try {
        const remoteUser = request.yar.get(yarKey);
        return remoteUser.key;
      } catch (error) {
        return null;
      }
      return null;
    }
  } else if (config.get('own_home.proxy_user_header') in request.headers) {
    return request.headers[config.get('own_home.proxy_user_header')]; 
  } else {
    return null;
  }
};
