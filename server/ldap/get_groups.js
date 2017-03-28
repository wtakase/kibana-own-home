import generateReply from '../generate_reply';
import getLdapConfig from './get_ldap_config';

export default function (server, request, remoteUser, groups, callback) {
  const ldapConfig = getLdapConfig(server, remoteUser);

  if (ldapConfig === null) {
    callback(generateReply(server, request, remoteUser, groups));
  }

  ldapConfig.client.search(ldapConfig.rolebase, ldapConfig.options, function (error, response) {
    if (error != undefined) {
      server.log(['plugin:own-home', 'error'], 'LDAP search error: ' + error);
      callback(generateReply(server, request, remoteUser, groups));
    }

    response.on('searchEntry', function(entry) {
      server.log(['plugin:own-home', 'debug'], 'LDAP search result: ' + entry.object[ldapConfig.rolenameAttribute]);
      if (entry.object[ldapConfig.rolenameAttribute] !== remoteUser) {
        groups.push(entry.object[ldapConfig.rolenameAttribute]);
      }
    });

    response.on('error', function(error) {
      server.log(['plugin:own-home', 'error'], 'LDAP search error: ' + error.message);
      callback(generateReply(server, request, remoteUser, groups));
    });

    response.on('end', function(result) {
      server.log(['plugin:own-home', 'debug'], 'LDAP search status: ' + result.status);
      server.log(['plugin:own-home', 'debug'], 'Found groups: ' + groups.toString());
      callback(generateReply(server, request, remoteUser, groups));
    });
  });
};
