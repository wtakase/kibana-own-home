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

    let dn = '%DN%';
    if (!config.get(configPrefix + 'get_dn_by_uid')) {
      dn = usernameAttribute + '=' + remoteUser + ',' + userbase;
    }

    const memberAttribute = config.get(configPrefix + 'member_attribute');
    let memberFilter;
    if (memberAttribute == 'member') {
      memberFilter = '(member' + adfsNested + '=' + dn + ')';
    } else if (memberAttribute == 'memberUid') {
      memberFilter = '(memberUid=' + remoteUser + ')'
    } else if (memberAttribute == 'uniquemember') {
      memberFilter = '(uniquemember=' + dn + ')';
    } else {
      server.log(['plugin:own-home', 'error'], 'Invalid LDAP member attribute: ' + memberAttribute);
      return null;
    }

    return {
      scope: 'sub',
      filter: '(&' + searchFilter + memberFilter + ')',
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
