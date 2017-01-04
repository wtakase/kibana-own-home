import getKibanaIndex from '../get_kibana_index';

module.exports = function (server, request) {

  const config = server.config();

  let replacedIndex = '';

  if (config.get('own_home.proxy_user_header') in request.headers) {
    const remoteUser = request.headers[config.get('own_home.proxy_user_header')];
    replacedIndex = getKibanaIndex(server, request, remoteUser);
  }

  return replacedIndex;
};
