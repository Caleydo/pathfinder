define(['jquery', 'd3', '../listeners', '../sorting', '../setinfo', '../selectionutil', './pathsorting', '../pathutil', '../query/pathquery', '../datastore', '../config', '../listoverlay', '../query/queryview', '../query/queryUtil'],
  function ($, d3, listeners, sorting, setInfo, selectionUtil, pathSorting, pathUtil, pathQuery, dataStore, config, ListOverlay, queryView, queryUtil) {
    'use strict';

    //var jsonPaths = require('./testpaths1.json');


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

    var currentSetTypeId = 0;

    var sortingManager = pathSorting.sortingManager;
    var sortingStrategies = pathSorting.sortingStrategies;


    var pathListUpdateTypes = {
      UPDATE_NODE_SET_VISIBILITY: "UPDATE_NODE_SET_VISIBILITY"
    }

    var showNodeSets = false;

    function SetRep(setId, type) {
      this.id = setId;
      this.nodeIndices = [];
      this.relIndices = [];
      this.setType = type;
    }

    SetRep.prototype = {
      getHeight: function () {
        return setHeight;
      },

      //Defines whether this set can be shown. Only considers own data to determine that, not e.g. whether its set type is collapsed.
      canBeShown: function () {
        return showNodeSets || (!showNodeSets && this.relIndices.length > 0);
      }
    };

    function SetType(type) {
      this.id = currentSetTypeId++;
      this.type = type;
      this.sets = [];
      this.setDict = {};
      this.collapsed = false;
      this.nodeIndices = [];
      this.relIndices = [];
    }

    SetType.prototype = {
      getHeight: function () {
        var height = setHeight;
        if (!this.collapsed) {
          this.sets.forEach(function (setRep) {
            if (setRep.canBeShown()) {
              height += setRep.getHeight();
            }
          });
        }
        return height;
      },

      canBeShown: function () {
        return showNodeSets || (!showNodeSets && this.relIndices.length > 0);
      }
    };

    function PathWrapper(path) {
      this.path = path;
      this.addPathSets(path);
    }

    PathWrapper.prototype = {

      getHeight: function () {
        var height = pathHeight;
        this.setTypes.forEach(function (setType) {
          if (setType.canBeShown()) {
            height += setType.getHeight();
          }
        });

        return height;
      },

      getWidth: function () {
        var height = pathHeight;
        this.setTypes.forEach(function (setType) {
          if (setType.canBeShown()) {
            height += setType.getHeight();
          }
        });

        return nodeStart + this.path.nodes.length * nodeWidth + this.path.edges.length * edgeSize;
      },

      addPathSets: function (path) {

        var setTypeDict = {};
        var setTypeList = [];

        for (var i = 0; i < path.nodes.length; i++) {
          var node = path.nodes[i];

          pathUtil.forEachNodeSet(node, function (setType, setId) {
            addSetForNode(setType, setId, i);
          });
        }
        ;

        for (var i = 0; i < path.edges.length; i++) {
          var edge = path.edges[i];

          pathUtil.forEachEdgeSet(edge, function (setType, setId) {
            addSetForEdge(setType, setId, i);
          });
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
            setType = new SetType(type);
            //setType = {type: type, sets: [], setDict: {}, collapsed: false, nodeIndices: [], relIndices: []};
            setTypeDict[type] = setType;
            setTypeList.push(setType);
          }

          var mySet = setType.setDict[setId];
          if (typeof mySet === "undefined") {
            mySet = new SetRep(setId, type);
            //mySet = {id: setId, nodeIndices: [], relIndices: [], setType: type};
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


//var allPaths = [];

    function getPathContainerTransformFunction(pathWrappers) {
      return function (d, i) {
        var posY = 0;
        for (var index = 0; index < i; index++) {
          posY += pathWrappers[index].getHeight() + pathSpacing;
        }
        return "translate(0," + posY + ")";
      };
    }

    function getSetTypeTransformFunction(pathWrappers) {

      return function (d, i) {
        var pathWrapper = pathWrappers[d.pathIndex];

        var posY = pathHeight;
        for (var typeIndex = 0; typeIndex < i; typeIndex++) {
          var setType = pathWrapper.setTypes[typeIndex];
          if (setType.canBeShown()) {
            posY += setType.getHeight();
          }
        }

        return "translate(0," + posY + ")";
      }
    }

    function getSetTransformFunction(pathWrappers) {
      return function (d, i) {
        var setType = pathWrappers[d.pathIndex].setTypes[d.setTypeIndex];

        var posY = setHeight;
        for (var setIndex = 0; setIndex < i; setIndex++) {
          var set = setType.sets[setIndex];
          if (set.canBeShown()) {
            posY += set.getHeight();
          }
        }
        return "translate(0," + posY + ")";
      }

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

          var text = info.properties[config.getSetNameProperty(info)];
          //return getClampedText(text, 15);
          return text;
        });

      svg.selectAll("g.pathContainer g.setGroup g.set title")
        .text(function (d) {
          var info = setInfo.get(d.set.id);

          if (typeof info === "undefined") {
            return d.set.id;
          }
          return info.properties[config.getSetNameProperty(info)];
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
      this.paths = [];
      this.pathWrappers = [];
      this.updateListeners = [];
      this.selectionListeners = [];
      var that = this;

      this.setVisibilityUpdateListener = function (showSets) {
        showNodeSets = showSets;
        that.updatePathList();
      };

      this.listUpdateListener = function (updatedObject) {
        that.updatePathList();
      };

      this.removeFilterChangedListener = function (remove) {
        if (remove) {
          that.updatePathWrappersToFilter();
        } else {
          that.addAllPaths();
        }
        that.notifyUpdateListeners();
      };

      this.queryChangedListener = function (query) {
        if (pathQuery.isRemoveFilteredPaths()) {
          that.updatePathWrappersToFilter();
          that.notifyUpdateListeners();
        } else {
          that.updatePathList();
        }
      };

      this.sortUpdateListener = function (currentComparator) {
        //sortingManager.sort(that.pathWrappers, that.parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers), sortStrategyChain);

        that.pathWrappers.sort(currentComparator);

        that.updateDataBinding();

        that.parent.selectAll("g.pathContainer").data(that.pathWrappers, getPathKey)
          .sort(currentComparator)
          .transition()
          .attr("transform", getPathContainerTransformFunction(that.pathWrappers));
      }
    }

    PathList.prototype = {
      wrapPaths: function (paths) {
        var that = this;
        paths.forEach(function (path) {
          if (!(pathQuery.isPathFiltered(path.id) && pathQuery.isRemoveFilteredPaths())) {
            that.pathWrappers.push(new PathWrapper(path));
          }
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
      }
      ,
      init: function () {
        listeners.add(updateSets, listeners.updateType.SET_INFO_UPDATE);
        listeners.add(this.setVisibilityUpdateListener, "UPDATE_NODE_SET_VISIBILITY");
        listeners.add(this.queryChangedListener, listeners.updateType.QUERY_UPDATE);
        listeners.add(this.removeFilterChangedListener, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);
        listeners.add(this.sortUpdateListener, pathSorting.updateType);
      },

      updatePathWrappersToFilter: function () {
        var pathWrappersToRemove = [];

        var that = this;

        this.pathWrappers.forEach(function (pathWrapper) {
          if (pathQuery.isPathFiltered(pathWrapper.path.id)) {
            pathWrappersToRemove.push(pathWrapper);
          }
        });

        pathWrappersToRemove.forEach(function (pathWrapper) {
          var index = that.pathWrappers.indexOf(pathWrapper);
          if (index !== -1) {
            that.pathWrappers.splice(index, 1);
          }
        });

        var pathsToAdd = [];
        var that = this;

        this.paths.forEach(function (path) {
          if (!pathQuery.isPathFiltered(path.id)) {
            var pathPresent = false;
            for (var i = 0; i < that.pathWrappers.length; i++) {
              var pathWrapper = that.pathWrappers[i];
              if (pathWrapper.path.id === path.id) {
                pathPresent = true;
              }
            }

            if (!pathPresent) {
              pathsToAdd.push(path);
            }
          }
        });

        pathsToAdd.forEach(function (path) {
          that.pathWrappers.push(new PathWrapper(path));
        });

        this.render(this.parent);
      },

      addAllPaths: function () {
        var pathsToAdd = [];
        var that = this;

        this.paths.forEach(function (path) {
          var pathPresent = false;
          for (var i = 0; i < that.pathWrappers.length; i++) {
            var pathWrapper = that.pathWrappers[i];
            if (pathWrapper.path.id === path.id) {
              pathPresent = true;
            }
          }

          if (!pathPresent) {
            pathsToAdd.push(path);
          }

        });

        pathsToAdd.forEach(function (path) {
          that.pathWrappers.push(new PathWrapper(path));
        });

        this.render(this.parent);
      },

      updatePathList: function () {

        //var setComboContainer = parent.selectAll("g.pathContainer g.setType")
        //  .transition()


        //d3.select(this).attr("display", function (d) {
        //  if (showNodeSets) {
        //    return "inline";
        //  }
        //  return d.setType.relIndices.length > 0 ? "inline" : "none";
        //});

        //d3.select(this).selectAll("g.set")
        //  .attr("display", function (d) {
        //    if (showNodeSets) {
        //      return "inline";
        //    }
        //    return d.set.relIndices.length > 0 ? "inline" : "none";
        //  })


        var that = this;

        that.parent.selectAll("g.pathContainer")
          .transition()
          .attr("transform", getPathContainerTransformFunction(this.pathWrappers))
          .style("opacity", function (d) {
            if (pathQuery.isPathFiltered(d.path.id)) {
              return 0.5;
            }
            return 1;
          });


        that.parent.selectAll("g.pathContainer")
          .each(function () {
            d3.select(this).selectAll("g.setType")
              .transition()
              .each("start", function (d) {
                if (d.setType.collapsed) {
                  d3.select(this).selectAll("g.setTypeSummary")
                    .attr("display", "inline");
                }

                d3.select(this).selectAll("g.setCont")
                  .each(function (setData) {
                    if (d.setType.collapsed || (!setData.set.canBeShown())) {
                      d3.select(this)
                        .attr("display", "none");
                    }
                  });
                if (!d.setType.canBeShown()) {
                  d3.select(this)
                    .attr("display", "none");
                }
              })
              .attr("transform", getSetTypeTransformFunction(that.pathWrappers))
              .each("end", function (d) {

                if (!d.setType.collapsed) {
                  d3.select(this).selectAll("g.setTypeSummary")
                    .attr("display", "none");
                }

                d3.select(this).selectAll("g.setCont")
                  .each(function (setData) {
                    if (!d.setType.collapsed && setData.set.canBeShown()) {
                      d3.select(this)
                        .attr("display", "inline");
                    }
                  });

                if (d.setType.canBeShown()) {
                  d3.select(this)
                    .attr("display", "inline");
                }
              });

            d3.select(this).selectAll("g.setType")
              .each(function () {
                d3.select(this).selectAll("g.setCont")
                  .transition()
                  .attr("transform", getSetTransformFunction(that.pathWrappers));
              });

          });

        this.notifyUpdateListeners();
      }
      ,

      destroy: function () {
        this.removePaths();
        this.updateListeners = [];
        listeners.remove(this.setVisibilityUpdateListener, "UPDATE_NODE_SET_VISIBILITY");
        listeners.remove(this.queryChangedListener, listeners.updateType.QUERY_UPDATE);
        listeners.remove(this.removeFilterChangedListener, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);
        listeners.remove(updateSets, listeners.updateType.SET_INFO_UPDATE);
        listeners.remove(this.sortUpdateListener, pathSorting.updateType);
      },

      removeGuiElements: function () {

        selectionUtil.removeListeners(this.selectionListeners);
        this.selectionListeners = [];
        currentSetTypeId = 0;

        if (typeof this.parent === "undefined")
          return;

        this.parent.selectAll("g.pathContainer")
          .remove();

        //parent.select("#arrowRight").remove();
        //parent.select("#SetLabelClipPath").remove();


      }
      ,

      removePaths: function () {
        this.removeGuiElements(this.parent);
        this.paths = [];
        this.pathWrappers = [];
      }
      ,


      render: function (parent) {
        this.parent = parent;

        if (this.pathWrappers.length > 0) {

          this.renderPaths();
        }
      }
      ,

      setPaths: function (paths) {
        this.pathWrappers = [];
        this.paths = paths;
        this.wrapPaths(paths);
      },

      addPath: function (path) {
        this.paths.push(path);
        if (!(pathQuery.isPathFiltered(path.id) && pathQuery.isRemoveFilteredPaths())) {
          this.pathWrappers.push(new PathWrapper(path));
        }
      }
      ,

      getSize: function () {
        var totalHeight = 0;
        var currentMaxWidth = 0;

        this.pathWrappers.forEach(function (pathWrapper) {
          totalHeight += pathWrapper.getHeight() + pathSpacing;
          var currentWidth = pathWrapper.getWidth();
          if (currentWidth > currentMaxWidth) {
            currentMaxWidth = currentWidth;
          }
        });
        return {width: currentMaxWidth, height: totalHeight};
      }
      ,

      updateDataBinding: function () {
        var pathContainers = this.parent.selectAll("g.pathContainer")
          .data(this.pathWrappers, getPathKey);

        pathContainers.each(function (pathWrapper, i) {

          d3.select(this).selectAll("g.path").selectAll("g.nodeGroup").selectAll("g.node")
            .data(function () {
              return pathWrapper.path.nodes;
            });

          d3.select(this).selectAll("g.path").selectAll("g.edgeGroup").selectAll("g.edge")
            .data(function () {
              return pathWrapper.path.edges.map(function (edge) {
                return {edge: edge, pathIndex: i};
              });
            });

          var setTypes = d3.select(this).selectAll("g.setGroup").selectAll("g.setType")
            .data(function () {
              return pathWrapper.setTypes.map(function (mySetType) {
                return {setType: mySetType, pathIndex: i};
              });
            });

          setTypes.each(function (d, i) {

            d3.select(this).selectAll("g.setTypeSummary").each(function () {
              d3.select(this).selectAll("circle")
                .data(function () {
                  return d.setType.nodeIndices.map(function (index) {
                    return {pathIndex: d.pathIndex, setTypeIndex: i, nodeIndex: index};
                  });
                });

              d3.select(this).selectAll("line")
                .data(function () {
                  return d.setType.relIndices.map(function (index) {
                    return {pathIndex: d.pathIndex, setTypeIndex: i, relIndex: index};
                  });
                })
            });

            var set = d3.select(this)
              .selectAll("g.setCont")
              .data(function () {
                return d.setType.sets.map(function (myset) {
                  return {set: myset, pathIndex: d.pathIndex, setTypeIndex: i};
                });
              });

            set.each(function (d, i) {
              d3.select(this).selectAll("circle")
                .data(function () {
                  return d.set.nodeIndices.map(function (index) {
                    return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, setIndex: i, nodeIndex: index};
                  });
                });


              d3.select(this).selectAll("line").
                data(function (d, i) {
                  return d.set.relIndices.map(function (index) {
                    return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, setIndex: i, relIndex: index};
                  });
                });
            });


          });

        });
      },

      renderPaths: function () {

        var that = this;


        var allPathContainers = that.parent.selectAll("g.pathContainer")
          .data(that.pathWrappers, getPathKey);

        allPathContainers.exit()
          .transition()
          .attr("transform", "translate(0," + 2000 + ")")
          .remove();

        var pathContainer = allPathContainers
          .enter()
          .append("g")
          .style("opacity", function (d) {
            if (pathQuery.isPathFiltered(d.path.id)) {
              return 0.5;
            }
            return 1;
          });


        pathContainer.attr("class", "pathContainer")
          .attr("transform", "translate(0," + that.getSize().height + ")");

        pathContainer.append("rect")
          .classed("pathContainerBackground", true)
          .attr("fill", "#A1D99B")
          .style("opacity", 0.8)
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", "100%")
          .attr("height", function (pathWrapper) {
            return pathWrapper.getHeight();
          });


        //.attr("visibility", visible ? "visible" : "hidden");

        var p = pathContainer.append("g")
          .attr("class", "path");

        p.append("rect")
          .attr("class", "filler")
          .attr("x", nodeStart)
          .attr("y", 0)
          .attr("width", "100%")
          .attr("height", pathHeight);
        //.on("click", function(d) {
        //  console.log(d.path.id);
        //});

        var l = selectionUtil.addDefaultListener(pathContainer, "g.path", function (d) {
            return d.path.id;
          },
          "path"
        );
        that.selectionListeners.push(l);

        var edgeGroup = p.append("g")
          .attr("class", "edgeGroup");


        var allEdges = allPathContainers.selectAll("g.path").selectAll("g.edgeGroup").selectAll("g.edge")
          .data(function (pathWrapper, i) {
            return pathWrapper.path.edges.map(function (edge) {
              return {edge: edge, pathIndex: i};
            });
          });

        //var edge = edgeGroup.selectAll("g.edge")
        //  .data(function (pathWrapper, i) {
        //    return pathWrapper.path.edges.map(function (edge) {
        //      return {edge: edge, pathIndex: i};
        //    });
        //  })
        var edge = allEdges
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
          .attr("marker-end", "url(#arrowRight)")
          .attr("display", function (d) {
            return d.edge.properties["_isNetworkEdge"] ? "inline" : "none";
          });

        var nodeGroup = p.append("g")
          .attr("class", "nodeGroup");

        var allNodes = allPathContainers.selectAll("g.path").selectAll("g.nodeGroup").selectAll("g.node")
          .data(function (pathWrapper) {
            return pathWrapper.path.nodes;
          });

        //var node = nodeGroup.selectAll("g.node")
        //  .data(function (pathWrapper) {
        //    return pathWrapper.path.nodes;
        //  })
        var nc = allNodes.enter()
          .append("g")
          .classed("nodeCont", true);

        nc.each(function (d, i) {
          queryUtil.createAddNodeFilterButton(d3.select(this), that.parent, "name", d.properties[config.getNodeNameProperty(d)], nodeStart + (i * nodeWidth) + (i * edgeSize) + nodeWidth, vSpacing);
        });

        var node = nc
          .append("g")
          .attr("class", "node")

          .on("dblclick", function (d) {
            sortingManager.addOrReplace(sortingStrategies.getNodePresenceStrategy([d.id]));
            listeners.notify(pathSorting.updateType, sortingManager.currentComparator);
            //sortingManager.sort(that.pathWrappers, parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers));
          });


        //.on("click.filter", function(d){
        //  if (d3.event.altKey) {
        //    queryView.addNodeFilter("name",  d.properties[config.getNodeNameProperty(d)]);
        //  }
        //});
        //.on("mouseover", function (d) {
        //  var o = new ListOverlay();
        //  o.show(d3.select(this), [{
        //    text: "something quite long", callback: function () {
        //    }
        //  }], 0, 0)
        //});
        var l = selectionUtil.addDefaultListener(nodeGroup, "g.node", function (d) {
            return d.id;
          },
          "node"
        );
        that.selectionListeners.push(l);


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
            var text = d.properties[config.getNodeNameProperty(d)];
            return getClampedText(text, 7);
          })
          .attr("x", function (d, i) {
            return nodeStart + (i * nodeWidth) + (i * edgeSize) + nodeWidth / 2;
          })
          .attr("y", vSpacing + nodeHeight - 5)
          .append("title")
          .text(function (d) {
            return d.properties[config.getNodeNameProperty(d)];
          });


        var setGroup = pathContainer.append("g")
          .attr("class", "setGroup");

        var allSetTypes = allPathContainers.selectAll("g.setGroup").selectAll("g.setType")
          .data(function (pathWrapper, i) {
            return pathWrapper.setTypes.map(function (mySetType) {
              return {setType: mySetType, pathIndex: i};
            });
          });


        //var setType = setGroup.selectAll("g.setType")
        //    .data(function (pathWrapper, i) {
        //      return pathWrapper.setTypes.map(function (mySetType) {
        //        return {setType: mySetType, pathIndex: i};
        //      });
        //    })
        var setType = allSetTypes.enter()
            .append("g")
            .classed("setType", true)
            .attr({
              display: function (d) {

                if (d.setType.canBeShown()) {
                  return "inline";
                }
                return "none";
              },
              transform: getSetTypeTransformFunction(that.pathWrappers)
            }
          )
          ;

        setType.append("text")
          .attr("class", "collapseIconSmall");

        allSetTypes.selectAll("text.collapseIconSmall")
          .attr("x", 5)
          .attr("y", setHeight)
          .text(function (d) {
            return d.setType.collapsed ? "\uf0da" : "\uf0dd";
          })
          .on("click", function (d) {
            d.setType.collapsed = !d.setType.collapsed;
            d3.select(this).text(d.setType.collapsed ? "\uf0da" : "\uf0dd");
            that.updatePathList();
            //updateSetList(parent);
          });

        setType.append("text")
          .text(function (d) {
            //var text = d[0].id;
            //return getClampedText(text, 15);
            return config.getSetTypeFromSetPropertyName(d.setType.type);
          })
          .attr("x", 10)
          .attr("y", setHeight)
          .attr("fill", function (d) {
            return setInfo.getSetTypeInfo(d.setType.type).color;
          })
          .attr("clip-path", "url(#SetLabelClipPath)");

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
                cy: setHeight / 2,
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
                y1: setHeight / 2,
                x2: function (d) {
                  return nodeStart + ((d.relIndex + 1) * nodeWidth) + ((d.relIndex + 1) * edgeSize) + nodeWidth / 2;
                },
                y2: setHeight / 2,
                stroke: function (d) {
                  return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
                }
              });
          }
        )
        ;


        setType.each(function (d, i) {

          var sc = d3.select(this)
            .selectAll("g.setCont")
            .data(function () {
              return d.setType.sets.map(function (myset) {
                return {set: myset, pathIndex: d.pathIndex, setTypeIndex: i};
              });
            })
            .enter()
            .append("g")
            .classed("setCont", true)
            .attr({
              display: function (d) {
                if (d.set.canBeShown()) {
                  return "inline";
                }
                return "none";
              },
              transform: getSetTransformFunction(that.pathWrappers)
            });

          sc.each(function (d, i) {
            queryUtil.createAddNodeFilterButton(d3.select(this), that.parent, "set", d.set.id, nodeStart, 0, true);
          });

          var set = sc
            .append("g")
            .classed("set", true)
            //.attr({
            //  display: function (d) {
            //    if (d.set.canBeShown()) {
            //      return "inline";
            //    }
            //    return "none";
            //  },
            //  transform: getSetTransformFunction(that.pathWrappers)
            //})
            .on("dblclick", function (d) {
              sortingManager.addOrReplace(sortingStrategies.getSetPresenceStrategy([d.set.id]));
              listeners.notify(pathSorting.updateType, sortingManager.currentComparator);
              //sortingManager.sort(that.pathWrappers, parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers));
            });

          set.append("rect")
            .attr("class", "filler")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", "100%")
            .attr("height", setHeight);

          set.append("text")
            .text(function (d) {
              //var text = d[0].id;
              //return getClampedText(text, 15);

              var info = setInfo.get(d.set.id);
              if (typeof info === "undefined") {
                return d.set.id;
              }
              return info.properties[config.getSetNameProperty(info)];
            })
            .attr("x", setTypeIndent)
            .attr("y", setHeight)
            .attr("fill", function (d) {
              return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
            })
            .attr("clip-path", "url(#SetLabelClipPath)");

          set.append("title")
            .text(function (d) {
              var info = setInfo.get(d.set.id);
              if (typeof info === "undefined") {
                return d.set.id;
              }
              return info.properties[config.getSetNameProperty(info)];
            });

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
                  return setHeight / 2;
                },
                r: 4,
                fill: function (d) {
                  return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
                }
              });

            d3.select(this).selectAll("line").
              data(function (d, i) {
                return d.set.relIndices.map(function (index) {
                  return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, setIndex: i, relIndex: index};
                });
              })
              .enter()
              .append("line")
              .attr("x1", function (d) {
                return nodeStart + (d.relIndex * nodeWidth) + (d.relIndex * edgeSize) + nodeWidth / 2;
              })
              .attr("y1", function (d) {
                return setHeight / 2;
                //return 2 * vSpacing + nodeHeight + (d.setIndex + 1) * setHeight - 5;
              })
              .attr("x2", function (d) {
                return nodeStart + ((d.relIndex + 1) * nodeWidth) + ((d.relIndex + 1) * edgeSize) + nodeWidth / 2;
              })
              .attr("y2", function (d) {
                return setHeight / 2;
                //return 2 * vSpacing + nodeHeight + (d.setIndex + 1) * setHeight - 5;
              })
              .attr("stroke", function (d) {
                return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
              });


          });


        });


        var l = selectionUtil.addDefaultListener(setType, "g.set", function (d) {
            return d.set.id;
          },
          "set"
        );
        that.selectionListeners.push(l);

        this.sortUpdateListener(sortingManager.currentComparator);

        pathContainer.selectAll("rect.pathContainerBackground").transition()
          .duration(800)
          .style("opacity", 0);

        //allPathContainers.transition()
        //  .attr("transform", getPathContainerTransformFunction(that.pathWrappers));


        //function getSetPositionY(pathIndex, setTypeIndex, setIndex) {
        //  var pathWrapper = that.pathWrappers[pathIndex];
        //
        //  var numSets = 0;
        //  for (var typeIndex = 0; typeIndex < setTypeIndex; typeIndex++) {
        //    var setType = pathWrapper.setTypes[typeIndex];
        //    numSets += setType.sets.length;
        //  }
        //
        //  return 2 * vSpacing + nodeHeight + (numSets + setIndex + setTypeIndex + 1) * setHeight;
        //}


      }

    };


    return PathList;
  }
);
