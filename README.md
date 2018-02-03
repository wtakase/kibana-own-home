Kibana plugin: Own Home
====

Adds multi-tenancy feature to Kibana.

Each user has own `kibana.index`.

![objects separation](https://github.com/wtakase/kibana-own-home/raw/master/images/objects_separation.png "objects separation")

This plugin enables a user to have own personal `kibana.index` so that objects the user created are stored to separate location from others. And also group shared `kibana.index` can be provided. A user can switch `kibana.index` depending on the situation by selecting on the plugin interface. Available `kibana.index` list will be generated based on username, local group definition in kibana.yml, and LDAP roles.

## Background

In the case of single Kibana instance shared among many users/groups, all objects (searches, vizualizations, dashboards) are stored to the same `kibana.index`. This means that any user can access, modify, and also delete all objects. In multi-user environment, in order to protect own objects from others or share part of objects among a group, `kibana.index` separation is one of the solutions.

## How it works

![overview](https://github.com/wtakase/kibana-own-home/raw/master/images/overview.png "overview")

This plugin starts up a proxy server with port 19200 on the same host of Kibana.
And the proxy server intercepts ElasticSearch request in order to replace `kibana.index` with specified one.

 * Kibana runs behind of a reverse proxy web server such httpd/nginx.
 * User is required authentication at the web server.
 * The web server sets authenticated username to `x-proxy-user` header and passes the user's request to Kibana with the header.
 * On the Kibana plugin interface, a user can set `kibana.index` and it is saved to session.
 * All requests to ElasticSearch are intercepted by this plugin, and `kibana.index` is replaced based on session information.

## Usage

* Install this plugin.
* Set up front end web server.
* Access your front end web server and log in.
* Click `Own Home` tab on Kibana web interface.
* Select one of tenants (kibana.index).
* Go back to Discover, Visualize, Dashboard pages.

![screenshot](https://github.com/wtakase/kibana-own-home/raw/master/images/screenshot.png "screenshot")

## Prerequirement

* A reverse proxy server such as httpd, nginx is required as a front end of Kibana.
* Authentication is required at the server.
* After the authentication the server passes user's requests to Kibana with `x-proxy-user` header which contains username.

### Example of httpd configuration with Basic authentication

```
RewriteEngine on
SSLProxyEngine on
RewriteRule  ^/?(.*)$ https://localhost:5601/$1 [L,P]
RequestHeader set X-Proxy-User %{REMOTE_USER}s
<Location />
  SSLRequireSSL
  AuthType Basic
  AuthName "Basic Authentication"
  AuthUserFile /path/to/htpasswd
  Require valid-user
</Location>
```

## Installation

* Kibana 6

```
bin/kibana-plugin install https://github.com/wtakase/kibana-own-home/releases/download/v6.1.2/own_home-6.1.2.zip
```

## Options

Available options and default values are as follows:
```
own_home.proxy_user_header: x-proxy-user
own_home.get_username_from_session.enabled: false
own_home.get_username_from_session.key: username
own_home.default_kibana_index_suffix: ''
own_home.ssl.certificate: '' <-- specify this elasticsearch proxy's server cert location if necessary
own_home.ssl.key: '' <-- specify this elasticsearch proxy's server key location if necessary
own_home.elasticsearch.url: http://localhost:9200
own_home.elasticsearch.ssl.certificateAuthorities: '' <-- specify your elasticsearch cert's CA cert location if necessary
own_home.session.secretkey: the-password-must-be-at-least-32-characters-long
own_home.session.isSecure: true
own_home.session.timeout: 3600000
own_home.local.enabled: true
own_home.local.groups: [ public, sandbox ]
own_home.ldap.enabled: false
own_home.ldap.url: ldap://localhost:389
own_home.ldap.userbase: ou=People,dc=localhost
own_home.ldap.rolebase: ou=Groups,dc=localhost
own_home.ldap.search_filter: '(cn=*)'
own_home.ldap.username_attribute: cn
own_home.ldap.rolename_attribute: cn
own_home.ldap.adfs: false
own_home.ldap.member_attribute: member <-- member or memberUid or uniquemember
own_home.ldap.get_dn_dynamically: false <-- if true, get the user's DN dynamically by using ldap.username_attribute
own_home.ldap.bind.dn: ''
own_home.ldap.bind.password: ''
own_home.explicit_kibana_index_url.enabled: false
own_home.explicit_kibana_index_url.proxy.url: http://localhost:15601
own_home.explicit_kibana_index_url.proxy.ssl.certificate: '' <-- specify this kibana proxy's server cert location if necessary
own_home.explicit_kibana_index_url.proxy.ssl.key: '' <-- specify this kibana proxy's server cert location if necessary
own_home.explicit_kibana_index_url.kibana.ssl.verificationMode: true
own_home.explicit_kibana_index_url.kibana.ssl.certificateAuthorities: '' <-- specify your kibana cert's CA cert location if necessary
own_home.force_to_access_by_es_user: false <-- override authorization header to force to access by elasticsearch.username
```

## Examples of configuration

### Minimum configuration (for test)

Assume the following situation:

 * Front end web server runs at http://localhost:80 and sends username by `x-proxy-user` header.
 * Kibana runs at http://localhost:5601.
 * This proxy server runs at http://localhost:19200.
 * ElasticSearch runs at http://localhost:9200.
 * Each user has own `kibana.index`.
 * `.kibana_common01` and `.kibana_common02` are shared among all users.

Set kibana.yml as follows:
```
elasticsearch.url: http://localhost:19200
elasticsearch.requestHeadersWhitelist: [ x-proxy-user, cookie ]
own_home.session.secretkey: the-password-must-be-at-least-32-characters-long
own_home.session.isSecure: false
own_home.local.groups: [ common01, common02 ]
```

### Configuration with LDAP

Assume the following situation:
 
 * Front end web server runs at https://localhost:443 and sends username by `remote-user` header.
 * Kibana runs at https://localhost:5601.
 * This proxy server runs at https://localhost:19200.
 * LDAP server runs at ldap://localhost:389.
 * ElasticSearch runs at https://localhost:9200.
 * Each user has own `kibana.index`.
 * `.kibana_public` and `.kibana_sandbox` are shared among all users.
 * Users belong to the same LDAP group can share group `kibana.index`.

Set kibana.yml as follows:
```
elasticsearch.url: https://localhost:19200
elasticsearch.ssl.certificateAuthorities: /path/to/this/proxy/server/cert/CA.crt
elasticsearch.requestHeadersWhitelist: [ remote-user, cookie ]
own_home.proxy_user_header: remote-user
own_home.ssl.certificate: /path/to/this/proxy/server.crt
own_home.ssl.key: /path/to/this/proxy/server.key
own_home.elasticsearch.url: https://localhost:9200
own_home.elasticsearch.ssl.certificateAuthorities: /path/to/elasticsearch/server/cert/CA.crt
own_home.session.secretkey: the-password-must-be-at-least-32-characters-long
own_home.local.groups: [ public, sandbox ]
own_home.ldap.enabled: true
own_home.ldap.url: ldap://localhost:389
own_home.ldap.userbase: ou=People,dc=localhost
own_home.ldap.rolebase: ou=Groups,dc=localhost
own_home.ldap.search_filter: '(cn=*)'
own_home.ldap.username_attribute: cn
own_home.ldap.rolename_attribute: cn
```

### Extract username from session instead of request header (Experimental)

By default, Own home fetches username from HTTP request header such as `x-proxy-user`.
`get_username_from_session.enabled` and `get_username_from_session.key` options enable to fetch from session.
In this case, you don't need to set up a front end server.

![extract_username_from_session](https://github.com/wtakase/kibana-own-home/raw/master/images/extract_username_from_session.png "extract_username_from_session")

Here is an example of integration with [search-guard-kibana-plugin](https://github.com/floragunncom/search-guard-kibana-plugin):
```
server.defaultRoute: /app/own_home
elasticsearch.url: http://localhost:19200
elasticsearch.requestHeadersWhitelist: [ cookie, authorization ]
elasticsearch.username: kibanaserver
elasticsearch.password: kibanaserver
elasticsearch.ssl.verify: false
own_home.get_username_from_session.enabled: true
own_home.get_username_from_session.key: username
own_home.session.isSecure: false
own_home.elasticsearch.url: http://localhost:9200
own_home.session.secretkey: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
searchguard.cookie.secure: false
searchguard.cookie.password: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

![demo_extract_username_from_session](https://github.com/wtakase/kibana-own-home/raw/master/images/demo_extract_username_from_session.gif "demo_extract_username_from_session")

### Use explicit kibana.index in URL feature (Experimental)

This enables to display current kibana.index in URL, so that it is possible users to know it explicitly.

Configure your httpd as follows:
```
RewriteEngine on
RewriteRule  ^/?(.*)$ http://localhost:15601/$1 [L,P]
RequestHeader set X-Proxy-User %{REMOTE_USER}e
<Location />
  AuthType Basic
  AuthName "Basic Authentication"
  AuthUserFile /path/to/htpasswd
  Require valid-user
</Location>
```

Add the following line to kibana.yml:
```
own_home.explicit_kibana_index_url.enabled: true
```

#### Example: Work on `.kibana_public`:
Access => http://frontendserver/public/app/kibana

![explicit_kibana_index_url](https://github.com/wtakase/kibana-own-home/raw/master/images/explicit_kibana_index_url.gif "explicit_kibana_index_url")

## Set default kibana.index by URL

You can specify kibana.index in URL as follows:

* front_end_server/app/own_home#/*KIBANA_INDEX_SUFFIX*
* front_end_server/app/own_home#/*KIBANA_INDEX_SUFFIX*/*TAB*
* front_end_server/app/own_home#/*KIBANA_INDEX_SUFFIX*/*TAB*/*OBJECT_ID*

### Example 1. Set .kibana_public as kibana.index

Access => front_end_server/app/own_home#/`public`

### Example 2. Set .kibana_public as kibana.index and then go to dashboard tab

Access => front_end_server/app/own_home#/`public`/`dashboard`

### Example 3. Set .kibana_public as kibana.index and then open xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx dashboard

Access => front_end_server/app/own_home#/`public`/`dashboard`/`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

## Contribute

### Build instructions

* Clone the Kibana repository.
```sh
$ git clone https://github.com/elastic/kibana
$ cd kibana/
```

* Checkout the target Kibbana version branch/tag.
```sh
$ git checkout v5.6.4
```

* Install Kibana Nodejs environment and dependencies.
```sh
$ nvm install `cat .node-version`
$ npm install
```

* Setup Own Home as a plugin inside the Kibana repo.
```sh
$ cd plugins/
$ git clone https://github.com/wtakase/kibana-own-home
$ cd kibana-own-home/
```

* Checkout the target Kibbana version branch/tag.
```sh
$ git checkout v5.6.4
```

* Install Own Home dependencies.
```sh
$ npm install --legacy-bundling
```

* Finally build the Own Home plugin file.
```sh
$ npm run build
```

Following all the steps should generate the `own_home-5.6.4.zip`  Kibana plugin
zip file under Own Home `build/` directory.
