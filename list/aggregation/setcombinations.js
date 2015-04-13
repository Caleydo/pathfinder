define(['jquery', 'd3', '../../listeners', '../pathlist', '../../sorting', '../../setinfo', '../../selectionutil', '../../pathUtil', '../../config', './aggregatesorting', './aggregate', '../../uiutil'],
  function ($, d3, listeners, pathList, sorting, setInfo, selectionUtil, pathUtil, config, aggregateSorting, a, uiUtil) {
    'use strict';


    var vSpacing = 10;
    var setNodeSpacing = 10;
    var setNodeRadiusX = 40;
    var setNodeRadiusY = 15;
    var setComboHeight = 2 * setNodeRadiusY + 2 * vSpacing;

    var sortingManager = aggregateSorting.sortingManager;

    function SetCombination(setIds, pathUpdateListener) {
      a.CombinationAggregate.call(this, setIds, pathUpdateListener);
    }

    SetCombination.prototype = Object.create(a.CombinationAggregate.prototype);


    function SetNodePresenceSortingStrategy(setIds) {
      sorting.SortingStrategy.call(this, sorting.SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE);
      this.setIds = setIds;
      this.ascending = false;
    }

    SetNodePresenceSortingStrategy.prototype = Object.create(sorting.SortingStrategy);
    SetNodePresenceSortingStrategy.prototype.compare = function (a, b) {
      var numNodesA = 0;
      var numNodesB = 0;
      this.setIds.forEach(function (setId) {
        a.combo.forEach(function (id) {
          if (id === setId) {
            numNodesA++;
          }
        });

        b.combo.forEach(function (id) {
          if (id === setId) {
            numNodesB++;
          }
        });
      });

      if (this.ascending) {
        return d3.ascending(numNodesA, numNodesB);
      }
      return d3.descending(numNodesA, numNodesB);

    };


    var sortingStrategies = {
      getSetNodePrensenceSortingStrategy: function (setIds) {
        return new SetNodePresenceSortingStrategy(setIds);
      }
    };


    function updateSets(setInfo) {

      var svg = d3.select("#pathlist svg");

      svg.selectAll("g.setNode text")
        .text(function (d) {
          var info = setInfo.get(d);

          if (typeof info === "undefined") {
            return d;
          }

          var text = info.properties[config.getSetNameProperty(info)];
          return uiUtil.getClampedText(text, 14);
        });

      svg.selectAll("g.setNode title")
        .text(function (d) {
          var info = setInfo.get(d);

          if (typeof info === "undefined") {
            return d;
          }
          return info.properties[config.getSetNameProperty(info)];
        });
    }


    function SetComboList() {
      a.CombinationAggregateList.call(this);

      var that = this;
    }

    SetComboList.prototype = Object.create(a.CombinationAggregateList.prototype);


    SetComboList.prototype.init = function () {
      a.CombinationAggregateList.prototype.init.call(this);
      listeners.add(updateSets, listeners.updateType.SET_INFO_UPDATE);
    };


    SetComboList.prototype.destroy = function () {
      a.CombinationAggregateList.prototype.destroy.call(this);
      listeners.remove(updateSets, listeners.updateType.SET_INFO_UPDATE);
    };

    SetComboList.prototype.updateAggregateDataBinding = function (parent, aggregate) {

      parent.selectAll("g.setNode")
        .data(function () {
          return aggregate.combo;
        });

    };


    SetComboList.prototype.addToSetCombinations = function (paths) {
      var that = this;

      paths.forEach(function (path) {
        nextEdge(path, 0, [], []);
      });

      function nextEdge(path, currentEdgeIndex, currentSetCombination, currentPathCombination) {


        if (currentEdgeIndex >= path.edges.length) {
          addToSetCombinations(currentSetCombination, path, currentPathCombination);
          return;
        }

        var edge = path.edges[currentEdgeIndex];
        var addedSet = false;
        for (var key in edge.properties) {
          if (pathUtil.isEdgeSetProperty(edge, key)) {
            var property = edge.properties[key];
            if (property instanceof Array) {
              property.forEach(function (val) {
                addSetToCombo(path, currentEdgeIndex, currentSetCombination, val, currentPathCombination)
              });
            } else {
              addSetToCombo(path, currentEdgeIndex, currentSetCombination, property, currentPathCombination);
            }
            addedSet = true;
          }
        }
        if (!addedSet) {
          addSetToCombo(path, currentEdgeIndex, currentSetCombination, "__No_Set__", currentPathCombination);
        }

      }

      function addSetToCombo(path, currentEdgeIndex, currentSetCombination, mySet, currentPathCombination) {
        var combo = currentSetCombination;
        var pathCombo = currentPathCombination.slice(0)
        pathCombo.push(mySet);
        if (currentSetCombination.length === 0 || (currentSetCombination.length > 0 && currentSetCombination[currentSetCombination.length - 1] !== mySet)) {
          combo = currentSetCombination.slice(0);
          combo.push(mySet);
        }
        nextEdge(path, currentEdgeIndex + 1, combo, pathCombo);
      }

      function addToSetCombinations(combination, path, pathCombination) {
        for (var i = 0; i < that.aggregates.length; i++) {
          var c = that.aggregates[i];
          if (c.combo.length === combination.length) {
            var numEqualSets = 0;
            for (var j = 0; j < c.combo.length; j++) {
              if (c.combo[j].id === combination[j]) {
                numEqualSets++;
              }
            }
            if (numEqualSets === combination.length) {
              c.addPath(path, pathCombination);
              return;
            }
          }
        }
        var setCombo = new SetCombination(combination, function (list) {
          that.updateAggregateList();
        });
        setCombo.addPath(path, pathCombination);
        that.aggregates.push(setCombo);
      }
    };

    SetComboList.prototype.addAggregateForPath = function (path) {
      this.addToSetCombinations([path]);
    };

    SetComboList.prototype.getComboNodeIDType = function () {
      return "set";
    };

    SetComboList.prototype.getComboNodeText = function (d) {
      var info = setInfo.get(d.id);
      if (typeof info === "undefined") {
        return d.id;
      }
      var text = info.properties[config.getSetNameProperty(info)];

      return text;
    };


    return SetComboList;

  }
);
