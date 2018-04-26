'use strict';

angular.module('root-app', ['chart.js'])

  .factory('getData', function($http) { 
    let data = $http.get('dataset.json')
      .then((res)=>{
        return res.data.dataSet;
      });
    return data;
  })

  .service('filter', function () {
    this.filterData = function (data, metric, airportFilter) {
    // object to keep totals and numbers for additional statistics
      let result = {};        
      // loop through the data from dataset.json
      for(let i=0; i<data.length; i++){
        // loop through each airport name in the airportFilter array
        for(let x=0; x<airportFilter.length; x++){
        // if the airport name in the airport filter array matches the airport name at the current index...
          if(data[i]['Airport Code'] === airportFilter[x]){
            // and the airport name already has been initialized in the result object
            if(data[i]['Airport Code'] in result){
            // monthNum gets the incident date month number from the current index 
              let monthNum = parseInt(data[i]['Incident Date'].substring(0,2).replace(/[^0-9\.]+/g,''));
              // increment this airports totalClaims number to track total claims
              result[data[i]['Airport Code']].totalClaims++;
              // adds up each airport's value lost and updates the result object as it goes
              result[data[i]['Airport Code']].valueLost = result[data[i]['Airport Code']].valueLost + Math.round(Number(data[i]['Close Amount'].replace(/[^0-9\.]+/g,'')));
              // keeps track of the claims per month by airline by incrementing 
              result[data[i]['Airport Code']].monthlyClaims[monthNum]++;        
            }
            // if airport name has not been initialized in the result object, add it in with default values
            else{
              result[data[i]['Airport Code']] = {totalClaims: 0, monthlyClaims: {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0}, valueLost: 0};
            }
          }
        }
      }
      console.log(result);
      return result;
    };
  })

  .controller('ToggleCtrl', function($scope, getData, filter) {
    $scope.currentGraph = 'line';
    $scope.metric = 'valueLost';
    // default airports to display
    $scope.airportFilter = ['CVG','DEN','LAX', 'ORD', 'SEA'];
    getData.then(function(res){
      let resultObj = filter.filterData(res, $scope.metric, $scope.airportFilter);
      let dataArray = [];
      for(let airport in resultObj){
        dataArray.push(resultObj[airport].valueLost);
      }
      $scope.labels = $scope.airportFilter;
      $scope.data = dataArray;
    });
  });