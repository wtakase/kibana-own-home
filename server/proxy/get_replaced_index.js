import getKibanaIndex from '../get_kibana_index';
import getRemoteUser from '../get_remote_user';

module.exports = function (server, request) {

  const config = server.config();

  const remoteUser = getRemoteUser(config, request);
  if (remoteUser) {
    return getKibanaIndex(server, request, remoteUser);
  } else {
    return null;
  }
};
