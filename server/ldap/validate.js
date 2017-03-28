import getGroups from '../get_groups';
import getLdapConfig from './get_ldap_config';
import setKibanaIndex from '../set_kibana_index';

export default function (server, request, remoteUser, kibanaIndexSuffix, callback) {

  const ldapConfig = getLdapConfig(server, remoteUser);
  let groups = [];

  if (ldapConfig === null) {
    return (callback === null) ? false : getGroups(server, request, remoteUser, callback);
  }

  ldapConfig.client.search(ldapConfig.rolebase, ldapConfig.options, function (error, response) {
    if (error != undefined) {
      server.log(['plugin:own-home', 'error'], 'LDAP search error: ' + error);
      return (callback === null) ? false : getGroups(server, request, remoteUser, callback);
    }

    response.on('searchEntry', function(entry) {
      server.log(['plugin:own-home', 'debug'], 'LDAP search result: ' + entry.object[ldapConfig.rolenameAttribute]);
      if (entry.object[ldapConfig.rolenameAttribute] !== remoteUser) {
        groups.push(entry.object[ldapConfig.rolenameAttribute]);
      }
    });

    response.on('error', function(error) {
      server.log(['plugin:own-home', 'error'], 'LDAP search error: ' + error.message);
      return (callback === null) ? false : getGroups(server, request, remoteUser, callback);
    });

    response.on('end', function(result) {
      server.log(['plugin:own-home', 'debug'], 'LDAP search status: ' + result.status);
      server.log(['plugin:own-home', 'debug'], 'Found LDAP groups: ' + groups.toString());
      for (let i = 0; i < groups.length; i++) {
        if (groups[i] == kibanaIndexSuffix) {
          server.log(['plugin:own-home', 'debug'], 'kibanaIndexSuffix matches LDAP group: ' + kibanaIndexSuffix);
          setKibanaIndex(server, request, remoteUser, kibanaIndexSuffix);
          return (callback === null) ? true : getGroups(server, request, remoteUser, callback);
        }
      }
      return (callback === null) ? false : getGroups(server, request, remoteUser, callback);
    });
  });
};
