define(['jquery', '../sorting', '../pathutil', '../query/querymodel', '../listeners', '../query/pathquery', '../datastore', '../setinfo', '../config', '../statisticsutil'],
    function ($, sorting, pathUtil, q, listeners, pathQuery, dataStore, setInfo, config, statisticsUtil) {
        var SortingStrategy = sorting.SortingStrategy;

        //TODO: fetch amount of sets from server
        var totalNumSets = 290;


        function PathLengthSortingStrategy() {
            SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.WEIGHT, "Path length", "PATH_LENGTH");
        }

        PathLengthSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
        PathLengthSortingStrategy.prototype.compare = function (a, b) {
            if (this.ascending) {
                return d3.ascending(a.path.edges.length, b.path.edges.length);
            }
            return d3.descending(a.path.edges.length, b.path.edges.length);
        };

        PathLengthSortingStrategy.prototype.getScoreInfo = function (path) {
            return {score: path.edges.length};
        };


        function SetConnectionStrengthSortingStrategy(stat, label, setType) {
            SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ID, label, "SET_COUNT_EDGE_WEIGHT");
            this.ascending = false;
            this.setType = setType;
            this.stat = stat;
        }

        SetConnectionStrengthSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
        SetConnectionStrengthSortingStrategy.prototype.compare = function (a, b) {
            //function calcWeight(pathWrapper) {
            //  var totalWeight = 0;
            //
            //  pathWrapper.path.edges.forEach(function (edge) {
            //      var numSets = 0;
            //      pathUtil.forEachEdgeSet(edge, function (type, setId) {
            //        numSets++;
            //      });
            //
            //      totalWeight += (totalNumSets - numSets + 1) / totalNumSets;
            //    }
            //  );
            //
            //  return totalWeight;
            //}

            var weightA = this.getScoreInfo(a.path, this.setType).score;
            var weightB = this.getScoreInfo(b.path, this.setType).score;

            if (this.ascending) {
                return d3.ascending(weightA, weightB);
            }
            return d3.descending(weightA, weightB);
        };

        SetConnectionStrengthSortingStrategy.prototype.getScoreInfo = function (path, setType) {
            var setsPerEdge = [];

            path.edges.forEach(function (edge) {
                    var numSets = 0;
                    pathUtil.forEachEdgeSet(edge, function (type, setId) {
                        if (typeof setType === "undefined" || type === setType) {
                            numSets++;
                        }
                    });
                    setsPerEdge.push(numSets);
                }
            );

            var stats = statisticsUtil.statisticsOf(setsPerEdge);

            return {score: stats[this.stat]};
        };


        function NumericalNodePropertySortingStrategy(stat, label, property) {
            SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, label, "NUMERICAL_PROPERTY");
            this.ascending = false;
            this.property = property;
            this.stat = stat;
        }

        NumericalNodePropertySortingStrategy.prototype = Object.create(SortingStrategy.prototype);
        NumericalNodePropertySortingStrategy.prototype.compare = function (a, b) {
            var scoreA = this.getScoreInfo(a.path).score;
            var scoreB = this.getScoreInfo(b.path).score;

            if (this.ascending) {
                return d3.ascending(scoreA, scoreB);
            }
            return d3.descending(scoreA, scoreB);
        };

        NumericalNodePropertySortingStrategy.prototype.getScoreInfo = function (path) {
            var that = this;
            var propertyValues = [];

            path.nodes.forEach(function (node) {
                    var value = node.properties[that.property];
                    if (typeof value !== "undefined") {
                        propertyValues.push(value);
                    }
                }
            );

            var stats = statisticsUtil.statisticsOf(propertyValues);
            return {score: stats[this.stat]};
        };


        function PathPresenceSortingStrategy(pathIds) {
            SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE, "Specified paths", "SELECTED_PATHS");
            this.pathIds = pathIds;
            this.ascending = false;
        }

        PathPresenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
        PathPresenceSortingStrategy.prototype.setPathIds = function (pathIds) {
            this.pathIds = pathIds;
        };

        PathPresenceSortingStrategy.prototype.compare = function (a, b) {
            var pathPresentA = this.getScoreInfo(a.path).score;
            var pathPresentB = this.getScoreInfo(b.path).score;

            if (this.ascending) {
                return d3.ascending(pathPresentA, pathPresentB);
            }
            return d3.descending(pathPresentA, pathPresentB);

        };

        PathPresenceSortingStrategy.prototype.getScoreInfo = function (path) {
            for (var i = 0; i < this.pathIds.length; i++) {
                if (path.id === this.pathIds[i]) {
                    return {score: 1};
                }
            }
            return {score: 0};
        };

        function NodePresenceSortingStrategy(nodeIds) {
            var nodeNames = nodeIds.map(function (nodeId) {
                var node = dataStore.getNode(nodeId);
                if (node) {
                    return node.properties[config.getNodeNameProperty(node)];
                }
            });
            SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE, "Nodes: " + nodeNames.toString(), "SELECTED_NODES");
            this.nodeIds = nodeIds;
            this.ascending = false;
        }

        NodePresenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
        NodePresenceSortingStrategy.prototype.setNodeIds = function (nodeIds) {
            this.nodeIds = nodeIds;
        };

        NodePresenceSortingStrategy.prototype.compare = function (a, b) {
            var numNodesA = this.getScoreInfo(a.path).score;
            var numNodesB = this.getScoreInfo(b.path).score;

            if (this.ascending) {
                return d3.ascending(numNodesA, numNodesB);
            }
            return d3.descending(numNodesA, numNodesB);
        };

        NodePresenceSortingStrategy.prototype.getScoreInfo = function (path) {
            var numNodes = 0;
            var ids = [];
            this.nodeIds.forEach(function (nodeId) {
                path.nodes.forEach(function (node) {
                    if (node.id.toString() === nodeId.toString()) {
                        numNodes++;
                        ids.push(node.id);
                    }
                });
            });

            return {
                score: numNodes,
                nodeIds: ids
            };
        };


        function SetPresenceSortingStrategy(setIds) {

            var setNames = setIds.map(function (setId) {
                return setInfo.getSetLabel(setId);
            });
            SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE, "Sets: " + setNames.toString(), "SELECTED_SETS");
            this.ascending = false;
            this.setIds = setIds;

        }

        SetPresenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
        SetPresenceSortingStrategy.prototype.setSetIds = function (setIds) {
            this.setIds = setIds;
        };

        SetPresenceSortingStrategy.prototype.compare = function (a, b) {
            var setScoreA = this.getScoreInfo(a.path).score;
            var setScoreB = this.getScoreInfo(b.path).score;

            if (this.ascending) {
                return d3.ascending(setScoreA, setScoreB);
            }
            return d3.descending(setScoreA, setScoreB);

        };

        SetPresenceSortingStrategy.prototype.getScoreInfo = function (path) {
            var numSets = 0;
            var ids = [];
            this.setIds.forEach(function (setId) {
                var setFound = false;
                path.edges.forEach(function (edge) {

                    pathUtil.forEachEdgeSet(edge, function (type, sId) {
                        if (!setFound && sId === setId) {
                            numSets++;
                            setFound = true;
                            ids.push(setId);
                        }
                    });
                });

                if (!setFound) {
                    path.nodes.forEach(function (node) {

                        pathUtil.forEachNodeSet(node, function (type, sId) {
                            if (!setFound && sId === setId) {
                                numSets++;
                                setFound = true;
                                ids.push(setId);
                            }
                        });

                    });
                }
            });

            return {
                score: numSets,
                setIds: ids
            };
        };

        function SelectionSortingStrategy() {
            SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE, "Selected elements", "SELECTED_ELEMENTS");
            this.nodePresenceStrategy = new NodePresenceSortingStrategy([]);
            this.setPresenceStrategy = new SetPresenceSortingStrategy([]);
            this.pathPresenceStrategy = new PathPresenceSortingStrategy([]);
            this.currentStrategy = this.nodePresenceStrategy;
            this.ascending = false;
        }

        SelectionSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
        SelectionSortingStrategy.prototype.setSetIds = function (setIds) {
            this.setPresenceStrategy.setSetIds(setIds);
            this.currentStrategy = this.setPresenceStrategy;
        };

        SelectionSortingStrategy.prototype.setNodeIds = function (nodeIds) {
            this.nodePresenceStrategy.setNodeIds(nodeIds);
            this.currentStrategy = this.nodePresenceStrategy;
        };

        SelectionSortingStrategy.prototype.setPathIds = function (pathIds) {
            this.pathPresenceStrategy.setPathIds(pathIds);
            this.currentStrategy = this.pathPresenceStrategy;
        };

        SelectionSortingStrategy.prototype.compare = function (a, b) {
            this.currentStrategy.ascending = this.ascending;
            return this.currentStrategy.compare(a, b);
        };


        function PathQuerySortingStrategy() {
            SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.FILTER, "Filtered paths", "FILTERED_PATHS");
            this.ascending = false;
        }

        PathQuerySortingStrategy.prototype = Object.create(SortingStrategy.prototype);
        PathQuerySortingStrategy.prototype.setQuery = function (query) {
            this.pathQuery = query;
        };

        PathQuerySortingStrategy.prototype.compare = function (a, b) {

            var scoreA = pathQuery.isPathFiltered(a.path.id) === true ? 0 : 1;
            var scoreB = pathQuery.isPathFiltered(b.path.id) === true ? 0 : 1;
            if (this.ascending) {
                return d3.ascending(scoreA, scoreB);
            }
            return d3.descending(scoreA, scoreB);

        };

        var currentCustomStratId = 0;

        function CustomSortingStrategy(userScoreFunction, label) {
            SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.UNKNOWN, label, "CUSTOM_" + (currentCustomStratId++));
            this.userScoreFunction = userScoreFunction;
        }

        CustomSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
        CustomSortingStrategy.prototype.compare = function (a, b) {

            var scoreA = this.getScoreInfo(a.path).score;
            var scoreB = this.getScoreInfo(b.path).score;
            if (this.ascending) {
                return d3.ascending(scoreA, scoreB);
            }
            return d3.descending(scoreA, scoreB);
        };

        CustomSortingStrategy.prototype.getScoreInfo = function (path) {
            return {score: this.userScoreFunction(path, dataStore.getDataSets(), (pathUtil.getAllSetInfosForNode).bind(pathUtil), (dataStore.getDataForNode).bind(dataStore), (dataStore.getStatsForNode).bind(dataStore))};
        };


        var sortingManager = new sorting.SortingManager(true);

        var sortingStrategies = {
            pathLength: new PathLengthSortingStrategy(),

            pathId: new sorting.IdSortingStrategy(function (pathWrapper) {
                return pathWrapper.path.id
            }, "PATH_ID"),

            //setCountEdgeWeight: new SetConnectionStrengthSortingStrategy(),

            selectionSortingStrategy: new SelectionSortingStrategy(),

            //nodePresenceStrategy: new NodePresenceSortingStrategy([]),
            //
            //setPresenceStrategy: new SetPresenceSortingStrategy([]),

            pathQueryStrategy: new PathQuerySortingStrategy()

        };

        //var pathQuery = new pathQueryModel.NodeMatcher(new pathQueryModel.Or(new pathQueryModel.NodeNameConstraint("C00527"), new pathQueryModel.NodeNameConstraint("C00431")));

        //var pathQuery = new q.NodeMatcher(new q.OrConstraint(new q.AndConstraint(new q.NodeSetPresenceConstraint("hsa01230"), new q.NodeSetPresenceConstraint("hsa00300")), new q.NodeNameConstraint("C00431")));

        //var pathQuery = new q.NodeMatcher(new q.AndConstraint(new q.new q.NodeNameConstraint("C00431"), new q.NodeSetPresenceConstraint("hsa00310")));

        //var pathQuery = new q.QueryMatchRegionRelation(new q.NodeMatcher(new q.NodeNameConstraint("219")), new q.NodeMatcher(new q.NodeNameConstraint("C00527")), q.MatchRegionRelations.subsequent);

        //var pathQuery = new q.QueryMatchRegionRelation(new q.QueryMatchRegionRelation(new q.NodeMatcher(new q.NodeNameConstraint("219")), new q.EdgeMatcher(new q.EdgeSetPresenceConstraint("hsa00071")), q.MatchRegionRelations.equal), new q.NodeMatcher(new q.NodeTypeConstraint("Compound")), q.MatchRegionRelations.subsequent);

        //var pathQuery = new q.QueryMatchRegionRelation(new q.NodeMatcher(new q.NodeNameConstraint("219")), new q.NodeMatcher(new q.NodeTypeConstraint("Compound")), q.MatchRegionRelations.subsequent);

        //var pathQuery = new q.RegionMatcher(new q.NodeMatcher(new q.NodeNameConstraint("219")), new q.MatchRegion(2, 2), true);

        //var pathQuery = new q.Or(new q.RegionMatcher(new q.NodeMatcher(new q.NodeNameConstraint("219")), new q.MatchRegion(2, 2), true), new q.NodeMatcher(new q.NodeNameConstraint("C00164")));

        //var pathQuery = new q.QueryMatchRegionRelation(
        //  new q.QueryMatchRegionRelation(
        //    new q.QueryMatchRegionRelation(
        //      new q.QueryMatchRegionRelation(
        //        new q.QueryMatchRegionRelation(
        //          new q.QueryMatchRegionRelation(
        //            new q.NodeMatcher(new q.NodeNameConstraint("1152")),
        //            new q.EdgeMatcher(new q.EdgeSetPresenceConstraint("hsa00330")), q.MatchRegionRelations.max1EqualsMin2),
        //          new q.NodeMatcher(new q.NodeNameConstraint("219")), q.MatchRegionRelations.subsequent),
        //        new q.EdgeMatcher(new q.EdgeSetPresenceConstraint("hsa00310")), q.MatchRegionRelations.max1EqualsMin2),
        //      new q.NodeMatcher(new q.NodeTypeConstraint("Compound")), q.MatchRegionRelations.subsequent),
        //    new q.EdgeMatcher(new q.EdgeSetPresenceConstraint("hsa00310")), q.MatchRegionRelations.max1EqualsMin2),
        //  new q.NodeMatcher(new  q.NodeNameConstraint("23067")), q.MatchRegionRelations.subsequent);

        //sortingManager.setStrategyChain([sortingStrategies.getPathQueryStrategy(pathQuery), sortingStrategies.pathId]);

        function updateWidgetVisibility() {
            $("#setConnectionStrengthWidgets").css({
                display: $("#setConnectionStrengthRadio").prop("checked") ? "block" : "none"
            });

            $("#nodePropertyWidgets").css({
                display: $("#nodePropertyRadio").prop("checked") ? "block" : "none"
            });

            $("#dataBasedScoreWidgets").css({
                display: $("#dataBasedScoreRadio").prop("checked") ? "block" : "none"
            });

            $("#customScoreWidgets").css({
                display: $("#customScoreRadio").prop("checked") ? "block" : "none"
            });
        }

        function validateSetBasedSortingConfig() {
            var setType = $("#setTypeSelect").val();
            var stat = $("#setStatSelect").val();
            return setType && stat;
        }

        function validateDataBasedSortingConfig() {
            var datasetId = $("#datasetSelect").val();
            var groupId = $("#groupSelect").val();
            var stat = $("#statisticSelect").val();
            var method = "stat"; //$("#methodSelect").val();
            var scope = $("#scopeSelect").val();
            return datasetId && groupId && stat && method && scope;
        }

        function validateNodePropertySortingConfig() {
            var property = $("#propertySelect").val();
            var stat = $("#propertyStatSelect").val();
            return property && stat;
        }

        function validateCustomScoreConfig() {
            return $("#customScoreSelect").val();
        }

        function fillGroupSelect(dataset) {
            var groupSelect = $("#groupSelect");
            groupSelect.empty();
            groupSelect.append("<option value='_all'>All groups</option>");
            groupSelect.val("_all");

            Object.keys(dataset.groups).forEach(function (group) {
                groupSelect.append("<option value='" + group + "'>" + group + "</option>");
            });
        }

        sortingManager.setStrategyChain([sortingStrategies.pathQueryStrategy, sortingStrategies.pathLength, sortingStrategies.pathId]);


        return {
            customSortingStrategies: [],

            init: function () {
                var that = this;
                listeners.add(function (query) {
                    //sortingStrategies.pathQueryStrategy.setQuery(query.getQuery());
                    //sortingManager.addOrReplace(sortingStrategies.getPathQueryStrategy(query.getQuery()));
                    listeners.notify("UPDATE_PATH_SORTING", sortingManager.currentComparator);
                }, listeners.updateType.QUERY_UPDATE);

                //$('#rankConfigModal').on('show', function () {
                //  $(this).find('.modal-body').css({
                //    width:'auto', //probably not needed
                //    height:'auto', //probably not needed
                //    'max-height':'100%'
                //  });
                //});


                function updateCustomSortingStrategyList() {
                    var customScoreSelect = $("#customScoreSelect");
                    customScoreSelect.empty();
                    that.customSortingStrategies.forEach(function (strat) {
                        customScoreSelect.append("<option value='" + strat.id + "'>" + strat.label + "</option>")
                    });
                }

                $("#pathLengthRadio").click(function () {
                    updateWidgetVisibility();
                    //$("#rankScriptConfirm").enable();
                    $("#rankConfigConfirm").prop("disabled", false);
                });
                $("#setConnectionStrengthRadio").click(function () {
                    updateWidgetVisibility();
                    //$("#rankScriptConfirm").toggleEnabled(true);
                    $("#rankConfigConfirm").prop("disabled", !validateSetBasedSortingConfig());
                });
                $("#nodePropertyRadio").click(function () {
                    updateWidgetVisibility();
                    //$("#rankScriptConfirm").toggleEnabled(true);
                    $("#rankConfigConfirm").prop("disabled", !validateNodePropertySortingConfig());
                });
                $("#dataBasedScoreRadio").click(function () {
                    updateWidgetVisibility();
                    //$("#rankScriptConfirm").toggleEnabled(validateDataBasedSortingConfig());
                    $("#rankConfigConfirm").prop("disabled", !validateDataBasedSortingConfig());
                });
                $("#customScoreRadio").click(function () {
                    updateWidgetVisibility();
                    //$("#rankScriptConfirm").toggleEnabled(validateDataBasedSortingConfig());
                    $("#rankConfigConfirm").prop("disabled", !validateCustomScoreConfig());
                });

                $("#setTypeSelect").on("change", function () {
                    $("#rankConfigConfirm").prop("disabled", !validateSetBasedSortingConfig());
                });
                $("#setStatSelect").on("change", function () {
                    $("#rankConfigConfirm").prop("disabled", !validateSetBasedSortingConfig());
                });

                $("#propertySelect").on("change", function () {
                    $("#rankConfigConfirm").prop("disabled", !validateNodePropertySortingConfig());
                });
                $("#propertyStatSelect").on("change", function () {
                    $("#rankConfigConfirm").prop("disabled", !validateNodePropertySortingConfig());
                });

                $("#datasetSelect").on("change", function () {
                    fillGroupSelect(dataStore.getDataSet($(this).val()));
                    $("#rankConfigConfirm").prop("disabled", !validateDataBasedSortingConfig());
                });
                $("#groupSelect").on("change", function () {
                    $("#rankConfigConfirm").prop("disabled", !validateDataBasedSortingConfig());
                });
                $("#statisticSelect").on("change", function () {
                    $("#rankConfigConfirm").prop("disabled", !validateDataBasedSortingConfig());
                });
                $("#methodSelect").on("change", function () {
                    $("#rankConfigConfirm").prop("disabled", !validateDataBasedSortingConfig());
                });
                $("#scopeSelect").on("change", function () {
                    $("#rankConfigConfirm").prop("disabled", !validateDataBasedSortingConfig());
                });

                $("#customScoreSelect").on("change", function () {
                    $("#rankConfigConfirm").prop("disabled", !validateCustomScoreConfig());
                });

                //$("#configureRanking").click(function () {
                //
                //});

                $("#addRanking").click(function () {
                    $("#scriptText").val("var getScore = function(path, datasets, getSetsForNode, getDataForNode, getStatsForNode) {\n" +
                    "//insert code here\n" +
                    "return 0;\n}");

                    $("#rankScriptModal").modal("show");
                });

                $("#rankScriptConfirm").click(function () {

                    var rankScript = $("#scriptText").val();
                    var label = $("#customScriptTitle").val();
                    eval(rankScript);

                    if (getScore) {
                        that.customSortingStrategies.push(new CustomSortingStrategy(getScore, label));
                        updateCustomSortingStrategyList();
                        $("#customScoreSelect").val(that.customSortingStrategies[that.customSortingStrategies.length - 1].id);
                        $("#rankConfigConfirm").prop("disabled", !validateCustomScoreConfig());
                        //listeners.notify("CUSTOM_SORTING_STRATEGY_UPDATE", that.customSortingStrategies);
                    }

                    //var getScoreInfo = function (path, datasets, getSetsForNode, getDataForNode, getStatsForNode) {
                    //  var numSets = 0;
                    //  path.nodes.forEach(function (node) {
                    //    var sets = getSetsForNode(node);
                    //    if (sets) {
                    //      numSets += sets.length;
                    //    }
                    //  });
                    //
                    //  return numSets;
                    //};


                    //if ($("#startOffsetButton").prop("checked")) {
                    //  that.setPosition(parseInt($("#startOffsetInput").val(), 10));
                    //} else if ($("#endOffsetButton").prop("checked")) {
                    //  that.setPosition(-(1 + parseInt($("#endOffsetInput").val(), 10)));
                    //} else {
                    //  that.removePosition();
                    //}
                    //$("#positionConfirm").off("click");
                });
            },

            openConfigureSortingDialog: function (callback) {
                var that = this;
                var datasets = dataStore.getDataSets();

                $("#dataBasedScore").css({
                    display: datasets.length > 0 ? "block" : "none"
                });

                var datasetSelect = $("#datasetSelect");
                datasetSelect.empty();
                datasets.forEach(function (dataset, i) {
                    datasetSelect.append("<option value='" + dataset.info.name + "'>" + dataset.info.title + "</option>");
                    if (i === 0) {
                        datasetSelect.val(dataset.info.name);
                        fillGroupSelect(dataset);
                    }
                });


                var setTypes = setInfo.getSetTypeInfos();

                $("#setConnectionStrength").css({
                    display: setTypes.length > 0 ? "block" : "none"
                });

                var setTypeSelect = $("#setTypeSelect");
                setTypeSelect.empty();
                if (setTypes.length > 1) {
                    setTypeSelect.append("<option value='all'>All</option>");
                    setTypeSelect.val("all");
                }
                setTypes.forEach(function (setType) {
                    setTypeSelect.append("<option value='" + setType.type + "'>" + config.getSetTypeFromSetPropertyName(setType.type) + "</option>");
                    if (setTypes.length === 1) {
                        setTypeSelect.val(setType.type);
                    }
                });

                var properties = dataStore.getAllNodeProperties();

                $("#nodeProperty").css({
                    display: properties.length > 0 ? "block" : "none"
                });

                var propertySelect = $("#propertySelect");
                propertySelect.empty();
                properties.forEach(function (property) {
                    propertySelect.append("<option value='" + property + "'>" + property + "</option>");
                    if (properties.length === 1) {
                        propertySelect.val(property);
                    }
                });


                updateWidgetVisibility();

                $("#rankConfigModal").modal("show");

                $("#rankConfigConfirm").click(function () {

                    if ($("#pathLengthRadio").prop("checked")) {
                        callback(sortingStrategies.pathLength);

                    } else if ($("#setConnectionStrengthRadio").prop("checked")) {
                        var setType = $("#setTypeSelect").val();
                        var stat = $("#setStatSelect").val();
                        var label = stat === "mean" ? "Average set connection strength" : (statisticsUtil.getHumanReadableStat(stat, true) + " set connection strength");
                        callback(setType === "all" ? new SetConnectionStrengthSortingStrategy(stat, label) : new SetConnectionStrengthSortingStrategy(stat, label, setType));

                    } else if ($("#nodePropertyRadio").prop("checked")) {
                        var property = $("#propertySelect").val();
                        var stat = $("#propertyStatSelect").val();
                        var label = stat === "mean" ? "Average " + property : (statisticsUtil.getHumanReadableStat(stat, true) + " " + property);
                        callback(new NumericalNodePropertySortingStrategy(stat, label, property));

                    } else if ($("#dataBasedScoreRadio").prop("checked")) {
                        var datasetId = $("#datasetSelect").val();
                        var stat = $("#statisticSelect").val();
                        var group = $("#groupSelect").val();
                        var method = "stat"; //$("#methodSelect").val();
                        var scope = $("#scopeSelect").val();
                        if (group === "_all") {
                            callback(dataStore.getSortingStrategy(datasetId, stat, method, scope));
                        } else {
                            callback(dataStore.getSortingStrategy(datasetId, stat, method, scope, group));
                        }
                    } else if ($("#customScoreRadio").prop("checked")) {
                        var sortingStrategyId = $("#customScoreSelect").val();
                        for (var i = 0; i < that.customSortingStrategies.length; i++) {
                            var strategy = that.customSortingStrategies[i];
                            if (strategy.id === sortingStrategyId) {
                                callback(strategy);
                                $("#rankConfigConfirm").off("click");
                                return;
                            }
                        }
                    }

                    $("#rankConfigConfirm").off("click");
                });
            },

            addSelectionBasedSortingStrategy: function (strategy) {
                sortingManager.currentStrategyChain.splice(1, 0, strategy);
                sortingManager.setStrategyChain(sortingManager.currentStrategyChain);
            },

            sortingManager: sortingManager,
            sortingStrategies: sortingStrategies,
            updateType: "UPDATE_PATH_SORTING",

            PathPresenceSortingStrategy: PathPresenceSortingStrategy,

            NodePresenceSortingStrategy: NodePresenceSortingStrategy,

            SetPresenceSortingStrategy: SetPresenceSortingStrategy,

            NumericalNodePropertySortingStrategy: NumericalNodePropertySortingStrategy
        }

    }
);
