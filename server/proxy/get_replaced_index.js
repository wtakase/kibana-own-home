import getKibanaIndex from '../get_kibana_index';
import getRemoteUser from '../get_remote_user';

module.exports = function (server, request) {
  const remoteUser = getRemoteUser(server, request);
  if (remoteUser) {
    return getKibanaIndex(server, request, remoteUser);
  } else {
    return null;
  }
};
