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

    PathLengthSortingStrategy.prototype.getScore = function (path) {
      return path.edges.length;
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

      var weightA = this.getScore(a.path, this.setType);
      var weightB = this.getScore(b.path, this.setType);

      if (this.ascending) {
        return d3.ascending(weightA, weightB);
      }
      return d3.descending(weightA, weightB);
    };

    SetConnectionStrengthSortingStrategy.prototype.getScore = function (path, setType) {
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

      return stats[this.stat];
    };

    function PathPresenceSortingStrategy(pathIds) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE, "Selected paths", "SELECTED_PATHS");
      this.pathIds = pathIds;
      this.ascending = false;
    }

    PathPresenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    PathPresenceSortingStrategy.prototype.setPathIds = function (pathIds) {
      this.pathIds = pathIds;
    };

    PathPresenceSortingStrategy.prototype.compare = function (a, b) {
      var pathPresentA = this.getScore(a.path);
      var pathPresentB = this.getScore(b.path);

      if (this.ascending) {
        return d3.ascending(pathPresentA, pathPresentB);
      }
      return d3.descending(pathPresentA, pathPresentB);

    };

    PathPresenceSortingStrategy.prototype.getScore = function (path) {
      for (var i = 0; i < this.pathIds.length; i++) {
        if (path.id === this.pathIds[i]) {
          return 1;
        }
      }
      return 0;
    };

    function NodePresenceSortingStrategy(nodeIds) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE, "Selected nodes", "SELECTED_NODES");
      this.nodeIds = nodeIds;
      this.ascending = false;
    }

    NodePresenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    NodePresenceSortingStrategy.prototype.setNodeIds = function (nodeIds) {
      this.nodeIds = nodeIds;
    };

    NodePresenceSortingStrategy.prototype.compare = function (a, b) {
      var numNodesA = this.getScore(a.path);
      var numNodesB = this.getScore(b.path);

      if (this.ascending) {
        return d3.ascending(numNodesA, numNodesB);
      }
      return d3.descending(numNodesA, numNodesB);
    };

    NodePresenceSortingStrategy.prototype.getScore = function (path) {
      var numNodes = 0;
      this.nodeIds.forEach(function (nodeId) {
        path.nodes.forEach(function (node) {
          if (node.id.toString() === nodeId.toString()) {
            numNodes++;
          }
        });
      });

      return numNodes;
    };


    function SetPresenceSortingStrategy(setIds) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE, "Selected sets", "SELECTED_SETS");
      this.ascending = false;
      this.setIds = setIds;

    }

    SetPresenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    SetPresenceSortingStrategy.prototype.setSetIds = function (setIds) {
      this.setIds = setIds;
    };

    SetPresenceSortingStrategy.prototype.compare = function (a, b) {
      var setScoreA = this.getScore(a.path);
      var setScoreB = this.getScore(b.path);

      if (this.ascending) {
        return d3.ascending(setScoreA, setScoreB);
      }
      return d3.descending(setScoreA, setScoreB);

    };

    SetPresenceSortingStrategy.prototype.getScore = function (path) {
      var numSets = 0;
      this.setIds.forEach(function (setId) {
        var setFound = false;
        path.edges.forEach(function (edge) {

          pathUtil.forEachEdgeSet(edge, function (type, sId) {
            if (!setFound && sId === setId) {
              numSets++;
              setFound = true;
            }
          });
        });

        if (!setFound) {
          path.nodes.forEach(function (node) {

            pathUtil.forEachNodeSet(node, function (type, sId) {
              if (!setFound && sId === setId) {
                numSets++;
                setFound = true;
              }
            });

          });
        }
      });

      return numSets;
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

      var scoreA = this.getScore(a.path);
      var scoreB = this.getScore(b.path);
      if (this.ascending) {
        return d3.ascending(scoreA, scoreB);
      }
      return d3.descending(scoreA, scoreB);
    };

    CustomSortingStrategy.prototype.getScore = function (path) {
      return this.userScoreFunction(path, dataStore.getDataSets(), (pathUtil.getAllSetInfosForNode).bind(pathUtil), (dataStore.getDataForNode).bind(dataStore), (dataStore.getStatsForNode).bind(dataStore));
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
      var stat = $("#statisticSelect").val();
      var method = "stat"; //$("#methodSelect").val();
      var scope = $("#scopeSelect").val();
      return datasetId && stat && method && scope;
    }

    function validateCustomScoreConfig() {
      return $("#customScoreSelect").val();
    }

    sortingManager.setStrategyChain([sortingStrategies.pathQueryStrategy, sortingStrategies.selectionSortingStrategy, sortingStrategies.pathLength, sortingStrategies.pathId]);


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
            customScoreSelect.append("<option label='" + strat.label + "'>" + strat.id + "</option>")
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

        $("#datasetSelect").on("change", function () {
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

          //var getScore = function (path, datasets, getSetsForNode, getDataForNode, getStatsForNode) {
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
          datasetSelect.append("<option label='" + dataset.info.title + "'>" + dataset.info.name + "</option>");
          if (i === 0) {
            datasetSelect.val(dataset.info.name);
          }
        });

        var setTypes = setInfo.getSetTypeInfos();

        $("#setConnectionStrength").css({
          display: setTypes.length > 0 ? "block" : "none"
        });

        var setTypeSelect = $("#setTypeSelect");
        setTypeSelect.empty();
        if (setTypes.length > 1) {
          setTypeSelect.append("<option label='All'>all</option>");
          setTypeSelect.val("all");
        }
        setTypes.forEach(function (setType) {
          setTypeSelect.append("<option label='" + config.getSetTypeFromSetPropertyName(setType.type) + "'>" + setType.type + "</option>");
          if (setTypes.length === 1) {
            setTypeSelect.val(setType.type);
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

          } else if ($("#dataBasedScoreRadio").prop("checked")) {
            var datasetId = $("#datasetSelect").val();
            var stat = $("#statisticSelect").val();
            var method = "stat"; //$("#methodSelect").val();
            var scope = $("#scopeSelect").val();

            callback(dataStore.getSortingStrategy(datasetId, stat, method, scope));
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
        sortingManager.currentStrategyChain.splice(0, 0, strategy);
        sortingManager.setStrategyChain(sortingManager.currentStrategyChain);
      },

      sortingManager: sortingManager,
      sortingStrategies: sortingStrategies,
      updateType: "UPDATE_PATH_SORTING",

      PathPresenceSortingStrategy: PathPresenceSortingStrategy,

      NodePresenceSortingStrategy: NodePresenceSortingStrategy,

      SetPresenceSortingStrategy: SetPresenceSortingStrategy
    }

  }
);
