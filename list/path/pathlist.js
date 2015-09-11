define(['jquery', 'd3', '../../listeners', '../../sorting', '../../setinfo', '../../selectionutil',
        '../pathsorting', '../../pathutil', '../../query/pathquery', '../../datastore', '../../config', '../../listoverlay',
        '../../query/queryview', '../../query/queryutil', '../../hierarchyelements', './settings', './datasetrenderer', '../../settings/visibilitysettings', '../../uiutil', './column'],
    function ($, d3, listeners, sorting, setInfo, selectionUtil, pathSorting, pathUtil, pathQuery, dataStore, config, ListOverlay, queryView, queryUtil, hierarchyElements, s, dr, vs, uiUtil, columns) {
        'use strict';


        var currentSetTypeId = 0;

        function SetRep(setId, type) {
            this.id = setId;
            this.nodeIndices = [];
            this.relIndices = [];
            this.setType = type;
        }

        SetRep.prototype = {
            getHeight: function () {
                return s.SET_HEIGHT;
            },

            //Defines whether this set can be shown. Only considers own data to determine that, not e.g. whether its set type is collapsed.
            canBeShown: function () {
                return vs.isShowNonEdgeSets() || (!vs.isShowNonEdgeSets() && this.relIndices.length > 0);
            }
        };

        function SetType(type) {
            this.id = currentSetTypeId++;
            this.type = type;
            this.sets = [];
            this.setDict = {};
            this.collapsed = true;
            this.nodeIndices = [];
            this.relIndices = [];
        }

        SetType.prototype = {
            getHeight: function () {
                var height = s.SET_TYPE_HEIGHT;
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
                return vs.isShowNonEdgeSets() || (!vs.isShowNonEdgeSets() && this.relIndices.length > 0);
            }
        };

        function NodeProperty(name) {
            hierarchyElements.HierarchyElement.call(this);
            this.name = name;
        }

        NodeProperty.prototype = Object.create(hierarchyElements.HierarchyElement.prototype);

        NodeProperty.prototype.getBaseHeight = function () {
            return s.SET_TYPE_HEIGHT;
        };


        function PathWrapper(path) {
            this.path = path;
            this.nodePositions = d3.range(0, path.nodes.length - 1);
            this.rank = "?.";
            this.datasets = [];
            this.addPathSets(path);
            this.addPathProperties(path);
            this.updateDatasets();
        }

        PathWrapper.prototype = {

            getHeight: function () {
                var height = s.PATH_HEIGHT;
                height += this.getSetHeight();
                height += this.getPropertyHeight();
                height += this.getDatasetHeight();
                return height;
            },

            getSetHeight: function () {
                var height = 0;
                this.setTypes.forEach(function (setType) {
                    if (setType.canBeShown()) {
                        height += setType.getHeight();
                    }
                });
                return height;
            },

            getPropertyHeight: function () {
                var height = 0;
                this.properties.forEach(function (prop) {
                    if (prop.canBeShown()) {
                        height += prop.getHeight();
                    }
                });
                return height;
            },

            getDatasetHeight: function () {
                var height = 0;
                this.datasets.forEach(function (dataset) {
                    if (dataset.canBeShown()) {
                        height += dataset.getHeight();
                    }
                });
                return height;
            },

            getWidth: function () {
                return s.NODE_START + this.path.nodes.length * s.NODE_WIDTH + this.path.edges.length * s.EDGE_SIZE;
            },

            updateDatasets: function () {
                var datasets = dataStore.getDataSets();
                var that = this;


                datasets.forEach(function (dataset) {
                        var d = new dr.DatasetWrapper(dataset, that);
                        var exists = false;
                        //Use existing wrapper if present
                        that.datasets.forEach(function (wrapper) {
                            if (wrapper.id === dataset.info.id) {
                                d = wrapper;
                                //clear children
                                d.children = [];
                                exists = true;
                            }
                        });

                        if (!exists) {
                            that.datasets.push(d);
                        }

                        if (dataset.info.type === "matrix") {
                            Object.keys(dataset.groups).forEach(function (group) {
                                var g = new dr.DataGroupWrapper(group, d, that);
                                d.children.push(g);
                            });
                        }
                        else if (dataset.info.type === "table") {
                            dataset.info.columns.forEach(function (col) {
                                if (col.value.type === "real") {
                                    var c = new dr.TableColumnWrapper(col, d, that);
                                    d.children.push(c);
                                }
                            });
                        }

                    }
                );


            },

            addPathProperties: function (path) {
                var numericalProperties = {};

                path.nodes.forEach(function (node) {
                    var props = config.getNumericalNodeProperties(node);
                    props.forEach(function (prop) {
                        if (!numericalProperties[prop]) {
                            numericalProperties[prop] = new NodeProperty(prop);
                        }
                    });
                });

                this.properties = Object.keys(numericalProperties).map(function (key) {
                    return numericalProperties[key];
                });

            }

            ,

            addPathSets: function (path) {

                var setTypeDict = {};
                var setTypeList = [];

                for (var i = 0; i < path.nodes.length; i++) {
                    var node = path.nodes[i];

                    pathUtil.forEachNodeSet(node, function (setType, setId) {
                        addSetForNode(setType, setId, i);
                    });
                }


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

                //setTypeList.forEach(function (setType) {
                //  delete setType.setDict;
                //});

                this.setTypes = setTypeList;
            }
        };

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


//var allPaths = [];

        //function getPathContainerTranslateY(pathWrappers, pathIndex) {
        //  var posY = 0;
        //  for (var index = 0; index < pathIndex; index++) {
        //    posY += pathWrappers[index].getHeight() + s.PATH_SPACING;
        //  }
        //  return posY;
        //}

        function getToggleReferencePathCallback(wrapper, allPathContainers) {
            return function (permanent) {
                if (!permanent) {
                    uiUtil.referencePathId = wrapper.path.id;
                    allPathContainers.each(function (pathWrapper) {
                        if (pathWrapper.path.id !== uiUtil.referencePathId) {
                            var parent = d3.select(this).select("g.path");

                            //FIXME A little hacky
                            $(parent[0]).off("mouseenter.overlay");
                            $(parent[0]).off("mouseleave.overlay");
                            parent.selectAll("g.overlayButton").remove();
                            uiUtil.createTemporalOverlayButton(parent, getToggleReferencePathCallback(pathWrapper, allPathContainers), "\uf13d", 50, (s.PATH_HEIGHT - uiUtil.NORMAL_BUTTON_SIZE) / 2, false, true, "Toggle reference path");
                        }
                    });

                } else {
                    delete uiUtil.referencePathId;
                }
            };
        }

        function getPathContainerTransformFunction(pathWrappers) {
            return function (d, i) {
                return "translate(0," + s.getPathContainerTranslateY(pathWrappers, i) + ")";
            };
        }

        function getSetTypeTransformFunction(pathWrappers) {

            return function (d, i) {
                var pathWrapper = pathWrappers[d.pathIndex];

                var posY = s.getSetTypeTranslateY(pathWrapper, i);

                return "translate(0," + posY + ")";
            }
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
                    return setInfo.getSetLabel(d.set.id);
                });

            svg.selectAll("g.pathContainer g.setGroup g.set title")
                .text(function (d) {
                    return setInfo.getSetLabel(d.set.id);
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
            this.paths = [];
            this.pathWrappers = [];
            this.updateListeners = [];
            this.setSelectionListener = 0;
            this.connectionSelectionListener = 0;
            this.stubSelectionListener = 0;
            this.selectionListeners = [];
            this.crossConnections = [];
            this.connectionStubs = [];
            this.maxNumNodeSets = 0;
            this.maxNumEdgeSets = 0;
            this.pivotNodeId = -1;
            this.pivotNodeIndex = 0;
            this.numericalPropertyScales = {};
            this.datasetRenderer = new dr.DatasetRenderer(this);
            var that = this;

            columns.init(this);

            this.updateDatasetsListener = function () {
                that.pathWrappers.forEach(function (pathWrapper) {
                    pathWrapper.updateDatasets();
                });
                that.renderPaths();
            };

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
                that.updatePathList();
            };

            this.listUpdateListener = function (updatedObject) {
                if (typeof that.parent === "undefined") {
                    return;
                }

                that.updatePathList();
            };

            this.removeFilterChangedListener = function (remove) {
                if (typeof that.parent === "undefined") {
                    return;
                }

                if (remove) {
                    that.updatePathWrappersToFilter();
                } else {
                    that.addAllPaths();
                }
                that.notifyUpdateListeners();
            };

            this.queryChangedListener = function (query) {
                if (typeof that.parent === "undefined") {
                    return;
                }

                if (pathQuery.isRemoveFilteredPaths() || pathQuery.isRemoteQuery()) {
                    that.updatePathWrappersToFilter();
                    that.notifyUpdateListeners();
                } else {
                    that.updatePathList();
                }
            };

            this.sortUpdateListener = function (comparator) {
                //sortingManager.sort(that.pathWrappers, that.parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers), sortStrategyChain);

                if (typeof that.parent === "undefined") {
                    return;
                }

                //that.sortPaths(comparator);

                that.renderPaths();
            };

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

                //var selectedNodes = {};
                //var selectedEdges = {};
                //selectedIds.forEach(function (pathId) {
                //
                //  that.pathWrappers.forEach(function(pathWrapper){
                //    var path = pathWrapper.path;
                //    if (path.id === pathId) {
                //      path.nodes.forEach(function (node) {
                //        selectedNodes[node.id.toString()] = true;
                //      });
                //      path.edges.forEach(function (edge) {
                //        selectedEdges[edge.id.toString()] = true;
                //      });
                //    }
                //  });
                //});

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

            }
        }

        PathList.prototype = {

            sortPaths: function (comparator) {
                var that = this;

                that.pathWrappers.sort(comparator);

                var rankingStrategyChain = Object.create(pathSorting.sortingManager.currentStrategyChain);
                rankingStrategyChain.splice(rankingStrategyChain.length - 1, 1);

                var rankComparator = sorting.getComparatorFromStrategyChain(rankingStrategyChain);

                var currentRank = 0;
                var rankCounter = 0;
                var prevWrapper = 0;
                that.pathWrappers.forEach(function (pathWrapper) {
                    rankCounter++;
                    if (prevWrapper === 0) {
                        currentRank = rankCounter;
                    } else {
                        if (rankComparator(prevWrapper, pathWrapper) !== 0) {
                            currentRank = rankCounter;
                        }
                    }
                    pathWrapper.rank = currentRank.toString() + ".";
                    prevWrapper = pathWrapper;
                    //} else {
                    //}

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
                s.NODE_WIDTH = config.getNodeWidth();
                s.NODE_HEIGHT = config.getNodeHeight();
                s.EDGE_SIZE = config.getEdgeSize();
                listeners.add(updateSets, listeners.updateType.SET_INFO_UPDATE);
                listeners.add(this.collapseElementListener, s.pathListUpdateTypes.COLLAPSE_ELEMENT_TYPE);
                listeners.add(this.setVisibilityUpdateListener, vs.updateTypes.UPDATE_NODE_SET_VISIBILITY);
                listeners.add(this.alignPathNodesUpdateListener, s.pathListUpdateTypes.ALIGN_PATH_NODES);
                listeners.add(this.alignColumnsUpdateListener, s.pathListUpdateTypes.ALIGN_COLUMNS);
                listeners.add(this.queryChangedListener, listeners.updateType.QUERY_UPDATE);
                listeners.add(this.removeFilterChangedListener, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);
                listeners.add(this.tiltAttributesListener, s.pathListUpdateTypes.TILT_ATTRIBUTES);
                listeners.add(this.sortUpdateListener, pathSorting.updateType);
                listeners.add(this.updateDatasetsListener, listeners.updateType.DATASET_UPDATE);

                selectionUtil.addListener("path", this.pathSelectionUpdateListener);
            },

            updatePathWrappersToFilter: function () {
                var pathWrappersToRemove = [];

                var that = this;

                if (pathQuery.isRemoteQuery()) {
                    for (var i = 0; i < this.paths.length; i++) {
                        var path = this.paths[i];
                        if (pathQuery.isPathFiltered(path.id)) {
                            this.paths.splice(i, 1);
                            i--;
                        }
                    }
                }

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

                this.updateNumericalPropertyScales();
                this.updateMaxSets();

                this.renderPaths();
            },

            getNodeSetScale: function () {
                return d3.scale.linear().domain([1, this.maxNumNodeSets]).range([Math.sqrt(16 / Math.PI), Math.sqrt(Math.min(128, 16 * this.maxNumNodeSets) / Math.PI)]);
            },

            getEdgeSetScale: function () {
                return d3.scale.linear().domain([1, this.maxNumEdgeSets]).range([1, Math.min(this.maxNumEdgeSets, 6)]);
            },

            updateMaxSets: function () {
                this.maxNumEdgeSets = 0;
                this.maxNumNodeSets = 0;

                var that = this;
                this.pathWrappers.forEach(function (pathWrapper) {
                    that.updateMaxSetsForPathWrapper(pathWrapper);
                });
            },

            updateNumericalPropertyScales: function () {
                var that = this;
                this.numericalPropertyScales = {};
                this.pathWrappers.forEach(function (pathWrapper) {
                    that.updateNumericalPropertyScalesForPathWrapper(pathWrapper);
                });

            },

            updateNumericalPropertyScalesForPathWrapper: function (pathWrapper) {
                var that = this;
                pathWrapper.path.nodes.forEach(function (node) {

                    config.getNumericalNodeProperties(node).forEach(function (property) {
                        var scale = that.numericalPropertyScales[property];
                        var value = node.properties[property];

                        if (!scale) {
                            that.numericalPropertyScales[property] = d3.scale.linear().domain([Math.min(0, value), Math.max(0, value)]).range([0, s.NODE_WIDTH]);
                        } else {
                            scale.domain([Math.min(0, Math.min(scale.domain()[0], value)), Math.max(0, Math.max(scale.domain()[1], value))]);
                        }
                    });

                });
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
                    that.addPathAsPathWrapper(path);
                });

                this.renderPaths();
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
                listeners.remove(this.queryChangedListener, listeners.updateType.QUERY_UPDATE);
                listeners.remove(this.removeFilterChangedListener, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);
                listeners.remove(updateSets, listeners.updateType.SET_INFO_UPDATE);
                listeners.remove(this.tiltAttributesListener, s.pathListUpdateTypes.TILT_ATTRIBUTES);
                listeners.remove(this.sortUpdateListener, pathSorting.updateType);
                listeners.remove(this.updateDatasetsListener, listeners.updateType.DATASET_UPDATE);

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
                currentSetTypeId = 0;

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
                this.paths = [];
                this.pathWrappers = [];
                this.maxNumEdgeSets = 0;
                this.maxNumNodeSets = 0;
                this.crossConnections = [];
                this.connectionStubs = [];
                that.numericalPropertyScales = {};
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

            setPaths: function (paths) {
                var that = this;
                this.pathWrappers = [];
                this.paths = paths;
                paths.forEach(function (path) {
                    that.addPathAsPathWrapper(path);
                })
            },

            updateMaxSetsForPathWrapper: function (pathWrapper) {
                var that = this;

                pathWrapper.setTypes.forEach(function (setTypeWrapper) {
                    pathWrapper.path.nodes.forEach(function (node) {
                        var numNodeSets = getNodeSetCount(node, setTypeWrapper);
                        if (numNodeSets > that.maxNumNodeSets) {
                            that.maxNumNodeSets = numNodeSets;
                        }
                    });

                    pathWrapper.path.edges.forEach(function (edge) {
                        var numEdgeSets = getEdgeSetCount(edge, setTypeWrapper);
                        if (numEdgeSets > that.maxNumEdgeSets) {
                            that.maxNumEdgeSets = numEdgeSets;
                        }
                    });
                });
            },

            addPathAsPathWrapper: function (path) {
                if (!(pathQuery.isPathFiltered(path.id) && pathQuery.isRemoveFilteredPaths())) {
                    var pathWrapper = new PathWrapper(path);
                    this.pathWrappers.push(pathWrapper);
                    this.updateMaxSetsForPathWrapper(pathWrapper);
                    this.updateNumericalPropertyScalesForPathWrapper(pathWrapper);
                }

            },

            addPath: function (path) {
                this.paths.push(path);
                this.addPathAsPathWrapper(path);
            },

            getSize: function () {
                var totalHeight = 0;
                var currentMaxWidth = 0;

                this.pathWrappers.forEach(function (pathWrapper) {
                    totalHeight += pathWrapper.getHeight() + s.PATH_SPACING;
                    var currentWidth = pathWrapper.getWidth();
                    if (currentWidth > currentMaxWidth) {
                        currentMaxWidth = currentWidth;
                    }
                });
                return {width: currentMaxWidth + columns.getWidth(), height: totalHeight};
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
                    //d3.select(this).selectAll("g.path").selectAll("g.nodeGroup").selectAll("g.node")
                    //  .data(function () {
                    //    return pathWrapper.path.nodes.map(function (node) {
                    //      return {node: node, pathIndex: i};
                    //    });
                    //  });

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

                    d3.select(this).selectAll("g.setGroup").selectAll("g.setTypeSummary")
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
                                var filteredSets = d.setType.sets.filter(function (s) {
                                    return s.canBeShown();
                                });

                                return filteredSets.map(function (myset) {
                                    return {
                                        set: myset,
                                        pathIndex: d.pathIndex,
                                        setTypeIndex: that.pathWrappers[d.pathIndex].setTypes.indexOf(d.setType)
                                    };
                                });
                            }, function (d) {
                                return d.set.id;
                            });

                        var setVisContainer = d3.select(this)
                            .selectAll("g.setVisContainer")
                            .data(function () {
                                var filteredSets = d.setType.sets.filter(function (s) {
                                    return s.canBeShown();
                                });

                                return filteredSets.map(function (myset) {
                                    return {
                                        set: myset,
                                        pathIndex: d.pathIndex,
                                        setTypeIndex: that.pathWrappers[d.pathIndex].setTypes.indexOf(d.setType)
                                    };
                                });
                            }, function (d) {
                                return d.set.id;
                            });

                        setVisContainer.each(function (d, i) {
                            d3.select(this).selectAll("circle")
                                .data(function () {
                                    return d.set.nodeIndices.map(function (index) {
                                        return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, nodeIndex: index};
                                    });
                                });


                            d3.select(this).selectAll("line").
                                data(function (d, i) {
                                    return d.set.relIndices.map(function (index) {
                                        return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, relIndex: index};
                                    });
                                });
                        });


                    });

                });
            },

            setPivotNode: function (id) {
                var maxNodeIndex = 0;
                this.pathWrappers.forEach(function (pathWrapper) {
                    for (var i = pathWrapper.path.nodes.length - 1; i >= 0; i--) {
                        if (pathWrapper.path.nodes[i].id === id && i > maxNodeIndex) {
                            maxNodeIndex = i;
                            break;
                        }
                    }
                });

                this.pivotNodeId = id;
                this.pivotNodeIndex = maxNodeIndex;

                this.updatePathList();
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

                return nodeStart + (this.pivotNodeIndex - index) * (s.NODE_WIDTH + s.EDGE_SIZE);
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
                        return translate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + s.NODE_WIDTH / 2;
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
                            return translate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + s.NODE_WIDTH / 2;
                        },
                        y1: function (d) {
                            var translate = s.getPathContainerTranslateY(that.pathWrappers, d.pathIndex);
                            return translate + (d.up ? 0 : s.PATH_HEIGHT / 2);
                        },
                        x2: function (d) {
                            var position = that.pathWrappers[d.pathIndex].nodePositions[d.nodeIndex];
                            var translate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                            return translate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + s.NODE_WIDTH / 2;
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

                var allSetTypes = allPathContainers.selectAll("g.setGroup").selectAll("g.setType")
                    .data(function (pathWrapper, i) {
                        var filteredSetTypes = pathWrapper.setTypes.filter(function (setType) {
                            return setType.canBeShown();
                        });

                        return filteredSetTypes.map(function (mySetType) {
                            return {setType: mySetType, pathIndex: i};
                        });
                    });


                var setType = allSetTypes.enter()
                    .append("g")
                    .classed("setType", true)
                    .attr({
                        //display: function (d) {
                        //  if (d.setType.canBeShown()) {
                        //    return "inline";
                        //  }
                        //  return "none";
                        //},
                        transform: getSetTypeTransformFunction(that.pathWrappers)
                    }
                );

                setType.append("text")
                    .attr("class", "collapseIconSmall")
                    .attr("x", 5)
                    .attr("y", (s.SET_TYPE_HEIGHT - 10) / 2 + 9);

                allSetTypes.selectAll("text.collapseIconSmall")
                    .text(function (d) {
                        return d.setType.collapsed ? "\uf0da" : "\uf0dd";
                    })
                    .on("click", function (d) {
                        var collapsed = !d.setType.collapsed;
                        if (d3.event.ctrlKey) {
                            listeners.notify(s.pathListUpdateTypes.COLLAPSE_ELEMENT_TYPE, {
                                type: d.setType.type,
                                collapsed: collapsed
                            });
                        } else {
                            d.setType.collapsed = collapsed;
                            d3.select(this).text(d.setType.collapsed ? "\uf0da" : "\uf0dd");

                            that.updatePathList();

                        }
                        //updateAggregateList(parent);
                    });

                allSetTypes
                    .transition()
                    .each("start", function (d) {
                        //var setTypeSummaryContainer = d3.select(this).selectAll("g.setTypeSummary");
                        ////.attr("transform", function (d) {
                        ////  return that.getPivotNodeAlignedTransform(that.pathWrappers[d.pathIndex]);
                        ////});
                        //
                        //if (d.setType.collapsed) {
                        d3.select(this).selectAll("g.setTypeSummary")
                            .attr("display", d.setType.collapsed ? "inline" : "none");

                        //}

                        d3.select(this).selectAll("text.collapseIconSmall")
                            .text(function (d) {
                                return d.setType.collapsed ? "\uf0da" : "\uf0dd";
                            });


                        //if (!d.setType.canBeShown()) {
                        //  d3.select(this)
                        //    .attr("display", "none");
                        //}
                    })
                    .attr("transform", getSetTypeTransformFunction(that.pathWrappers));
                //.each("end", function (d) {
                //
                //
                //
                //  //if (d.setType.canBeShown()) {
                //  //  d3.select(this)
                //  //    .attr("display", "inline");
                //  //}
                //});

                setType.append("text")
                    .text(function (d) {
                        //var text = d[0].id;
                        //return getClampedText(text, 15);
                        return config.getSetTypeFromSetPropertyName(d.setType.type);
                    })
                    .attr("x", 10)
                    .attr("y", (s.SET_TYPE_HEIGHT - 10) / 2 + 9)
                    .style("fill", function (d) {
                        return config.getSetColorFromSetTypePropertyName(d.setType.type);
                    })
                    .attr("clip-path", "url(#SetLabelClipPath)");

                setType.append("g")
                    .classed("setTypeSummary", true)
                    .attr("display", function (d) {
                        return d.setType.collapsed ? "inline" : "none";
                    });
                //.attr("transform", function (d) {
                //  return that.getPivotNodeAlignedTransform(that.pathWrappers[d.pathIndex]);
                //});

                allSetTypes.each(function (d, i) {
                        var setTypeSummaryContainer = d3.select(this).select("g.setTypeSummary");


                        var allLines = setTypeSummaryContainer.selectAll("line")
                            .data(function () {
                                return d.setType.relIndices.map(function (index) {
                                    return {pathIndex: d.pathIndex, setTypeIndex: i, relIndex: index};
                                });
                            });
                        var line = allLines.enter()
                            .append("line")
                            .attr({
                                x1: function (d) {
                                    var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                                    var position = that.pathWrappers[d.pathIndex].nodePositions[d.relIndex];
                                    return pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + s.NODE_WIDTH / 2;
                                }
                                ,
                                y1: s.SET_TYPE_HEIGHT / 2,
                                x2: function (d) {
                                    var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                                    var position = that.pathWrappers[d.pathIndex].nodePositions[d.relIndex + 1];
                                    return pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + s.NODE_WIDTH / 2;
                                },
                                y2: s.SET_TYPE_HEIGHT / 2,
                                stroke: function (d) {
                                    return config.getSetColorFromSetTypePropertyName(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type);
                                },
                                "stroke-width": function (d) {
                                    var numSets = getEdgeSetCount(that.pathWrappers[d.pathIndex].path.edges[d.relIndex],
                                        that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex]);
                                    return edgeSetScale(numSets);
                                }
                            });

                        line.append("title").text(function (d) {
                            var numSets = getEdgeSetCount(that.pathWrappers[d.pathIndex].path.edges[d.relIndex],
                                that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex]);
                            return "Number of connecting sets: " + numSets;
                        });

                        allLines.transition()
                            .attr({
                                x1: function (d) {
                                    var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                                    var position = that.pathWrappers[d.pathIndex].nodePositions[d.relIndex];
                                    return pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + s.NODE_WIDTH / 2;
                                },
                                x2: function (d) {
                                    var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                                    var position = that.pathWrappers[d.pathIndex].nodePositions[d.relIndex + 1];
                                    return pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + s.NODE_WIDTH / 2;
                                },
                                stroke: function (d) {
                                    return config.getSetColorFromSetTypePropertyName(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type);
                                },
                                "stroke-width": function (d) {
                                    var numSets = getEdgeSetCount(that.pathWrappers[d.pathIndex].path.edges[d.relIndex],
                                        that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex]);
                                    return edgeSetScale(numSets);
                                }
                            });

                        allLines.selectAll("title").data(function () {
                            return d.setType.relIndices.map(function (index) {
                                return {pathIndex: d.pathIndex, setTypeIndex: i, relIndex: index};
                            });
                        }).text(function (d) {
                            var numSets = getEdgeSetCount(that.pathWrappers[d.pathIndex].path.edges[d.relIndex],
                                that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex]);
                            return "Number of connecting sets: " + numSets;
                        });

                        allLines.exit().remove();

                        var allCircles = setTypeSummaryContainer.selectAll("circle")
                            .data(function () {
                                return d.setType.nodeIndices.map(function (index) {
                                    return {pathIndex: d.pathIndex, setTypeIndex: i, nodeIndex: index};
                                });
                            });

                        var circle = allCircles.enter()
                            .append("circle")
                            .attr({
                                cx: function (d) {
                                    var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                                    var position = that.pathWrappers[d.pathIndex].nodePositions[d.nodeIndex];
                                    return pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + s.NODE_WIDTH / 2;
                                },
                                cy: s.SET_TYPE_HEIGHT / 2,
                                r: function (d) {
                                    var numSets = getNodeSetCount(that.pathWrappers[d.pathIndex].path.nodes[d.nodeIndex],
                                        that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex]);

                                    return numSets == 0 ? 0 : nodeSetScale(numSets);
                                },
                                fill: function (d) {
                                    return config.getSetColorFromSetTypePropertyName(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type);
                                }
                            });

                        circle.append("title").text(function (d) {
                            var numSets = getNodeSetCount(that.pathWrappers[d.pathIndex].path.nodes[d.nodeIndex],
                                that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex]);
                            return "Number of sets: " + numSets;
                        });

                        allCircles.transition()
                            .attr({
                                cx: function (d) {
                                    var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                                    var position = that.pathWrappers[d.pathIndex].nodePositions[d.nodeIndex];
                                    return pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + s.NODE_WIDTH / 2;
                                },
                                r: function (d) {
                                    var numSets = getNodeSetCount(that.pathWrappers[d.pathIndex].path.nodes[d.nodeIndex],
                                        that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex]);

                                    return numSets == 0 ? 0 : nodeSetScale(numSets);
                                }
                            });

                        allCircles.selectAll("title").data(function () {
                            return d.setType.nodeIndices.map(function (index) {
                                return {pathIndex: d.pathIndex, setTypeIndex: i, nodeIndex: index};
                            });
                        }).text(function (d) {
                            var numSets = getNodeSetCount(that.pathWrappers[d.pathIndex].path.nodes[d.nodeIndex],
                                that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex]);
                            return "Number of sets: " + numSets;
                        });

                        allCircles.exit().remove();
                    }
                );

                allSetTypes.exit().remove();


                allSetTypes.each(function (d) {

                    if (d.setType.collapsed) {
                        d3.select(this).selectAll("g.setCont")
                            .remove();
                        return;
                    }

                    var allSc = d3.select(this)
                        .selectAll("g.setCont")
                        .data(function () {
                            var filteredSets = d.setType.sets.filter(function (s) {
                                return s.canBeShown();
                            });

                            return filteredSets.map(function (myset) {
                                return {
                                    set: myset,
                                    pathIndex: d.pathIndex,
                                    setTypeIndex: that.pathWrappers[d.pathIndex].setTypes.indexOf(d.setType)
                                };
                            });
                        }, function (d) {
                            return d.set.id;
                        });

                    var sc = allSc
                        .enter()
                        .append("g")
                        .classed("setCont", true);

                    sc.each(function (d, i) {


                        uiUtil.createTemporalMenuOverlayButton(d3.select(this), s.NODE_START, 0, true, function () {

                            var setNode = setInfo.get(d.set.id);

                            if (typeof setNode === "undefined") {
                                return [];
                            }

                            var items = queryUtil.getFilterOverlayItems("set", d.set.id);
                            var linkItem = setInfo.getLinkOverlayItem(d.set.id);
                            if (linkItem) {
                                items.push(linkItem);
                            }
                            return items;
                        });
                        //queryUtil.createAddNodeFilterButton(d3.select(this), that.parent, "set", d.set.id, s.NODE_START, 0, true);
                    });

                    allSc.attr({
                        display: function (d) {
                            if (d.set.canBeShown()) {
                                return "inline";
                            }
                            return "none";
                        },
                        transform: getSetTransformFunction(that.pathWrappers)
                    });

                    var set = sc.append("g")
                        .classed("set", true)
                        .on("dblclick", function (d) {
                            //pathSorting.sortingStrategies.selectionSortingStrategy.setSetIds([d.set.id]);
                            pathSorting.addSelectionBasedSortingStrategy(new pathSorting.SetPresenceSortingStrategy(selectionUtil.selections["set"]["selected"]));
                            listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
                        });

                    set.append("rect")
                        .attr("class", "filler")
                        .attr("x", 0)
                        .attr("y", 0)
                        .attr("width", "100%")
                        .attr("height", s.SET_HEIGHT);

                    set.append("text")
                        .text(function (d) {
                            return setInfo.getSetLabel(d.set.id);
                        })
                        .attr("x", s.SET_TYPE_INDENT)
                        .attr("y", s.SET_HEIGHT)
                        .style("fill", function (d) {
                            return config.getSetColorFromSetTypePropertyName(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type);
                        })
                        .attr("clip-path", "url(#SetLabelClipPath)");

                    set.append("title")
                        .text(function (d) {
                            return setInfo.getSetLabel(d.set.id);
                        });


                    var setVisContainer = set.append("g")
                        .classed("setVisContainer", true);


                    //allSetVisContainers.attr("transform", function (d) {
                    //  return that.getPivotNodeAlignedTransform(that.pathWrappers[d.pathIndex])
                    //});

                    setVisContainer.each(function (d) {
                        var allCircles = d3.select(this).selectAll("circle")
                            .data(function () {
                                return d.set.nodeIndices.map(function (index) {
                                    return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, nodeIndex: index};
                                });
                            });

                        allCircles.enter()
                            .append("circle")
                            .attr({
                                cy: function (d) {
                                    return s.SET_HEIGHT / 2;
                                },
                                r: 2,
                                fill: function (d) {
                                    return config.getSetColorFromSetTypePropertyName(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type);
                                }
                            });


                        allCircles.exit().remove();

                        var allLines = d3.select(this).selectAll("line").
                            data(function (d, i) {
                                return d.set.relIndices.map(function (index) {
                                    return {
                                        pathIndex: d.pathIndex,
                                        setTypeIndex: d.setTypeIndex,
                                        setIndex: i,
                                        relIndex: index
                                    };
                                });
                            });

                        allLines.enter()
                            .append("line")
                            //.attr("x1", function (d) {
                            //  return (d.relIndex * nodeWidth) + (d.relIndex * edgeSize) + nodeWidth / 2;
                            //})
                            .attr("y1", function (d) {
                                return s.SET_HEIGHT / 2;
                                //return 2 * vSpacing + nodeHeight + (d.setIndex + 1) * setHeight - 5;
                            })
                            //.attr("x2", function (d) {
                            //  return ((d.relIndex + 1) * nodeWidth) + ((d.relIndex + 1) * edgeSize) + nodeWidth / 2;
                            //})
                            .attr("y2", function (d) {
                                return s.SET_HEIGHT / 2;
                                //return 2 * vSpacing + nodeHeight + (d.setIndex + 1) * setHeight - 5;
                            })
                            .attr("stroke", function (d) {
                                return config.getSetColorFromSetTypePropertyName(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type);
                            });

                        allLines.exit().remove();
                    });


                    d3.select(this).selectAll("g.setVisContainer")
                        .each(function (d) {

                            var allCircles = d3.select(this).selectAll("circle");

                            allCircles.transition()
                                .attr({
                                    cx: function (d) {
                                        var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                                        var position = that.pathWrappers[d.pathIndex].nodePositions[d.nodeIndex];
                                        return pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + s.NODE_WIDTH / 2;
                                    }
                                });

                            var allLines = d3.select(this).selectAll("line");

                            allLines.transition()
                                .attr({
                                    x1: function (d) {
                                        var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                                        var position = that.pathWrappers[d.pathIndex].nodePositions[d.relIndex];
                                        return pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + s.NODE_WIDTH / 2;
                                    },
                                    x2: function (d) {
                                        var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                                        var position = that.pathWrappers[d.pathIndex].nodePositions[d.relIndex + 1];
                                        return pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + s.NODE_WIDTH / 2;
                                    }
                                });

                        });


                    allSc.exit()
                        .remove();

                });

                selectionUtil.removeListeners(that.setSelectionListener);

                that.setSelectionListener = selectionUtil.addDefaultListener(allSetTypes, "g.set", function (d) {
                        return d.set.id;
                    },
                    "set"
                );

            },

            getNodePositionX: function (pathWrapper, nodeIndex, centerPosition) {
                var pivotNodeTranslate = this.getPivotNodeAlignedTranslationX(pathWrapper);
                var position = pathWrapper.nodePositions[nodeIndex];
                return pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE) + (centerPosition ? s.NODE_WIDTH / 2 : 0);
            },

            renderLineGrid: function () {
                var gridStrokeColor = "white";
                var gridFillColor = "rgba(0,0,0,0)";

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
                        .style({
                            stroke: gridStrokeColor,
                            fill: gridFillColor,
                            "shape-rendering": "crispEdges"
                        });
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
                            .style({
                                stroke: gridStrokeColor,
                                fill: gridFillColor,
                                "shape-rendering": "crispEdges"
                            });
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
                            .style({
                                stroke: gridStrokeColor,
                                fill: gridFillColor,
                                "shape-rendering": "crispEdges"
                            });

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
                        .classed("bgSetType", true);


                    bgNodeProperties.each(function (property) {
                        d3.select(this).attr({
                            transform: "translate(0," + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + property.getPosYRelativeToParent(pathWrapper.properties)) + ")",
                            x: 0,
                            y: 0,
                            width: "100%",
                            height: property.getBaseHeight()
                        })
                            .style({
                                stroke: gridStrokeColor,
                                fill: gridFillColor,
                                "shape-rendering": "crispEdges"
                            });

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
                            .style({
                                stroke: gridStrokeColor,
                                fill: gridFillColor,
                                "shape-rendering": "crispEdges"
                            });
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
                            .style({
                                stroke: gridStrokeColor,
                                fill: gridFillColor,
                                "shape-rendering": "crispEdges"
                            });

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
            },

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

                        prop.append("text")
                            .text(property.name)
                            .attr("x", 10)
                            .attr("y", (property.getBaseHeight() - 10) / 2 + 9)
                            .style("fill", config.getNodePropertyColorFromPropertyName(property.name))
                            .attr("clip-path", "url(#SetLabelClipPath)")
                            .append("title").text(property.name);

                    });

                    allProperties.each(function (property) {
                        var prop = d3.select(this);
                        prop.transition()
                            .attr({
                                transform: "translate(0," + property.getPosYRelativeToParent(pathWrapper.properties) + ")"
                            });

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
                                var scale = that.numericalPropertyScales[property.name];

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
                                var scale = that.numericalPropertyScales[property.name];

                                bar.select("rect.valueBg").transition()
                                    .attr({
                                        x: posX,
                                        y: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2
                                    });

                                bar.select("rect.value").transition()
                                    .attr({
                                        x: posX + (node.properties < 0 ? scale(value) : scale(0)),
                                        y: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2,
                                        width: Math.abs(scale(0) - scale(value))
                                    });

                                bar.select("rect.valueFrame").transition()
                                    .attr({
                                        x: posX,
                                        y: (property.getBaseHeight() - s.DEFAULT_BAR_SIZE) / 2
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


            },

            renderPaths: function () {

                var that = this;

                var comparator = pathSorting.sortingManager.currentComparator;

                that.sortPaths(comparator);

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
                            return config.isNetworkEdge(d.edge) ? "0,0" : "10,5";
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
                                return pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE);
                            },
                            x2: function (d, i) {
                                var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                                var position = that.pathWrappers[d.pathIndex].nodePositions[i + 1];
                                return pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE);
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

                //var node = nodeGroup.selectAll("g.node")
                //  .data(function (pathWrapper) {
                //    return pathWrapper.path.nodes;
                //  })
                //var nc = allNodes.enter()
                //  .append("g")
                //  .classed("nodeCont", true);


                //nc.each(function (d, i) {
                //  uiUtil.createTemporalMenuOverlayButton(d3.select(this), s.NODE_WIDTH, 0, false, queryUtil.getFilterOverlayItems("name", d.node.properties[config.getNodeNameProperty(d.node)]));
                //  //queryUtil.createAddNodeFilterButton(d3.select(this), that.parent, "name", d.node.properties[config.getNodeNameProperty(d.node)], s.NODE_WIDTH, 0);
                //});

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
                    pathUtil.renderNode(d3.select(this), d.node, 0, 0, s.NODE_WIDTH, s.NODE_HEIGHT, "url(#pathNodeClipPath)", function (text) {
                        return that.listView.getTextWidth(text);
                    }, queryUtil.getFilterOverlayItems("name", d.node.properties[config.getNodeNameProperty(d.node)]));
                });

                allNodes
                    .transition()
                    .attr("transform", function (d, i) {
                        var position = that.pathWrappers[d.pathIndex].nodePositions[i];
                        var pivotNodeTranslate = that.getPivotNodeAlignedTranslationX(that.pathWrappers[d.pathIndex]);
                        return "translate(" + (pivotNodeTranslate + position * (s.NODE_WIDTH + s.EDGE_SIZE)) + "," + s.V_SPACING + ")";
                    });


                var setGroup = pathContainer.append("g")
                    .attr("class", "setGroup");

                var setGroup = pathContainer.append("g")
                    .attr("class", "propertyGroup");

                var datasetGroup = pathContainer.append("g")
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

        };


        return PathList;
    }
);
