define(['jquery', 'd3', './listeners', './sorting', './setinfo', './selectionutil'],
  function ($, d3, listeners, sorting, setInfo, selectionUtil) {
    'use strict';

    //var jsonPaths = require('./testpaths1.json');

    //TODO: fetch amount of sets from server
    var totalNumSets = 290;


    var nodeStart = 90;
    var setTypeIndent = 10;
    var nodeWidth = 50;
    var nodeHeight = 20;
    var vSpacing = 5;
    var pathHeight = nodeHeight + 2 * vSpacing;
    var edgeSize = 50;
    var arrowWidth = 7;
    var setHeight = 10;
    var pathSpacing = 15;

    var SortingStrategy = sorting.SortingStrategy;

    var selectionListeners = [];

    var pathListUpdateTypes = {
      UPDATE_NODE_SET_VISIBILITY: "UPDATE_NODE_SET_VISIBILITY"
    }

    var isNodeSetVisible = false;

    function PathWrapper(path) {
      this.path = path;
      this.addPathSets(path);
    }

    PathWrapper.prototype = {

      getHeight: function () {
        var height = pathHeight;
        this.setTypes.forEach(function (setType) {
          height += setType.collapsed ? setHeight : (setType.sets.length + 1) * setHeight;
        });

        return height;
      },

      addPathSets: function (path) {

        var setTypeDict = {};
        var setTypeList = [];

        for (var i = 0; i < path.nodes.length; i++) {
          var node = path.nodes[i];
          for (var key in node.properties) {
            if (isSetProperty(key)) {
              var property = node.properties[key];
              if (property instanceof Array) {
                property.forEach(function (setId) {
                  addSetForNode(key, setId, i);
                });
              } else {
                var currentSet = addSet(key, property);
                addSetForNode(key, property, i);
              }
            }
          }
        }
        ;

        function isSetProperty(key) {
          return key !== "id" && key !== "idType" && key !== "name";
        }

        for (var i = 0; i < path.edges.length; i++) {
          var edge = path.edges[i];

          for (var key in edge.properties) {
            if (key.charAt(0) !== '_') {
              var property = edge.properties[key];
              if (property instanceof Array) {
                edge.properties[key].forEach(function (setId) {
                  addSetForEdge(key, setId, i);
                });
              } else {
                addSetForEdge(key, property, i);
              }
            }
          }
        }

        function addSetForNode(type, setId, nodeIndex) {
          var currentSet = addSet(type, setId);
          currentSet.nodeIndices.push(nodeIndex);
          var currentSetType = setTypeDict[type];
          if (currentSetType.nodeIndices.indexOf(nodeIndex) === -1) {
            currentSetType.nodeIndices.push(nodeIndex);
          }
        }

        function addSetForEdge(type, setId, relIndex) {
          var currentSet = addSet(type, setId);
          currentSet.relIndices.push(relIndex);
          var currentSetType = setTypeDict[type];
          if (currentSetType.relIndices.indexOf(relIndex) === -1) {
            currentSetType.relIndices.push(relIndex);
          }
        }

        function addSet(type, setId) {
          var setType = setTypeDict[type];

          if (typeof setType === "undefined") {
            setType = {type: type, sets: [], setDict: {}, collapsed: false, nodeIndices: [], relIndices: []}
            setTypeDict[type] = setType;
            setTypeList.push(setType);
          }

          var mySet = setType.setDict[setId];
          if (typeof mySet === "undefined") {
            mySet = {id: setId, nodeIndices: [], relIndices: [], setType: type};
            setType.setDict[setId] = mySet;
            setType.sets.push(mySet);
          }
          return mySet;
        }

        setTypeList.forEach(function (setType) {
          delete setType.setDict;
        });

        this.setTypes = setTypeList;
      }
    };

    function PathLengthSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.WEIGHT);
    }

    PathLengthSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    PathLengthSortingStrategy.prototype.compare = function (a, b) {
      if (sortingManager.ascending) {
        return d3.ascending(a.path.edges.length, b.path.edges.length);
      }
      return d3.descending(a.path.edges.length, b.path.edges.length);
    }


    function SetCountEdgeWeightSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ID);
    }

    SetCountEdgeWeightSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    SetCountEdgeWeightSortingStrategy.prototype.compare = function (a, b) {
      function calcWeight(pathWrapper) {
        var totalWeight = 0;

        pathWrapper.path.edges.forEach(function (edge) {
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
          a.path.nodes.forEach(function (node) {
            if (node.id === nodeId) {
              numNodesA++;
            }
          });

          b.path.nodes.forEach(function (node) {
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

      function getSetOccurrences(pathWrapper, setId) {
        var numSetOccurrences = 0;
        pathWrapper.path.edges.forEach(function (edge) {
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


    //var allPaths = [];

    function getTransformFunction(pathWrappers) {
      return function (d, i) {
        var posY = 0;
        for (var index = 0; index < i; index++) {
          posY += pathWrappers[index].getHeight() + pathSpacing;
        }
        return "translate(0," + posY + ")";
      };
    }


    function updateSets(setInfo) {

      var svg = d3.select("#pathlist svg");

      svg.selectAll("g.pathContainer g.setGroup g.set text")
        .text(function (d) {
          var info = setInfo.get(d.set.id);

          if (typeof info === "undefined") {
            //return getClampedText(d[0].id, 15);
            return d.set.id;
          }

          var text = info.properties["name"];
          //return getClampedText(text, 15);
          return text;
        });

      svg.selectAll("g.pathContainer g.setGroup g.set title")
        .text(function (d) {
          var info = setInfo.get(d.set.id);

          if (typeof info === "undefined") {
            return d.set.id;
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
      return d.path.id;
    }


    function isSourceNodeLeft(nodes, edge, edgeIndex) {
      return nodes[edgeIndex].id === edge.sourceNodeId;
    }


    function PathList() {
      this.pathWrappers = [];
      this.updateListeners = [];
      var that = this;
      this.listUpdateListener = function (updatedObject) {
        that.updatePathList(that.parent);
      }
    }

    PathList.prototype = {
      wrapPaths: function (paths) {
        var that = this;
        paths.forEach(function (path) {
          that.pathWrappers.push(new PathWrapper(path));
        });
      },

      addUpdateListener: function (l) {
        this.updateListeners.push(l);
      },

      notifyUpdateListeners: function () {
        var that = this;
        this.updateListeners.forEach(function (l) {
          l(that);
        })
      },

      appendWidgets: function (parent, svg) {

        var pathlist = this;


        var selectSortingStrategy = $('<select>').appendTo(parent)[0];
        $(selectSortingStrategy).append($("<option value='0'>Set Count Edge Weight</option>"));
        $(selectSortingStrategy).append($("<option value='1'>Path Length</option>"));
        $(selectSortingStrategy).on("change", function () {
          if (this.value == '0') {
            sortingManager.sort(pathlist.pathWrappers, svg, "g.pathContainer", getTransformFunction(pathlist.pathWrappers), [sortingStrategies.setCountEdgeWeight, sortingStrategies.pathId]);
          }
          if (this.value == '1') {
            sortingManager.sort(pathlist.pathWrappers, svg, "g.pathContainer", getTransformFunction(pathlist.pathWrappers), [sortingStrategies.pathLength, sortingStrategies.pathId]);
          }
        });

        var sortButton = $('<input>').appendTo(parent)[0];
        $(sortButton).attr("type", "checkbox");
        $(sortButton).on("click", function () {
          var that = this;
          sortingManager.ascending = !this.checked;
          sortingManager.sort(pathlist.pathWrappers, svg, "g.pathContainer", getTransformFunction(pathlist.pathWrappers));
        });

        var hideNodeOnlySetsButton = $('<input>').appendTo(parent)[0];
        $(hideNodeOnlySetsButton).attr("type", "checkbox");
        $(hideNodeOnlySetsButton).on("click", function () {
          isNodeSetVisible = !this.checked;
          listeners.notify(isNodeSetVisible, pathListUpdateTypes.UPDATE_NODE_SET_VISIBILITY);
        });
      }
      ,

      updatePathList: function (parent) {

        var setComboContainer = parent.selectAll("g.pathContainer g.setType")
          .transition()
          .each("start", function (d) {
            if (d.setType.collapsed) {
              d3.select(this).selectAll("g.set")
                .attr("display", "none");
              d3.select(this).selectAll("g.setTypeSummary")
                .attr("display", "inline");
            }


          })
          .each("end", function (d) {
            if (!d.setType.collapsed) {
              d3.select(this).selectAll("g.set")
                .attr("display", "inline");
              d3.select(this).selectAll("g.setTypeSummary")
                .attr("display", "none");
            }

            d3.select(this).attr("display", function (d) {
              if (isNodeSetVisible) {
                return "inline";
              }
              return d.setType.relIndices.length > 0 ? "inline" : "none";
            });

            d3.select(this).selectAll("g.set")
              .attr("display", function (d) {
                if (isNodeSetVisible) {
                  return "inline";
                }
                return d.set.relIndices.length > 0 ? "inline" : "none";
              })
          });

        parent.selectAll("g.pathContainer")
          .transition()
          .attr("transform", getTransformFunction(this.pathWrappers));

        this.notifyUpdateListeners();
      }
      ,

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

      }
      ,

      removeGuiElements: function (parent) {

        parent.selectAll("g.pathContainer")
          .remove();

        parent.select("#arrowRight").remove();
        parent.select("#SetLabelClipPath").remove();

        selectionUtil.removeListeners(selectionListeners);
        selectionListeners = [];
        listeners.remove(this.listUpdateListener, pathListUpdateTypes.UPDATE_NODE_SET_VISIBILITY);
      }
      ,


      render: function (paths, parent) {

        this.pathWrappers = [];
        this.parent = parent;
        this.wrapPaths(paths);

        if (paths.length > 0) {

          parent.selectAll("g.pathContainer")
            .remove();
          sortingManager.sort(this.pathWrappers, parent, "g.pathContainer", getTransformFunction(this.pathWrappers));
          parent.selectAll("g.pathContainer")
            .remove();

          this.renderPaths(parent);

          var totalHeight = this.getTotalHeight(paths);

          parent.attr("height", totalHeight);
          parent.select("#SetLabelClipPath rect")
            .attr("height", totalHeight);

          listeners.add(updateSets, listeners.updateType.SET_INFO_UPDATE);
          listeners.add(this.listUpdateListener, pathListUpdateTypes.UPDATE_NODE_SET_VISIBILITY);
        }
      }
      ,

      getTotalHeight: function () {
        var totalHeight = 0;

        this.pathWrappers.forEach(function (pathWrapper) {
          totalHeight += pathWrapper.getHeight() + pathSpacing;
        });
        return totalHeight;
      }
      ,

      renderPaths: function (parent) {

        var that = this;


        var pathContainer = parent.selectAll("g.pathContainer")
          .data(that.pathWrappers, getPathKey)
          .enter()
          .append("g");

        pathContainer.attr("class", "pathContainer")
          .attr("transform", getTransformFunction(that.pathWrappers));
        //.attr("visibility", visible ? "visible" : "hidden");

        var p = pathContainer.append("g")
          .attr("class", "path")
          .on("click", function (d) {
            listeners.notify(d.path, listeners.updateType.PATH_SELECTION);
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
          .data(function (pathWrapper) {
            return pathWrapper.path.nodes;
          })
          .enter()
          .append("g")
          .attr("class", "node")

          .on("dblclick", function (d) {
            sortingManager.addOrReplace(sortingStrategies.getNodePresenceStrategy([d.id]));
            sortingManager.sort(that.pathWrappers, parent, "g.pathContainer", getTransformFunction(that.pathWrappers));
          });
        var l = selectionUtil.addListener(nodeGroup, "g.node", function (d) {
            return d.id;
          },
          "node"
        );
        selectionListeners.push(l);


        node.append("rect")
          .attr("x", function (d, i) {
            return nodeStart + (i * nodeWidth) + (i * edgeSize);
          })
          .attr("y", vSpacing)
          .attr("rx", 5).attr("ry", 5)
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
          .data(function (pathWrapper, i) {
            return pathWrapper.path.edges.map(function (edge) {
              return {edge: edge, pathIndex: i};
            });
          })
          .enter()
          .append("g")
          .attr("class", "edge");

        edge.append("line")
          .attr("x1", function (d, i) {
            if (isSourceNodeLeft(that.pathWrappers[d.pathIndex].path.nodes, d.edge, i)) {
              return ( nodeStart + (i + 1) * nodeWidth) + (i * edgeSize);
            } else {
              return ( nodeStart + (i + 1) * nodeWidth) + ((i + 1) * edgeSize);
            }
          })
          .attr("y1", vSpacing + nodeHeight / 2)
          .attr("x2", function (d, i) {
            if (isSourceNodeLeft(that.pathWrappers[d.pathIndex].path.nodes, d.edge, i)) {
              return ( nodeStart + (i + 1) * nodeWidth) + ((i + 1) * edgeSize) - arrowWidth;
            } else {
              return ( nodeStart + (i + 1) * nodeWidth) + (i * edgeSize) + arrowWidth;
            }
          })
          .attr("y2", vSpacing + nodeHeight / 2)
          .attr("marker-end", "url(#arrowRight)");

        var setGroup = pathContainer.append("g")
          .attr("class", "setGroup");

        var setType = setGroup.selectAll("g.setType")
          .data(function (pathWrapper, i) {
            return pathWrapper.setTypes.map(function (mySetType) {
              return {setType: mySetType, pathIndex: i, collapsed: false};
            });
          })
          .enter()
          .append("g")
          .attr("class", "setType")
          .attr("display", function (d) {
            if (isNodeSetVisible) {
              return "inline";
            }
            return d.setType.relIndices.length > 0 ? "inline" : "none";
          });

        setType.append("text")
          .attr("class", "collapseIconSmall")
          .attr("x", 5)
          .attr("y", function (d, i) {
            var pathWrapper = that.pathWrappers[d.pathIndex];

            var numSets = 0;
            for (var typeIndex = 0; typeIndex < i; typeIndex++) {
              var setType = pathWrapper.setTypes[typeIndex];
              numSets += setType.sets.length;
            }

            return 2 * vSpacing + nodeHeight + (numSets + i + 1) * setHeight;
          })
          .text(function (d) {
            return d.collapsed ? "\uf0da" : "\uf0dd";
          })
          .on("click", function (d) {
            d.setType.collapsed = !d.setType.collapsed;
            d3.select(this).text(d.setType.collapsed ? "\uf0da" : "\uf0dd");
            that.updatePathList(parent);
            //updateSetList(parent);
          });

        var setTypeSummaryContainer = setType.append("g")
          .classed("setTypeSummary", true)
          .attr("display", function (d) {
            return d.setType.collapsed ? "inline" : "none";
          });

        setTypeSummaryContainer.each(function (d, i) {
            d3.select(this).selectAll("circle")
              .data(function () {
                return d.setType.nodeIndices.map(function (index) {
                  return {pathIndex: d.pathIndex, setTypeIndex: i, nodeIndex: index};
                });
              })
              .enter()
              .append("circle")
              .attr({
                cx: function (d) {
                  return nodeStart + (d.nodeIndex * nodeWidth) + (d.nodeIndex * edgeSize) + nodeWidth / 2;
                },
                cy: function (d) {
                  return getSetTypePositionY(d.pathIndex, d.setTypeIndex) + setHeight / 2;
                },
                r: 4,
                fill: function (d) {
                  return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
                }
              });


            d3.select(this).selectAll("line")
              .data(function () {
                return d.setType.relIndices.map(function (index) {
                  return {pathIndex: d.pathIndex, setTypeIndex: i, relIndex: index};
                });
              })
              .enter()
              .append("line")
              .attr({
                x1: function (d) {
                  return nodeStart + (d.relIndex * nodeWidth) + (d.relIndex * edgeSize) + nodeWidth / 2;
                }
                ,
                y1: function (d) {
                  return getSetTypePositionY(d.pathIndex, d.setTypeIndex) + setHeight / 2;
                  //return 2 * vSpacing + nodeHeight + (d.setIndex + 1) * setHeight - 5;
                },
                x2: function (d) {
                  return nodeStart + ((d.relIndex + 1) * nodeWidth) + ((d.relIndex + 1) * edgeSize) + nodeWidth / 2;
                },
                y2: function (d) {
                  return getSetTypePositionY(d.pathIndex, d.setTypeIndex) + setHeight / 2;
                },
                stroke: function (d) {
                  return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
                }
              });
          }
        )
        ;

        function getSetTypePositionY(pathIndex, setTypeIndex) {
          var pathWrapper = that.pathWrappers[pathIndex];

          var numSets = 0;
          for (var typeIndex = 0; typeIndex < setTypeIndex; typeIndex++) {
            var setType = pathWrapper.setTypes[typeIndex];
            numSets += setType.sets.length;
          }

          return 2 * vSpacing + nodeHeight + (numSets + setTypeIndex) * setHeight;
        }

        setType.append("text")
          .text(function (d) {
            //var text = d[0].id;
            //return getClampedText(text, 15);
            return d.setType.type;
          })
          .attr("x", 10)
          .attr("y", function (d, i) {

            return getSetTypePositionY(d.pathIndex, i) + setHeight;
          })
          .attr("fill", function (d) {
            return setInfo.getSetTypeInfo(d.setType.type).color;
          })
          .attr("clip-path", "url(#SetLabelClipPath)");


        var set = setType.selectAll("g.set")
          .data(function (d, i) {

            var numPrevSetTypes = 0;
            for (var pathIndex = 0; pathIndex < d.pathIndex; pathIndex++) {
              numPrevSetTypes += that.pathWrappers[pathIndex].setTypes.length;
            }

            return d.setType.sets.map(function (myset) {
              return {set: myset, pathIndex: d.pathIndex, setTypeIndex: i - numPrevSetTypes};
            });
          })
          .enter()
          .append("g")
          .attr("class", "set")
          .attr("display", function (d) {
            if (isNodeSetVisible) {
              return "inline";
            }
            return d.set.relIndices.length > 0 ? "inline" : "none";
          })
          .on("dblclick", function (d) {
            sortingManager.addOrReplace(sortingStrategies.getSetPresenceStrategy([d.set.id]));
            sortingManager.sort(that.pathWrappers, parent, "g.pathContainer", getTransformFunction(that.pathWrappers));
          });

        var l = selectionUtil.addListener(setType, "g.set", function (d) {
            return d.set.id;
          },
          "set"
        );
        selectionListeners.push(l);

        function getSetPositionY(pathIndex, setTypeIndex, setIndex) {
          var pathWrapper = that.pathWrappers[pathIndex];

          var numSets = 0;
          for (var typeIndex = 0; typeIndex < setTypeIndex; typeIndex++) {
            var setType = pathWrapper.setTypes[typeIndex];
            numSets += setType.sets.length;
          }

          return 2 * vSpacing + nodeHeight + (numSets + setIndex + setTypeIndex + 1) * setHeight;
        }

        set.append("rect")
          .attr("class", "filler")
          .attr("x", 0)
          .attr("y", function (d, i) {
            return getSetPositionY(d.pathIndex, d.setTypeIndex, i);
          })
          .attr("width", "100%")
          .attr("height", setHeight)

        set.append("text")
          .text(function (d) {
            //var text = d[0].id;
            //return getClampedText(text, 15);

            var info = setInfo.get(d.set.id);
            if (typeof info === "undefined") {
              return d.set.id;
            }
            return info.properties["name"];
          })
          .attr("x", setTypeIndent)
          .attr("y", function (d, i) {

            return getSetPositionY(d.pathIndex, d.setTypeIndex, i) + setHeight;
          })
          .attr("fill", function (d) {
            return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
          })
          .attr("clip-path", "url(#SetLabelClipPath)");

        set.each(function (d, i) {
          d3.select(this).selectAll("circle")
            .data(function () {
              return d.set.nodeIndices.map(function (index) {
                return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, setIndex: i, nodeIndex: index};
              });
            })
            .enter()
            .append("circle")
            .attr({
              cx: function (d) {
                return nodeStart + (d.nodeIndex * nodeWidth) + (d.nodeIndex * edgeSize) + nodeWidth / 2;
              },
              cy: function (d) {
                return getSetPositionY(d.pathIndex, d.setTypeIndex, d.setIndex) + setHeight / 2;
              },
              r: 4,
              fill: function (d) {
                return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
              }
            })
        });


        set.selectAll("line")
          .data(function (d, i) {
            var numPrevSets = 0;
            for (var pathIndex = 0; pathIndex < d.pathIndex; pathIndex++) {
              that.pathWrappers[pathIndex].setTypes.forEach(function (setType) {
                numPrevSets += setType.sets.length;
              });
            }

            var setIndex = i - numPrevSets;

            return d.set.relIndices.map(function (index) {
              return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, setIndex: setIndex, relIndex: index};
            });
          })
          .enter()
          .append("line")
          .attr("x1", function (d) {
            return nodeStart + (d.relIndex * nodeWidth) + (d.relIndex * edgeSize) + nodeWidth / 2;
          })
          .attr("y1", function (d) {
            return getSetPositionY(d.pathIndex, d.setTypeIndex, d.setIndex) + setHeight - 5;
            //return 2 * vSpacing + nodeHeight + (d.setIndex + 1) * setHeight - 5;
          })
          .attr("x2", function (d) {
            return nodeStart + ((d.relIndex + 1) * nodeWidth) + ((d.relIndex + 1) * edgeSize) + nodeWidth / 2;
          })
          .attr("y2", function (d) {
            return getSetPositionY(d.pathIndex, d.setTypeIndex, d.setIndex) + setHeight - 5;
            //return 2 * vSpacing + nodeHeight + (d.setIndex + 1) * setHeight - 5;
          })
          .attr("stroke", function (d) {
            return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
          });

        set.append("title")
          .text(function (d) {
            var info = setInfo.get(d.set.id);
            if (typeof info === "undefined") {
              return d.set.id;
            }
            return info.properties["name"];
          });

      }

    }

    return PathList;
  }
)
