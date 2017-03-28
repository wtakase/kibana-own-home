import ldap from 'ldapjs';

export default function (server, remoteUser) {

  const configPrefix = 'own_home.ldap.';
  const config = server.config();

  function getOptions() {
    const searchFilter = config.get(configPrefix + 'search_filter');
    const userbase = config.get(configPrefix + 'userbase');
    const usernameAttribute = config.get(configPrefix + 'username_attribute');
    const rolenameAttribute = config.get(configPrefix + 'rolename_attribute');
    const adfsNested = config.get(configPrefix + 'adfs') ? ':1.2.840.113556.1.4.1941:' : '';

    return {
      scope: 'sub',
      filter: '(&' + searchFilter + '(member' + adfsNested + '=' + usernameAttribute + '=' + remoteUser + ',' + userbase + '))',
      attributes: [rolenameAttribute]
    };    
  } 

  const client = ldap.createClient({
    url: config.get(configPrefix + 'url')
  });
  const options = getOptions(config, remoteUser);
  const rolebase = config.get(configPrefix + 'rolebase');
  const rolenameAttribute = config.get(configPrefix + 'rolename_attribute');

  if (config.get(configPrefix + 'bind.dn') && config.get(configPrefix + 'bind.password')) {
    client.bind(config.get(configPrefix + 'bind.dn'), config.get(configPrefix + 'bind.password'), function(err) {
      if (err) {
        server.log(['plugin:own-home', 'error'], 'LDAP bind error: ' + err);
        return null;
      }
    });
  }
 
  return {
    client: client,
    options: options,
    rolebase: rolebase,
    rolenameAttribute: rolenameAttribute
  };
};
