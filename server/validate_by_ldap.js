import getLdapConfig from './get_ldap_config';
import fetchGroups from './fetch_groups';
import setKibanaIndex from './set_kibana_index';

export default function (server, request, remoteUser, kibanaIndexSuffix, reply) {

  const ldapConfig = getLdapConfig(server, remoteUser);
  let groups = [];

  ldapConfig.client.search(ldapConfig.rolebase, ldapConfig.options, function (error, response) {
    if (error != undefined) {
      server.log(['plugin:own-home', 'error'], 'LDAP search error: ' + error);
      return {};
    }

    response.on('searchEntry', function(entry) {
      server.log(['plugin:own-home', 'debug'], 'LDAP search result: ' + entry.object[ldapConfig.rolenameAttribute]);
      if (entry.object[ldapConfig.rolenameAttribute] !== remoteUser) {
        groups.push(entry.object[ldapConfig.rolenameAttribute]);
      }
    });

    response.on('error', function(error) {
      server.log(['plugin:own-home', 'error'], 'LDAP search error: ' + error.message);
    });

    response.on('end', function(result) {
      server.log(['plugin:own-home', 'debug'], 'LDAP search status: ' + result.status);
      server.log(['plugin:own-home', 'debug'], 'Found LDAP groups: ' + groups.toString());
      for (let i = 0; i < groups.length; i++) {
        if (groups[i] == kibanaIndexSuffix) {
          server.log(['plugin:own-home', 'debug'], 'kibanaIndexSuffix matches LDAP group: ' + kibanaIndexSuffix);
          setKibanaIndex(server, request, remoteUser, kibanaIndexSuffix);
          return (reply === null) ? true : fetchGroups(server, request, remoteUser, reply);
        }
      }
      return (reply === null) ? false : fetchGroups(server, request, remoteUser, reply);
    });
  });
};
