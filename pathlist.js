define(['jquery', 'd3', './listeners', './sorting', './setinfo', './selectionutil'],
  function ($, d3, listeners, sorting, setInfo, selectionUtil) {
    'use strict';

    //var jsonPaths = require('./testpaths1.json');

    //TODO: fetch amount of sets from server
    var totalNumSets = 290;


    var nodeStart = 90;
    var nodeWidth = 50;
    var nodeHeight = 20;
    var vSpacing = 5;
    var pathHeight = nodeHeight + 2 * vSpacing;
    var edgeSize = 50;
    var arrowWidth = 7;
    var setHeight = 10;
    var pathSpacing = 15;

    var SortingStrategy = sorting.SortingStrategy;

    function PathLengthSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.WEIGHT);
    }

    PathLengthSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    PathLengthSortingStrategy.prototype.compare = function (a, b) {
      if (sortingManager.ascending) {
        return d3.ascending(a.edges.length, b.edges.length);
      }
      return d3.descending(a.edges.length, b.edges.length);
    }


    function SetCountEdgeWeightSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ID);
    }

    SetCountEdgeWeightSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    SetCountEdgeWeightSortingStrategy.prototype.compare = function (a, b) {
      function calcWeight(path) {
        var totalWeight = 0;

        path.edges.forEach(function (edge) {
            var numSets = 0;
            for (var key in edge.properties) {
              if (key.charAt(0) !== '_') {
                var property = edge.properties[key];
                if (property instanceof Array) {
                  numSets += property.length;
                } else {
                  numSets++;
                }
              }
            }

            totalWeight += (totalNumSets - numSets + 1) / totalNumSets;
          }
        );

        return totalWeight;
      }

      var weightA = calcWeight(a);
      var weightB = calcWeight(b);

      if (sortingManager.ascending) {
        return d3.ascending(weightA, weightB);
      }
      return d3.descending(weightA, weightB);
    }

    function NodePresenceSortingStrategy(nodeIds) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE);
      this.compare = function (a, b) {
        var numNodesA = 0;
        var numNodesB = 0;
        nodeIds.forEach(function (nodeId) {
          a.nodes.forEach(function (node) {
            if (node.id === nodeId) {
              numNodesA++;
            }
          });

          b.nodes.forEach(function (node) {
            if (node.id === nodeId) {
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

    NodePresenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

    function SetPresenceSortingStrategy(setIds) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE);
      this.compare = function (a, b) {
        var setScoreA = 0;
        var setScoreB = 0;
        setIds.forEach(function (setId) {
          var setOccurrencesA = getSetOccurrences(a, setId);
          setScoreA += setOccurrencesA / a.edges.length;
          var setOccurrencesB = getSetOccurrences(b, setId);
          setScoreB += setOccurrencesB / b.edges.length;
        });

        //Inverse definition of ascending and descending, as higher score should be ranked higher
        if (sortingManager.ascending) {
          return d3.descending(setScoreA, setScoreB);
        }
        return d3.ascending(setScoreA, setScoreB);
      }

      function getSetOccurrences(path, setId) {
        var numSetOccurrences = 0;
        path.edges.forEach(function (edge) {
          for (var key in edge.properties) {
            if (key.charAt(0) !== '_') {
              var property = edge.properties[key];
              if (property instanceof Array) {
                for (var i = 0; i < property.length; i++) {
                  if (property[i] === setId) {
                    numSetOccurrences++
                  }
                }
              } else if (property === setId) {
                numSetOccurrences++;
              }
            }
          }
        });
        return numSetOccurrences;
      }
    }

    SetPresenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

    var sortingManager = new sorting.SortingManager(true);

    var sortingStrategies = {
      pathLength: new PathLengthSortingStrategy(),

      pathId: new sorting.IdSortingStrategy(sortingManager),

      setCountEdgeWeight: new SetCountEdgeWeightSortingStrategy(),

      getNodePresenceStrategy: function (nodeIds) {
        return new NodePresenceSortingStrategy(nodeIds);
      },

      getSetPresenceStrategy: function (setIds) {
        return new SetPresenceSortingStrategy(setIds);
      },

      getChainComparator: function (strategies) {
        return function (a, b) {

          for (var i = 0; i < strategies.length; i++) {
            var res = strategies[i].compare(a, b);
            if (res !== 0) {
              return res;
            }
          }
          return 0;
        }
      }
    }

    sortingManager.setStrategyChain([sortingStrategies.setCountEdgeWeight, sortingStrategies.pathId]);


    var allPaths = [];

    function getTransformFunction(paths) {
      return function (d, i) {
        var posY = 0;
        for (var index = 0; index < i; index++) {
          posY += pathHeight + paths[index].sets.length * setHeight + pathSpacing;
        }
        return "translate(0," + posY + ")";
      };
    }


    function updateSets(setInfo) {

      var svg = d3.select("#pathlist svg");

      svg.selectAll("g.pathContainer g.setGroup g.set text")
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

      svg.selectAll("g.pathContainer g.setGroup g.set title")
        .text(function (d) {
          var info = setInfo["path:" + d[0].id];

          if (typeof info === "undefined") {
            return d[0].id;
          }
          return info.properties["name"];
        });
    }

    function getClampedText(text, maxLength) {
      if (text.length > maxLength) {
        return text.substring(0, maxLength);
      }
      return text;
    }


    function getPathKey(d) {
      return d.id;
    }


    function isSourceNodeLeft(nodes, edge, edgeIndex) {
      return nodes[edgeIndex].id === edge.sourceNodeId;
    }

    return {

      appendWidgets: function (parent, svg) {


        var selectSortingStrategy = $('<select>').appendTo(parent)[0];
        $(selectSortingStrategy).append($("<option value='0'>Set Count Edge Weight</option>"));
        $(selectSortingStrategy).append($("<option value='1'>Path Length</option>"));
        $(selectSortingStrategy).on("change", function () {
          if (this.value == '0') {
            sortingManager.sort(allPaths, svg, "g.pathContainer", getTransformFunction(allPaths), [sortingStrategies.setCountEdgeWeight, sortingStrategies.pathId]);
          }
          if (this.value == '1') {
            sortingManager.sort(allPaths, svg, "g.pathContainer", getTransformFunction(allPaths), [sortingStrategies.pathLength, sortingStrategies.pathId]);
          }
        });

        var sortButton = $('<input>').appendTo(parent)[0];
        $(sortButton).attr("type", "checkbox");
        $(sortButton).on("click", function () {
          var that = this;
          sortingManager.ascending = !this.checked;
          sortingManager.sort(allPaths, svg, "g.pathContainer", getTransformFunction(allPaths));
        });
      },

      init: function (svg) {

        var w = 800;
        var h = 800;

        //var svg = d3.select("#pathlist").append("svg")
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

      },

      removeGuiElements: function (parent) {

        parent.selectAll("g.pathContainer")
          .remove();

        parent.select("#arrowRight").remove();
        parent.select("#SetLabelClipPath").remove();
      },


      render: function (paths, parent) {

        allPaths = paths;


        if (paths.length > 0) {

          parent.selectAll("g.pathContainer")
            .remove();
          sortingManager.sort(paths, parent, "g.pathContainer", getTransformFunction(paths));
          this.displayPaths(parent, paths);
        }
      },

      displayPaths: function (svg, paths) {


        svg.selectAll("g.pathContainer")
          .remove();

        this.renderPaths(svg, paths, 0, 0, true);


        //paths.forEach(function (path) {
        //  var p = svg.append("g");
        //  p.attr("class", "path")
        //    .on("click", function () {
        //      pathListeners.notify(path);
        //    });
        //
        //  addPathSets(path);
        //  renderPath(p, path, posX, posY);
        //  posY += 50 + path.sets.length * 10;
        //
        //  path.sets.forEach(function (s) {
        //    var setExists = setDict[s.id];
        //    if (!setExists) {
        //      allSets.push(s.id);
        //      setDict[s.id] = true;
        //    }
        //  });
        //});

        var totalHeight = this.getTotalHeight(paths);

        svg.attr("height", totalHeight);
        svg.select("#SetLabelClipPath rect")
          .attr("height", totalHeight);

        listeners.add(updateSets, listeners.updateType.SET_INFO_UPDATE);
      },

      getTotalHeight: function (paths) {
        var totalHeight = 0;

        paths.forEach(function (path) {
          totalHeight += pathHeight + pathSpacing + path.sets.length * setHeight;
        });
        return totalHeight;
      },

      renderPaths: function (parent, paths, baseTranslateX, baseTranslateY, visible) {


        var pathContainer = parent.selectAll("g.pathContainer")
          .data(paths, getPathKey)
          .enter()
          .append("g");

        pathContainer.attr("class", "pathContainer")
          .attr("transform", function (d, i) {
            var posY = baseTranslateY;
            for (var index = 0; index < i; index++) {
              posY += pathHeight + paths[index].sets.length * setHeight;
            }
            posY += i * pathSpacing;

            return "translate(" + baseTranslateX + "," + posY + ")";
          })
          .attr("visibility", visible ? "visible" : "hidden");

        var p = pathContainer.append("g")
          .attr("class", "path")
          .on("click", function (d) {
            listeners.notify(d, listeners.updateType.PATH_SELECTION);
          });

        p.append("rect")
          .attr("class", "filler")
          .attr("x", nodeStart)
          .attr("y", 0)
          .attr("width", "100%")
          .attr("height", pathHeight);

        var nodeGroup = p.append("g")
          .attr("class", "nodeGroup");

        var node = nodeGroup.selectAll("g.node")
          .data(function (path) {
            return path.nodes;
          })
          .enter()
          .append("g")
          .attr("class", "node")
          .on("dblclick", function (d) {
            sortingManager.addOrReplace(sortingStrategies.getNodePresenceStrategy([d.id]));
            sortingManager.sort(paths, parent, "g.pathContainer", getTransformFunction(paths));


            //sortingManager.sortPaths(svg, [sortingStrategies.getNodePresenceStrategy([d.id]),
            //  sortingManager.currentStrategyChain]);
          });
        //.on("mouseover", function (d) {
        //  d3.select(this).classed("hover", true);
        //})
        //.on("mouseout", function (d) {
        //  d3.select(this).classed("hover", false);
        //});
        selectionUtil.addListeners(nodeGroup, "g.node", function (d) {
            return d.id;
          },
          "node"
        );

        node.append("rect")
          .attr("x", function (d, i) {
            return nodeStart + (i * nodeWidth) + (i * edgeSize);
          })
          .attr("y", vSpacing)
          .attr("width", nodeWidth)
          .attr("height", nodeHeight);
        //.attr("fill", "rgb(200,200,200)")
        //.attr("stroke", "rgb(30,30,30)");

        node.append("text")
          .text(function (d) {
            var text = d.properties["name"];
            return getClampedText(text, 7);
          })
          .attr("x", function (d, i) {
            return nodeStart + (i * nodeWidth) + (i * edgeSize) + nodeWidth / 2;
          })
          .attr("y", vSpacing + nodeHeight - 5)
          .append("title")
          .text(function (d) {
            return d.properties["name"];
          });
        ;

        var edgeGroup = p.append("g")
          .attr("class", "edgeGroup");

        var edge = edgeGroup.selectAll("g.edge")
          .data(function (path, i) {
            return path.edges.map(function (edge) {
              return [edge, i];
            });
          })
          .enter()
          .append("g")
          .attr("class", "edge");

        edge.append("line")
          .attr("x1", function (d, i) {
            if (isSourceNodeLeft(paths[d[1]].nodes, d[0], i)) {
              return ( nodeStart + (i + 1) * nodeWidth) + (i * edgeSize);
            } else {
              return ( nodeStart + (i + 1) * nodeWidth) + ((i + 1) * edgeSize);
            }
          })
          .attr("y1", vSpacing + nodeHeight / 2)
          .attr("x2", function (d, i) {
            if (isSourceNodeLeft(paths[d[1]].nodes, d[0], i)) {
              return ( nodeStart + (i + 1) * nodeWidth) + ((i + 1) * edgeSize) - arrowWidth;
            } else {
              return ( nodeStart + (i + 1) * nodeWidth) + (i * edgeSize) + arrowWidth;
            }
          })
          .attr("y2", vSpacing + nodeHeight / 2)
          .attr("marker-end", "url(#arrowRight)");

        var setGroup = pathContainer.append("g")
          .attr("class", "setGroup");

        var set = setGroup.selectAll("g.set")
          .data(function (path, i) {
            return path.sets.map(function (myset) {
              return [myset, i];
            });
          })
          .enter()
          .append("g")
          .attr("class", "set")
          .on("dblclick", function (d) {
            sortingManager.addOrReplace(sortingStrategies.getSetPresenceStrategy([d[0].id]));
            sortingManager.sort(paths, parent, "g.pathContainer", getTransformFunction(paths));
          });

        set.append("rect")
          .attr("class", "filler")
          .attr("x", 0)
          .attr("y", function (d, i) {
            return 2 * vSpacing + nodeHeight + i * setHeight;
          })
          .attr("width", "100%")
          .attr("height", setHeight)

        set.append("text")
          .text(function (d) {
            //var text = d[0].id;
            //return getClampedText(text, 15);

            var info = setInfo.get(d[0].id);
            if (typeof info === "undefined") {
              return d[0].id;
            }
            return info.properties["name"];
          })
          .attr("x", 0)
          .attr("y", function (d, i) {
            return 2 * vSpacing + nodeHeight + (i + 1) * setHeight;
          })
          .attr("clip-path", "url(#SetLabelClipPath)");


        set.selectAll("line")
          .data(function (d, i) {
            var numPrevSets = 0;
            for (var pathIndex = 0; pathIndex < d[1]; pathIndex++) {
              numPrevSets += paths[pathIndex].sets.length;
            }
            return d[0].relIndices.map(function (item) {
              return [item, i - numPrevSets];
            });
          })
          .enter()
          .append("line")
          .attr("x1", function (d) {
            return nodeStart + (d[0] * nodeWidth) + (d[0] * edgeSize) + nodeWidth / 2;
          })
          .attr("y1", function (d) {
            return 2 * vSpacing + nodeHeight + (d[1] + 1) * setHeight - 3;
          })
          .attr("x2", function (d) {
            return nodeStart + ((d[0] + 1) * nodeWidth) + ((d[0] + 1) * edgeSize) + nodeWidth / 2;
          })
          .attr("y2", function (d) {
            return 2 * vSpacing + nodeHeight + (d[1] + 1) * setHeight - 3;
          });

        set.append("title")
          .text(function (d) {
            var info = setInfo.get(d[0].id);
            if (typeof info === "undefined") {
              return d[0].id;
            }
            return info.properties["name"];
          });
      }

    }


  }
)
