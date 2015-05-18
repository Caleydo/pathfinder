define(['d3', './listeners', './query/pathquery', './config', './statisticsutil', './sorting'], function (d3, listeners, pathQuery, config, statisticsUtil, sorting) {

  var SortingStrategy = sorting.SortingStrategy;

  function DatasetMedianSortingStrategy(datasetName) {
    SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, datasetName + ": Median");
    this.datasetName = datasetName;
  }

  DatasetMedianSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

  DatasetMedianSortingStrategy.prototype.compare = function (a, b) {
    var statsA = getPathDatasetStats(a.path, this.datasetName);
    var statsB = getPathDatasetStats(b.path, this.datasetName);
    if (this.ascending) {
      return d3.ascending(statsA.median, statsB.median);
    }
    return d3.descending(statsA.median, statsB.median);
  };

  function GroupMedianSortingStrategy(datasetName, groupName) {
    SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, datasetName + " - " + groupName + ": Median");
    this.datasetName = datasetName;
    this.groupName = groupName;
  }

  GroupMedianSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

  GroupMedianSortingStrategy.prototype.compare = function (a, b) {
    var statsA = getPathGroupStats(a.path, this.datasetName, this.groupName);
    var statsB = getPathGroupStats(b.path, this.datasetName, this.groupName);
    if (this.ascending) {
      return d3.ascending(statsA.median, statsB.median);
    }
    return d3.descending(statsA.median, statsB.median);
  };


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
        groups.forEach(function (group) {
          strategies.push(new GroupMedianSortingStrategy(dataset.toString(), group.toString()));
        });
      });

      return strategies;
    }
  }

});
