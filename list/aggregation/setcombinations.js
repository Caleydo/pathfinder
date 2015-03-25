define(['jquery', 'd3', '../../listeners', '../pathlist', '../../sorting', '../../setinfo', '../../selectionutil', '../../pathUtil', '../../config', './aggregatesorting', './aggregate'],
  function ($, d3, listeners, pathList, sorting, setInfo, selectionUtil, pathUtil, config, aggregateSorting, a) {
    'use strict';


    var vSpacing = 10;
    var setNodeSpacing = 10;
    var setNodeRadiusX = 40;
    var setNodeRadiusY = 15;
    var setComboHeight = 2 * setNodeRadiusY + 2 * vSpacing;

    var sortingManager = aggregateSorting.sortingManager;

    function SetCombination(setIds, pathUpdateListener) {
      a.Aggregate.call(this, pathUpdateListener);
      this.setIds = setIds;
    }

    SetCombination.prototype = Object.create(a.Aggregate.prototype);

    SetCombination.prototype.getSize = function(){
      return {
        width:  this.setIds.length * 2 * setNodeRadiusX + (this.setIds.length - 1) * setNodeSpacing,
        height: setComboHeight
      };
    };


    function SetNodePresenceSortingStrategy(setIds) {
      sorting.SortingStrategy.call(this, sorting.SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE);
      this.compare = function (a, b) {
        var numNodesA = 0;
        var numNodesB = 0;
        setIds.forEach(function (setId) {
          a.setIds.forEach(function (id) {
            if (id === setId) {
              numNodesA++;
            }
          });

          b.setIds.forEach(function (id) {
            if (id === setId) {
              numNodesB++;
            }
          });
        });

        //Inverse definition of ascending and descending, as more nodes should be ranked higher
        if (sortingManager.ascending) {
          return d3.descending(numNodesA, numNodesB);
        }
        return d3.ascending(numNodesA, numNodesB);
      }
    }


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
          return pathUtil.getClampedText(text, 14);
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
      a.AggregateList.call(this);

      var that = this;
    }

    SetComboList.prototype = Object.create(a.AggregateList.prototype);



    SetComboList.prototype.init = function () {
      a.AggregateList.prototype.init.call(this);
      listeners.add(updateSets, listeners.updateType.SET_INFO_UPDATE);
    };


    SetComboList.prototype.destroy = function () {
      this.removePaths();
      this.updateListeners = [];
      listeners.remove(updateSets, listeners.updateType.SET_INFO_UPDATE);
    };

    SetComboList.prototype.updateAggregateDataBinding = function (parent, aggregate) {

      parent.selectAll("g.setNode")
        .data(function () {
          return aggregate.setIds;
        });

    };


    SetComboList.prototype.addToSetCombinations = function (paths) {
      var that = this;

      paths.forEach(function (path) {
        nextEdge(path, 0, []);
      });

      function nextEdge(path, currentEdgeIndex, currentSetCombination) {


        if (currentEdgeIndex >= path.edges.length) {
          addToSetCombinations(currentSetCombination, path);
          return;
        }

        var edge = path.edges[currentEdgeIndex];
        var addedSet = false;
        for (var key in edge.properties) {
          if (pathUtil.isEdgeSetProperty(edge, key)) {
            var property = edge.properties[key];
            if (property instanceof Array) {
              property.forEach(function (val) {
                addSetToCombo(path, currentEdgeIndex, currentSetCombination, val)
              });
            } else {
              addSetToCombo(path, currentEdgeIndex, currentSetCombination, property);
            }
            addedSet = true;
          }
        }
        if (!addedSet) {
          addSetToCombo(path, currentEdgeIndex, currentSetCombination, "__No_Set__");
        }

      }

      function addSetToCombo(path, currentEdgeIndex, currentSetCombination, mySet) {
        var combo = currentSetCombination;
        if (currentSetCombination.length === 0 || (currentSetCombination.length > 0 && currentSetCombination[currentSetCombination.length - 1] !== mySet)) {
          combo = currentSetCombination.slice(0);
          combo.push(mySet);
        }
        nextEdge(path, currentEdgeIndex + 1, combo);
      }

      function addToSetCombinations(combination, path) {
        for (var i = 0; i < that.aggregates.length; i++) {
          var c = that.aggregates[i];
          if (c.setIds.length === combination.length) {
            var numEqualSets = 0;
            for (var j = 0; j < c.setIds.length; j++) {
              if (c.setIds[j] === combination[j]) {
                numEqualSets++;
              }
            }
            if (numEqualSets === combination.length) {
              c.addPath(path);
              return;
            }
          }
        }
        var setCombo = new SetCombination(combination, function (list) {
          that.updateSetList();
        });
        setCombo.addPath(path);
        that.aggregates.push(setCombo);
      }
    };

    SetComboList.prototype.addPath = function (path) {
      this.addToSetCombinations([path]);
    };

    SetComboList.prototype.setPaths = function (paths) {
      this.clearAggregates();
      this.addToSetCombinations(paths);
    };


    SetComboList.prototype.renderAggregate= function (parent) {
      var that = this;

      parent.each(function (setCombo) {
        var allNodes = d3.select(this).selectAll("g.setNode")
          .data(function (combination) {
            return combination.setIds;
          });

        var node = allNodes
          .enter()
          .append("g")
          .attr("class", "setNode")
          .on("dblclick", function (d) {
            sortingManager.addOrReplace(sortingStrategies.getSetNodePrensenceSortingStrategy([d]));
            listeners.notify(aggregateSorting.updateType, sortingManager.currentComparator);
          });

        var l = selectionUtil.addDefaultListener(d3.select(this), "g.setNode", function (d) {
            return d;
          },
          "set"
        );
        that.selectionListeners.push(l);

        node.append("ellipse")
          .attr("cx", function (d, i) {
            return setNodeRadiusX + (i * ((2 * setNodeRadiusX) + setNodeSpacing));
          })
          .attr("cy", vSpacing + setNodeRadiusY)
          .attr("rx", setNodeRadiusX)
          .attr("ry", setNodeRadiusY);
        //.attr("fill", "rgb(200,200,200)")
        //.attr("stroke", "rgb(30,30,30)");

        node.append("text")
          .text(function (d) {

            var info = setInfo.get(d);


            if (typeof info === "undefined") {
              return d;
            }
            var text = pathUtil.getClampedText(info.properties[config.getSetNameProperty(info)], 14);

            return text;
          })
          .attr("x", function (d, i) {
            return (i * ((2 * setNodeRadiusX) + setNodeSpacing)) + setNodeRadiusX;
          })
          .attr("y", vSpacing + setNodeRadiusY + 4);
        node.append("title")
          .text(function (d) {
            var info = setInfo.get(d);
            if (typeof info === "undefined") {
              return d;
            }
            return info.properties[config.getSetNameProperty(info)];
          });
      });
    };


    return SetComboList;

  }
);
