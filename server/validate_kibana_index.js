import validateByLdap from './ldap/validate';
import validateByLocal from './local/validate';

export default function (server, request, remoteUser, kibanaIndexSuffix) {

  const config = server.config();

  if (remoteUser == kibanaIndexSuffix) {
    server.log(['plugin:own-home', 'debug'], 'kibanaIndexSuffix matches remote user name: ' + kibanaIndexSuffix);
    return true;
  }

  if (config.get('own_home.local.enabled')) {
    if (validateByLocal(server, kibanaIndexSuffix)) {
      server.log(['plugin:own-home', 'debug'], 'kibanaIndexSuffix matches local group: ' + kibanaIndexSuffix);
      return true;
    }
  }

  if (config.get('own_home.ldap.enabled')) {
    if (validateByLdap(server, request, remoteUser, kibanaIndexSuffix)) {
      server.log(['plugin:own-home', 'debug'], 'kibanaIndexSuffix matches LDAP group: ' + kibanaIndexSuffix);
      return true;
    }
  }

  return false;
};
