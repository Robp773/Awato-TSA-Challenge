'use strict';

angular.module('root-app', ['chart.js'])

  .factory('getData', function($http) { 
    let data = $http.get('dataset.json')
      .then((res)=>{
        return res.data.dataset;
      });
    return data;
  })

  .service('filter', function () {
    this.standardDeviation = function(values){         
      let stdDevArray = [];
      for(let value in values){      
        stdDevArray.push(values[value]);
      }               
      let avg = this.average(stdDevArray);     
      let squareDiffs = stdDevArray.map(function(value){
        let diff = value - avg;
        let sqrDiff = diff * diff;
        return sqrDiff;
      });
            
      let avgSquareDiff = this.average(squareDiffs);  
      let stdDev = Math.sqrt(avgSquareDiff);
      return stdDev;
    };

    this.average = function(data){
      let sum = data.reduce(function(sum, value){
        return sum + value;
      }, 0);      
      let avg = sum / data.length;
      return avg;   
    };

    this.setGraphData = function(result, metric){
      let labelOrder=  [];
      let dataArray = [];
      let stdDevArray = [];
      if(metric === 'lineValueLost'){
        let totalMonthlyLoss = 0;
        for(let airline in result){
          totalMonthlyLoss += result[airline].valueLost;
          dataArray.push(Math.round(result[airline].valueLost / 12));
          labelOrder.push(airline);
        }
        return {labelOrder: labelOrder, dataArray: dataArray, totalLossesAvg: Math.round(totalMonthlyLoss / 12)};              
      }       
      else{
        for(let airport in result){
          labelOrder.push(airport);
          dataArray.push(Math.round(result[airport].totalClaims / 12));
          stdDevArray.push(this.standardDeviation(result[airport].monthlyClaims));
        }        
      }
      return {labelOrder, dataArray, stdDevArray};
    };

    this.lineGraph = function (data, metric, airlineFilter) {
      // object to keep totals and numbers for additional statistics
      let result = {};        
      // loop through the data from dataset.json
      for(let i=0; i<data.length; i++){
        // loop through each airport name in the airportFilter array
        for(let x=0; x<airlineFilter.length; x++){
        // if the airport name in the airport filter array matches the airport name at the current index...
          if(data[i]['Airline Name'] === airlineFilter[x]){
            // and the airport name already has been initialized in the result object
            if(data[i]['Airline Name'] in result){
            // monthNum gets the incident date month number from the current index 
              // increment this airports totalClaims number to track total claims
              result[data[i]['Airline Name']].totalClaims++;
              // adds up each airport's value lost and updates the result object as it goes
              result[data[i]['Airline Name']].valueLost = result[data[i]['Airline Name']].valueLost + Math.round(Number(data[i]['Close Amount'].replace(/[^0-9\.]+/g,'')));
              // keeps track of the claims per month by airline by incrementing 
            }
            // if airport name has not been initialized in the result object, add it in with default values
            else{
              result[data[i]['Airline Name']] = {totalClaims: 0, valueLost: 0};
            }
          }
        }
      }
      return this.setGraphData(result, metric);
    };
    
    this.barGraph = function(data, metric, airportFilter){
      let resultsObj = {};
      for(let i=0;i<data.length; i++){
        for(let x=0; x<airportFilter.length; x++){
          if(data[i]['Airport Code'] === airportFilter[x]){
            if(data[i]['Airport Code'] in resultsObj){
              let monthNum = parseInt(data[i]['Incident Date'].substring(0,2).replace(/[^0-9\.]+/g,''));
              resultsObj[data[i]['Airport Code']].monthlyClaims[monthNum]++;
              resultsObj[data[i]['Airport Code']].totalClaims++;
            }
            else{
              resultsObj[data[i]['Airport Code']] = {totalClaims: 0, monthlyClaims: {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0}        
              };
            }
          }
        }
      }
      return this.setGraphData(resultsObj, metric);
    };
  })

  .controller('LineCtrl', function ($scope, $rootScope, filter, getData) {  
    getData.then(function(res){ 
      $rootScope.airlineFilter = ['American Airlines', 'Delta Air Lines', 'Lufthansa', 'Alaska Airlines'];
      $scope.lineGraphData = filter.lineGraph(res, 'lineValueLost', $rootScope.airlineFilter);
      $scope.data = $scope.lineGraphData.dataArray;
      $scope.labels = $scope.lineGraphData.labelOrder;
      $scope.totalLossesAvg = $scope.lineGraphData.totalLossesAvg;
    });
  })

  .controller('BarCtrl', function ($scope, $rootScope, filter, getData) { 
    getData.then(function(res){    
      $rootScope.airportFilter = ['CVG','DEN','LAX', 'ORD', 'SEA']; 
      $scope.barGraphData = filter.barGraph(res, 'barAvgClaims', $rootScope.airportFilter);
      $scope.data = $scope.barGraphData.dataArray;
      $scope.labels = $scope.barGraphData.labelOrder;
      let standardDeviationArrary = $scope.barGraphData.stdDevArray;
      $scope.options = {
        tooltips: {
          enabled: true,
          callbacks: {
            label: function(tooltipItem) {
              return `Mean: ${tooltipItem.yLabel} \n SD: ${Math.round(standardDeviationArrary[tooltipItem.index])}`;
            }
          }
        },
      };
    });        
  })

  .controller('ToggleCtrl', function($scope) {
    $scope.metric = 'lineValueLost';
    $scope.toggle = function(toggle){
      $scope.metric = toggle; 
    };
  });  