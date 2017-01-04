import getLdapConfig from './get_ldap_config';
import generateReply from './generate_reply';

export default function (server, request, remoteUser, reply, groups) {
  const ldapConfig = getLdapConfig(server, remoteUser);

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
      server.log(['plugin:own-home', 'debug'], 'Found groups: ' + groups.toString());
      reply(generateReply(server, request, remoteUser, groups));
    });
  });
};
