Kibana plugin: Own Home
====

Adds multi-tenancy feature to Kibana.

Each user has own `kibana.index`.

![objects separation] (https://github.com/wtakase/kibana-own-home/raw/master/images/objects_separation.png "objects separation")

This plugin enables a user to have own personal `kibana.index` so that objects the user created are stored to separate location from others. And also group shared `kibana.index` can be provided. A user can switch `kibana.index` depending on the situation by selecting on the plugin interface. Available `kibana.index` list will be generated based on username, local group definition in kibana.yml, and LDAP roles.

## Background

In the case of single Kibana instance shared among many users/groups, all objects (searches, vizualizations, dashboards) are stored to the same `kibana.index`. This means that any user can access, modify, and also delete all objects. In multi-user environment, in order to protect own objects from others or share part of objects among a group, `kibana.index` separation is one of the solutions.

## How it works

![overview] (https://github.com/wtakase/kibana-own-home/raw/master/images/overview.png "overview")

This plugin starts up a proxy server with port 19200 on the same host of Kibana.
And the proxy server intercepts ElasticSearch request in order to replace `kibana.index` with specified one.

 * Kibana runs behind of a reverse proxy web server such httpd/nginx.
 * User is required authentication at the web server.
 * The web server sets authenticated username to `x-proxy-user` header and proxies the user's request to Kibana with the header.
 * On the Kibana plugin interface, a user can set `kibana.index` and it is saved to session.
 * All requests to ElasticSearch are intercepted by this plugin, and `kibana.index` is replaced based on session information.

## Usage

* Install this plugin.
* Set up front end web server.
* Access your front end web server and log in.
* Click `Own Home` tab on Kibana web interface.
* Select one of tenants (kibana.index).
* Go back to Discover, Visualize, Dashboard pages.

![screenshot] (https://github.com/wtakase/kibana-own-home/raw/4.6/images/screenshot.png "screenshot")

## Prerequirement

* A reverse proxy server such as httpd, nginx is required as a front end of Kibana.
* Authentication is required at the server.
* After the authentication the server proxies user's requests to Kibana with `x-proxy-user` header which contains username.

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

* Kibana 4

```
bin/kibana plugin -i own_home -u https://github.com/wtakase/kibana-own-home/releases/download/v4.6.4/own_home-4.6.4.zip
```

## Options

Available optins and default values are as follows:
```
own_home.proxy_user_header: x-proxy-user
own_home.ssl.cert: '' <-- specify this proxy's server cert location if necessary
own_home.ssl.key: '' <-- specify this proxy's server key location if necessary
own_home.elasticsearch.url: http://localhost:9200
own_home.elasticsearch.ssl.ca: '' <-- specify your elasticsearch cert's CA cert location if necessary
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
elasticsearch.ssl.ca: /path/to/this/proxy/server/cert/CA.crt
own_home.proxy_user_header: remote-user
own_home.ssl.cert: /path/to/this/proxy/server.crt
own_home.ssl.key: /path/to/this/proxy/server.key
own_home.elasticsearch.url: https://localhost:9200
own_home.elasticsearch.ssl.ca: /path/to/elasticsearch/server/cert/CA.crt
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

## Set default kibana.index by URL

You can specify kibana.index in URL as follows:

* kibanaserver:5601/app/own_home#/*KIBANA_INDEX_SUFFIX*
* kibanaserver:5601/app/own_home#/*KIBANA_INDEX_SUFFIX*/*TAB*
* kibanaserver:5601/app/own_home#/*KIBANA_INDEX_SUFFIX*/*TAB*/*OBJECT_NAME*

### Example 1. Set `.kibana_public` as kibana.index

Access to kibanaserver:5601/app/own_home#/`public`

### Example 2. Set `.kibana_public` as kibana.index and then go to `dashboard` tab

Access to kibanaserver:5601/app/own_home#/`public`/`dashboard`

### Example 3. Set `.kibana_public` as kibana.index and then open `example01` dashboard

Access to kibanaserver:5601/app/own_home#/`public`/`dashboard`/`example01`
