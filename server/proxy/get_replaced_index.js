import getKibanaIndex from '../get_kibana_index';
import getRemoteUser from '../get_remote_user';

module.exports = function (server, request) {
  const getReplacedIndex = async function () {
    const remoteUser = getRemoteUser(server, request);
    if (remoteUser) {
      const kibanaIndex = await getKibanaIndex(server, request, remoteUser);
      return kibanaIndex;
    } else {
      return null;
    }
  }
  return getReplacedIndex();
};
