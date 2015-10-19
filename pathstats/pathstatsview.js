define(['jquery', 'd3', '../view', '../hierarchyelements', '../selectionutil', './statdata', '../pathutil', '../listeners', '../query/pathquery', '../sorting', '../setinfo', '../config', '../query/queryutil', '../uiutil'],
    function ($, d3, view, hierarchyElements, selectionUtil, statData, pathUtil, listeners, pathQuery, sorting, setInfo, config, queryUtil, uiUtil) {

        var HierarchyElement = hierarchyElements.HierarchyElement;
        var NodeTypeWrapper = statData.NodeTypeWrapper;
        var SetTypeWrapper = statData.SetTypeWrapper;
        var Level1HierarchyElement = statData.Level1HierarchyElement;

        var HIERARCHY_ELEMENT_HEIGHT = 12;
        var COLLAPSE_BUTTON_SPACING = 10;
        var BAR_START_X = 110;
        var MAX_BAR_WIDTH = 80;

        function getKey(d) {
            return d.id;
        }

        function PathStatsView() {
            view.call(this, "#pathstats");
            this.paths = [];
            this.nodeTypeDict = {};
            this.setTypeDict = {};
            this.dataRoot = new HierarchyElement();
            this.nodeTypeWrappers = new Level1HierarchyElement(this.dataRoot);
            this.setTypeWrappers = new Level1HierarchyElement(this.dataRoot);
            this.dataRoot.children.push(this.nodeTypeWrappers);
            this.dataRoot.children.push(this.setTypeWrappers);


            this.selectionListeners = [];
        }

        PathStatsView.prototype = Object.create(view.prototype);


        PathStatsView.prototype.init = function () {
            view.prototype.init.call(this);

            var svg = d3.select("#pathstats svg");
            //svg.append("g")
            //  .classed("nodeTypeGroup", true);
            //svg.append("g")
            //  .classed("setTypeGroup", true);
            svg.append("clipPath")
                .attr("id", "LabelClipPath")
                .append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 90)
                .attr("height", 20);

            this.textSizeDomElement = uiUtil.createFontSizeTextElement(svg);

            var that = this;

            listeners.add(function (query) {
                if (pathQuery.isRemoveFilteredPaths() || pathQuery.isRemoteQuery()) {
                    that.updateToFilteredPaths();
                } else {
                    that.updateView();
                }
            }, listeners.updateType.QUERY_UPDATE);

            listeners.add(updateSets, listeners.updateType.SET_INFO_UPDATE);

            listeners.add(function (remove) {
                if (remove) {
                    that.updateToFilteredPaths();
                } else {
                    that.updateToAllPaths();
                }
            }, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);


            listeners.add(function (showNonEdgeSets) {
                that.updateView();
            }, "UPDATE_SET_VISIBILITY");
        };

        PathStatsView.prototype.getTextWidth = function (string, fontStyle) {
            return uiUtil.getTextBBox(this.textSizeDomElement, string, fontStyle).width;
        };


        PathStatsView.prototype.updateToFilteredPaths = function () {
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

            for (var i = 0; i < this.nodeTypeWrappers.children.length; i++) {
                var nodeTypeWrapper = this.nodeTypeWrappers.children[i];

                var nodesToRemove = [];

                nodeTypeWrapper.children.forEach(function (nodeWrapper) {
                    if (nodeWrapper.isFiltered()) {
                        nodesToRemove.push(nodeWrapper);
                    }
                });
                if (nodesToRemove.length === nodeTypeWrapper.children.length) {
                    this.nodeTypeWrappers.children.splice(i, 1);
                    delete this.nodeTypeDict[nodeTypeWrapper.type];
                    i--;
                } else {

                    nodesToRemove.forEach(function (nodeWrapper) {
                        nodeWrapper.parent.removeNode(nodeWrapper.node);
                    });
                }
            }

            for (var i = 0; i < this.setTypeWrappers.children.length; i++) {
                var setTypeWrapper = this.setTypeWrappers.children[i];

                var setsToRemove = [];

                setTypeWrapper.children.forEach(function (setWrapper) {
                    if (setWrapper.isFiltered()) {
                        setsToRemove.push(setWrapper);
                    }
                });

                if (setsToRemove.length === setTypeWrapper.children.length) {
                    this.setTypeWrappers.children.splice(i, 1);
                    delete this.setTypeDict[setTypeWrapper.type];
                    i--;
                } else {

                    setsToRemove.forEach(function (setWrapper) {
                        setWrapper.parent.removeSet(setWrapper.setId);
                    });
                }
            }

            selectionUtil.removeListeners(this.selectionListeners);
            this.selectionListeners = [];

            this.paths.forEach(function (path) {
                if (!pathQuery.isPathFiltered(path.id)) {
                    that.addPathElements(path);
                } else {
                    that.nodeTypeWrappers.children.forEach(function (nodeTypeWrapper) {
                        nodeTypeWrapper.removePath(path);
                    });
                    that.setTypeWrappers.children.forEach(function (setTypeWrapper) {
                        setTypeWrapper.removePath(path);
                    });
                }
            });

            this.render();
            this.updateView();
        };

        PathStatsView.prototype.updateToAllPaths = function () {
            var that = this;
            this.paths.forEach(function (path) {
                that.addPathElements(path);
            });

            this.render();
        };

        PathStatsView.prototype.setPaths = function (paths) {
            var that = this;
            paths.forEach(function (path) {
                that.addPath(path);
            });
        };

        PathStatsView.prototype.addPathElements = function (path) {
            var that = this;
            path.nodes.forEach(function (node) {
                addNode(node, path, pathUtil.getNodeType(node));

                pathUtil.forEachNodeSet(node, function (setType, setId) {
                    addNodeSet(setType, setId, path, node);
                });

            });

            function addNode(node, path, type) {
                var nodeType = that.nodeTypeDict[type];
                if (typeof nodeType === "undefined") {
                    nodeType = new NodeTypeWrapper(that.nodeTypeWrappers, type);
                    that.nodeTypeDict[type] = nodeType;
                    that.nodeTypeWrappers.children.push(nodeType);
                }
                nodeType.addNode(node, path);
            }

            function addNodeSet(type, setId, path, node) {
                var setType = that.setTypeDict[type];
                if (typeof setType === "undefined") {
                    setType = new SetTypeWrapper(that.setTypeWrappers, type);
                    that.setTypeDict[type] = setType;
                    that.setTypeWrappers.children.push(setType);
                }
                setType.addNode(setId, node, path);
            }

            function addEdgeSet(type, setId, path, edge) {
                var setType = that.setTypeDict[type];
                if (typeof setType === "undefined") {
                    setType = new SetTypeWrapper(that.setTypeWrappers, type);
                    that.setTypeDict[type] = setType;
                    that.setTypeWrappers.children.push(setType);
                }
                setType.addEdge(setId, edge, path);
            }

            path.edges.forEach(function (edge) {

                pathUtil.forEachEdgeSet(edge, function (setType, setId) {
                    addEdgeSet(setType, setId, path, edge);
                });
            });
        };

        PathStatsView.prototype.addPath = function (path) {
            this.paths.push(path);
            this.addPathElements(path);
        };


        PathStatsView.prototype.reset = function () {
            this.paths = [];
            this.nodeTypeDict = {};
            this.setTypeDict = {};
            this.dataRoot = new HierarchyElement();
            this.nodeTypeWrappers = new Level1HierarchyElement(this.dataRoot);
            this.setTypeWrappers = new Level1HierarchyElement(this.dataRoot);
            this.dataRoot.children.push(this.nodeTypeWrappers);
            this.dataRoot.children.push(this.setTypeWrappers);
            selectionUtil.removeListeners(this.selectionListeners);
            this.selectionListeners = [];
            //currentNodeTypeWrapperId = 0;
            //currentNodeWrapperId = 0;
            var svg = d3.select("#pathstats svg");
            svg.selectAll("g.nodeTypeGroup")
                .remove();
            svg.selectAll("g.setTypeGroup")
                .remove();
            //svg.append("g")
            //  .classed("nodeTypeGroup", true);
            //svg.append("g")
            //  .classed("setTypeGroup", true);

        };

        PathStatsView.prototype.getBarScale = function () {
            var scaleDomain = [0, Math.max(this.nodeTypeWrappers.children.length <= 0 ? 0 : (d3.max(this.nodeTypeWrappers.children, function (d) {
                return d.pathIds.length;
            })), this.setTypeWrappers.children.length <= 0 ? 0 : d3.max(this.setTypeWrappers.children, function (d) {
                return d.pathIds.length;
            }))];

            return d3.scale.linear()
                .domain(scaleDomain)
                .range([0, MAX_BAR_WIDTH]);
        };

        PathStatsView.prototype.updateView = function () {

            var scaleX = this.getBarScale();

            //d3.selectAll("g.nodeTypeGroup").data([this.nodeTypeWrappers]);
            var that = this;
            var statTypeGroups = d3.selectAll("g.level1HierarchyElement")
                .transition()
                .attr({
                    transform: hierarchyElements.transformFunction
                });

            var comparator = sorting.chainComparators([function (a, b) {
                return d3.descending(a.pathIds.length, b.pathIds.length);
            }, function (a, b) {
                return d3.descending(a.id, b.id);
            }]);

            statTypeGroups.each(function (d) {
                d.children.sort(comparator);
                var allStatTypes = d3.select(this).selectAll("g.statTypes")
                    .data(d.children, getKey);

                d3.select(this).selectAll("g.statTypes rect.pathOccurrences")
                    .data(d.children, getKey)
                    .transition()
                    .attr("width", function (d) {
                        return scaleX(d.pathIds.length)
                    });

                d3.select(this).selectAll("g.statTypes rect.pathOccurrences title")
                    .data(d.children, getKey)
                    .text(function (d) {
                        return d.getTooltip()
                    });


                allStatTypes
                    .sort(comparator)
                    .transition()
                    .attr({
                        display: hierarchyElements.displayFunction,
                        transform: hierarchyElements.transformFunction
                    });

                allStatTypes.each(function (typeWrapper) {

                    typeWrapper.children.sort(comparator);


                    var stats = d3.select(this).selectAll("g.stats")
                        .data(typeWrapper.children, getKey);


                    stats.selectAll("rect.pathOccurrences")
                        .data(typeWrapper.children, getKey)
                        .transition()
                        .attr("width", function (d) {
                            return scaleX(d.pathIds.length)
                        });

                    stats.selectAll("rect.pathOccurrences title")
                        .data(typeWrapper.children, getKey)
                        .text(function (d) {
                            return d.getTooltip()
                        });

                    d3.select(this).selectAll("g.statTypeCont")
                        .transition()
                        .style("opacity", function (d) {
                            return d.isFiltered() ? 0.5 : 1;
                        });

                    d3.select(this).selectAll("g.stats")
                        .sort(comparator)
                        .transition()
                        .attr({
                            display: hierarchyElements.displayFunction,
                            transform: hierarchyElements.transformFunction
                        })
                        .style("opacity", function (d) {
                            return d.isFiltered() ? 0.5 : 1;
                        });
                });

                allStatTypes.selectAll("g.statGroup")
                    .transition()
                    .each("start", function (typeWrapper) {
                        if (typeWrapper.collapsed) {
                            d3.select(this)
                                .attr({
                                    display: "none"
                                });
                        }
                    })
                    .each("end", function (typeWrapper) {
                        if (!typeWrapper.collapsed) {
                            d3.select(this)
                                .attr({
                                    display: "inline"
                                });
                        }
                    });

            });


            this.updateViewSize();
        };

        function updateSets(setInfo) {

            var svg = d3.select("#pathstats svg");

            //Title needs to be appended every time as text() on a text element removes existing subelements with the text
            svg.selectAll("g.set_stat text")
                .text(function (d) {
                    return setInfo.getSetLabel(d.setId);
                })
                .append("title")
                .text(function (d) {
                    return setInfo.getSetLabel(d.setId);
                });

            //var titles = svg.selectAll("g.set_stat text title");
            //
            //titles
            //  .text(function (d) {
            //    return setInfo.getSetLabel(d.setId);
            //  });
        }

        PathStatsView.prototype.getMinSize = function () {
            var totalHeight = 0;
            this.nodeTypeWrappers.children.forEach(function (nodeTypeWrapper) {
                if (nodeTypeWrapper.canBeShown()) {
                    totalHeight += nodeTypeWrapper.getHeight();
                }
            });

            this.setTypeWrappers.children.forEach(function (setTypeWrapper) {
                if (setTypeWrapper.canBeShown()) {
                    totalHeight += setTypeWrapper.getHeight();
                }
            });


            return {width: BAR_START_X + MAX_BAR_WIDTH, height: this.dataRoot.getHeight()};
        };

        PathStatsView.prototype.render = function () {

            var that = this;

            var allLevel1HierarchyElements = d3.select("#pathstats svg").selectAll("g.level1HierarchyElement").data(this.dataRoot.children);

            allLevel1HierarchyElements.enter()
                .append("g")
                .classed("level1HierarchyElement", true)
                .each(function (d) {
                    if (d === that.nodeTypeWrappers) {
                        d3.select(this)
                            .classed("nodeTypeGroup", true)
                            .append("text")
                            .text("Nodes")
                            .attr({
                                x: 0,
                                y: d.getBaseHeight()
                            })
                            .style({
                                "font-size": 18
                            });

                    } else if (d === that.setTypeWrappers) {
                        d3.select(this)
                            .classed("setTypeGroup", true)
                            .append("text")
                            .text("Sets")
                            .attr({
                                x: 0,
                                y: d.getBaseHeight()
                            })
                            .style({
                                "font-size": 18
                            });

                    }

                    appendAxis(d3.select(this), that.getBarScale(), d.getBaseHeight());
                });


            allLevel1HierarchyElements.each(function (d) {
                updateAxis(d3.select(this), that.getBarScale());
            });

            function appendAxis(parent, scaleX, posY) {
                parent
                    .append("g")
                    .classed("axis", true)
                    .attr({
                        transform: "translate(" + BAR_START_X + "," + posY + ")"
                    })
                    .call(axis(scaleX));
            }

            function updateAxis(parent, scaleX) {
                parent.select("g.axis")
                    .call(axis(scaleX));
            }

            function axis(scaleX) {
                return d3.svg.axis()
                    .scale(scaleX)
                    .orient("top")
                    .tickValues([scaleX.domain()[0], scaleX.domain()[1]])
                    .tickFormat(d3.format(".0f"))
                    .tickSize(3, 3);
            }


            selectionUtil
                .removeListeners(this.selectionListeners);
            this.selectionListeners = [];

            this.renderStats("g.nodeTypeGroup", this.nodeTypeWrappers.children, function (d) {
                return d.node.id;
            }, "node");
            //this.renderStats();
            this.renderStats("g.setTypeGroup", this.setTypeWrappers.children, function (d) {
                return d.setId;
            }, "set");

            this.updateView();

        };

        PathStatsView.prototype.renderStats = function (rootSelector, statTypes, statSelectionFunction, idType) {

            var statTypeGroup = d3.selectAll(rootSelector);
            //.attr({
            //  transform: hierarchyElements.transformFunction
            //});
            var that = this;

            var allStatTypes = statTypeGroup.selectAll("g.statTypes")
                .data(statTypes, getKey);

            allStatTypes.exit()
                .remove();

            var scaleX = this.getBarScale();

            var statType = allStatTypes
                .enter()
                .append("g")
                .classed("statTypes", true)
                .attr({
                    display: hierarchyElements.displayFunction,
                    transform: "translate(0," + Math.max($(this.parentSelector)[0].offsetHeight, that.getMinSize().height) + ")"
                });

            var typeCont = statType.append("g")
                .classed("statTypeCont", true);

            typeCont.each(function (d, i) {
                if (d.hasOverlayItems()) {
                    uiUtil.createTemporalMenuOverlayButton(d3.select(this), BAR_START_X - 20, d.getBaseHeight() - uiUtil.SMALL_BUTTON_SIZE - 2, true, function () {
                        return d.getOverlayMenuItems();
                    });

                    //queryUtil.createAddNodeFilterButton(d3.select(this), d3.select("#pathstats svg"), d.getNodeConstraintType(), d.getFilterText(), BAR_START_X - 20, 0, true);
                }
            });

            typeCont.append("rect")
                .classed("filler", true)
                .attr({
                    x: 0,
                    y: 0,
                    width: "100%",
                    height: function (d) {
                        return d.getBaseHeight();
                    }
                });

            typeCont.append("text")
                .attr("class", "collapseIconSmall")
                .attr("x", 5)
                .attr("y", function (d) {
                    return d.getBaseHeight() - 2;
                })
                .text(function (typeWrapper) {
                    return typeWrapper.collapsed ? "\uf0da" : "\uf0dd";
                })
                .on("click", function (typeWrapper) {
                    typeWrapper.collapsed = !typeWrapper.collapsed;
                    d3.select(this).text(typeWrapper.collapsed ? "\uf0da" : "\uf0dd");
                    that.updateView();
                });

            var typeLabelStyle = {"font-weight": "bolder"};

            if (idType === "node") {
                typeCont.each(function (d) {
                    var symbolType = config.getNodeTypeSymbol(d.type);

                    if (typeof symbolType !== "undefined") {
                        var symbol = d3.svg.symbol().type(symbolType)
                            .size(40);
                        var textWidth = that.getTextWidth(d.type, typeLabelStyle);

                        d3.select(this).append("path")
                            .classed("nodeTypeSymbol", true)
                            .attr({
                                d: symbol,
                                transform: "translate(" + (COLLAPSE_BUTTON_SPACING + textWidth + 8) + "," + (d.getBaseHeight() / 2 + 2) + ")"
                            });
                    }
                });
            }

            var typeLabel = typeCont.append("text")
                .text(function (typeWrapper) {
                    return typeWrapper.getLabel();
                })
                .attr({
                    x: function (d) {
                        //var symbolPresent = false;
                        //if (idType === "node") {
                        //  symbolPresent = (typeof config.getNodeTypeSymbol(d.type) !== "undefined");
                        //}

                        return COLLAPSE_BUTTON_SPACING;// + (symbolPresent ? 10 : 0);
                    },
                    y: function (d) {
                        return d.getBaseHeight() - 2;
                    },
                    "clip-path": "url(#LabelClipPath)"
                })
                .style(typeLabelStyle);

            typeLabel.append("title")
                .text(function (typeWrapper) {
                    return typeWrapper.getLabel();
                });

            if (idType === "set") {
                typeLabel.style("fill", function (d) {
                    return config.getSetColorFromSetTypePropertyName(d.type);
                });
            }

            addPathOccurrenceBar(typeCont, idType === "set" ? function (d) {
                return config.getSetColorFromSetTypePropertyName(d.type);
            } : function (d) {
                return "gray";
            });

            var statGroup = statType.append("g")
                .classed("statGroup", true);


            var allStats = allStatTypes.selectAll("g.statGroup").selectAll("g.stats")
                .data(function (typeWrapper) {
                    return typeWrapper.children;
                }, getKey);

            allStats.exit()
                .remove();

            var stats = allStats
                .enter()
                .append("g")
                .classed("stats", true)
                .classed(idType + "_stat", true)
                .attr({
                    display: hierarchyElements.displayFunction,
                    transform: "translate(0," + Math.max($(this.parentSelector)[0].offsetHeight, that.getMinSize().height) + ")"
                })
                .on("dblclick", function (d) {
                    d.onDoubleClick();
                });

            stats.each(function (d, i) {
                if (d.hasOverlayItems()) {
                    uiUtil.createTemporalMenuOverlayButton(d3.select(this), BAR_START_X - 20, 0, true, function () {
                        return d.getOverlayMenuItems();
                    });


                    //queryUtil.createAddNodeFilterButton(d3.select(this), d3.select("#pathstats svg"), d.getNodeConstraintType(), d.getFilterText(), BAR_START_X - 20, 0, true);
                }
            });


            stats.append("rect")
                .classed("filler", true)
                .attr({
                    x: COLLAPSE_BUTTON_SPACING,
                    y: 0,
                    width: "100%",
                    height: HIERARCHY_ELEMENT_HEIGHT
                });

            var l = selectionUtil.addDefaultListener(allStatTypes.selectAll("g.statGroup"), "g.stats", statSelectionFunction, idType
            );
            that.selectionListeners.push(l);

            var setLabel = stats.append("text")
                .text(function (stat) {
                    return stat.getLabel();
                })
                .attr({
                    x: COLLAPSE_BUTTON_SPACING,
                    y: HIERARCHY_ELEMENT_HEIGHT - 2,
                    "clip-path": "url(#LabelClipPath)"
                });
            if (idType === "set") {
                setLabel.style("fill", function (d) {
                    return config.getSetColorFromSetTypePropertyName(d.parent.type);
                });
            }

            setLabel.append("title")
                .text(function (stat) {

                    if (idType === "set") {
                        var info = setInfo.get(stat.setId);

                        if (typeof info === "undefined") {
                            return stat.setId;
                        }
                        return info.properties[config.getSetNameProperty(info)];
                    }

                    return stat.getLabel();
                });

            addPathOccurrenceBar(stats, idType === "set" ? function (d) {
                return config.getSetColorFromSetTypePropertyName(d.parent.type);
            } : function (d) {
                return "gray";
            });

            function addPathOccurrenceBar(parent, barColor) {
                var setPathOccurrenceBar = parent.append("rect")
                    .classed("pathOccurrences", true)
                    .attr({
                        x: BAR_START_X,
                        y: function (stat) {
                            return stat.getBaseHeight() + 2 - HIERARCHY_ELEMENT_HEIGHT;
                        },
                        width: function (stat) {
                            return scaleX(stat.pathIds.length);
                        },
                        height: HIERARCHY_ELEMENT_HEIGHT - 4,
                        fill: barColor
                    });

                setPathOccurrenceBar.append("title")
                    .text(function (stat) {
                        return stat.getTooltip();
                    });
            }


        };

        return new PathStatsView();
    })
;
