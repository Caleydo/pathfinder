define(['./listeners', './query/pathquery', './config', './statisticsutil'], function (listeners, pathQuery, config, statisticsUtil) {

  var paths = [];

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

    getDataForNode: function (node, dataset, group) {

      var d = allData[dataset];
      var g = d[group]

      var data = g[node.id.toString()] || createRandomData(-10, 10, 10);
      allData[dataset][group][node.id.toString()] = data;

      return data;

    },

    getStatsForNode: function (node, dataset, group) {

      var stats = allStats[dataset][group][node.id.toString()];

      if (typeof stats === "undefined") {
        var data = this.getDataForNode(node, dataset, group);
        stats = statisticsUtil.statisticsOf(data);
        allStats[dataset][group][node.id.toString()] = stats;
      }

      return stats;
    }
  }

});
