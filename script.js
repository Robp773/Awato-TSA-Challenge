'use strict';

angular.module('root-app', ['chart.js'])

  // gets data from dataset.json
  .factory('getData', function ($http) {
    let data = $http.get('dataset.json')
      .then((res) => {
        return res.data.dataset;
      });
    return data;
  })
  // returns standard deviation
  .service('stdDeviation', function () {
    this.sqrDiff = function (values) {
      let stdDevArray = [];
      for (let value in values) {
        stdDevArray.push(values[value]);
      }
      let avg = this.average(stdDevArray);
      let squareDiffs = stdDevArray.map(function (value) {
        let diff = value - avg;
        let sqrDiff = diff * diff;
        return sqrDiff;
      });

      let avgSquareDiff = this.average(squareDiffs);
      let stdDev = Math.sqrt(avgSquareDiff);
      return stdDev;
    };

    this.average = function (data) {
      let sum = data.reduce(function (sum, value) {
        return sum + value;
      }, 0);
      let avg = sum / data.length;
      return avg;
    };
  })
  // returns graph labels, values, and stats for display
  .service('setGraphs', function (stdDeviation) {

    this.lineGraphData = function (result) {
      let labelOrder = [];
      let dataArray = [];
      let statsObj = {};

      let totalMonthlyLoss = 0;
      for (let airline in result) {
        statsObj[airline] = result[airline];
        // add up all the losses to eventually get an total avg for all airlines
        totalMonthlyLoss += result[airline].valueLost;
        // get this airline's avg
        dataArray.push(Math.round(result[airline].valueLost / 12));
        // push airline names into labelOrder array to avoid object keys not being accessed in order
        labelOrder.push(airline);
      }
      let claimKeys = ['approved', 'denied', 'settled'];
      for (let airline in statsObj) {
        for (let i = 0; i < claimKeys.length; i++) {
          // calculate get percentages of approved, denied, and settled claims
          statsObj[airline].claimStatus[claimKeys[i]] = ((statsObj[airline].claimStatus[claimKeys[i]] / statsObj[airline].claimStatus.totalClaims) * 100).toFixed(1) + '%';
        }
      }
      return { statsObj: statsObj, labelOrder: labelOrder, dataArray: dataArray, totalLossesAvg: Math.round(totalMonthlyLoss / 12) };
    };

    this.barGraphData = function (result) {
      let labelOrder = [];
      let dataArray = [];
      let stdDevArray = [];
      let statsObj = {};

      for (let airport in result) {
        // initialize the highest and lowest months as the first key in the object
        // result is an object with keys 1-12 representing numerical months
        // values are the number of claims in those months
        let dataObj = { highest: {month: 0, claims: result[airport].monthlyClaims[1]}, lowest: {month: 0, claims: result[airport].monthlyClaims[1]} };

        for (let month in result[airport].monthlyClaims) {
          let strMonth;
          let monthArray = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          // str month will use the key of result[airport] to find the right month from month array
          strMonth = monthArray[month - 1];
          // if the next key in the object has a higher value, use that value as highest
          if (result[airport].monthlyClaims[month] >= dataObj.highest.claims) {
            // record current month and number of claims 
            dataObj.highest = { month: strMonth, claims: result[airport].monthlyClaims[month] };
          }
          if (result[airport].monthlyClaims[month] <= dataObj.lowest.claims) {
            dataObj.lowest = { month: strMonth, claims: result[airport].monthlyClaims[month] };
          }
        }
        statsObj[airport] = dataObj;       
        labelOrder.push(airport);
        dataArray.push(Math.round(result[airport].totalClaims / 12));
        stdDevArray.push(stdDeviation.sqrDiff(result[airport].monthlyClaims));
      }
      return { labelOrder, dataArray, stdDevArray, statsObj };
    };
  })
  // filters through dataset.json and gathers relevant data
  .service('filter', function (setGraphs) {

    this.lineGraph = function (data, airlineFilter) {
      // object to keep totals and numbers for additional statistics
      let result = {};
      for (let i = 0; i < data.length; i++) {
        // loop through each airport name in the airportFilter array
        for (let x = 0; x < airlineFilter.length; x++) {
          // if the airport name in the airport filter array matches the airport name at the current index...
          if (data[i]['Airline Name'] === airlineFilter[x]) {
            // and the airport name already has been initialized in the result object
            if (data[i]['Airline Name'] in result) {
              // start counting claims and their status
              if (data[i].Disposition === 'Approve in Full') {
                result[data[i]['Airline Name']].claimStatus.approved++;
              }
              else if (data[i].Disposition === 'Deny') {
                result[data[i]['Airline Name']].claimStatus.denied++;
              }
              else if (data[i].Disposition === 'Settle') {
                result[data[i]['Airline Name']].claimStatus.settled++;
              }
              // monthNum gets the incident date month number from the current index
              let monthNum = data[i]['Incident Date'].substring(0, 2).replace(/\D+/g, '');
              // add a claim to this month's total
              result[data[i]['Airline Name']].monthlyClaims[monthNum]++;
              // increment this airports totalClaims number to track total claims
              result[data[i]['Airline Name']].claimStatus.totalClaims++;
              // add up each airport's value lost and update the result object 
              result[data[i]['Airline Name']].valueLost = result[data[i]['Airline Name']].valueLost + Number(data[i]['Close Amount'].replace(/[^0-9\.]+/g, ''));
            }
            // if airport name has not been initialized in the result object, add it in with default values
            else {
              result[data[i]['Airline Name']] = { claimStatus: { totalClaims: 0, approved: 0, denied: 0, settled: 0 }, valueLost: 0, monthlyClaims: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 } };
            }
          }
        }
      }
      return setGraphs.lineGraphData(result);
    };
    // get data relevant to the bar graph
    this.barGraph = function (data, airportFilter) {

      let resultsObj = {};
      for (let i = 0; i < data.length; i++) {
        for (let x = 0; x < airportFilter.length; x++) {
          // if the current item's airport code matches the filter
          if (data[i]['Airport Code'] === airportFilter[x]) {
            // and resultsObj already has a key for this airport code
            if (data[i]['Airport Code'] in resultsObj) {
              // get the current month number
              let monthNum = parseInt(data[i]['Incident Date'].substring(0, 2).replace(/[^0-9\.]+/g, ''));
              // increment the monthly claims object to keep track of each month's claim totals
              resultsObj[data[i]['Airport Code']].monthlyClaims[monthNum]++;
              // increment the total claim count
              resultsObj[data[i]['Airport Code']].totalClaims++;
            }
            else {
              // if resultObj doesnt have a key for the airport code, initialize the object for future use
              resultsObj[data[i]['Airport Code']] = {
                totalClaims: 0, monthlyClaims: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 }
              };
            }
          }
        }
      }
    
      return setGraphs.barGraphData(resultsObj);
    };
  })
  // controller for line graph
  .controller('LineCtrl', function ($scope, $rootScope, filter, getData) {
    // array that is accessed by filterAirlines() below
    $scope.filterArray = [];
    getData.then(function (res) {
      // set to rootScope so that the data array can be accessed and updated from different controllers
      $rootScope.res = res;
      $rootScope.airlineFilter = ['AirTran Airlines', 'Carribean Airlines', 'Continental Airlines', 'American Airlines', 'Delta Air Lines', 'Lufthansa', 'Alaska Airlines', 'Jet Blue'];
      let lineGraphData = filter.lineGraph($rootScope.res, $scope.airlineFilter);
      // data for chart
      $rootScope.lineData = lineGraphData.dataArray;
      // labels 
      $rootScope.lineLabels = lineGraphData.labelOrder;
      // total avg across all airlines
      $rootScope.totalLossesAvg = lineGraphData.totalLossesAvg;
      // object of stats from line graph data
      $rootScope.lineGraphStats = lineGraphData.statsObj;
    });

    // handles user clicks on the filter check boxes
    $scope.filterAirlines = function (name) {
      let lineGraphData;
      let matchTracker = false;
      // loop through the airlineFilter array to see if the passed in name is there
      // if it is splice it out - for when a user clicks the same check box twice to undo a filter
      for (let i = 0; i < $scope.airlineFilter.length; i++) {
        if (name === $scope.filterArray[i]) {
          $scope.filterArray.splice(i, 1);
          matchTracker = true;
        }
      }
      // if there was no matching name, push the name into filterArray
      if (!matchTracker) {
        $scope.filterArray.push(name);
      }
      // update the scope variables/stats/chart
      lineGraphData = filter.lineGraph($rootScope.res, $scope.filterArray);
      $rootScope.lineData = lineGraphData.dataArray;
      $rootScope.lineLabels = lineGraphData.labelOrder;
      $rootScope.totalLossesAvg = lineGraphData.totalLossesAvg;
      $rootScope.lineGraphStats = lineGraphData.statsObj;
    };
  })

  .controller('BarCtrl', function ($scope, $rootScope, filter, getData) {
    $scope.filterArray = [];
    getData.then(function (res) {
      $rootScope.res = res;
      $rootScope.airportFilter = ['CVG', 'DEN', 'LAX', 'ORD', 'SEA', 'HNL', 'SMF', 'IAH'];
      let barGraphData = filter.barGraph($rootScope.res, $rootScope.airportFilter);
      $rootScope.barStats = barGraphData.statsObj;
      $rootScope.barData = barGraphData.dataArray;
      $rootScope.barLabels = barGraphData.labelOrder;
      let standardDeviationArrary = barGraphData.stdDevArray;
      // graph settings used to display mean and standard deviation on hover over bars
      $scope.options = {
        tooltips: {
          enabled: true,
          callbacks: {
            label: function (tooltipItem) {
              return `Mean: ${tooltipItem.yLabel} \n SD: ${Math.round(standardDeviationArrary[tooltipItem.index])}`;
            }
          }
        },
      };
    });

    $scope.filterAirports = function (name) {
      let barGraphData;
      let matchTracker = false;
      for (let i = 0; i < $scope.filterArray.length; i++) {
        if (name === $scope.filterArray[i]) {
          $scope.filterArray.splice(i, 1);
          matchTracker = true;
        }
      }
      if (!matchTracker) {
        $scope.filterArray.push(name);
      }
      barGraphData = filter.barGraph($rootScope.res, $scope.filterArray);
      $rootScope.barData = barGraphData.dataArray;
      $rootScope.barLabels = barGraphData.labelOrder;
      $rootScope.barStats = barGraphData.statsObj;

    };
  })

  // handles user graph selection
  .controller('FilterToggleCtrl', function ($scope) {
    $scope.metric = 'lineValueLost';
    $scope.toggle = function (toggle) {
      $scope.metric = toggle;
    };

  })
  // handles new claim submissions
  .controller('formCtrl', function ($scope, $rootScope, filter) {

    // add the new claim into the data array
    $scope.submit = function () {
      $rootScope.res.push({
        'Airline Name': $scope.airlineName,
        'Airport Code': $scope.airportCode,
        'Incident Date': $scope.incidentDate,
        'Close Amount': $scope.closeAmount
      });
      // update all charts and stats

      let barGraphData = filter.barGraph($rootScope.res, $rootScope.airportFilter);
      $rootScope.barData = barGraphData.dataArray;
      $rootScope.barLabels = barGraphData.labelOrder;
      $rootScope.barStats = barGraphData.statsObj;

      let lineGraphData = filter.lineGraph($rootScope.res, $rootScope.airlineFilter);
      $rootScope.lineData = lineGraphData.dataArray;
      $rootScope.lineLabels = lineGraphData.labelOrder;
      $rootScope.totalLossesAvg = lineGraphData.totalLossesAvg;
      $rootScope.lineGraphStats = lineGraphData.statsObj;
    };
  });
