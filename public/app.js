import chrome from 'ui/chrome';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';

import 'ui/autoload/styles';
import './less/main.less';
import template from './templates/index.html';

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
          dashboard: null
        };
      });
    }
  }
}).when('/:suffix/:dashboard', {
  template,
  resolve: {
    userInfo($route, $http) {
      return $http.get('../api/own_home/selection/' + $route.current.params.suffix).then(function (resp) {
        return {
          currentKibanaIndex: resp.data.currentKibanaIndex,
          kibanaIndexPrefix: resp.data.kibanaIndexPrefix,
          username: resp.data.username,
          groups: resp.data.groups,
          dashboard: $route.current.params.dashboard
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
          dashboard: null
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
  if (userInfo.dashboard) {
    $location.url('/');
    $route.reload();
    window.location.replace('/app/kibana#/dashboard/' + userInfo.dashboard);
  }
});
