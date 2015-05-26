define(['d3', './listeners', './query/pathquery', './config', './statisticsutil', './sorting'], function (d3, listeners, pathQuery, config, statisticsUtil, sorting) {

  var SortingStrategy = sorting.SortingStrategy;

  function DatasetMedianSortingStrategy(datasetName) {
    SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, datasetName + ": Median");
    this.dataset = datasetName;
  }

  DatasetMedianSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

  DatasetMedianSortingStrategy.prototype.compare = function (a, b) {
    var statsA = getPathDatasetStats(a.path, this.dataset);
    var statsB = getPathDatasetStats(b.path, this.dataset);
    if (this.ascending) {
      return d3.ascending(statsA.median, statsB.median);
    }
    return d3.descending(statsA.median, statsB.median);
  };

  function MaxMedianSortingStrategy(datasetName) {
    SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, datasetName + ": Max Median");
    this.dataset = datasetName;
  }

  MaxMedianSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

  MaxMedianSortingStrategy.prototype.compare = function (a, b) {

    var groups = Object.keys(allData[this.dataset.toString()]);

    groups.forEach(function (group) {
      var stats = getPathGroupStats(a.path, this.dataset, group);
    });
    var statsA = getPathGroupStats(a.path, this.dataset, this.group);
    var statsB = getPathGroupStats(b.path, this.dataset, this.group);
    if (this.ascending) {
      return d3.ascending(statsA.median, statsB.median);
    }
    return d3.descending(statsA.median, statsB.median);
  };

  function GroupMedianSortingStrategy(datasetName, groupName) {
    SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, datasetName + " - " + groupName + ": Median");
    this.dataset = datasetName;
    this.group = groupName;
  }

  GroupMedianSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

  GroupMedianSortingStrategy.prototype.compare = function (a, b) {
    var statsA = getPathGroupStats(a.path, this.dataset, this.group);
    var statsB = getPathGroupStats(b.path, this.dataset, this.group);

    if (this.ascending) {
      return d3.ascending(statsA.median, statsB.median);
    }
    return d3.descending(statsA.median, statsB.median);
  };


  //-------------------------------------------------------------


  function PerNodeBetweenGroupsSortingStrategy(datasetName, statsProperty, betweenGroupsAggregateFunction, nodeAggregateFunction, label) {
    SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, datasetName + ": " + label);
    this.dataset = datasetName;
    this.statsProperty = statsProperty;
    this.betweenGroupsAggregateFunction = betweenGroupsAggregateFunction;
    this.nodeAggregateFunction = nodeAggregateFunction;
  }

  PerNodeBetweenGroupsSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

  PerNodeBetweenGroupsSortingStrategy.prototype.compare = function (a, b) {

    var scoreA = this.nodeAggregateFunction(getPerNodeAggregatesBetweenGroups(this.dataset, a.path, this.statsProperty, this.betweenGroupsAggregateFunction));
    var scoreB = this.nodeAggregateFunction(getPerNodeAggregatesBetweenGroups(this.dataset, b.path, this.statsProperty, this.betweenGroupsAggregateFunction));

    if (this.ascending) {
      return d3.ascending(scoreA, scoreB);
    }
    return d3.descending(scoreA, scoreB);
  };

  function PerNodeWithinGroupSortingStrategy(datasetName, groupName, statsProperty, aggregateFunction, label) {
    SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, datasetName + " - " + groupName + ": " + label);
    this.dataset = datasetName;
    this.group = groupName;
    this.statsProperty = statsProperty;
    this.aggrgateFunction = aggregateFunction;
  }

  PerNodeWithinGroupSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

  PerNodeWithinGroupSortingStrategy.prototype.compare = function (a, b) {
    var scoreA = aggregateStats(getPerNodeStatsWithinGroup(this.dataset, this.group, a.path), this.statsProperty, this.aggrgateFunction);
    var scoreB = aggregateStats(getPerNodeStatsWithinGroup(this.dataset, this.group, b.path), this.statsProperty, this.aggrgateFunction);


    if (this.ascending) {
      return d3.ascending(scoreA, scoreB);
    }
    return d3.descending(scoreA, scoreB);
  };

  function maxOfArray(arr) {
    return Math.max.apply(null, arr);
  }

  function minOfArray(arr) {
    return Math.min.apply(null, arr);
  }

  function mean(arr) {
    var sum = 0;
    arr.forEach(function (el) {
      sum += el;
    });
    return sum / arr.length;
  }

  function maxDiff(arr) {
    return maxOfArray(diffsOfArray(arr));
  }

  function minDiff(arr) {
    return minOfArray(diffsOfArray(arr));
  }

  function diffsOfArray(arr) {
    var diffs = [];

    arr.forEach(function (el, i) {
      arr.forEach(function (e, j) {
        if (i !== j) {
          diffs.push(Math.abs(el - e));
        }
      });
    });
    return diffs;
  }

  function getPerNodeAggregatesBetweenGroups(dataset, path, statsProperty, aggregateFunction) {
    var allStatsPerNode = {};
    var groups = Object.keys(allData[dataset.toString()]);
    groups.forEach(function (group) {
      var allGroupStats = getPerNodeStatsWithinGroup(dataset, group, path);
      allGroupStats.forEach(function (stats, i) {
        var allStats = allStatsPerNode[i.toString()];
        if (typeof allStats === "undefined") {
          allStats = [];
          allStatsPerNode[i.toString()] = allStats;
        }
        allStats.push(stats);
      });
    });
    var nodeAggregates = [];

    Object.keys(allStatsPerNode).forEach(function (key) {
      var statsPerNode = allStatsPerNode[key];
      nodeAggregates.push(aggregateStats(statsPerNode, statsProperty, aggregateFunction));
    });

    return nodeAggregates;

  }

  function getPerNodeStatsWithinGroup(dataset, group, path) {

    var allStats = [];

    path.nodes.forEach(function (node) {
      allStats.push(getStatsForNode(node, dataset, group));
    });

    return allStats;
  }

  function aggregateStats(statsArray, statsProperty, aggregateFunction) {

    var elementsToAggregate = [];

    statsArray.forEach(function (stats) {
      var el = stats[statsProperty];
      if (typeof el !== "undefined" && !isNaN(el)) {
        elementsToAggregate.push(el);
      }
    });

    return aggregateFunction(elementsToAggregate);
  }


  var paths = [];

  //var pathStats = {};

  function getPathDatasetStats(path, dataset) {
    var data = [];

    path.nodes.forEach(function (node) {
      var groups = Object.keys(allData[dataset.toString()]);
      groups.forEach(function (group) {
        data = data.concat(getDataForNode(node, dataset, group));
      });
    });

    return statisticsUtil.statisticsOf(data);
  }

  function getPathGroupStats(path, dataset, group) {

    var data = [];

    path.nodes.forEach(function (node) {
      data = data.concat(getDataForNode(node, dataset, group));
    });

    return statisticsUtil.statisticsOf(data);
  }

  function getStatsForNode(node, dataset, group) {

    var stats = allStats[dataset][group][node.id.toString()];

    if (typeof stats === "undefined") {
      var data = getDataForNode(node, dataset, group);
      stats = statisticsUtil.statisticsOf(data);
      allStats[dataset][group][node.id.toString()] = stats;
    }

    return stats;
  }

  function getDataForNode(node, dataset, group) {

    var d = allData[dataset];
    var g = d[group];

    var data = g[node.id.toString()] || createRandomData(-10, 10, 10);
    allData[dataset][group][node.id.toString()] = data;

    return data;

  }

  function pathExists(path) {
    for (var i = 0; i < paths.length; i++) {


      var edges = paths[i].edges;
      //checking edge ids should be enough to check for path equality
      if (edges.length === path.edges.length) {
        var allEdgesEqual = true;
        for (var j = 0; j < edges.length; j++) {
          var currentEdge = edges[j];
          var currentPathEdge = path.edges[j];

          if (currentEdge.id !== currentPathEdge.id) {
            if (!isBidirectionalSetEdge(currentEdge, currentPathEdge)) {
              allEdgesEqual = false;
            }
          }
        }
        if (allEdgesEqual) {
          return true;
        }
      }
    }
    return false;
  }

  //Checks if both edges are set edges, the source and target nodes are the same but swapped, and if the same set types are present
  function isBidirectionalSetEdge(edge1, edge2) {
    if (config.isSetEdge(edge1) && config.isSetEdge(edge2)) {
      if (((edge1.sourceNodeId === edge2.sourceNodeId) && (edge1.targetNodeId === edge2.targetNodeId)) ||
        ((edge1.targetNodeId === edge2.sourceNodeId) && (edge1.sourceNodeId === edge2.targetNodeId))) {
        var keys1 = config.getEdgeSetProperties(edge1);
        var keys2 = config.getEdgeSetProperties(edge2);
        if (keys1.length === keys2.length) {
          for (var i = 0; i < keys1.length; i++) {
            var key1 = keys1[i];
            var found = false;
            for (var j = 0; j < keys2.length; j++) {
              var key2 = keys2[i];
              if (key1 === key2) {
                found = true;
                break;
              }
            }
            if (!found) {
              return false;
            }
          }
          return true;
        }
      }
    }
    return false;
  }

  function createRandomData(min, max, count) {
    var data = [];
    for (var i = 0; i < count; i++) {
      data.push(Math.random() * (max - min) + min);
    }
    return data;
  }

  var allData = {
    mRNAExpression: {
      breast: {},
      lung: {},
      ovary: {}
    },
    CopyNumberVariation: {
      breast: {},
      lung: {},
      ovary: {}
    }

  };

  var allStats = {
    mRNAExpression: {
      breast: {},
      lung: {},
      ovary: {}
    },
    CopyNumberVariation: {
      breast: {},
      lung: {},
      ovary: {}
    }

  };

  return {

    init: function () {
      listeners.add(function (pathQuery) {
          if (pathQuery.isRemoteQuery()) {

            for (var i = 0; i < paths.length; i++) {
              var path = paths[i];
              if (pathQuery.isPathFiltered(path.id)) {
                paths.splice(i, 1);
                i--;
              }
            }
          }
        },
        listeners.updateType.QUERY_UPDATE);
    },

    getPaths: function () {
      return paths;
    },

    addPath: function (path) {
      if (!pathExists(path)) {
        paths.push(path);
        return true;
      }
      return false;
    },

    reset: function () {
      paths = [];
    },

    getDataSets: function () {
      //TODO: get real data
      return [{
        name: "mRNAExpression",
        minValue: -10,
        maxValue: 10,
        groups: ["breast", "lung", "ovary"]
      }, {
        name: "CopyNumberVariation",
        minValue: -10,
        maxValue: 10,
        groups: ["breast", "lung", "ovary"]
      }];
      return [];
    },

    getDataForNode: getDataForNode,

    getStatsForNode: getStatsForNode,

    getDataBasedPathSortingStrategies: function () {

      var strategies = [];
      var datasets = Object.keys(allData);

      datasets.forEach(function (dataset) {
        var groups = Object.keys(allData[dataset.toString()]);
        strategies.push(new DatasetMedianSortingStrategy(dataset.toString()));
        strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "median", maxDiff, maxOfArray, "Max of max median differences between groups per node"));
        strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "median", minDiff, maxOfArray, "Max of min median differences between groups per node"));
        groups.forEach(function (group) {
          strategies.push(new GroupMedianSortingStrategy(dataset.toString(), group.toString()));
          strategies.push(new PerNodeWithinGroupSortingStrategy(dataset, group, "median", maxOfArray, "Max median per node"));
        });
      });

      return strategies;
    }
  }

});
