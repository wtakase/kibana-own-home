import setKibanaIndex from './set_kibana_index';
import validate from './validate';

export default function (server, request, remoteUser) {
  try {
    const remoteUserSession = request.yar.get(remoteUser);
    return remoteUserSession.key;
  } catch (error) {
    server.log(['plugin:own-home', 'debug'], 'Stored kibana.index not found: ' + error);
    let suffix = remoteUser;
    const defaultSuffix = server.config().get('own_home.default_kibana_index_suffix');
    if (defaultSuffix && validate(server, request, remoteUser, defaultSuffix, null)) {
      suffix = defaultSuffix;
    }
    setKibanaIndex(server, request, remoteUser, suffix);
    const remoteUserSession = request.yar.get(remoteUser);
    return remoteUserSession.key;
  } 
};
