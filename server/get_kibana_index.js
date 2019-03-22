import setKibanaIndex from './set_kibana_index';
import validate from './validate';

export default function (server, request, remoteUser) {
  const getKibanaIndex = async function () {
    try {
      const remoteUserSession = request.yar.get(remoteUser);
      return remoteUserSession.key;
    } catch (error) {
      server.log(['plugin:own-home', 'debug'], 'Stored kibana.index not found: ' + error);
      let suffix = remoteUser;
      const defaultSuffix = server.config().get('own_home.default_kibana_index_suffix');
      let isValidated = false;
      if (defaultSuffix) {
        isValidated = await validate(server, request, remoteUser, defaultSuffix);
      }
      if (isValidated) {
        suffix = defaultSuffix;
      }
      setKibanaIndex(server, request, remoteUser, suffix);
      const remoteUserSession = request.yar.get(remoteUser);
      return remoteUserSession.key;
    }
  }
  return getKibanaIndex();
};
