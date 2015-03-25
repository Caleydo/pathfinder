define(['jquery', 'd3', '../../listeners', '../pathlist', '../../sorting', '../../setinfo', '../../selectionutil', '../../pathUtil', '../../config', './aggregatesorting', './aggregate'],
  function ($, d3, listeners, pathList, sorting, setInfo, selectionUtil, pathUtil, config, aggregateSorting, a) {
    'use strict';


    var vSpacing = 10;
    var setContainerSpacing = 10;
    var setNodeSpacing = 10;
    var setNodeRadiusX = 40;
    var setNodeRadiusY = 15;
    var setComboHeight = 2 * setNodeRadiusY + 2 * vSpacing;
    var collapseButtonSpacing = 28;

    var sortingManager = aggregateSorting.sortingManager;

    function SetCombination(setIds, pathUpdateListener) {
      a.Aggregate.call(this, pathUpdateListener);
      this.setIds = setIds;
      this.collapsed = true;
    }

    SetCombination.prototype = Object.create(a.Aggregate.prototype);


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
            //return getClampedText(d[0].id, 15);
            return d;
          }

          var text = info.properties[config.getSetNameProperty(info)];
          return getClampedText(text, 14);
          //return text;
        });

      svg.selectAll("g.setNode title")
        .text(function (d) {
          var info = setInfo.get(d);

          if (typeof info === "undefined") {
            return d;
          }
          return info.properties[config.getSetNameProperty(info)];
        });

      svg.selectAll("g.set text")
        .text(function (d) {
          var info = setInfo[d.set.id];

          if (typeof info === "undefined") {
            //return getClampedText(d[0].id, 15);
            return d.set.id;
          }

          var text = info.properties[config.getSetNameProperty(info)];
          //return getClampedText(text, 15);
          return text;
        });

      svg.selectAll("g.set title")
        .text(function (d) {
          var info = setInfo[d.set.id];

          if (typeof info === "undefined") {
            return d.set.id;
          }
          return info.properties[config.getSetNameProperty(info)];
        });
    }

    function getKey(setCombination) {
      return setCombination.id;
    }


    function getClampedText(text, maxLength) {
      if (text.length > maxLength) {
        return text.substring(0, maxLength);
      }
      return text;
    }


    function getTransformFunction(setCombinations) {
      return function (d, i) {

        var posY = 0;

        for (var index = 0; index < i; index++) {

          posY += setContainerSpacing + setComboHeight;

          if (!setCombinations[index].collapsed) {
            posY += setCombinations[index].pathList.getSize().height;
          }
        }

        return "translate(0," + posY + ")";
      }
    }

    function SetComboList() {
      a.AggregateList.call(this);

      var that = this;

      this.sortUpdateListener = function (currentComparator) {
        //sortingManager.sort(that.pathWrappers, that.parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers), sortStrategyChain);

        that.aggregates.sort(currentComparator);

        that.updateDataBinding();

        that.parent.selectAll("g.setComboContainer")
          .sort(currentComparator)
          .transition()
          .attr("transform", getTransformFunction(that.aggregates));
      }
    }

    SetComboList.prototype = Object.create(a.AggregateList.prototype);


    SetComboList.prototype.updateDataBinding = function () {
      var setComboContainers = this.parent.selectAll("g.setComboContainer")
        .data(this.aggregates, getKey);

      setComboContainers.each(function (combination) {
        d3.select(this).selectAll("g.setNodeGroup").selectAll("g.setNode")
          .data(function () {
            return combination.setIds;
          })
      });
    };


    SetComboList.prototype.updateSetList = function () {

      var setComboContainer = this.parent.selectAll("g.setComboContainer")
        .transition()
        .each("start", function (d) {
          if (d.collapsed) {
            d3.select(this).selectAll("g.pathListContainer")
              .attr("display", d.collapsed ? "none" : "inline");
          }
        })
        .attr("class", "setComboContainer")
        .attr("transform", getTransformFunction(this.aggregates))
        .each("end", function (d) {
          if (!d.collapsed) {
            d3.select(this).selectAll("g.pathListContainer")
              .attr("display", d.collapsed ? "none" : "inline");
          }
        });

      this.notifyUpdateListeners();
    };

    SetComboList.prototype.getSize = function () {
      var posY = 0;

      var maxWidth = 0;

      for (var index = 0; index < this.aggregates.length; index++) {

        var currentSetCombo = this.aggregates[index];

        var comboWidth = collapseButtonSpacing + currentSetCombo.setIds.length * 2 * setNodeRadiusX + (currentSetCombo.setIds.length - 1) * setNodeSpacing;
        if (comboWidth > maxWidth) {
          maxWidth = comboWidth;
        }
        if (!currentSetCombo.collapsed) {
          var pathListSize = this.aggregates[index].pathList.getSize();
          if (pathListSize.width > maxWidth) {
            maxWidth = pathListSize.width;
          }
          posY += pathListSize.height;

        }
        posY += setContainerSpacing + setComboHeight;

      }
      return {width: maxWidth, height: posY};
    };

    SetComboList.prototype.init = function () {
      listeners.add(updateSets, listeners.updateType.SET_INFO_UPDATE);
      listeners.add(this.sortUpdateListener, aggregateSorting.updateType);
    };

    SetComboList.prototype.removePaths = function () {
      this.clearAggregates();

      this.parent.selectAll("g.setComboContainer")
        .remove();

      //parent.select("#arrowRight").remove();
      //parent.select("#SetLabelClipPath").remove();
      selectionUtil.removeListeners(this.selectionListeners);
      this.selectionListeners = [];
    };


    SetComboList.prototype.destroy = function () {
      this.removePaths();
      this.updateListeners = [];
      listeners.remove(updateSets, listeners.updateType.SET_INFO_UPDATE);
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


    SetComboList.prototype.render = function (parent) {
      this.parent = parent;
      this.renderSetCombinations();
    };

    SetComboList.prototype.renderSetCombinations = function () {
      var that = this;


      var allSetComboContainers = that.parent.selectAll("g.setComboContainer")
        .data(that.aggregates, getKey);

      var setComboContainer = allSetComboContainers
        .enter()
        .append("g");

      setComboContainer.attr("class", "setComboContainer")
        .attr("transform", "translate(0," + that.getSize().height + ")");

      var setCombination = setComboContainer.append("g")
        .attr("class", "setCombination")
        .on("click", function (d) {
          //listeners.notify(d, listeners.updateType.PATH_SELECTION);
        });

      setCombination.append("rect")
        .classed("setComboContainerBackground", true)
        .attr("fill", "#A1D99B")
        .style("opacity", 0.8)
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", "100%")
        .attr("height", setComboHeight);

      setCombination.append("text")
        .attr("class", "collapseIcon")
        .attr("x", 10)
        .attr("y", setComboHeight - vSpacing - setNodeRadiusY + 5)
        .text(function (d) {
          return d.collapsed ? "\uf0da" : "\uf0dd";
        })
        .on("click", function (d) {
          d.collapsed = !d.collapsed;
          d3.select(this).text(d.collapsed ? "\uf0da" : "\uf0dd");

          that.updateSetList(that.parent);
        });

      var setNodeGroup = setCombination.append("g")
        .attr("class", "setNodeGroup");

      var allNodes = allSetComboContainers.selectAll("g.setNodeGroup").selectAll("g.setNode")
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

      var l = selectionUtil.addDefaultListener(setNodeGroup, "g.setNode", function (d) {
          return d;
        },
        "set"
      );
      this.selectionListeners.push(l);

      node.append("ellipse")
        .attr("cx", function (d, i) {
          return collapseButtonSpacing + setNodeRadiusX + (i * ((2 * setNodeRadiusX) + setNodeSpacing));
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
          var text = getClampedText(info.properties[config.getSetNameProperty(info)], 14);

          return text;
        })
        .attr("x", function (d, i) {
          return collapseButtonSpacing + (i * ((2 * setNodeRadiusX) + setNodeSpacing)) + setNodeRadiusX;
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


      var pathListContainer = setComboContainer.append("g")
        .classed("pathListContainer", true)
        .attr("transform", "translate(0," + setComboHeight + ")")
        .attr("display", function (d) {
          return d.collapsed ? "none" : "inline";
        });

      var allPathListContainers = allSetComboContainers.selectAll("g.pathListContainer");

      allPathListContainers.each(function (d, i) {

        d.pathList.render(d3.select(this));
      });

      this.notifyUpdateListeners();


      this.sortUpdateListener(sortingManager.currentComparator);

      setComboContainer.selectAll("rect.setComboContainerBackground").transition()
        .duration(800)
        .style("opacity", 0);
      //listeners.notify(setListUpdateTypes.UPDATE_SET_COMBO_SORTING, sortingManager.currentComparator);


    };


    return SetComboList;

  }
);
