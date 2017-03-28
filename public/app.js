import chrome from 'ui/chrome';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';

import 'ui/autoload/styles';
import './less/main.less';
import template from './templates/index.html';

function generateUserInfo(resp, tab, object, reload) {
  return {
    currentKibanaIndex: resp.data.currentKibanaIndex,
    kibanaIndexPrefix: resp.data.kibanaIndexPrefix,
    username: resp.data.username,
    groups: resp.data.groups,
    moveTo: tab ? {tab: tab, object: object || ''} : null,
    reload: reload,
    backHref: resp.data.backHref
  }
}

uiRoutes.enable();
uiRoutes
.when('/:suffix', {
  template,
  resolve: {
    userInfo($route, $http) {
      return $http.get('../api/own_home/selection/' + $route.current.params.suffix).then(function (resp) {
        return generateUserInfo(resp, null, null, resp.data.explicitMode == 'true' ? true : false);
      });
    }
  }
}).when('/:suffix/:tab', {
  template,
  resolve: {
    userInfo($route, $http) {
      return $http.get('../api/own_home/selection/' + $route.current.params.suffix).then(function (resp) {
        return generateUserInfo(resp, $route.current.params.tab, null, false);
      });
    }
  }
}).when('/:suffix/:tab/:object', {
  template,
  resolve: {
    userInfo($route, $http) {
      return $http.get('../api/own_home/selection/' + $route.current.params.suffix).then(function (resp) {
        return generateUserInfo(resp, $route.current.params.tab, $route.current.params.object, false);
      });
    }
  }
}).otherwise({
  template,
  resolve: {
    userInfo($route, $http) {
      return $http.get('../api/own_home/selection').then(function (resp) {
        return generateUserInfo(resp, null, null, false);
      });
    }
  }
});

uiModules
.get('app/own_home', [])
.controller('ownHome', function ($scope, $route, $location) {
  const userInfo = $route.current.locals.userInfo;
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
