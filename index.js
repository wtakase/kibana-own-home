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

      return object({
        enabled: boolean().default(true),
        proxy_user_header: string().default('x-proxy-user'),
        ssl: object({
          cert: string(),
          key: string()
        }).default(),
        elasticsearch: object({
          url: string().default('http://localhost:9200'),
          ssl: object({
            certificateAuthorities: array().single().items(string())
          }).default()
        }).default(),
        session: object({
          secretkey: string().default('the-password-must-be-at-least-32-characters-long'),
          isSecure: boolean().default(true),
          timeout: number().default(3600000)
        }).default(),
        local: object({
          enabled: boolean().default(true),
          groups: array().items().single().default(['public', 'sandbox'])
        }).default(),
        ldap: object({
          enabled: Joi.boolean().default(false),
          url: string().default('ldap://localhost:389'),
          userbase: string().default('ou=People,dc=localhost'),
          rolebase: string().default('ou=Groups,dc=localhost'),
          search_filter: string().default('(cn=*)'),
          username_attribute: string().default('cn'),
          rolename_attribute: string().default('cn'),
          adfs: boolean().default(false),
          bind: object({
            dn: string(),
            password: string()
          }).default()
        }).default(),
        explicit_kibana_index_url: object({
          enabled: Joi.boolean().default(false),
          proxy: object({
            url: string().default('http://localhost:15601'),
            ssl: object({
              certificate: string(),
              key: string()
            }).default()
          }).default(),
          kibana: object({
            ssl: object({
              verificationMode: Joi.boolean().default(true),
              certificateAuthorities: string()
            }).default()
          }).default()
        }).default()
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
