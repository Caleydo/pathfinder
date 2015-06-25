define(['d3', 'jquery', './listeners', './query/pathquery', './config', './statisticsutil', './sorting', '../pathfinder-ccle/ccle', './colors'],
  function (d3, $, listeners, pathQuery, config, statisticsUtil, sorting, ccle, colors) {

    var SortingStrategy = sorting.SortingStrategy;

    /**
     * Sort by stats for the whole dataset or a whole group.
     *
     * @param datasetId
     * @param stat
     * @param groupId
     * @constructor
     */
    function OverallStatsSortingStrategy(datasetId, stat, groupId) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, datasetId + ": " + stat, "OVERALL_STATS");
      this.datasetId = datasetId;
      this.groupId = groupId;
      this.stat = stat;
      this.supportsScoresPerGroup = true;
    }

    OverallStatsSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

    OverallStatsSortingStrategy.prototype.compare = function (a, b) {
      var scoreA = this.getScoreInfo(a.path, this.datasetId, this.groupId).score;
      var scoreB = this.getScoreInfo(b.path, this.datasetId, this.groupId).score;
      if (this.ascending) {
        return d3.ascending(scoreA, scoreB);
      }
      return d3.descending(scoreA, scoreB);
    };

    OverallStatsSortingStrategy.prototype.getScoreInfo = function (path, datasetId, groupId) {
      return {score: groupId ? getPathGroupStats(path, datasetId, groupId)[this.stat] : getPathDatasetStats(path, datasetId)[this.stat]};
    };

    /**
     * Sort by stats of individual nodes.
     *
     * @param datasetId
     * @param stat
     * @param aggregateFunction
     * @param label
     * @param groupId
     * @constructor
     */
    function PerNodeStatsSortingStrategy(datasetId, stat, aggregateFunction, label, groupId) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, datasetId + ": " + label, "PER_NODE_STATS");
      this.datasetId = datasetId;
      this.groupId = groupId;
      this.stat = stat;
      this.aggregateFunction = aggregateFunction;
      this.supportsScoresPerGroup = true;
    }

    PerNodeStatsSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

    PerNodeStatsSortingStrategy.prototype.compare = function (a, b) {
      var scoreA = this.getScoreInfo(a.path, this.datasetId, this.groupId).score;
      var scoreB = this.getScoreInfo(b.path, this.datasetId, this.groupId).score;

      if (this.ascending) {
        return d3.ascending(scoreA, scoreB);
      }
      return d3.descending(scoreA, scoreB);
    };

    PerNodeStatsSortingStrategy.prototype.getScoreInfo = function (path, datasetId, groupId) {
      var desc = aggregateStats(getPerNodeStatsWithinGroup(path, datasetId, groupId), this.stat, this.aggregateFunction, function (el) {
        return el.stats;
      });

      return {
        node: desc.node,
        score: desc.stats[this.stat]
      };
    };


    //-------------------------------------------------------------

    /**
     * Sort by an aggregate score of overall group stats.
     *
     * @param datasetId
     * @param stat
     * @param betweenGroupsAggregateFunction
     * @param label
     * @constructor
     */
    function OverallBetweenGroupsSortingStrategy(datasetId, stat, betweenGroupsAggregateFunction, label) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, datasetId + ": " + label, "OVERALL_BETWEEN_GROUPS_STATS");
      this.datasetId = datasetId;
      this.stat = stat;
      this.betweenGroupsAggregateFunction = betweenGroupsAggregateFunction;
      this.supportsScoresPerGroup = false;
    }

    OverallBetweenGroupsSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

    OverallBetweenGroupsSortingStrategy.prototype.compare = function (a, b) {

      var scoreA = this.getScoreInfo(a.path, this.datasetId).score;
      var scoreB = this.getScoreInfo(b.path, this.datasetId).score;

      if (this.ascending) {
        return d3.ascending(scoreA, scoreB);
      }
      return d3.descending(scoreA, scoreB);
    };

    OverallBetweenGroupsSortingStrategy.prototype.getScoreInfo = function (path, datasetId) {
      var desc = getAggregatesBetweenGroups(datasetId, path, this.stat, this.betweenGroupsAggregateFunction);
      return {
        group1: desc.el1.group,
        group2: desc.el2.group,
        score: desc.diff
      }
    };


    /**
     * Sort by an aggregate score of per node stats.
     * @param datasetId
     * @param stat
     * @param betweenGroupsAggregateFunction
     * @param nodeAggregateFunction
     * @param label
     * @constructor
     */
    function PerNodeBetweenGroupsSortingStrategy(datasetId, stat, betweenGroupsAggregateFunction, nodeAggregateFunction, label) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, datasetId + ": " + label, "PER_NODE_BETWEEN_GROUPS_STATS");
      this.datasetId = datasetId;
      this.stat = stat;
      this.betweenGroupsAggregateFunction = betweenGroupsAggregateFunction;
      this.nodeAggregateFunction = nodeAggregateFunction;
      this.supportsScoresPerGroup = false;
    }

    PerNodeBetweenGroupsSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

    PerNodeBetweenGroupsSortingStrategy.prototype.compare = function (a, b) {

      var scoreA = this.getScoreInfo(a.path, this.datasetId).score;
      var scoreB = this.getScoreInfo(b.path, this.datasetId).score;

      if (this.ascending) {
        return d3.ascending(scoreA, scoreB);
      }
      return d3.descending(scoreA, scoreB);
    };

    PerNodeBetweenGroupsSortingStrategy.prototype.getScoreInfo = function (path, datasetId) {
      var desc = this.nodeAggregateFunction(getPerNodeAggregatesBetweenGroups(datasetId, path, this.stat, this.betweenGroupsAggregateFunction), function (el) {
        return el.diff;
      });
      return {
        group1: desc.el1.group,
        group2: desc.el2.group,
        node: desc.el1.node,
        score: desc.diff
      };
    };


    function maxOfArray(arr, accessor) {

      var max = Number.NEGATIVE_INFINITY;
      var maxEl = null;

      arr.forEach(function (el) {
        var val = accessor ? accessor(el) : el;
        if (max < val) {
          max = val;
          maxEl = el;
        }
      });

      return maxEl;
    }

    function minOfArray(arr, accessor) {
      var min = Number.POSITIVE_INFINITY;
      var minEl = null;

      arr.forEach(function (el) {
        var val = accessor ? accessor(el) : el;
        if (min > val) {
          min = val;
          minEl = el;
        }
      });

      return minEl;
    }

    function mean(arr, accessor) {
      var sum = 0;
      arr.forEach(function (el) {
        sum += accessor ? accessor(el) : el;
      });
      return sum / arr.length;
    }

    function maxDiff(arr, accessor) {
      return maxOfArray(diffsOfArray(arr, accessor), function (el) {
        return el.diff;
      });
    }

    function minDiff(arr, accessor) {
      return minOfArray(diffsOfArray(arr, accessor), function (el) {
        return el.diff;
      });
    }

    function diffsOfArray(arr, accessor) {
      var diffs = [];

      arr.forEach(function (el, i) {
        arr.forEach(function (e, j) {
          if (i !== j) {
            var val1 = accessor ? accessor(el) : el;
            var val2 = accessor ? accessor(e) : e;
            diffs.push({el1: el, el2: e, diff: Math.abs(val1 - val2)});
          }
        });
      });
      return diffs;
    }

    function getAggregatesBetweenGroups(datasetId, path, stat, aggregateFunction) {
      var allStats = [];
      var groups = Object.keys(allDatasets[datasetId].groups);
      groups.forEach(function (groupId) {
        var stats = getPathGroupStats(path, datasetId, groupId);
        if (stats) {
          allStats.push({group: groupId, stats: stats});
        }

      });
      return aggregateStats(allStats, stat, aggregateFunction, function (el) {
        return el.stats;
      });
    }

    function getPerNodeAggregatesBetweenGroups(dataset, path, statsProperty, aggregateFunction) {
      var allStatsPerNode = {};
      var groups = Object.keys(allDatasets[dataset.toString()].groups);
      groups.forEach(function (group) {
        var allGroupStats = getPerNodeStatsWithinGroup(path, dataset, group);
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
        nodeAggregates.push(aggregateStats(statsPerNode, statsProperty, aggregateFunction, function (el) {
          return el.stats;
        }));
      });

      return nodeAggregates;

    }

    function getPerNodeStatsWithinGroup(path, dataset, group) {

      var allStats = [];

      path.nodes.forEach(function (node) {
        var stats = getStatsForNode(node, dataset, group);
        if (stats) {
          allStats.push({group: group, node: node, stats: stats});
        }
      });

      return allStats;
    }

    function aggregateStats(arr, statsProperty, aggregateFunction, accessor) {
      var elementsToAggregate = [];

      arr.forEach(function (e) {

        var stat = accessor ? accessor(e)[statsProperty] : e[statsProperty];
        if (typeof stat !== "undefined" && !isNaN(stat)) {
          elementsToAggregate.push(e);
        }
      });

      return aggregateFunction(elementsToAggregate, function (el) {
        return accessor ? accessor(el)[statsProperty] : el[statsProperty];
      });
    }


    var paths = [];

    var pathStats = {};

    function getPathDatasetStats(path, dataset) {
      var data = [];
      pathStats[path.id] = pathStats[path.id] || {};
      pathStats[path.id][dataset] = pathStats[path.id][dataset] || {};

      if (pathStats[path.id][dataset].stats) {
        return pathStats[path.id][dataset].stats;
      }

      path.nodes.forEach(function (node) {
        var groups = Object.keys(allDatasets[dataset.toString()].groups);
        groups.forEach(function (group) {
          data = data.concat(getDataForNode(node, dataset, group));
        });
      });

      var stats = statisticsUtil.statisticsOf(data);
      pathStats[path.id][dataset].stats = stats;

      return stats;
    }

    function getPathGroupStats(path, dataset, group) {

      pathStats[path.id] = pathStats[path.id] || {};
      pathStats[path.id][dataset] = pathStats[path.id][dataset] || {};
      pathStats[path.id][dataset].groups = pathStats[path.id][dataset].groups || {};
      pathStats[path.id][dataset].groups[group] = pathStats[path.id][dataset].groups[group] || {};

      if (pathStats[path.id][dataset].groups[group].stats) {
        return pathStats[path.id][dataset].groups[group].stats;
      }

      var data = [];

      path.nodes.forEach(function (node) {
        data = data.concat(getDataForNode(node, dataset, group));
      });

      var stats = statisticsUtil.statisticsOf(data);
      pathStats[path.id][dataset].groups[group].stats = stats;
      return stats;
    }

    function getDataPropertyForNode(property, node, dataset, group) {
      var nodeId = getMappingIdForDataset(node, dataset);

      if (typeof nodeId !== "undefined") {
        if (typeof group === "undefined") {
          if (!allDatasets[dataset] || !allDatasets[dataset][nodeId]) {
            return;
          }
          return allDatasets[dataset][nodeId][property];
        } else {

          if (!allDatasets[dataset] || !allDatasets[dataset].groups[group] || !allDatasets[dataset].groups[group][nodeId]) {
            return;
          }
          return allDatasets[dataset].groups[group][nodeId][property];
        }
      }
    }

    function getStatsForNode(node, dataset, group) {
      return getDataPropertyForNode("stats", node, dataset, group);
    }

    function getMappingIdForDataset(node, dataset) {
      var dsConfig = config.getDatasetConfig(dataset);
      if (!dsConfig) {
        return;
      }
      var nodeId = -1;

      for (var i = 0; i < dsConfig["mapping_nodes"].length; i++) {
        var n = dsConfig["mapping_nodes"][i]
        if (node.labels.indexOf(n["node_label"] !== -1)) {
          return node.properties[n["id_property"]];
        }
      }
    }

    function getDataForNode(node, dataset, group, property) {
      return getDataPropertyForNode("data", node, dataset, group);
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


    function fetchData() {

      if (Object.keys(allDatasets).length === 0) {
        return;
      }
      //Get every node just once, no duplicates
      var nodes = [];
      paths.forEach(function (path) {
        path.nodes.forEach(function (node) {
          if (!(node.id in nodesWithData)) {
            nodes.push(node);
            nodesWithData[node.id] = true;
          }
        });
      });

      //var keys = Object.keys(allDatasets);
      //
      //keys.forEach(function (key) {
      //    var dsConfig = config.getDatasetConfig(key);
      //    var dataset = allDatasets[key];
      var nodeIds = [];
      nodes.forEach(function (node) {
        //FIXME hardcoded
        var nodeId = getMappingIdForDataset(node, Object.keys(allDatasets)[0]);
        if (typeof nodeId != "undefined") {
          nodeIds.push(nodeId);
        }
      });

      var groupKeys = Object.keys(stratification.groups);

      if (groupKeys.length === 0 || nodeIds.length === 0) {
        return;
      }


      nodeIds.forEach(function (nodeId) {
        ccle.boxplot_of(nodeId, function (res) {
          if (typeof res !== "undefined") {
            Object.keys(res).forEach(function (dataset) {
              Object.keys(res[dataset]).forEach(function (group) {
                allDatasets[dataset][nodeId] = allDatasets[dataset][nodeId] || {};
                allDatasets[dataset][nodeId].stats = res[dataset]["_all"].stats;
                allDatasets[dataset][nodeId].data = res[dataset]["_all"].data;
              })
            });
            listeners.notify(listeners.updateType.DATASET_UPDATE);
          }

        }, ["_all"]);

        ccle.boxplot_of(nodeId, function (res) {
          if (typeof res !== "undefined") {
            Object.keys(res).forEach(function (dataset) {
              Object.keys(res[dataset]).forEach(function (group) {
                allDatasets[dataset].groups[group] = allDatasets[dataset].groups[group] || {};
                allDatasets[dataset].groups[group][nodeId] = allDatasets[dataset].groups[group][nodeId] || {};
                allDatasets[dataset].groups[group][nodeId].stats = res[dataset][group].stats;
                allDatasets[dataset].groups[group][nodeId].data = res[dataset][group].data;
              })
            });
            listeners.notify(listeners.updateType.DATASET_UPDATE);
          }

        });
      });


      //---------------------
      //Fetch each group separately, don't wait for previous promise to be satisfied
      //groupKeys.forEach(function (groupKey) {
      //  dataset.groups[groupKey] = dataset.groups[groupKey] || {};
      //  nodeIds.forEach(function (nodeId) {
      //    dataset.groups[groupKey][nodeId] = dataset.groups[groupKey][nodeId] || {};
      //  });
      //
      //  if (dsConfig["mapping_type"] === dataset.info.rowtype) {
      //    ccle.data(key, nodeIds, stratification.groups[groupKey].ids).then(function (data) {
      //      data.rows.forEach(function (row, i) {
      //        dataset.groups[groupKey][row].data = data.data[i];
      //      });
      //      listeners.notify(listeners.updateType.DATASET_UPDATE);
      //    });
      //  } else {
      //    ccle.data(key, stratification.groups[groupKey].ids, nodeIds).then(function (data) {
      //      data.cols.forEach(function (col, i) {
      //        var colData = [];
      //        data.data.forEach(function (row) {
      //          colData.push(row[i]);
      //        });
      //        dataset.groups[groupKey][col].data = colData;
      //      });
      //      listeners.notify(listeners.updateType.DATASET_UPDATE);
      //    });
      //  }
      //});

      //---------------------
      //Fetch all groups at once
      //var allGroupIds = [];
      //
      //groupKeys.forEach(function (groupKey) {
      //  allGroupIds = allGroupIds.concat(stratification.groups[groupKey].ids);
      //});
      //
      //ccle.data(key, nodeIds, allGroupIds).then(function (data) {
      //  console.log("there")
      //  //data.rows.forEach(function (row, i) {
      //  //  dataset.groups[groupKey][row].data = data.data[i];
      //  //});
      //
      //});
      //---------------------

      //---------------------
      //Fetch each group separately, wait for previous promise to be satisfied
      //var fetchData = function (groupKeyIndex) {
      //  var groupKey = groupKeys[groupKeyIndex];
      //
      //  dataset.groups[groupKey] = dataset.groups[groupKey] || {};
      //  nodeIds.forEach(function (nodeId) {
      //    dataset.groups[groupKey][nodeId] = dataset.groups[groupKey][nodeId] || {};
      //  });
      //
      //  if (dsConfig["mapping_type"] === dataset.info.rowtype) {
      //    ccle.data(key, nodeIds, stratification.groups[groupKey].ids).then(function (data) {
      //      data.rows.forEach(function (row, i) {
      //        dataset.groups[groupKey][row].data = data.cols.length <= 1 ? [data.data[i]] : data.data[i];
      //        dataset.groups[groupKey][row].stats = statisticsUtil.statisticsOf(data.cols.length <= 1 ? [data.data[i]] : data.data[i]);
      //      });
      //      listeners.notify(listeners.updateType.DATASET_UPDATE);
      //      if (groupKeyIndex < groupKeys.length - 1) {
      //        fetchData(groupKeyIndex + 1);
      //      }
      //    });
      //  } else {
      //    ccle.data(key, stratification.groups[groupKey].ids, nodeIds).then(function (data) {
      //      data.cols.forEach(function (col, i) {
      //        var colData = [];
      //        data.data.forEach(function (row) {
      //          colData.push(row[i]);
      //        });
      //        dataset.groups[groupKey][col].data = colData;
      //        dataset.groups[groupKey][col].stats = statisticsUtil.statisticsOf(colData);
      //      });
      //      listeners.notify(listeners.updateType.DATASET_UPDATE);
      //      if (groupKeyIndex < groupKeys.length - 1) {
      //        fetchData(groupKeyIndex + 1);
      //      }
      //
      //    });
      //  }
      //};
      //
      //if (groupKeys.length > 0) {
      //  fetchData(0);
      //}

      //}
      //)

    }

    function createRandomData(min, max, count) {
      var data = [];
      for (var i = 0; i < count; i++) {
        data.push(Math.random() * (max - min) + min);
      }
      return data;
    }

    /**
     *
     * Data has been loaded for these nodes or data is currently loading.
     */
    var nodesWithData = {};

    var allDatasets = {};

    var stratification = {};

    return {

      init: function () {
        listeners.add(function (pathQuery) {
            if (pathQuery.isRemoteQuery()) {

              for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                if (pathQuery.isPathFiltered(path.id)) {
                  paths.splice(i, 1);
                  i--;
                  delete pathStats[path.id];
                }
              }
            }
          },
          listeners.updateType.QUERY_UPDATE);

        $("#savePaths").click(function () {
          var data = JSON.stringify(paths);
          var url = 'data:text/json;charset=utf8,' + encodeURIComponent(data);
          window.open(url, '_blank');
          window.focus();
        });

        //ccle.data("mrnaexpression", ["SOS1"], ["CHP212_AUTONOMIC_GANGLIA", "IMR32_AUTONOMIC_GANGLIA", "KELLY_AUTONOMIC_GANGLIA"]).then(function (data) {
        //  var x = 0;
        //});

        //ccle.boxplot_of("SOS1", function (res) {
        //  var x = res;
        //});
        ////
        //ccle.boxplot_of("SOS1", function (res) {
        //  var x = res;
        //}, ["skin", "ovary"]);


        ccle.list().then(function (dataInfos) {
          var configs = config.getDatasetConfigs();

          if (!configs) {
            return;
          }

          var datasetInfos = [];
          var stratificationInfo = {};

          dataInfos.forEach(function (info) {
            if (info.type === "stratification" && info.name === config.getStratification()) {
              stratificationInfo = info;
            } else if (info.type === "matrix") {
              configs.forEach(function (c) {
                if (info.name === c.id) {
                  datasetInfos.push(info);
                }
              });
            }
          });

          ccle.group(stratificationInfo.name).then(function (strat) {
            stratification.info = stratificationInfo;
            stratification.groups = strat;
            var groupKeys = Object.keys(stratification.groups);

            //var fetchGroups = function (index) {
            //  ccle.data("mrnaexpression", [], stratification.groups[groupKeys[index]].ids).then(function (data) {
            //    if (index < groupKeys.length - 1) {
            //      fetchGroups(index + 1);
            //    }
            //  });
            //};

            var fetchDataset = function (index) {
              var info = datasetInfos[index];
              ccle.stats(info.name).then(function (stats) {
                info.color = colors.nextColor();
                allDatasets[info.name] = {
                  info: info,
                  stats: stats,
                  groups: {},
                  data: {}
                };
                if (index < datasetInfos.length - 1) {
                  fetchDataset(index + 1);
                } else {
                  //fetchGroups(0);
                  //Reset node status as new datasets are available
                  nodesWithData = {};
                  fetchData();
                }
              });
            };

            if (datasetInfos.length > 0) {
              fetchDataset(0);
            }


          });
        });
      },

      getPaths: function () {
        return paths;
      },

      addPath: function (path) {
        if (!pathExists(path)) {
          paths.push(path);
          fetchData();
          return true;
        }
        return false;
      },

      reset: function () {
        paths = [];
        pathStats = {};
      },

      getDataSets: function () {

        var datasets = [];

        Object.keys(allDatasets).forEach(function (key) {
          datasets.push(allDatasets[key]);
        });

        return datasets;
        ////TODO: get real data
        //return [{
        //  name: "mRNAExpression",
        //  minValue: -10,
        //  maxValue: 10,
        //  groups: ["breast", "lung", "ovary"]
        //}, {
        //  name: "CopyNumberVariation",
        //  minValue: -10,
        //  maxValue: 10,
        //  groups: ["breast", "lung", "ovary"]
        //}];
        //return [];
      },

      getDataForNode: getDataForNode,

      getStatsForNode: getStatsForNode,

      getPathDatasetStats: getPathDatasetStats,

      getPathGroupStats: getPathGroupStats,

      getSortingStrategy: function (datasetId, stat, method, scope) {
        if (method === "stat") {
          if (scope === "path") {
            return new OverallStatsSortingStrategy(datasetId, stat);
          } else if (scope === "minNode") {
            return new PerNodeStatsSortingStrategy(datasetId, stat, minOfArray, "Max " + statisticsUtil.getHumanReadableStat(stat) + " per node");
          } else {
            return new PerNodeStatsSortingStrategy(datasetId, stat, maxOfArray, "Max " + statisticsUtil.getHumanReadableStat(stat) + " per node");
          }
        } else if (method === "minDiff") {
          if (scope === "path") {
            return new OverallBetweenGroupsSortingStrategy(datasetId, stat, minDiff, "Min difference in " + statisticsUtil.getHumanReadableStat(stat) + " between groups");
          } else if (scope === "minNode") {
            return new PerNodeBetweenGroupsSortingStrategy(datasetId, stat, minDiff, minOfArray, "Min of min " + statisticsUtil.getHumanReadableStat(stat) + " differences between groups per node");
          } else {
            return new PerNodeBetweenGroupsSortingStrategy(datasetId, stat, minDiff, maxOfArray, "Max of min " + statisticsUtil.getHumanReadableStat(stat) + " differences between groups per node");
          }
        } else {
          if (scope === "path") {
            return new OverallBetweenGroupsSortingStrategy(datasetId, stat, maxDiff, "Max difference in " + statisticsUtil.getHumanReadableStat(stat) + " between groups");
          } else if (scope === "minNode") {
            return new PerNodeBetweenGroupsSortingStrategy(datasetId, stat, maxDiff, minOfArray, "Min of max " + statisticsUtil.getHumanReadableStat(stat) + " differences between groups per node");
          } else {
            return new PerNodeBetweenGroupsSortingStrategy(datasetId, stat, maxDiff, maxOfArray, "Max of max " + statisticsUtil.getHumanReadableStat(stat) + " differences between groups per node");
          }
        }
      },

      getDataBasedPathSortingStrategies: function () {

        var strategies = [];
        var datasets = Object.keys(allDatasets);

        datasets.forEach(function (dataset) {
          //var groups = Object.keys(allData[dataset.toString()].groups);
          strategies.push(new OverallStatsSortingStrategy(dataset.toString(), "median"));
          strategies.push(new OverallStatsSortingStrategy(dataset.toString(), "max"));
          strategies.push(new OverallStatsSortingStrategy(dataset.toString(), "min"));
          strategies.push(new OverallStatsSortingStrategy(dataset.toString(), "mean"));
          strategies.push(new OverallStatsSortingStrategy(dataset.toString(), "std"));

          strategies.push(new PerNodeStatsSortingStrategy(dataset, "median", maxOfArray, "Max median per node"));
          strategies.push(new PerNodeStatsSortingStrategy(dataset, "max", maxOfArray, "Max max per node"));
          strategies.push(new PerNodeStatsSortingStrategy(dataset, "min", maxOfArray, "Max min per node"));
          strategies.push(new PerNodeStatsSortingStrategy(dataset, "mean", maxOfArray, "Max mean per node"));
          strategies.push(new PerNodeStatsSortingStrategy(dataset, "std", maxOfArray, "Max standard-deviation per node"));

          strategies.push(new PerNodeStatsSortingStrategy(dataset, "median", minOfArray, "Min median per node"));
          strategies.push(new PerNodeStatsSortingStrategy(dataset, "max", minOfArray, "Min max per node"));
          strategies.push(new PerNodeStatsSortingStrategy(dataset, "min", minOfArray, "Min min per node"));
          strategies.push(new PerNodeStatsSortingStrategy(dataset, "mean", minOfArray, "Min mean per node"));
          strategies.push(new PerNodeStatsSortingStrategy(dataset, "std", minOfArray, "Min standard-deviation per node"));

          strategies.push(new OverallBetweenGroupsSortingStrategy(dataset, "median", maxDiff, "Max difference in median between groups"));
          strategies.push(new OverallBetweenGroupsSortingStrategy(dataset, "max", maxDiff, "Max difference in max between groups"));
          strategies.push(new OverallBetweenGroupsSortingStrategy(dataset, "min", maxDiff, "Max difference in min between groups"));
          strategies.push(new OverallBetweenGroupsSortingStrategy(dataset, "mean", maxDiff, "Max difference in mean between groups"));
          strategies.push(new OverallBetweenGroupsSortingStrategy(dataset, "std", maxDiff, "Max difference in standard-deviation between groups"));

          strategies.push(new OverallBetweenGroupsSortingStrategy(dataset, "median", minDiff, "Min difference in median between groups"));
          strategies.push(new OverallBetweenGroupsSortingStrategy(dataset, "max", minDiff, "Min difference in max between groups"));
          strategies.push(new OverallBetweenGroupsSortingStrategy(dataset, "min", minDiff, "Min difference in min between groups"));
          strategies.push(new OverallBetweenGroupsSortingStrategy(dataset, "mean", minDiff, "Min difference in mean between groups"));
          strategies.push(new OverallBetweenGroupsSortingStrategy(dataset, "std", minDiff, "Min difference in standard-deviation between groups"));

          strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "median", maxDiff, maxOfArray, "Max of max median differences between groups per node"));
          strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "max", maxDiff, maxOfArray, "Max of max max differences between groups per node"));
          strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "min", maxDiff, maxOfArray, "Max of max min differences between groups per node"));
          strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "mean", maxDiff, maxOfArray, "Max of max mean differences between groups per node"));
          strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "std", maxDiff, maxOfArray, "Max of max standard-deviation differences between groups per node"));

          strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "median", minDiff, minOfArray, "Min of min median differences between groups per node"));
          strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "max", minDiff, minOfArray, "Min of min max differences between groups per node"));
          strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "min", minDiff, minOfArray, "Min of min min differences between groups per node"));
          strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "mean", minDiff, minOfArray, "Min of min mean differences between groups per node"));
          strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "std", minDiff, minOfArray, "Min of min standard-deviation differences between groups per node"));


          //strategies.push(new PerNodeBetweenGroupsSortingStrategy(dataset, "median", minDiff, maxOfArray, "Max of min median differences between groups per node"));
          //groups.forEach(function (group) {
          //  strategies.push(new GroupMedianSortingStrategy(dataset.toString(), group.toString()));

          //});
        });

        return strategies;
      }
    }

  })
;
