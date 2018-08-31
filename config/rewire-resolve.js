const paths = require('react-scripts/config/paths');

/* config-overrides.js */
module.exports = function override(config, env) {

  let alias = config.resolve.alias;
  alias.assets = paths.appSrc + '/assets';
  alias.components = paths.appSrc + '/components';
  alias.constants = paths.appSrc + '/constants';
  alias.reducers = paths.appSrc + '/reducers';
  alias.routes = paths.appSrc + '/routes';
  alias['@vdap'] = paths.appSrc + '/vdap';
  alias['vdap-ui'] = paths.appSrc + '/components';
  return config;
};
