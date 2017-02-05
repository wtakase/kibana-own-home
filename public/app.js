import chrome from 'ui/chrome';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';

import './less/main.less';
import template from './templates/index.html';

const context = require.context('ui/styles', false, /[\/\\](?!mixins|variables|_|\.)[^\/\\]+\.less/);
context.keys().forEach(key => context(key));

uiRoutes.enable();
uiRoutes
.when('/:suffix', {
  template,
  resolve: {
    userInfo($route, $http) {
      return $http.get('../api/own_home/selection/' + $route.current.params.suffix).then(function (resp) {
        return {
          currentKibanaIndex: resp.data.currentKibanaIndex,
          kibanaIndexPrefix: resp.data.kibanaIndexPrefix,
          username: resp.data.username,
          groups: resp.data.groups,
          moveTo: null,
          reload: resp.data.explicitMode == 'true' ? true : false,
          backHref: resp.data.backHref
        };
      });
    }
  }
}).when('/:suffix/:tab', {
  template,
  resolve: {
    userInfo($route, $http) {
      return $http.get('../api/own_home/selection/' + $route.current.params.suffix).then(function (resp) {
        return {
          currentKibanaIndex: resp.data.currentKibanaIndex,
          kibanaIndexPrefix: resp.data.kibanaIndexPrefix,
          username: resp.data.username,
          groups: resp.data.groups,
          moveTo: {
            tab: $route.current.params.tab,
            object: ''
          },
          reload: false,
          backHref: resp.data.backHref
        };
      });
    }
  }
}).when('/:suffix/:tab/:object', {
  template,
  resolve: {
    userInfo($route, $http) {
      return $http.get('../api/own_home/selection/' + $route.current.params.suffix).then(function (resp) {
        return {
          currentKibanaIndex: resp.data.currentKibanaIndex,
          kibanaIndexPrefix: resp.data.kibanaIndexPrefix,
          username: resp.data.username,
          groups: resp.data.groups,
          moveTo: {
            tab: $route.current.params.tab,
            object: $route.current.params.object
          },
          reload: false,
          backHref: resp.data.backHref
        };
      });
    }
  }
}).otherwise({
  template,
  resolve: {
    userInfo($route, $http) {
      return $http.get('../api/own_home/selection').then(function (resp) {
        return {
          currentKibanaIndex: resp.data.currentKibanaIndex,
          kibanaIndexPrefix: resp.data.kibanaIndexPrefix,
          username: resp.data.username,
          groups: resp.data.groups,
          moveTo: null,
          reload: false,
          backHref: resp.data.backHref
        };
      });
    }
  }
});

uiModules
.get('app/own_home', [])
.controller('ownHome', function ($scope, $route, $location) {
  $scope.title = 'Multi-tenancy for Kibana';
  $scope.message = 'Select tenant (kibana.index)';
  $scope.description1 = 'You can switch a tenant (kibana.index) for personal or group use.';
  $scope.description2 = 'Created objects are saved to the selected index.';
  let userInfo = $route.current.locals.userInfo;
  $scope.currentKibanaIndex = userInfo.currentKibanaIndex;
  $scope.kibanaIndexPrefix = userInfo.kibanaIndexPrefix;
  $scope.username = userInfo.username;
  $scope.groups = userInfo.groups;
  $scope.backHref = userInfo.backHref;
  $location.path('').replace();
  if (userInfo.moveTo && ['discover', 'visualize', 'dashboard'].indexOf(userInfo.moveTo.tab) > -1) {
    window.location = './own_home';
    window.location.replace('./kibana#/' + userInfo.moveTo.tab + '/' + userInfo.moveTo.object);
  }
  if (userInfo.reload) {
    window.location.replace('./own_home');
  }
});
