'use strict';

angular.module('root-app', [])
  .controller('MyCtrl', function($scope) {
    $scope.currentGraph = 'bar';
  });