import validateByLdap from './ldap/validate';
import validateByLocal from './local/validate';

export default function (server, request, remoteUser, kibanaIndexSuffix) {

  const config = server.config();

  // NOTE(wtakase): '@' replacement is necessary to support email address as a remoteUser name (issue #52).
  //                To avoid any unexpected side-effects, the replacement is taken place only at this place.
  if (remoteUser == kibanaIndexSuffix.replace('%40', '@')) {
    const replacedKibanaIndexSuffix = kibanaIndexSuffix.replace('%40', '@')
    server.log(['plugin:own-home', 'debug'], 'kibanaIndexSuffix matches remote user name: ' + replacedKibanaIndexSuffix);
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
