import getLdapConfig from './get_ldap_config';

export default function (server, request, remoteUser, kibanaIndexSuffix) {

  const ldapConfig = getLdapConfig(server, remoteUser);
  let groups = [];

  if (ldapConfig === null) {
    return false;
  }

  function searchGroups(error, response) {
    if (error != undefined) {
      server.log(['plugin:own-home', 'error'], 'LDAP search error: ' + error);
      return false;
    }

    response.on('searchEntry', function(entry) {
      server.log(['plugin:own-home', 'debug'], 'LDAP search result: ' + entry.object[ldapConfig.rolenameAttribute]);
      if (entry.object[ldapConfig.rolenameAttribute] !== remoteUser) {
        groups.push(entry.object[ldapConfig.rolenameAttribute]);
      }
    });

    response.on('error', function(error) {
      server.log(['plugin:own-home', 'error'], 'LDAP search error: ' + error.message);
      return false;
    });

    response.on('end', function(result) {
      server.log(['plugin:own-home', 'debug'], 'LDAP search status: ' + result.status);
      server.log(['plugin:own-home', 'debug'], 'Found LDAP groups: ' + groups.toString());
      for (let i = 0; i < groups.length; i++) {
        if (groups[i] == kibanaIndexSuffix) {
          return true;
        }
      }
      return false;
    });
  }

  if (server.config().get('own_home.ldap.get_dn_dynamically') && server.config().get('own_home.ldap.member_attribute') != 'memberUid') {
    const userbase = server.config().get('own_home.ldap.userbase');
    const usernameAttribute = server.config().get('own_home.ldap.username_attribute');
    const options = {
      scope: 'sub',
      filter: '(' + usernameAttribute + '=' + remoteUser + ')',
      attributes: ['dn']
    };
    ldapConfig.client.search(userbase, options, function (error, response) {
      let dn = null;

      if (error != undefined) {
        server.log(['plugin:own-home', 'error'], 'LDAP search error: ' + error);
        return false;
      }

      response.on('searchEntry', function(entry) {
        server.log(['plugin:own-home', 'debug'], 'LDAP search result: ' + entry.object['dn']);
        if (entry.object['dn']) {
          dn = entry.object['dn'];
        }
      });

      response.on('error', function(error) {
        server.log(['plugin:own-home', 'error'], 'LDAP search error: ' + error.message);
        return false;
      });

      response.on('end', function(result) {
        server.log(['plugin:own-home', 'debug'], 'LDAP search status: ' + result.status);
        server.log(['plugin:own-home', 'debug'], 'Found DN: ' + dn);
        ldapConfig.options['filter'] = ldapConfig.options['filter'].replace('%DN%', dn);
        ldapConfig.client.search(ldapConfig.rolebase, ldapConfig.options, searchGroups);
      });
    });
  } else {
    ldapConfig.client.search(ldapConfig.rolebase, ldapConfig.options, searchGroups);
  }
};
