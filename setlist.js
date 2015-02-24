define(['jquery', 'd3', './listeners', './pathlist', './sorting', './setinfo'],
  function ($, d3, listeners, pathList, sorting, setInfo) {
    'use strict';


    var vSpacing = 10;
    var setContainerSpacing = 10;
    var setNodeSpacing = 10;
    var setNodeRadiusX = 40;
    var setNodeRadiusY = 15;
    var setComboHeight = 2 * setNodeRadiusY + 2 * vSpacing;
    var collapseButtonSize = 16;
    var collapseButtonSpacing = 10;

    var allSetCombinations = [];

    function NumPathsSortingStrategy() {
      sorting.SortingStrategy.call(this, sorting.SortingStrategy.prototype.STRATEGY_TYPES.WEIGHT);
    }

    NumPathsSortingStrategy.prototype = Object.create(sorting.SortingStrategy.prototype);
    NumPathsSortingStrategy.prototype.compare = function (a, b) {
      //reversed for now
      if (sortingManager.ascending) {
        return d3.descending(a.paths.length, b.paths.length);
      }
      return d3.ascending(a.paths.length, b.paths.length);
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

    var sortingManager = new sorting.SortingManager(true);

    var sortingStrategies = {
      setId: new sorting.IdSortingStrategy(sortingManager),
      numPaths: new NumPathsSortingStrategy(),
      getSetNodePrensenceSortingStrategy: function(setIds) {
        return new SetNodePresenceSortingStrategy(setIds);
      }
    };

    sortingManager.setStrategyChain([sortingStrategies.numPaths, sortingStrategies.setId]);

    function getSetCombinations(paths) {

      var setCombinations = [];
      var currentSetId = 0;

      paths.forEach(function (path) {
        nextEdge(path, 0, []);
      });

      return setCombinations;

      function nextEdge(path, currentEdgeIndex, currentSetCombination) {


        if (currentEdgeIndex >= path.edges.length) {
          addToSetCombinations(currentSetCombination, path);
          return;
        }

        var edge = path.edges[currentEdgeIndex];
        var addedSet = false;
        for (var key in edge.properties) {
          if (key.charAt(0) !== '_') {
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
        for (var i = 0; i < setCombinations.length; i++) {
          var c = setCombinations[i];
          if (c.setIds.length === combination.length) {
            var numEqualSets = 0;
            for (var j = 0; j < c.setIds.length; j++) {
              if (c.setIds[j] === combination[j]) {
                numEqualSets++;
              }
            }
            if (numEqualSets === combination.length) {
              c.paths.push(path);
              return;
            }
          }
        }
        setCombinations.push({
          id: currentSetId,
          collapsed: true,
          setIds: combination,
          paths: [path]
        });
        currentSetId++;
      }
    }

    function updateSets(setInfo) {

      var svg = d3.select("#pathlist svg");

      svg.selectAll("g.setNode text")
        .text(function (d) {
          var info = setInfo["path:" + d];

          if (typeof info === "undefined") {
            //return getClampedText(d[0].id, 15);
            return d;
          }

          var text = info.properties["name"];
          return getClampedText(text, 14);
          //return text;
        });

      svg.selectAll("g.setNode title")
        .text(function (d) {
          var info = setInfo["path:" + d];

          if (typeof info === "undefined") {
            return d;
          }
          return info.properties["name"];
        });

      svg.selectAll("g.set text")
        .text(function (d) {
          var info = setInfo["path:" + d[0].id];

          if (typeof info === "undefined") {
            //return getClampedText(d[0].id, 15);
            return d[0].id;
          }

          var text = info.properties["name"];
          //return getClampedText(text, 15);
          return text;
        });

      svg.selectAll("g.set title")
        .text(function (d) {
          var info = setInfo["path:" + d[0].id];

          if (typeof info === "undefined") {
            return d[0].id;
          }
          return info.properties["name"];
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

    function updateSetList(parent) {

      var setComboContainer = parent.selectAll("g.setComboContainer")
        .transition()
        .each("start", function (d) {
          if (d.collapsed) {
            d3.select(this).selectAll("g.pathContainer")
              .attr("visibility", d.collapsed ? "hidden" : "visible");
          }
        })
        .attr("class", "setComboContainer")
        .attr("transform", getTransformFunction(allSetCombinations))
        .each("end", function (d) {
          if (!d.collapsed) {
            d3.select(this).selectAll("g.pathContainer")
              .attr("visibility", d.collapsed ? "hidden" : "visible");
          }
        });

      updateListHeight(parent);
      //setComboContainer.selectAll("g.pathContainer").
      //  attr("transform", function (d, i) {
      //    var posY = 0;
      //    for (var index = 0; index < i; index++) {
      //      posY += pathHeight + allPaths[index].sets.length * setHeight + pathSpacing;
      //    }
      //    return "translate(0," + posY + ")";
      //  });
    }

    function updateListHeight(svg) {
      var posY = 0;

      for (var index = 0; index < allSetCombinations.length; index++) {

        if (!allSetCombinations[index].collapsed) {
          var pathsHeight = pathList.getTotalHeight(allSetCombinations[index].paths);
          posY += pathsHeight;


        }
        posY += setContainerSpacing + setComboHeight;

      }
      svg.attr("height", posY);
      svg.select("#SetLabelClipPath rect")
        .attr("height", posY);
    }

    function getTransformFunction(setCombinations) {
      return function (d, i) {

        var posY = 0;

        for (var index = 0; index < i; index++) {

          posY += setContainerSpacing + setComboHeight;

          if (!setCombinations[index].collapsed) {
            var pathsHeight = pathList.getTotalHeight(setCombinations[index].paths);
            posY += pathsHeight;
          }
        }

        return "translate(0," + posY + ")";
      }
    }


    return {
      appendWidgets: function(parent, svg) {
        var sortButton = $('<input>').appendTo(parent)[0];
        $(sortButton).attr("type", "checkbox");
        $(sortButton).on("click", function () {
          var that = this;
          sortingManager.ascending = !this.checked;
          sortingManager.sort(allSetCombinations, svg, "g.setComboContainer", getTransformFunction(allSetCombinations));
        });
      },

      init: function (svg) {

        var w = 800;
        var h = 800;

        //var svg = d3.select("#setlist").append("svg")
        svg.attr("width", w)
          .attr("height", h);
        svg.append("marker")
          .attr("id", "arrowRight")
          .attr("viewBox", "0 0 10 10")
          .attr("refX", "0")
          .attr("refY", "5")
          .attr("markerUnits", "strokeWidth")
          .attr("markerWidth", "4")
          .attr("markerHeight", "3")
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M 0 0 L 10 5 L 0 10 z");
        svg.append("clipPath")
          .attr("id", "SetLabelClipPath")
          .append("rect")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", 90)
          .attr("height", 10);


        //
        //var sortButton = $('<input>').prependTo('div.outer')[0];
        //$(sortButton).attr("type", "checkbox");
        //$(sortButton).on("click", function () {
        //  var that = this;
        //  sortingManager.ascending = !this.checked;
        //  sortingManager.sortPaths(svg);
        //});
        //
        //var selectSortingStrategy = $('<select>').prependTo('div.outer')[0];
        //$(selectSortingStrategy).append($("<option value='0'>Set Count Edge Weight</option>"));
        //$(selectSortingStrategy).append($("<option value='1'>Path Length</option>"));
        //$(selectSortingStrategy).on("change", function () {
        //  if (this.value == '0') {
        //    sortingManager.sortPaths(svg, [sortingStrategies.setCountEdgeWeight, sortingStrategies.pathId]);
        //  }
        //  if (this.value == '1') {
        //    sortingManager.sortPaths(svg, [sortingStrategies.pathLength, sortingStrategies.pathId]);
        //  }
        //});


      },

      removeGuiElements: function (parent) {
        var svg = d3.select("#pathlist svg");

        parent.selectAll("g.setComboContainer")
          .remove();

        parent.select("#arrowRight").remove();
        parent.select("#SetLabelClipPath").remove();
      },


      render: function (paths, parent) {
        allSetCombinations = getSetCombinations(paths);


        parent.selectAll("g.setComboContainer")
          .remove();

        sortingManager.sort(allSetCombinations, parent, "g.setComboContainer", getTransformFunction(allSetCombinations));

        listeners.add(updateSets, listeners.updateType.SET_INFO_UPDATE);



        var setComboContainer = parent.selectAll("g.setComboContainer")
          .data(allSetCombinations, getKey)
          .enter()
          .append("g");

        setComboContainer.attr("class", "setComboContainer")
          .attr("transform", getTransformFunction(allSetCombinations));

        var setCombination = setComboContainer.append("g")
          .attr("class", "setCombination")
          .on("click", function (d) {
            //listeners.notify(d, listeners.updateType.PATH_SELECTION);
          });

        setCombination.append("rect")
          .attr("class", "filler")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", "100%")
          .attr("height", setComboHeight);

        setCombination.append("text")
          .attr("class", "collapseIcon")
          .attr("x", collapseButtonSpacing)
          .attr("y", setComboHeight - vSpacing - setNodeRadiusY + 5)
          .text(function (d) {
            return d.collapsed ? "\uf0da" : "\uf0dd";
          })
          .on("click", function (d) {
            d.collapsed = !d.collapsed;
            d3.select(this).text(d.collapsed ? "\uf0da" : "\uf0dd");

            updateSetList(parent);
          });

        var setNodeGroup = setCombination.append("g")
          .attr("class", "setNodeGroup");

        var node = setNodeGroup.selectAll("g.setNode")
          .data(function (combination) {
            return combination.setIds;
          })
          .enter()
          .append("g")
          .attr("class", "setNode")
          .on("dblclick", function (d) {
            sortingManager.addOrReplace(sortingStrategies.getSetNodePrensenceSortingStrategy([d]));
            sortingManager.sort(allSetCombinations, parent, "g.setComboContainer", getTransformFunction(allSetCombinations));


            //sortingManager.sortPaths(svg, [sortingStrategies.getNodePresenceStrategy([d.id]),
            //  sortingManager.currentStrategyChain]);
          });

        node.append("ellipse")
          .attr("cx", function (d, i) {
            return 2 * collapseButtonSpacing + 8 + setNodeRadiusX + (i * ((2 * setNodeRadiusX) + setNodeSpacing));
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
            var text = getClampedText(info.properties["name"], 14);

            return text;
          })
          .attr("x", function (d, i) {
            return 2 * collapseButtonSpacing + 8 + (i * ((2 * setNodeRadiusX) + setNodeSpacing)) + setNodeRadiusX;
          })
          .attr("y", vSpacing + setNodeRadiusY + 4);
        node.append("title")
          .text(function (d) {
            var info = setInfo.get(d);
            if (typeof info === "undefined") {
              return d;
            }
            return info.properties["name"];
          });

        //setComboContainer.attr("class", "setComboContainer")
        //  .attr("transform", function (d, i) {
        //    var posY = i * (setContainerSpacing + setComboHeight);
        //
        //    return "translate(0," + posY + ")";
        //  });
        setComboContainer.each(function (d, i) {
          //var posY = 0;
          //
          //for (var index = 0; index < i; index++) {
          //  var pathsHeight = pathList.getTotalHeight(setCombinations[index].paths);
          //  posY += pathsHeight + setContainerSpacing + setComboHeight;
          //}

          pathList.renderPaths(d3.select(this), d.paths, 0, setComboHeight, !d.collapsed);
        });
        updateListHeight(parent);
      }

    }


  }
)
