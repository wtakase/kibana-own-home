import fetchGroups from './fetch_groups';
import setKibanaIndex from './set_kibana_index';
import validateByLdap from './validate_by_ldap';

export default function (server, request, remoteUser, kibanaIndexSuffix, reply) {

  const config = server.config();

  if (remoteUser == kibanaIndexSuffix) {
    server.log(['plugin:own-home', 'debug'], 'kibanaIndexSuffix matches remote user name: ' + kibanaIndexSuffix);
    setKibanaIndex(server, request, remoteUser, kibanaIndexSuffix);
    return fetchGroups(server, request, remoteUser, reply);
  }

  if (config.get('own_home.local.enabled') && config.get('own_home.local.groups').indexOf(kibanaIndexSuffix) >= 0) {
    server.log(['plugin:own-home', 'debug'], 'kibanaIndexSuffix matches local group: ' + kibanaIndexSuffix);
    setKibanaIndex(server, request, remoteUser, kibanaIndexSuffix);
    return fetchGroups(server, request, remoteUser, reply);
  }

  if (config.get('own_home.ldap.enabled')) {
    return validateByLdap(server, request, remoteUser, kibanaIndexSuffix, reply);
  } else {
    return fetchGroups(server, request, remoteUser, reply);
  }
};
