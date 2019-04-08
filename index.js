import initProxy from './server/proxy/init_proxy';
import selectionRoute from './server/selection';

export default function (kibana) {

  return new kibana.Plugin({
    require: ['elasticsearch'],

    uiExports: {
      app: {
        title: 'Own Home',
        description: 'Add multi-tenancy feature to Kibana',
        main: 'plugins/own_home/app',
        icon: 'plugins/own_home/icon.svg'
      }
    },

    config(Joi) {
      const { array, boolean, number, object, string } = Joi;

      return Joi.object({
        enabled: Joi.boolean().default(true),
        remote_user: Joi.string(),
        proxy_user_header: Joi.string().default('x-proxy-user'),
        get_username_from_session: Joi.object({
          enabled: Joi.boolean().default(false),
          key: Joi.string().default('username')
        }).default(),
        default_kibana_index_suffix: Joi.string(),
        ssl: Joi.object({
          certificate: Joi.string(),
          key: Joi.string()
        }).default(),
        elasticsearch: Joi.object({
          url: Joi.string().default('http://localhost:9200'),
          ssl: Joi.object({
            certificateAuthorities: Joi.array().single().items(Joi.string())
          }).default()
        }).default(),
        session: Joi.object({
          secretkey: Joi.string().default('the-password-must-be-at-least-32-characters-long'),
          isSecure: Joi.boolean().default(true),
          timeout: Joi.number().default(3600000),
          cookie: Joi.object({
            ttl: Joi.number().integer().min(0).default(60 * 60 * 1000)
          }).default()
        }).default(),
        local: Joi.object({
          enabled: Joi.boolean().default(true),
          groups: Joi.array().items().single().default(['public', 'sandbox'])
        }).default(),
        ldap: Joi.object({
          enabled: Joi.boolean().default(false),
          url: Joi.string().default('ldap://localhost:389'),
          userbase: Joi.string().default('ou=People,dc=localhost'),
          rolebase: Joi.string().default('ou=Groups,dc=localhost'),
          search_filter: Joi.string().default('(cn=*)'),
          username_attribute: Joi.string().default('cn'),
          rolename_attribute: Joi.string().default('cn'),
          adfs: Joi.boolean().default(false),
          member_attribute: Joi.string().valid('member', 'memberUid', 'uniquemember').default('member'),
          get_dn_dynamically: Joi.boolean().default(false),
          bind: Joi.object({
            dn: Joi.string(),
            password: Joi.string()
          }).default()
        }).default(),
        explicit_kibana_index_url: Joi.object({
          enabled: Joi.boolean().default(false),
          proxy: Joi.object({
            url: Joi.string().default('http://localhost:15601'),
            ssl: Joi.object({
              certificate: Joi.string(),
              key: Joi.string()
            }).default()
          }).default(),
          kibana: Joi.object({
            ssl: Joi.object({
              verificationMode: Joi.boolean().default(true),
              certificateAuthorities: Joi.string()
            }).default()
          }).default()
        }).default(),
        wait_kibana_index_creation: Joi.number().default(3000),
        force_to_access_by_es_user: Joi.boolean().default(false)
      }).default();
    },

    init(server, options) {
      if (server.config().get('own_home.enabled')) {
        initProxy(server);
        selectionRoute(server);
      }
    }
  });
};
