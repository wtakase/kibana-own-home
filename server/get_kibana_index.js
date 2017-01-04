import setKibanaIndex from './set_kibana_index';

export default function (server, request, remoteUser) {
  try {
    const remoteUserSession = request.yar.get(remoteUser);
    return remoteUserSession.key;
  } catch (error) {
    server.log(['plugin:own-home', 'debug'], 'Stored kibana.index not found: ' + error);
    setKibanaIndex(server, request, remoteUser, remoteUser);
    const remoteUserSession = request.yar.get(remoteUser);
    return remoteUserSession.key;
  } 
};
