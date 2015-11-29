define(['jquery', 'd3', '../../listeners', '../../sorting', '../../setinfo', '../../selectionutil',
    '../pathsorting', '../../pathutil', '../../query/pathquery', '../../datastore', '../../config', '../../listoverlay',
    '../../query/queryview', '../../query/queryutil', '../../hierarchyelements', './settings', './datasetrenderer', '../../settings/visibilitysettings', '../../uiutil', './column', './pathdata'],
  function ($, d3, listeners, sorting, setInfo, selectionUtil, pathSorting, pathUtil, pathQuery, dataStore, config, ListOverlay, queryView, queryUtil, hierarchyElements, s, dr, vs, uiUtil, columns, pathData) {
    'use strict';


    function CrossPathNodeConnection(id, nodeId) {
      this.id = id;
      this.nodeId = nodeId;
      this.nodeAnchors = [];
      this.nodeLocations = [];
      this.maxNodeIndex = -1;
    }

    CrossPathNodeConnection.prototype = {

      addNodeAnchor: function (pathIndex, nodeIndex) {

        if (this.maxNodeIndex < nodeIndex) {
          this.maxNodeIndex = nodeIndex;
        }

        this.nodeLocations.push({pathIndex: pathIndex, nodeIndex: nodeIndex});

        if (this.nodeAnchors.length > 0) {
          this.nodeAnchors[this.nodeAnchors.length - 1].last = false;
          this.nodeAnchors.push({
            pathIndex: pathIndex,
            nodeIndex: nodeIndex,
            top: true,
            last: false,
            first: false
          });
          this.nodeAnchors.push({
            pathIndex: pathIndex,
            nodeIndex: nodeIndex,
            top: false,
            last: true,
            first: false
          });
        } else {
          this.nodeAnchors.push({
            pathIndex: pathIndex,
            nodeIndex: nodeIndex,
            top: true,
            last: false,
            first: true
          });
          this.nodeAnchors.push({
            pathIndex: pathIndex,
            nodeIndex: nodeIndex,
            top: false,
            last: true,
            first: false
          });
        }
      }

    };

    function getNodeSetCount(node, setTypeWrapper) {
      var numSets = 0;

      pathUtil.forEachNodeSetOfType(node, setTypeWrapper.type, function (type, setId) {
        if (setTypeWrapper.setDict[setId].canBeShown()) {
          numSets++;
        }
      });
      return numSets;
    }

    function getEdgeSetCount(edge, setTypeWrapper) {
      var numSets = 0;

      pathUtil.forEachEdgeSetOfType(edge, setTypeWrapper.type, function (type, setId) {
        if (setTypeWrapper.setDict[setId].canBeShown()) {
          numSets++;
        }
      });
      return numSets;
    }

    function getToggleReferencePathCallback(wrapper, allPathContainers) {
      return function (permanent) {
        if (!permanent) {
          s.referencePathId = wrapper.path.id;
          allPathContainers.each(function (pathWrapper) {
            if (pathWrapper.path.id !== s.referencePathId) {
              var parent = d3.select(this).select("g.path");

              //FIXME A little hacky
              $(parent[0]).off("mouseenter.overlay");
              $(parent[0]).off("mouseleave.overlay");
              parent.selectAll("g.overlayButton").remove();
              uiUtil.createTemporalOverlayButton(parent, getToggleReferencePathCallback(pathWrapper, allPathContainers), "\uf13d", 50, (s.PATH_HEIGHT - uiUtil.NORMAL_BUTTON_SIZE) / 2, false, true, "Toggle reference path");
            }
          });

          selectionUtil.selections["path"].setSelection(s.referencePathId, "reference");
          selectionUtil.notify("path", "reference");
        } else {
          selectionUtil.selections["path"].removeFromSelection(s.referencePathId, "reference");
          delete s.referencePathId;
          selectionUtil.notify("path", "reference");
        }

        if (config.isAutoColor()) {
          config.enableColors(permanent);
          listeners.notify(config.COLOR_UPDATE, permanent);
        }
        listeners.notify(s.pathListUpdateTypes.UPDATE_REFERENCE_PATH, s.referencePathId);
      };
    }

    function getPathContainerTransformFunction(pathWrappers) {
      return function (d, i) {
        return "translate(0," + s.getPathContainerTranslateY(pathWrappers, i) + ")";
      };
    }

    function getSetTransformFunction(pathWrappers) {
      return function (d, i) {
        var setType = pathWrappers[d.pathIndex].setTypes[d.setTypeIndex];

        var posY = s.getSetTranslateY(setType, i);

        return "translate(0," + posY + ")";
      }

    }


    function updateSets(setInfo) {

      var svg = d3.select("#pathlist svg");

      svg.selectAll("g.pathContainer g.setGroup g.set text")
        .text(function (d) {
          return setInfo.getSetLabel(d.id);
        });

      svg.selectAll("g.pathContainer g.setGroup g.set title")
        .text(function (d) {
          return setInfo.getSetLabel(d.id);
        });
    }


    function getPathKey(d) {
      return d.path.id;
    }


    function isSourceNodeLeft(nodes, edge, edgeIndex) {
      return nodes[edgeIndex].id === edge.sourceNodeId;
    }


    function PathList(listView) {
      this.listView = listView;
      this.pathWrappers = [];
      this.updateListeners = [];
      this.setSelectionListener = 0;
      this.connectionSelectionListener = 0;
      this.stubSelectionListener = 0;
      this.selectionListeners = [];
      this.crossConnections = [];
      this.connectionStubs = [];
      this.pivotNodeId = -1;
      this.pivotNodeIndex = 0;
      this.datasetRenderer = new dr.DatasetRenderer(this);
      var that = this;

      columns.init(this);

      //this.updateDatasetsListener = function () {
      //  that.pathWrappers.forEach(function (pathWrapper) {
      //    pathWrapper.updateDatasets();
      //  });
      //  that.renderPaths();
      //};

      this.alignPathNodesUpdateListener = function (align) {
        //s.alignPathNodes = align;

        that.renderPaths();
      };

      this.alignColumnsUpdateListener = function (align) {
        that.renderPaths();
      };

      this.tiltAttributesListener = function (tilt) {
        that.renderPaths();
      };

      this.setVisibilityUpdateListener = function (showSets) {
        //s.showNodeSets = showSets;

        if (typeof that.parent === "undefined") {
          return;
        }

        that.updateMaxSets();
        that.renderPaths();
      };

      this.listUpdateListener = function (updatedObject) {
        if (typeof that.parent === "undefined") {
          return;
        }

        that.updatePathList();
      };

      this.updateColorListener = function () {
        that.updatePathList();
      };

      this.updateNodeSizeListener = function () {
        that.renderPaths();
      };

      //this.removeFilterChangedListener = function (remove) {
      //  if (typeof that.parent === "undefined") {
      //    return;
      //  }
      //
      //  if (remove) {
      //    that.updatePathWrappersToFilter();
      //  } else {
      //    that.addAllPaths();
      //  }
      //  that.notifyUpdateListeners();
      //};

      //this.queryChangedListener = function (query) {
      //  if (typeof that.parent === "undefined") {
      //    return;
      //  }
      //
      //  if (pathQuery.isRemoveFilteredPaths() || pathQuery.isRemoteQuery()) {
      //    that.updatePathWrappersToFilter();
      //    that.notifyUpdateListeners();
      //  } else {
      //    that.updatePathList();
      //  }
      //};

      //this.sortUpdateListener = function (comparator) {
      //  //sortingManager.sort(that.pathWrappers, that.parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers), sortStrategyChain);
      //
      //  if (typeof that.parent === "undefined") {
      //    return;
      //  }
      //
      //  //that.sortPaths(comparator);
      //
      //  that.renderPaths();
      //};

      this.collapseElementListener = function (collapseElement) {
        if (typeof that.parent === "undefined") {
          return;
        }

        that.pathWrappers.forEach(function (pathWrapper) {
          pathWrapper.setTypes.forEach(function (t) {
            if (t.type === collapseElement.type) {
              t.collapsed = collapseElement.collapsed;
            }
          });

          pathWrapper.datasets.forEach(function (d) {
            if (d.name === collapseElement.type) {
              d.collapsed = collapseElement.collapsed;
            }
          })
        });
        that.updatePathList();
      };

      this.pathSelectionUpdateListener = function (selectionType) {

        var selectedIds = (selectionUtil.selections["path"])[selectionType];

        that.parent.selectAll("g.pathContainer").each(function (pathWrapper) {

          d3.select(this).selectAll("g.node")
            .classed("path_" + selectionType, function (d) {
              return (selectedIds.indexOf(pathWrapper.path.id) !== -1);
            });

          d3.select(this).selectAll("g.edge")
            .classed("path_" + selectionType, function (d) {
              return (selectedIds.indexOf(pathWrapper.path.id) !== -1);
            });
        });

      };

      this.updateReferencePathListener = function (pathId) {
        that.renderPaths();
      }
    }

    PathList.prototype = {


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
      init: function (parent) {
        if (typeof this.parent === "undefined") {
          this.parent = parent;
          this.parent.append("g")
            .classed("lineGridContainer", true);
          this.parent.append("g")
            .classed("crossConnectionContainer", true);
        }
        //s.NODE_WIDTH = config.getNodeWidth();
        s.NODE_HEIGHT = config.getNodeHeight();
        s.EDGE_SIZE = config.getEdgeSize();
        pathData.addUpdateListener(this.onPathDataUpdate.bind(this));
        listeners.add(updateSets, listeners.updateType.SET_INFO_UPDATE);
        listeners.add(this.collapseElementListener, s.pathListUpdateTypes.COLLAPSE_ELEMENT_TYPE);
        //listeners.add(this.setVisibilityUpdateListener, vs.updateTypes.UPDATE_NODE_SET_VISIBILITY);
        listeners.add(this.alignPathNodesUpdateListener, s.pathListUpdateTypes.ALIGN_PATH_NODES);
        listeners.add(this.alignColumnsUpdateListener, s.pathListUpdateTypes.ALIGN_COLUMNS);
        //listeners.add(this.queryChangedListener, listeners.updateType.QUERY_UPDATE);
        //listeners.add(this.removeFilterChangedListener, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);
        listeners.add(this.tiltAttributesListener, s.pathListUpdateTypes.TILT_ATTRIBUTES);
        //listeners.add(this.updateReferencePathListener, s.pathListUpdateTypes.UPDATE_REFERENCE_PATH);
        listeners.add(this.updateColorListener, config.COLOR_UPDATE);
        listeners.add(this.updateNodeSizeListener, config.NODE_SIZE_UPDATE);
        //listeners.add(this.sortUpdateListener, pathSorting.updateType);
        //listeners.add(this.updateDatasetsListener, listeners.updateType.DATASET_UPDATE);

        selectionUtil.addListener("path", this.pathSelectionUpdateListener);
      },

      onPathDataUpdate: function (changes) {
        this.pathWrappers = pathData.getPathWrappers(false);
        if (changes.pagePathsChanged || changes.crossPathDataChanged || changes.cause === listeners.updateType.DATASET_UPDATE || changes.cause === s.pathListUpdateTypes.UPDATE_REFERENCE_PATH) {
          this.updatePivotNodeIndex();
          this.renderPaths();
        } else if (changes.cause === pathSorting.updateType) {
          this.updatePathList();
        }
      },


      getNodeSetScale: function () {
        return d3.scale.linear().domain([1, pathData.maxNumNodeSets]).range([Math.sqrt(16 / Math.PI), Math.sqrt(Math.min(128, 16 * pathData.maxNumNodeSets) / Math.PI)]);
      },

      getEdgeSetScale: function () {
        return d3.scale.linear().domain([1, pathData.maxNumEdgeSets]).range([1, Math.min(pathData.maxNumEdgeSets, 6)]);
      },


      updatePathList: function () {
        this.updateDataBinding();

        var that = this;
        that.parent.selectAll("g.pathContainer").data(that.pathWrappers, getPathKey)
          .transition()
          .attr("transform", getPathContainerTransformFunction(this.pathWrappers))
          .style("opacity", function (d) {
            if (pathQuery.isPathFiltered(d.path.id)) {
              return 0.5;
            }
            return 1;
          });

        that.renderSets(that.parent.selectAll("g.pathContainer").data(that.pathWrappers, getPathKey));

        that.renderNodeProperties();
        //that.renderDatasets();
        that.datasetRenderer.render();
        columns.renderColumns(that.parent, that.pathWrappers);


        this.renderLineGrid();
        this.renderCrossConnections();

        this.notifyUpdateListeners();
      },

      destroy: function () {
        this.removePaths();
        this.updateListeners = [];
        listeners.remove(this.collapseElementListener, s.pathListUpdateTypes.COLLAPSE_ELEMENT_TYPE);
        listeners.remove(this.setVisibilityUpdateListener, vs.updateTypes.UPDATE_NODE_SET_VISIBILITY);
        listeners.remove(this.alignPathNodesUpdateListener, s.pathListUpdateTypes.ALIGN_PATH_NODES);
        listeners.remove(this.alignColumnsUpdateListener, s.pathListUpdateTypes.ALIGN_COLUMNS);
        //listeners.remove(this.queryChangedListener, listeners.updateType.QUERY_UPDATE);
        //listeners.remove(this.removeFilterChangedListener, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);
        listeners.remove(updateSets, listeners.updateType.SET_INFO_UPDATE);
        listeners.remove(this.tiltAttributesListener, s.pathListUpdateTypes.TILT_ATTRIBUTES);
        //listeners.remove(this.updateReferencePathListener, s.pathListUpdateTypes.UPDATE_REFERENCE_PATH);
        listeners.remove(this.updateColorListener, config.COLOR_UPDATE);
        listeners.remove(this.updateNodeSizeListener, config.NODE_SIZE_UPDATE);
        //listeners.remove(this.sortUpdateListener, pathSorting.updateType);
        //listeners.remove(this.updateDatasetsListener, listeners.updateType.DATASET_UPDATE);


      },

      removeGuiElements: function () {

        selectionUtil.removeListeners(this.selectionListeners);
        this.selectionListeners = [];
        selectionUtil.removeListeners(this.setSelectionListener);
        this.setSelectionListener = 0;
        selectionUtil.removeListeners(this.connectionSelectionListener);
        this.connectionSelectionListener = 0;
        selectionUtil.removeListeners(this.stubSelectionListener);
        this.stubSelectionListener = 0;
        selectionUtil.removeListeners(this.pathSelectionUpdateListener);

        if (typeof this.parent === "undefined")
          return;

        this.parent.selectAll("g.lineGridContainer")
          .remove();

        this.parent.selectAll("g.crossConnectionContainer")
          .remove();

        this.parent.selectAll("g.pathContainer")
          .remove();

        //parent.select("#arrowRight").remove();
        //parent.select("#SetLabelClipPath").remove();


      },

      removePaths: function () {
        this.removeGuiElements(this.parent);
        this.pathWrappers = [];
        this.crossConnections = [];
        this.connectionStubs = [];
      },


      render: function (parent) {
        if (typeof this.parent === "undefined") {
          this.parent = parent;
          this.parent.append("g")
            .classed("lineGridContainer", true);
          this.parent.append("g")
            .classed("crossConnectionContainer", true);
        }


        if (this.pathWrappers.length > 0) {
          this.renderPaths();
        }
      },

      getSize: function () {
        var that = this;
        var totalHeight = 0;
        var currentMaxWidth = 0;

        this.pathWrappers.forEach(function (pathWrapper) {
          totalHeight += pathWrapper.getHeight() + s.PATH_SPACING;
          var currentWidth = that.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + config.getNodeWidth();
          if (currentWidth > currentMaxWidth) {
            currentMaxWidth = currentWidth;
          }
        });
        return {width: (currentMaxWidth + columns.getWidth() + 120), height: totalHeight};
      }
      ,

      updateDataBinding: function () {
        if (typeof this.parent === "undefined") {
          return;
        }
        var that = this;

        var pathContainers = this.parent.selectAll("g.pathContainer")
          .data(this.pathWrappers, getPathKey);
        this.parent.selectAll("g.pathContainer g.pathContent")
          .data(this.pathWrappers, getPathKey);

        pathContainers.each(function (pathWrapper, i) {

          d3.select(this).selectAll("g.path").selectAll("g.nodeGroup").selectAll("g.node")
            .data(function () {
              return pathWrapper.path.nodes.map(function (node) {
                return {node: node, pathIndex: i};
              });
            });

          d3.select(this).selectAll("g.path").selectAll("g.edgeGroup").selectAll("g.edge")
            .data(function () {
              return pathWrapper.path.edges.map(function (edge) {
                return {edge: edge, pathIndex: i};
              });
            });
        });
      },

      setPivotNode: function (id) {

        this.pivotNodeId = id;
        this.updatePivotNodeIndex();
        this.renderPaths();
      },

      updatePivotNodeIndex: function () {
        if (this.pivotNodeId === -1) {
          return;
        }
        var that = this;
        var maxNodeIndex = 0;
        this.pathWrappers.forEach(function (pathWrapper) {
          for (var i = pathWrapper.path.nodes.length - 1; i >= 0; i--) {
            if (pathWrapper.path.nodes[i].id === that.pivotNodeId && i > maxNodeIndex) {
              maxNodeIndex = i;
              break;
            }
          }
        });
        this.pivotNodeIndex = maxNodeIndex;
      },

      getPivotNodeAlignedTranslationX: function (pathWrapper) {

        var nodeStart = s.NODE_START + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);

        if (s.isAlignPathNodes()) {
          return nodeStart;
        }

        var index = -1;
        for (var i = 0; i < pathWrapper.path.nodes.length; i++) {
          if (pathWrapper.path.nodes[i].id === this.pivotNodeId) {
            index = i;
            break;
          }
        }

        if (index === -1) {
          return nodeStart;
        }

        return nodeStart + (this.pivotNodeIndex - index) * (config.getNodeWidth() + s.EDGE_SIZE);
      },

      getPivotNodeAlignedTransform: function (pathWrapper) {

        return "translate(" + this.getPivotNodeAlignedTranslationX(pathWrapper) + ", 0)";

      },

      calcCrossConnections: function () {
        var that = this;
        this.crossConnections = [];
        this.connectionStubs = [];
        var connectionId = 0;
        var stubId = 0;
        var stubCandidates = {};
        var lastStubs = {};
        var previousNodeIndices = {};
        var currentNodeIndices = {};
        var previousConnections = {};
        var currentConnections = {};

        this.pathWrappers.forEach(function (pathWrapper, i) {

          currentConnections = {};
          currentNodeIndices = {};

          pathWrapper.path.nodes.forEach(function (node, j) {
            var connection = previousConnections[node.id.toString()];
            if (typeof connection !== "undefined") {
              connection.addNodeAnchor(i, j);
              currentConnections[node.id.toString()] = connection;
            } else {

              var previousNodeIndex = previousNodeIndices[node.id.toString()];
              if (typeof previousNodeIndex !== "undefined") {
                connection = new CrossPathNodeConnection(connectionId++, node.id);
                connection.addNodeAnchor(i - 1, previousNodeIndex);
                connection.addNodeAnchor(i, j);
                that.crossConnections.push(connection);
                delete lastStubs[node.id.toString()];
                currentConnections[node.id.toString()] = connection;
              } else {
                currentNodeIndices[node.id.toString()] = j;

                var prevStub = lastStubs[node.id.toString()];

                if (typeof prevStub !== "undefined" && (i - prevStub.pathIndex) > 1) {
                  prevStub.down = true;
                  var currentStub = {
                    id: stubId++,
                    nodeId: node.id,
                    pathIndex: i,
                    nodeIndex: j,
                    up: true,
                    down: false
                  };
                  that.connectionStubs.push(currentStub);
                  lastStubs[node.id.toString()] = currentStub;
                } else {

                  var prevStubCandidate = stubCandidates[node.id.toString()];

                  if (typeof prevStubCandidate !== "undefined" && (i - prevStubCandidate.pathIndex) > 1) {
                    var prevStub = {
                      id: stubId++,
                      nodeId: node.id,
                      pathIndex: prevStubCandidate.pathIndex,
                      nodeIndex: prevStubCandidate.nodeIndex,
                      up: false,
                      down: true
                    };
                    that.connectionStubs.push(prevStub);
                    var currentStub = {
                      id: stubId++,
                      nodeId: node.id,
                      pathIndex: i,
                      nodeIndex: j,
                      up: true,
                      down: false
                    };
                    that.connectionStubs.push(currentStub);
                    lastStubs[node.id.toString()] = currentStub;
                  }
                }
              }
            }

            stubCandidates[node.id.toString()] = {pathIndex: i, nodeIndex: j};
          });

          previousConnections = currentConnections;
          previousNodeIndices = currentNodeIndices;
        });
      },

      calcNodePositions: function () {
        var that = this;
        var straightenedConnections = {};

        that.pathWrappers.forEach(function (pathWrapper) {
          pathWrapper.nodePositions = d3.range(0, pathWrapper.path.nodes.length);
        });

        if (!s.isAlignPathNodes()) {
          return;
        }

        //Calc node alignment

        //sort connections by lowest max node index
        this.crossConnections.sort(function (a, b) {
          return d3.ascending(a.maxNodeIndex, b.maxNodeIndex);
        });

        this.crossConnections.forEach(function (connection) {
          var maxPosition = -1;
          var maxNodeLocation = 0;
          connection.nodeLocations.forEach(function (nodeLocation) {
            var position = that.pathWrappers[nodeLocation.pathIndex].nodePositions[nodeLocation.nodeIndex];
            if (position > maxPosition) {
              maxPosition = position;
              maxNodeLocation = nodeLocation;
            }
          });

          connection.nodeLocations.forEach(function (nodeLocation) {
            shiftNodes(nodeLocation, maxNodeLocation, connection.nodeId);
          });

          var connections = straightenedConnections[connection.nodeId.toString()];
          if (typeof connections === "undefined") {
            connections = [];
            straightenedConnections[connection.nodeId.toString()] = connections;
          }
          connections.push(connection);

        });

        function shiftNodes(nodeLocation, maxNodeLocation, currentNodeId) {
          var currentPathWrapper = that.pathWrappers[nodeLocation.pathIndex];
          var refPosition = that.pathWrappers[maxNodeLocation.pathIndex].nodePositions[maxNodeLocation.nodeIndex];
          var currentPosition = currentPathWrapper.nodePositions[nodeLocation.nodeIndex];

          if (refPosition === currentPosition) {
            return;
          }


          //Always shift for pivot node
          if (that.pivotNodeId !== currentNodeId) {

            //If there is any straightened connection for one of the nodes after the current node, do not shift in this path
            for (var i = nodeLocation.nodeIndex + 1; i < currentPathWrapper.nodePositions.length; i++) {
              var connections = straightenedConnections[currentPathWrapper.path.nodes[i].id.toString()];

              if (typeof connections !== "undefined") {
                for (var j = 0; j < connections.length; j++) {
                  var connection = connections[j];
                  if (connection.nodeLocations[0].pathIndex <= nodeLocation.pathIndex && connection.nodeLocations[connection.nodeLocations.length - 1].pathIndex >= nodeLocation.pathIndex) {
                    return;
                  }
                }
              }
            }
          }

          var shift = refPosition - currentPosition;

          for (var i = nodeLocation.nodeIndex; i < currentPathWrapper.nodePositions.length; i++) {
            currentPathWrapper.nodePositions[i] += shift;
          }
        }
      },

      renderCrossConnections: function () {

        var that = this;
        var connectionContainer = this.parent.select("g.crossConnectionContainer");

        var line = d3.svg.line()
          .x(function (d) {
            var position = that.pathWrappers[d.pathIndex].nodePositions[d.nodeIndex];
            var translate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
            return translate + position * (config.getNodeWidth() + s.EDGE_SIZE) + config.getNodeWidth() / 2;
          })
          .y(function (d) {
            var translate = s.getPathContainerTranslateY(that.pathWrappers, d.pathIndex);
            return d.top ? translate + (d.first ? s.PATH_HEIGHT / 2 : 0) : translate + (d.last ? s.PATH_HEIGHT / 2 : that.pathWrappers[d.pathIndex].getHeight());
          })
          .interpolate("linear");

        var allConnections = connectionContainer.selectAll("path.crossConnection")
          .data(this.crossConnections, function (d) {
            return d.id;
          });

        var connection = allConnections.enter()
          .append("path")
          .style({fill: "none"})
          .classed("crossConnection", true);


        allConnections
          .transition()
          .attr({
            d: function (d) {
              return line(d.nodeAnchors);
            }
          });

        allConnections.exit().remove();

        selectionUtil.removeListeners(that.connectionSelectionListener);

        that.connectionSelectionListener = selectionUtil.addDefaultListener(connectionContainer, "path.crossConnection", function (d) {
            return d.nodeId;
          },
          "node"
        );

        var allStubs = connectionContainer.selectAll("line.stub")
          .data(this.connectionStubs, function (d) {
            return d.id;
          });

        var stub = allStubs.enter()
          .append("line")
          .classed("stub", true);


        allStubs
          .transition()
          .attr({
            x1: function (d) {
              var position = that.pathWrappers[d.pathIndex].nodePositions[d.nodeIndex];
              var translate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
              return translate + position * (config.getNodeWidth() + s.EDGE_SIZE) + config.getNodeWidth() / 2;
            },
            y1: function (d) {
              var translate = s.getPathContainerTranslateY(that.pathWrappers, d.pathIndex);
              return translate + (d.up ? 0 : s.PATH_HEIGHT / 2);
            },
            x2: function (d) {
              var position = that.pathWrappers[d.pathIndex].nodePositions[d.nodeIndex];
              var translate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
              return translate + position * (config.getNodeWidth() + s.EDGE_SIZE) + config.getNodeWidth() / 2;
            },
            y2: function (d) {
              var translate = s.getPathContainerTranslateY(that.pathWrappers, d.pathIndex);
              return translate + (d.down ? s.PATH_HEIGHT : s.PATH_HEIGHT / 2);
            }
          });

        allStubs.exit().remove();

        selectionUtil.removeListeners(that.stubSelectionListener);

        that.stubSelectionListener = selectionUtil.addDefaultListener(connectionContainer, "line.stub", function (d) {
            return d.nodeId;
          },
          "node"
        );

      },

      renderSets: function (allPathContainers) {
        var that = this;


        var nodeSetScale = this.getNodeSetScale();
        var edgeSetScale = this.getEdgeSetScale();

        var referencePathWrapper = 0;
        if (typeof s.referencePathId !== "undefined") {
          for (var i = 0; i < this.pathWrappers.length; i++) {
            if (this.pathWrappers[i].path.id === s.referencePathId) {
              referencePathWrapper = this.pathWrappers[i];
            }
          }
        }

        allPathContainers.each(function (pathWrapper) {


          var allSetTypes = d3.select(this).select("g.setGroup").selectAll("g.setType")
            .data(function () {
              return pathWrapper.setTypes.filter(function (setType) {
                return setType.canBeShown();
              });
            });


          var setType = allSetTypes.enter()
            .append("g")
            .classed("setType", true)
            .attr({
                transform: function (d, i) {
                  var posY = s.getSetTypeTranslateY(pathWrapper, i);
                  return "translate(0," + posY + ")";
                }
              }
            );

          setType.append("text")
            .attr("class", "collapseIconSmall")
            .attr({
              x: 5,
              y: (s.SET_TYPE_HEIGHT - 10) / 2 + 9
            });


          setType.append("text")
            .classed("setTypeLabel", true)
            .text(function (d) {
              return config.getSetTypeFromSetPropertyName(d.type);
            })
            .attr({
              x: 10,
              y: ( s.SET_TYPE_HEIGHT - 10) / 2 + 9
            })
            .style("fill", function (d) {
              return config.getSetColorFromSetTypePropertyName(d.type);
            })
            .attr("clip-path", "url(#SetLabelClipPath)");

          setType.append("g")
            .classed("setTypeSummary", true)
            .attr("display", function (d) {
              return d.collapsed ? "inline" : "none";
            });


          allSetTypes
            .transition()
            .each("start", function (d) {
              d3.select(this).selectAll("g.setTypeSummary")
                .attr("display", d.collapsed ? "inline" : "none");

              d3.select(this).selectAll("text.collapseIconSmall")
                .text(function (d) {
                  return d.collapsed ? "\uf0da" : "\uf0dd";
                });

              d3.select(this).select("text.setTypeLabel").style("fill", function (d) {
                return config.getSetColorFromSetTypePropertyName(d.type);
              });

            })
            .attr("transform", function (d, i) {
              var posY = s.getSetTypeTranslateY(pathWrapper, i);
              return "translate(0," + posY + ")";
            });


          if (typeof s.referencePathId !== "undefined") {
            var overviewSetStatusStartX = 0;
            allSetTypes.each(function (d, i) {
              var start = that.listView.getTextWidth(config.getSetTypeFromSetPropertyName(d.type));
              if (start > overviewSetStatusStartX) {
                overviewSetStatusStartX = start;
              }
            });
            overviewSetStatusStartX += 15;
          }

          allSetTypes.each(function (setTypeWrapper) {

            var $setType = d3.select(this);

            $setType.select("text.collapseIconSmall")
              .text(setTypeWrapper.collapsed ? "\uf0da" : "\uf0dd")
              .on("click", function () {
                var collapsed = !setTypeWrapper.collapsed;
                if (d3.event.ctrlKey) {
                  listeners.notify(s.pathListUpdateTypes.COLLAPSE_ELEMENT_TYPE, {
                    type: setTypeWrapper.type,
                    collapsed: collapsed
                  });
                } else {
                  setTypeWrapper.collapsed = collapsed;
                  d3.select(this).text(setTypeWrapper.collapsed ? "\uf0da" : "\uf0dd");

                  that.updatePathList();

                }
              });

            if (typeof s.referencePathId === "undefined") {
              d3.select(this).select("g.setStatusOverview").remove();
            } else {
              if (pathWrapper.path.id !== s.referencePathId) {

                var refPathSetType = referencePathWrapper.setTypeDict[setTypeWrapper.type];
                if (refPathSetType) {

                  var numSetsInRefPath = 0;

                  var mySets = setTypeWrapper.sets.filter(function (set) {
                    return set.canBeShown();
                  });

                  mySets.forEach(function (set) {
                    if (typeof refPathSetType.setDict[set.id] !== "undefined" && refPathSetType.setDict[set.id].canBeShown()) {
                      numSetsInRefPath++;
                    }
                  });
                }


                var setOverview = $setType.select("g.setStatusOverview");
                if (setOverview.empty()) {
                  setOverview = $setType.append("g")
                    .classed("setStatusOverview", true);

                  setOverview.append("text")
                    .classed({
                      refPathStatus: true,
                      numSetsStatus: true
                    })
                    .attr({
                      x: overviewSetStatusStartX,
                      y: (s.SET_TYPE_HEIGHT - 10) / 2 + 9
                    }).style({
                    fill: "green",
                    "text-anchor": "start"
                  }).text("\uf00c");

                  setOverview.append("text")
                    .classed("numPresentSets", true)
                    .attr({
                      x: overviewSetStatusStartX + 13,
                      y: (s.SET_TYPE_HEIGHT - 10) / 2 + 9
                    }).style({
                    fill: "green"
                  });

                  setOverview.append("text")
                    .classed({
                      refPathStatus: true,
                      numNonSetsStatus: true
                    })
                    .attr({
                      y: (s.SET_TYPE_HEIGHT - 10) / 2 + 9
                    }).style({
                    fill: "red",
                    "text-anchor": "start"
                  }).text("\uf00d");

                  setOverview.append("text")
                    .classed("numNonPresentSets", true)
                    .attr({
                      y: (s.SET_TYPE_HEIGHT - 10) / 2 + 9
                    }).style({
                    fill: "red"
                  });

                  setOverview.append("title");

                }
                var numSetsTextWidth = that.listView.getTextWidth(numSetsInRefPath);

                $setType.select("g.setStatusOverview").select("text.numPresentSets")
                  .text(numSetsInRefPath);
                $setType.select("g.setStatusOverview").select("text.numNonSetsStatus")
                  .attr("x", overviewSetStatusStartX + 13 + numSetsTextWidth + 5);
                $setType.select("g.setStatusOverview").select("text.numNonPresentSets")
                  .attr("x", overviewSetStatusStartX + 24 + numSetsTextWidth + 5)
                  .text(mySets.length - numSetsInRefPath);
                $setType.select("g.setStatusOverview").select("title")
                  .text(config.getSetTypeFromSetPropertyName(setTypeWrapper.type) + ": " + numSetsInRefPath + " sets are shared with the reference path, " + (mySets.length - numSetsInRefPath) + " are not.");

              } else {
                $setType.select("g.setStatusOverview").remove();
              }
            }


            var setTypeSummaryContainer = $setType.select("g.setTypeSummary");

            var allLines = setTypeSummaryContainer.selectAll("line")
              .data(function () {
                return setTypeWrapper.relIndices;
              });
            var line = allLines.enter()
              .append("line")
              .attr({
                x1: function (d) {
                  //var pivotNodeTranslate = getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                  //var position = that.pathWrappers[d.pathIndex].nodePositions[d.relIndex];
                  return that.getNodePositionX(pathWrapper, d, true); // + config.getNodeWidth() / 2;
                }
                ,
                y1: s.SET_TYPE_HEIGHT / 2,
                x2: function (d) {
                  //var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                  //var position = that.pathWrappers[d.pathIndex].nodePositions[d.relIndex + 1];
                  //return pivotNodeTranslate + position * (config.getNodeWidth() + s.EDGE_SIZE) + config.getNodeWidth() / 2;
                  return that.getNodePositionX(pathWrapper, d + 1, true);
                },
                y2: s.SET_TYPE_HEIGHT / 2,
                stroke: config.getSetColorFromSetTypePropertyName(setTypeWrapper.type),
                "stroke-dasharray": function (d) {
                  if (!config.isSetTypeEdgeOrigin(setTypeWrapper.type)) {
                    return "0,0";
                  }
                  var edge = pathWrapper.path.edges[d];
                  return config.isNetworkEdge(edge) ? "0,0" : "10,5";
                },
                "stroke-width": function (d) {
                  var numSets = getEdgeSetCount(pathWrapper.path.edges[d], setTypeWrapper);
                  return edgeSetScale(numSets);
                }
              });

            line.append("title");

            allLines.transition()
              .attr({
                x1: function (d) {
                  return that.getNodePositionX(pathWrapper, d, true); // + config.getNodeWidth() / 2;
                },
                x2: function (d) {
                  return that.getNodePositionX(pathWrapper, d + 1, true); // + config.getNodeWidth() / 2;
                },
                stroke: config.getSetColorFromSetTypePropertyName(setTypeWrapper.type),
                "stroke-width": function (d) {
                  var numSets = getEdgeSetCount(pathWrapper.path.edges[d],
                    setTypeWrapper);
                  return edgeSetScale(numSets);
                }
              });

            allLines.each(function (relIndex) {
              var numSets = getEdgeSetCount(pathWrapper.path.edges[relIndex], setTypeWrapper);
              d3.select(this).select("title").text("Number of connecting sets: " + numSets);
            });
            allLines.exit().remove();

            var allCircles = setTypeSummaryContainer.selectAll("circle")
              .data(function () {
                return setTypeWrapper.nodeIndices;
              });

            var circle = allCircles.enter()
              .append("circle")
              .attr({
                cx: function (d) {
                  return that.getNodePositionX(pathWrapper, d, true);
                },
                cy: s.SET_TYPE_HEIGHT / 2,
                r: function (d) {
                  var numSets = getNodeSetCount(pathWrapper.path.nodes[d],
                    setTypeWrapper);
                  return numSets == 0 ? 0 : nodeSetScale(numSets);
                },
                fill: config.getSetColorFromSetTypePropertyName(setTypeWrapper.type)
              });

            circle.append("title");

            allCircles.transition()
              .attr({
                cx: function (d) {
                  return that.getNodePositionX(pathWrapper, d, true);
                },
                r: function (d) {
                  var numSets = getNodeSetCount(pathWrapper.path.nodes[d],
                    setTypeWrapper);
                  return numSets == 0 ? 0 : nodeSetScale(numSets);
                },
                fill: config.getSetColorFromSetTypePropertyName(setTypeWrapper.type)
              });

            allCircles.each(function (nodeIndex) {
              var numSets = getNodeSetCount(pathWrapper.path.nodes[nodeIndex],
                setTypeWrapper);
              d3.select(this).select("title")
                .text("Number of sets: " + numSets)
            });

            allCircles.exit().remove();


            if (setTypeWrapper.collapsed) {
              $setType.selectAll("g.set")
                .remove();
              return;
            }

            var allSets = $setType
              .selectAll("g.set")
              .data(function () {
                return setTypeWrapper.sets.filter(function (s) {
                  return s.canBeShown();
                });
              }, function (d) {
                return d.id;
              });


            var set = allSets
              .enter()
              .append("g")
              .classed("set", true)
              .on("dblclick", function (d) {
                //pathSorting.sortingStrategies.selectionSortingStrategy.setSetIds([d.set.id]);
                pathSorting.addSelectionBasedSortingStrategy(new pathSorting.SetPresenceSortingStrategy(selectionUtil.selections["set"]["selected"]));
                listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
              });

            set.append("rect")
              .classed("filler", true)
              .attr({
                x: 0,
                y: 0,
                width: "100%",
                height: s.SET_HEIGHT
              });

            set.append("text")
              .classed("setLabel", true)
              .text(function (d) {
                return setInfo.getSetLabel(d.id);
              })
              .attr({
                x: s.SET_TYPE_INDENT,
                y: s.SET_HEIGHT
              })
              .style("fill", config.getSetColorFromSetTypePropertyName(setTypeWrapper.type))
              .attr("clip-path", "url(#SetLabelClipPath)");

            set.append("title")
              .text(function (d) {
                return setInfo.getSetLabel(d.id);
              });

            set.each(function (d, i) {

              uiUtil.createTemporalMenuOverlayButton(d3.select(this), s.NODE_START, 0, true, function () {

                var setNode = setInfo.get(d.id);

                if (typeof setNode === "undefined") {
                  return [];
                }

                var items = queryUtil.getFilterOverlayItems("set", d.id);
                var linkItem = setInfo.getLinkOverlayItem(d.id);
                if (linkItem) {
                  items.push(linkItem);
                }
                return items;
              });
              //queryUtil.createAddNodeFilterButton(d3.select(this), that.parent, "set", d.set.id, s.NODE_START, 0, true);
            });

            allSets.transition()
              .attr({
                transform: function (d, i) {
                  var posY = s.getSetTranslateY(setTypeWrapper, i);
                  return "translate(0," + posY + ")";
                }
              });

            allSets.each(function () {
              d3.select(this).select("text.setLabel")
                .style("fill", config.getSetColorFromSetTypePropertyName(setTypeWrapper.type));
            });


            var setVisContainer = set.append("g")
              .classed("setVisContainer", true);


            //allSetVisContainers.attr("transform", function (d) {
            //  return that.getPivotNodeAlignedTransform(that.pathWrappers[d.pathIndex])
            //});


            allSets.each(function (setWrapper) {

              var container = d3.select(this).select("g.setVisContainer");
              var allCircles = container.selectAll("circle")
                .data(function () {
                  return setWrapper.nodeIndices;
                });

              allCircles.enter()
                .append("circle")
                .attr({
                  cy: s.SET_HEIGHT / 2,
                  r: 2,
                  fill: config.getSetColorFromSetTypePropertyName(setTypeWrapper.type)
                });

              allCircles.transition()
                .attr({
                  cx: function (d) {
                    return that.getNodePositionX(pathWrapper, d, true);
                  },
                  fill: config.getSetColorFromSetTypePropertyName(setTypeWrapper.type)
                });


              allCircles.exit().remove();


              var allLines = container.selectAll("line").
              data(function () {
                return setWrapper.relIndices;
              });

              allLines.enter()
                .append("line")
                .attr({
                  y1: s.SET_HEIGHT / 2,
                  y2: s.SET_HEIGHT / 2,
                  "stroke-dasharray": function (d) {
                    if (!config.isSetTypeEdgeOrigin(setTypeWrapper.type)) {
                      return "0,0";
                    }
                    var edge = pathWrapper.path.edges[d];
                    return config.isSetOriginOfEdge(setWrapper.id, edge) ? "0,0" : "10,5";
                  },
                  stroke: config.getSetColorFromSetTypePropertyName(setTypeWrapper.type)
                });


              allLines.transition()
                .attr({
                  x1: function (d) {
                    return that.getNodePositionX(pathWrapper, d, true);
                  },
                  x2: function (d) {
                    return that.getNodePositionX(pathWrapper, d + 1, true);
                  },
                  stroke: config.getSetColorFromSetTypePropertyName(setTypeWrapper.type)
                });

              allLines.exit().remove();

              if (typeof s.referencePathId === "undefined") {
                d3.select(this).select("text.refPathStatus").remove();
              } else {
                if (pathWrapper.path.id !== s.referencePathId) {

                  var refPathSetType = referencePathWrapper.setTypeDict[setTypeWrapper.type];
                  if (refPathSetType) {
                    var setInRefPath = refPathSetType.setDict[setWrapper.id];
                  }

                  var isSetInRefPath = typeof setInRefPath !== "undefined" && setInRefPath.canBeShown();
                  var t = d3.select(this).select("text.refPathStatus");
                  if (t.empty()) {
                    t = d3.select(this).append("text")
                      .classed("refPathStatus", true)
                      .attr({
                        x: s.NODE_START + 28,
                        y: s.SET_HEIGHT
                      });
                    t.append("title");
                  }

                  t.style({
                    fill: isSetInRefPath ? "green" : "red"
                  }).text(isSetInRefPath ? "\uf00c" : "\uf00d");
                  //t.select("title")
                  //    .text(setInfo.getSetLabel(d.set.id) + "is " + (isSetInRefPath ? "" : "not ") + " in the reference path.");

                } else {
                  d3.select(this).select("text.refPathStatus").remove();
                }
              }

            });


            allSets.exit()
              .remove();

          });

          allSetTypes.exit().remove();
        });


        selectionUtil.removeListeners(that.setSelectionListener);

        that.setSelectionListener = selectionUtil.addDefaultListener(allPathContainers, "g.set", function (d) {
            return d.id;
          },
          "set"
        );

      }
      ,

      getNodePositionX: function (pathWrapper, nodeIndex, centerPosition) {
        var pivotNodeTranslate = this.getPivotNodeAlignedTranslationX(pathWrapper);
        var position = pathWrapper.nodePositions[nodeIndex];
        return pivotNodeTranslate + position * (config.getNodeWidth() + s.EDGE_SIZE) + (centerPosition ? config.getNodeWidth() / 2 : 0);
      }

      ,

      renderLineGrid: function () {
        var gridStrokeColor = "white";
        var gridFillColor = "rgba(0,0,0,0)";

        var gridStyle = {
          stroke: "white",
          fill: "rgba(0,0,0,0)",
          "shape-rendering": "crispEdges"
        };

        var that = this;

        var lineGridContainer = this.parent.select("g.lineGridContainer");

        var allBgPathWrappers = lineGridContainer.selectAll("g.bgPathWrapper" + this.id)
          .data(that.pathWrappers, function (d) {
            return d.path.id
          });

        var bgPathWrapper = allBgPathWrappers.enter()
          .append("g")
          .classed("bgPathWrapper" + this.id, true)
          .attr({
            transform: function (d, i) {
              var translateY = s.getPathContainerTranslateY(that.pathWrappers, i);
              return "translate(0," + translateY + ")";
            }
          });

        bgPathWrapper.each(function (pathWrapper, index) {
          var item = d3.select(this);
          //item.append("rect")
          //  .classed("bgPathItem", true)
          //  .attr({
          //    x: 0,
          //    y: 0,
          //    width: that.getWidth(),
          //    height: pathWrapper.getHeight()
          //  })
          //  .style({
          //    stroke: "black",
          //    fill: "rgba(0,0,0,0)"
          //  });

          item.append("rect")
            .classed("bgPath", true)
            .attr({
              x: 0,
              y: 0,
              width: "100%",
              height: s.PATH_HEIGHT
            })
            .style(gridStyle);
        });

        allBgPathWrappers.transition()
          .attr({
            transform: function (d, i) {
              var translateY = s.getPathContainerTranslateY(that.pathWrappers, i);
              return "translate(0," + translateY + ")";
            }
          });


        allBgPathWrappers.each(function (pathWrapper, index) {
          var item = d3.select(this);

          var allBgSetTypes = item.selectAll("g.bgSetType").data(pathWrapper.setTypes, function (d) {
            return d.id;
          });

          var bgSetTypes = allBgSetTypes.enter().append("g")
            .classed("bgSetType", true)
            .attr({
              transform: function (d, i) {
                return "translate(0," + s.getSetTypeTranslateY(pathWrapper, i) + ")"
              }
            });

          bgSetTypes.each(function (setType, setTypeIndex) {
            var bgSetType = d3.select(this);
            bgSetType.attr({
              transform: "translate(0," + s.getSetTypeTranslateY(pathWrapper, setTypeIndex) + ")"
            });

            bgSetType.append("rect")
              .classed("bgSetTypeSummary", true)
              .attr({
                x: 0,
                y: 0,
                width: "100%",
                height: s.SET_TYPE_HEIGHT
              })
              .style(gridStyle);
          });

          allBgSetTypes.each(function (setType, setTypeIndex) {

            var bgSetType = d3.select(this);

            bgSetType.transition()
              .attr({
                transform: "translate(0," + s.getSetTypeTranslateY(pathWrapper, setTypeIndex) + ")"
              });

            bgSetType.select("rect.bgSetTypeSummary")
              .attr({
                height: s.SET_TYPE_HEIGHT
              });

            var allBgSets = bgSetType.selectAll("rect.bgSet").data(setType.sets.filter(function (s) {
              return s.canBeShown() && !setType.collapsed;
            }), function (d) {
              return d.id;
            });

            allBgSets.enter()
              .append("rect")
              .classed("bgSet", true)
              .attr({
                x: 0,
                y: function (d, i) {
                  return s.getSetTranslateY(setType, i);
                },
                width: "100%",
                height: function (d, i) {
                  return d.getHeight();
                }
              })
              .style(gridStyle);

            allBgSets.transition()
              .attr({
                y: function (d, i) {
                  return s.getSetTranslateY(setType, i);
                },
                height: function (d, i) {
                  return d.getHeight();
                }
              });

            allBgSets.exit().remove();


          });

          allBgSetTypes.exit().remove();

          var allBgNodeProperties = item.selectAll("rect.bgNodeProperty").data(pathWrapper.properties, function (d) {
            return d.name
          });

          var bgNodeProperties = allBgNodeProperties.enter().append("rect")
            .classed("bgNodeProperty", true);


          bgNodeProperties.each(function (property) {
            d3.select(this).attr({
                transform: "translate(0," + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + property.getPosYRelativeToParent(pathWrapper.properties)) + ")",
                x: 0,
                y: 0,
                width: "100%",
                height: property.getBaseHeight()
              })
              .style(gridStyle);

          });

          allBgNodeProperties.each(function (property) {
            d3.select(this).attr({
              transform: "translate(0," + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + property.getPosYRelativeToParent(pathWrapper.properties)) + ")",
              height: property.getBaseHeight()
            });
          });


          var allBgDatasets = item.selectAll("g.bgDataset").data(pathWrapper.datasets, function (d) {
            return d.id;
          });

          var bgDatasets = allBgDatasets.enter().append("g")
            .classed("bgDataset", true);

          bgDatasets.each(function (dataset, datasetIndex) {
            var bgDataset = d3.select(this);
            bgDataset.attr({
              transform: "translate(0," + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + pathWrapper.getPropertyHeight() + dataset.getPosYRelativeToParent(pathWrapper.datasets)) + ")"
            });

            bgDataset.append("rect")
              .classed("bgDatasetSummary", true)
              .attr({
                x: 0,
                y: 0,
                width: "100%",
                height: dataset.getBaseHeight()
              })
              .style(gridStyle);
          });

          allBgDatasets.each(function (dataset, datasetIndex) {

            var bgDataset = d3.select(this);

            bgDataset.transition()
              .attr({
                transform: "translate(0," + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + pathWrapper.getPropertyHeight() + dataset.getPosYRelativeToParent(pathWrapper.datasets)) + ")"
              });

            bgDataset.select("rect.bgDatasetSummary")
              .attr({
                height: dataset.getBaseHeight()
              });

            var allGroups = bgDataset.selectAll("rect.bgGroup").data(dataset.getVisibleChildren(), function (d) {
              return d.name;
            });

            allGroups.enter()
              .append("rect")
              .classed("bgGroup", true)
              .attr({
                x: 0,
                y: function (d) {
                  return d.getPosYRelativeToParent();
                },
                width: "100%",
                height: function (d) {
                  return d.getHeight();
                }
              })
              .style(gridStyle);

            allGroups.transition()
              .attr({
                y: function (d) {
                  return d.getPosYRelativeToParent();
                },
                height: function (d) {
                  return d.getHeight();
                }
              });

            allGroups.exit().remove();


          });

          allBgDatasets.exit().remove();
        });

        allBgPathWrappers.exit().remove();
      }
      ,

      renderNodeProperties: function () {
        var that = this;

        var allPropertyGroups = this.parent.selectAll("g.pathContainer g.propertyGroup")
          .data(this.pathWrappers, getPathKey);

        allPropertyGroups.each(function (pathWrapper) {

          d3.select(this).transition().
          attr({
            transform: "translate(0, " + (s.PATH_HEIGHT + pathWrapper.getSetHeight()) + ")"
          });

          var allProperties = d3.select(this).selectAll("g.property")
            .data(pathWrapper.properties, function (d) {
              return d.name
            });

          var properties = allProperties.enter().append("g")
            .classed("property", true);

          properties.each(function (property) {

            var prop = d3.select(this);
            prop.attr({
              transform: "translate(0," + property.getPosYRelativeToParent(pathWrapper.properties) + ")"
            });

            //prop.append("rect")
            //  .attr({
            //    x: 0,
            //    y: 0,
            //    width: "100%",
            //    height: property.getBaseHeight()
            //  }).style({stroke: "black", fill:"white"});
            prop.append("rect")
              .classed("filler", true)
              .attr({
                x: 0,
                y:0,
                width: "100%",
                height: property.getBaseHeight()
              });

            prop.append("text")
              .classed("propertyLabel", true)
              .text(property.name)
              .attr("x", 10)
              .attr("y", (property.getBaseHeight() - 10) / 2 + 9)
              .style("fill", config.getNodePropertyColorFromPropertyName(property.name))
              .attr("clip-path", "url(#SetLabelClipPath)")
              .append("title").text(property.name);

            uiUtil.createTemporalMenuOverlayButton(prop, s.NODE_START, 0, true, function () {

              function isPropertyMapped(){
                 return s.onNodeMapper instanceof pathUtil.PropertyMapper && s.onNodeMapper.propertyName === property.name;
              }

              return [{
                text: isPropertyMapped() ? "Unmap from nodes" : "Map to nodes",
                //icon: "\uf276",
                callback: function () {

                  if (!isPropertyMapped()) {
                    s.onNodeMapper = new pathUtil.PropertyMapper(property.name, function () {
                      return pathData.numericalPropertyDomains[property.name];
                    });
                    s.showOnNodeMapping = true;
                  } else {
                    s.onNodeMapper = {};
                     s.showOnNodeMapping = false;
                  }


                  listeners.notify(listeners.updateType.UPDATE_ON_NODE_MAPPING, s.showOnNodeMapping);
                }
              }];
            });

          });

          allProperties.each(function (property) {
            var prop = d3.select(this);
            prop.transition()
              .attr({
                transform: "translate(0," + property.getPosYRelativeToParent(pathWrapper.properties) + ")"
              });

            prop.select("text.propertyLabel")
              .style("fill", config.getNodePropertyColorFromPropertyName(property.name));

            var allBars = prop.selectAll("g.bar").data(pathWrapper.path.nodes, function (d) {
              return d.id
            });

            var bars = allBars.enter().append("g")
              .classed("bar", true);

            bars.each(function (node, nodeIndex) {

              var bar = d3.select(this);

              var value = node.properties[property.name];

              if (typeof value !== "undefined") {

                var posX = that.getNodePositionX(pathWrapper, nodeIndex, false);
                var scale = d3.scale.linear().domain(pathData.numericalPropertyDomains[property.name]).range([0, config.getNodeWidth()]);

                bar.append("rect")
                  .classed("valueBg", true)
                  .attr({
                    x: posX,
                    y: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2,
                    width: scale.range()[1],
                    height: s.DEFAULT_BAR_SIZE
                  })
                  .style({
                    fill: "white"
                  });

                bar.append("rect")
                  .classed("value", true)
                  .attr({
                    x: posX + (value < 0 ? scale(value) : scale(0)),
                    y: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2,
                    fill: config.getNodePropertyColorFromPropertyName(property.name),
                    width: Math.abs(scale(0) - scale(value)),
                    height: s.DEFAULT_BAR_SIZE
                  });

                bar.append("rect")
                  .classed("valueFrame", true)
                  .attr({
                    x: posX,
                    y: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2,
                    width: scale.range()[1],
                    height: s.DEFAULT_BAR_SIZE
                  })
                  .style({
                    "shape-rendering": "crispEdges",
                    fill: "rgba(0,0,0,0)",
                    stroke: "rgb(80,80,80)"
                  });

                bar.append("line")
                  .classed("zero", true)
                  .attr({
                    x1: posX + scale(0),
                    y1: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2 - 4,
                    x2: posX + scale(0),
                    y2: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2 + 4
                  })
                  .style({
                    "opacity": (scale.domain()[0] < 0 && scale.domain()[1] > 0) ? 1 : 0,
                    "shape-rendering": "crispEdges",
                    stroke: "rgb(80,80,80)"
                  });

                bar.append("title").text(property.name + ": " + uiUtil.formatNumber(value));
              }

            });

            allBars.each(function (node, nodeIndex) {
              var value = node.properties[property.name];

              if (typeof value !== "undefined") {
                var bar = d3.select(this);

                var posX = that.getNodePositionX(pathWrapper, nodeIndex, false);
                var scale = d3.scale.linear().domain(pathData.numericalPropertyDomains[property.name]).range([0, config.getNodeWidth()]);
                var domain = scale.domain();
                var range = scale.range();


                bar.select("rect.valueBg").transition()
                  .attr({
                    x: posX,
                    y: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2,
                    width: scale.range()[1]
                  });

                bar.select("rect.value").transition()
                  .attr({
                    x: posX + (node.properties < 0 ? scale(value) : scale(0)),
                    y: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2,
                    width: Math.abs(scale(0) - scale(value)),
                    fill: config.getNodePropertyColorFromPropertyName(property.name)
                  });

                bar.select("rect.valueFrame").transition()
                  .attr({
                    x: posX,
                    y: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2,
                    width: scale.range()[1]
                  });

                bar.select("line.zero").transition()
                  .attr({
                    x1: posX + scale(0),
                    y1: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2 - 4,
                    x2: posX + scale(0),
                    y2: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2 + 4
                  })
                  .style({
                    "opacity": (scale.domain()[0] < 0 && scale.domain()[1] > 0) ? 1 : 0
                  });
              }
            });

            allBars.exit().remove();


          });

          allProperties.exit().remove();
        });


      }
      ,

      renderPaths: function () {

        var that = this;

        var comparator = pathSorting.sortingManager.currentComparator;


        this.calcCrossConnections();
        this.calcNodePositions();

        this.renderLineGrid();
        this.renderCrossConnections();

        that.updateDataBinding();


        var allPathContainers = that.parent.selectAll("g.pathContainer")
          .data(that.pathWrappers, getPathKey);

        allPathContainers
          .transition()
          .attr("transform", getPathContainerTransformFunction(that.pathWrappers));


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
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", "100%")
          .attr("height", s.PATH_HEIGHT)
          .on("dblclick", function (d) {
            //pathSorting.sortingStrategies.selectionSortingStrategy.setPathIds(selectionUtil.selections["path"]["selected"]);
            pathSorting.addSelectionBasedSortingStrategy(new pathSorting.PathPresenceSortingStrategy(selectionUtil.selections["path"]["selected"]));
            listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
          });
        //.on("click", function(d) {
        //  console.log(d.path.id);
        //});

        p.append("text")
          .classed("pathRank", true)
          .attr({
            x: 5,
            y: s.PATH_HEIGHT / 2 + 5
          })
          .text(function (d) {
            return d.rank;
          });

        var l = selectionUtil.addDefaultListener(pathContainer, "g.path", function (d) {
            return d.path.id;
          },
          "path"
        );
        that.selectionListeners.push(l);

        pathContainer.each(function (pathWrapper) {
          var parent = d3.select(this).select("g.path");

          uiUtil.createTemporalOverlayButton(parent, getToggleReferencePathCallback(pathWrapper, allPathContainers), "\uf13d", 50, (s.PATH_HEIGHT - uiUtil.NORMAL_BUTTON_SIZE) / 2, false, true, "Toggle reference path");

        });


        var edgeGroup = p.append("g")
          .attr("class", "edgeGroup");
        //.attr("transform", function (d) {
        //  return that.getPivotNodeAlignedTransform(d)
        //});


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

        edge.append("marker")
          .attr("id", function (d) {
            return "arrowRight" + that.pathWrappers[d.pathIndex].path.id + "_" + d.edge.id;
          })
          .attr("viewBox", "0 0 10 10")
          .attr("refX", "9")
          .attr("refY", "5")
          .attr("markerUnits", "strokeWidth")
          .attr("markerWidth", "8")
          .attr("markerHeight", "6")
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M 0 0 L 10 5 L 0 10 z");

        edge.append("line")
          .attr("y1", s.V_SPACING + s.NODE_HEIGHT / 2)
          .attr("y2", s.V_SPACING + s.NODE_HEIGHT / 2)
          .attr("marker-end", function (d, i) {
            if (!config.isNetworkEdge(d.edge))
              return "";
            return (isSourceNodeLeft(that.pathWrappers[d.pathIndex].path.nodes, d.edge, i)) ? "url(#arrowRight" + that.pathWrappers[d.pathIndex].path.id + "_" + d.edge.id + ")" : "";
          })
          .attr("marker-start", function (d, i) {
            if (!config.isNetworkEdge(d.edge))
              return "";
            return ( isSourceNodeLeft(that.pathWrappers[d.pathIndex].path.nodes, d.edge, i)
            )
              ? "" : "url(#arrowRight" + that.pathWrappers[d.pathIndex].path.id + "_" + d.edge.id + ")";
          })
          .style({
            "stroke-dasharray": function (d) {
              return (config.isSetEdgesOnly() || config.isNetworkEdge(d.edge)) ? "0,0" : "10,5";
            }
          });
        //.attr("display", function (d) {
        //  return config.isNetworkEdge(d.edge) ? "inline" : "none";
        //});

        allPathContainers.selectAll("g.path").selectAll("g.edgeGroup").selectAll("g.edge line")
          .data(function (pathWrapper, i) {
            return pathWrapper.path.edges.map(function (edge) {
              return {edge: edge, pathIndex: i};
            });
          });

        allPathContainers.each(function (d) {
          d3.select(this).selectAll("g.path g.edgeGroup g.edge line").transition()
            .attr({
              x1: function (d, i) {
                var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                var position = that.pathWrappers[d.pathIndex].nodePositions[i];
                return pivotNodeTranslate + position * (config.getNodeWidth() + s.EDGE_SIZE);
              },
              x2: function (d, i) {
                var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                var position = that.pathWrappers[d.pathIndex].nodePositions[i + 1];
                return pivotNodeTranslate + position * (config.getNodeWidth() + s.EDGE_SIZE);
              }
            });
        });


        var nodeGroup = p.append("g")
          .attr("class", "nodeGroup");
        //.attr("transform", function (d) {
        //  return that.getPivotNodeAlignedTransform(d)
        //});

        var allNodes = allPathContainers.selectAll("g.path").selectAll("g.nodeGroup").selectAll("g.node")
          .data(function (pathWrapper, i) {
            return pathWrapper.path.nodes.map(function (node) {
              return {node: node, pathIndex: i};
            });
          });


        var node = allNodes.enter()
          .append("g")
          .classed("node", true)
          .on("dblclick.align", function (d) {
            //pathSorting.sortingStrategies.selectionSortingStrategy.setNodeIds([d.node.id]);
            that.setPivotNode(d.node.id);
            pathSorting.addSelectionBasedSortingStrategy(new pathSorting.NodePresenceSortingStrategy(selectionUtil.selections["node"]["selected"]));
            listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
          });

        var l = selectionUtil.addDefaultListener(nodeGroup, "g.node", function (d) {
            return d.node.id;
          },
          "node"
        );
        that.selectionListeners.push(l);

        node.each(function (d) {
          pathUtil.renderNode(d3.select(this), d.node, 0, 0, config.getNodeWidth(), s.NODE_HEIGHT, "url(#pathNodeClipPath)", function (text) {
            return that.listView.getTextWidth(text);
          }, pathUtil.getDefaultNodeOverlayItems(d.node), false);
        });

        var referencePath = dataStore.getPath(s.referencePathId);

        allNodes
          .transition()
          .attr("transform", function (d, i) {
            var position = that.pathWrappers[d.pathIndex].nodePositions[i];
            var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
            return "translate(" + (pivotNodeTranslate + position * (config.getNodeWidth() + s.EDGE_SIZE)) + "," + s.V_SPACING + ")";
          })
          .each(function (node, nodeIndex) {

              pathUtil.updateNode(d3.select(this), node.node, 0, 0, config.getNodeWidth(), s.NODE_HEIGHT, function (text) {
                return that.listView.getTextWidth(text);
              }, pathUtil.getDefaultNodeOverlayItems(node.node));

              if (typeof s.referencePathId === "undefined") {
                d3.select(this).select("text.refPathStatus").remove();
                d3.select(this).select("text.refPathPosDiff").remove();
              } else {

                if (that.pathWrappers[node.pathIndex].path.id !== s.referencePathId) {
                  var nodeIndexInRefPath = pathUtil.indexOfNodeInPath(node.node, referencePath);
                  var t = d3.select(this).select("text.refPathStatus");
                  if (t.empty()) {
                    t = d3.select(this).append("text")
                      .classed("refPathStatus", true)
                      .attr({
                        x: -2,
                        y: s.NODE_HEIGHT / 2 - 4
                      });
                  }

                  t.style({
                    fill: nodeIndexInRefPath >= 0 ? "green" : "red"
                  }).text(nodeIndexInRefPath >= 0 ? "\uf00c" : "\uf00d");

                  var nodePosDiff = nodeIndex - nodeIndexInRefPath;

                  if (nodeIndexInRefPath >= 0 && nodePosDiff !== 0) {
                    var diffText = d3.select(this).select("text.refPathPosDiff");
                    if (diffText.empty()) {
                      diffText = d3.select(this).append("text")
                        .classed("refPathPosDiff", true)
                        .attr({
                          x: -2,
                          y: s.NODE_HEIGHT + 2
                        });
                    }

                    diffText.style({
                      fill: "red",
                      "text-anchor": "end"
                    }).text((nodePosDiff > 0 ? "+" : "") + nodePosDiff);
                  } else {
                    d3.select(this).select("text.refPathPosDiff").remove();
                  }

                } else {
                  d3.select(this).select("text.refPathStatus").remove();
                  d3.select(this).select("text.refPathPosDiff").remove();
                }
              }
            }
          );


        pathContainer.append("g")
          .attr("class", "setGroup");

        pathContainer.append("g")
          .attr("class", "propertyGroup");

        pathContainer.append("g")
          .attr("class", "datasetGroup");


        that.renderSets(allPathContainers);

        that.renderNodeProperties();

        that.datasetRenderer.render();

        columns.renderColumns(that.parent, that.pathWrappers);

        that.parent.selectAll("text.pathRank")
          .data(that.pathWrappers, getPathKey)
          .text(function (d) {
            return d.rank;
          });

        this.updatePathList();

        allPathContainers.exit()
          .transition()
          .attr("transform", "translate(0," + 2000 + ")")
          .remove();

        pathContainer.selectAll("rect.pathContainerBackground").transition()
          .duration(800)
          .style("opacity", 0);

      }

    }
    ;


    return PathList;
  }
)
;
