define(['jquery', '../sorting', '../pathutil', '../query/querymodel', '../listeners', '../query/pathquery', '../datastore', '../setinfo', '../config', '../statisticsutil', './path/settings', '../settings/visibilitysettings'],
  function ($, sorting, pathUtil, q, listeners, pathQuery, dataStore, setInfo, config, statisticsUtil, pathSettings, visibilitySettings) {
    var SortingStrategy = sorting.SortingStrategy;

    //TODO: fetch amount of sets from server
    var totalNumSets = 290;


    function PathLengthSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.WEIGHT, "Length", "PATH_LENGTH");
    }

    PathLengthSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    PathLengthSortingStrategy.prototype.compare = function (a, b) {
      if (this.ascending) {
        return d3.ascending(a.path.edges.length, b.path.edges.length);
      }
      return d3.descending(a.path.edges.length, b.path.edges.length);
    };

    PathLengthSortingStrategy.prototype.getScoreInfo = PathLengthSortingStrategy.prototype.getInherentScoreInfo = function (path) {
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

      var weightA = this.getInherentScoreInfo(a.path).score;
      var weightB = this.getInherentScoreInfo(b.path).score;

      if (this.ascending) {
        return d3.ascending(weightA, weightB);
      }
      return d3.descending(weightA, weightB);
    };

    SetConnectionStrengthSortingStrategy.prototype.getInherentScoreInfo = function (path) {
      return this.getScoreInfo(path, this.setType);
    };

    SetConnectionStrengthSortingStrategy.prototype.getScoreInfo = function (path, setType) {
      var setsPerEdge = [];

      path.edges.forEach(function (edge) {
          var numSets = 0;
          pathUtil.forEachEdgeSet(edge, function (type, setId) {
            if (typeof setType === "undefined" || type === setType) {
              if((!config.isSetTypeEdgeOrigin(type) || config.isSetOriginOfEdge(setId, edge))) {
                numSets++;
              }
            }
          });
          setsPerEdge.push(numSets);
        }
      );

      var stats = statisticsUtil.statisticsOf(setsPerEdge);

      return {score: stats[this.stat]};
    };


    function NumericalPerNodeSortingStrategy(stat, label, propertyAccessor, id) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ATTRIBUTE, label, id);
      this.ascending = false;
      this.accessor = propertyAccessor;
      this.stat = stat;
    }

    NumericalPerNodeSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    NumericalPerNodeSortingStrategy.prototype.compare = function (a, b) {
      var scoreA = this.getScoreInfo(a.path).score;
      var scoreB = this.getScoreInfo(b.path).score;

      if (this.ascending) {
        return d3.ascending(scoreA, scoreB);
      }
      return d3.descending(scoreA, scoreB);
    };

    NumericalPerNodeSortingStrategy.prototype.getScoreInfo = NumericalPerNodeSortingStrategy.prototype.getInherentScoreInfo = function (path) {
      var that = this;
      var propertyValues = [];

      path.nodes.forEach(function (node) {
          var value = that.accessor(node);
          if (typeof value !== "undefined") {
            propertyValues.push(value);
          }
        }
      );

      var stats = statisticsUtil.statisticsOf(propertyValues);
      return {score: stats[this.stat]};
    };

    function NumericalTableAttributeSortingStrategy(datasetId, stat, label, attribute) {
      NumericalPerNodeSortingStrategy.call(this, stat, label, function (node) {
        var data = dataStore.getTableAttributeForNode(node, datasetId, attribute);
        if (typeof data !== "undefined") {
          if (data instanceof Array) {
            return statisticsUtil.statisticsOf(data)[stat];
          }
          return data;
        }
      }, "NUMERICAL_TABLE_ATTRIBUTE");
      this.datasetId = datasetId;
      this.attribute = attribute;
    }

    NumericalTableAttributeSortingStrategy.prototype = Object.create(NumericalPerNodeSortingStrategy.prototype);

    function NumericalNodePropertySortingStrategy(stat, label, property) {
      NumericalPerNodeSortingStrategy.call(this, stat, label, function (node) {
        return node.properties[property];
      }, "NUMERICAL_PROPERTY");
      this.property = property;
    }

    NumericalNodePropertySortingStrategy.prototype = Object.create(NumericalPerNodeSortingStrategy.prototype);


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

    PathPresenceSortingStrategy.prototype.getScoreInfo = PathPresenceSortingStrategy.prototype.getInherentScoreInfo = function (path) {
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

    NodePresenceSortingStrategy.prototype.getScoreInfo = NodePresenceSortingStrategy.prototype.getInherentScoreInfo = function (path) {
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

    SetPresenceSortingStrategy.prototype.getScoreInfo = SetPresenceSortingStrategy.prototype.getInherentScoreInfo = function (path) {
      var numSets = 0;
      var ids = [];
      this.setIds.forEach(function (setId) {
        var setFound = false;
        if (visibilitySettings.isShowNonEdgeSets()) {
          path.nodes.forEach(function (node) {

            pathUtil.forEachNodeSet(node, function (type, sId) {
              if (!setFound && sId === setId) {
                numSets++;
                setFound = true;
                ids.push(setId);
              }
            });

          });
        } else {
          path.edges.forEach(function (edge) {

            pathUtil.forEachEdgeSet(edge, function (type, sId) {
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


    function ReferencePathDifferenceSortingStrategy(wrappee) {
      SortingStrategy.call(this, wrappee.type, "Difference to reference path in " + wrappee.label, "REFERENCE_PATH_DIFFERENCE");
      this.wrappee = wrappee;
    }

    ReferencePathDifferenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

    ReferencePathDifferenceSortingStrategy.prototype.compare = function (a, b) {


      //Make sure that the reference path is always ranked on top/bottom
      var scoreA = a.path.id === pathSettings.referencePathId ? -1 : this.getInherentScoreInfo(a.path).score;
      var scoreB = b.path.id === pathSettings.referencePathId ? -1 : this.getInherentScoreInfo(b.path).score;
      if (this.ascending) {
        return d3.ascending(scoreA, scoreB);
      }
      return d3.descending(scoreA, scoreB);
    };

    ReferencePathDifferenceSortingStrategy.prototype.getInherentScoreInfo = function (path) {
      if (typeof pathSettings.referencePathId !== "undefined") {
        var referencePath = dataStore.getPath(pathSettings.referencePathId);
        if (referencePath) {
          var refPathScoreInfo = this.wrappee.getInherentScoreInfo(referencePath);
          var scoreInfo = this.wrappee.getInherentScoreInfo(path);
          return {
            score: Math.abs(refPathScoreInfo.score - scoreInfo.score),
            refPathScoreInfo: refPathScoreInfo,
            pathScoreInfo: scoreInfo,
            hideScore: pathSettings.referencePathId === path.id
          };
        }
      }

      return {score: 0};
    };

    ReferencePathDifferenceSortingStrategy.prototype.getScoreInfo = function (path) {

      if (typeof pathSettings.referencePathId !== "undefined") {
        var referencePath = dataStore.getPath(pathSettings.referencePathId);
        if (referencePath) {

          var refArgs = Array.prototype.slice.call(arguments);
          refArgs[0] = referencePath;
          //Pass any parameters to the wrappee
          var refPathScoreInfo = this.wrappee.getScoreInfo.apply(this.wrappee, refArgs);
          var scoreInfo = this.wrappee.getScoreInfo.apply(this.wrappee, arguments);
          return {
            score: Math.abs(refPathScoreInfo.score - scoreInfo.score),
            refPathScoreInfo: refPathScoreInfo,
            pathScoreInfo: scoreInfo,
            hideScore: pathSettings.referencePathId === path.id
          };
        }
      }

      return {score: 0};

    };

    function CommonNodesWithRefPathSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.UNKNOWN, "Shared nodes to path length ratio", "COMMON_NODES");
      this.ascending = false;
    }

    CommonNodesWithRefPathSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

    CommonNodesWithRefPathSortingStrategy.prototype.compare = function (a, b) {

      //Make sure that the reference path is always ranked on top/bottom
      var scoreA = a.path.id === pathSettings.referencePathId ? 2 : this.getInherentScoreInfo(a.path).score;
      var scoreB = b.path.id === pathSettings.referencePathId ? 2 : this.getInherentScoreInfo(b.path).score;
      if (this.ascending) {
        return d3.ascending(scoreA, scoreB);
      }
      return d3.descending(scoreA, scoreB);
    };

    CommonNodesWithRefPathSortingStrategy.prototype.getInherentScoreInfo = function (path) {
      return this.getScoreInfo(path);
    };

    CommonNodesWithRefPathSortingStrategy.prototype.getScoreInfo = function (path) {

      if (typeof pathSettings.referencePathId !== "undefined") {
        var referencePath = dataStore.getPath(pathSettings.referencePathId);
        var commonNodeIds = pathUtil.getCommonNodes(referencePath, path).map(function (node) {
          return node.id;
        });
        if (referencePath) {
          var score = commonNodeIds.length / path.nodes.length;
          return {
            score: score,
            idType: "node",
            ids: commonNodeIds,
            hideScore: pathSettings.referencePathId === path.id
          };
        }
      }
      return {
        score: 0
      };

    };

    function CommonSetsWithRefPathSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.UNKNOWN, "Shared sets in non-shared nodes", "COMMON_SETS");
      this.ascending = false;
    }

    CommonSetsWithRefPathSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

    CommonSetsWithRefPathSortingStrategy.prototype.compare = function (a, b) {

      //Make sure that the reference path is always ranked on top/bottom
      var scoreA = a.path.id === pathSettings.referencePathId ? Number.POSITIVE_INFINITY : this.getInherentScoreInfo(a.path).score;
      var scoreB = b.path.id === pathSettings.referencePathId ? Number.POSITIVE_INFINITY : this.getInherentScoreInfo(b.path).score;
      if (this.ascending) {
        return d3.ascending(scoreA, scoreB);
      }
      return d3.descending(scoreA, scoreB);
    };

    CommonSetsWithRefPathSortingStrategy.prototype.getInherentScoreInfo = function (path) {
      return this.getScoreInfo(path);
    };

    CommonSetsWithRefPathSortingStrategy.prototype.getScoreInfo = function (path) {

      if (typeof pathSettings.referencePathId !== "undefined") {
        var referencePath = dataStore.getPath(pathSettings.referencePathId);
        if (referencePath) {

          var commonSets = [];
          var nonCommonNodes = pathUtil.getNonCommonNodesOfPath(path, referencePath);

          var refPathSetIds = visibilitySettings.isShowNonEdgeSets() ? pathUtil.getSetIdsOfNodes(referencePath.nodes) : pathUtil.getSetIdsOfEdges(referencePath.edges);
          var setIds = d3.set(pathUtil.getSetIdsOfNodes(nonCommonNodes));
          var refPathSetIdsSet = d3.set(refPathSetIds);

          if (!visibilitySettings.isShowNonEdgeSets()) {
            var edgeSetIds = pathUtil.getSetIdsOfEdges(path.edges);
            var tmp = d3.set([]);
            edgeSetIds.forEach(function (setId) {
              if (setIds.has(setId)) {
                tmp.add(setId);
              }
            });
            setIds = tmp;
          }

          setIds.forEach(function (setId) {
            if (refPathSetIdsSet.has(setId)) {
              commonSets.push(setId);
            }
          });


          return {
            score: commonSets.length,
            idType: "set",
            ids: commonSets,
            hideScore: pathSettings.referencePathId === path.id
          };

        }
      }

      return {score: 0};
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

    CustomSortingStrategy.prototype.getScoreInfo = CustomSortingStrategy.prototype.getInherentScoreInfo = function (path) {
      return {score: this.userScoreFunction(path, dataStore.getPath(pathSettings.referencePathId), dataStore.getDataSets(), (pathUtil.getAllSetInfosForNode).bind(pathUtil), (dataStore.getMatrixDataForNode).bind(dataStore), (dataStore.getMatrixStatsForNode).bind(dataStore), (dataStore.getTableAttributeForNode).bind(dataStore))};
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

      $("#referencePathScoreWidgets").css({
        display: $("#referencePathScoreRadio").prop("checked") ? "block" : "none"
      });

      $("#customScoreWidgets").css({
        display: $("#customScoreRadio").prop("checked") ? "block" : "none"
      });

      $("#diffToReferencePathWidgets").css({
        display: $("#referencePathScoreRadio").prop("checked") ? "none" : "block"
      });
    }

    function validateSetBasedSortingConfig() {
      var setType = $("#setTypeSelect").val();
      var stat = $("#setStatSelect").val();
      return setType && stat;
    }

    function validateDataBasedSortingConfig() {
      var datasetId = $("#datasetSelect").val();
      if (!datasetId) {
        return false;
      }
      var dataset = dataStore.getDataSet(datasetId);
      if (dataset.info.type === "matrix") {
        var groupId = $("#groupSelect").val();
        var stat = $("#statisticSelect").val();
        //var method = "stat"; //$("#methodSelect").val();
        var scope = $("#scopeSelect").val();

        return groupId && stat && scope;
      } else {
        var attribute = $("#attributeSelect").val();
        var stat = $("#attributeStatSelect").val();
        return attribute && stat;
      }
    }

    function validateNodePropertySortingConfig() {
      var property = $("#propertySelect").val();
      var stat = $("#propertyStatSelect").val();
      return property && stat;
    }

    function validateRefPathSortingConfig() {
      return $("#referencePathScoreSelect").val();
    }

    function validateCustomScoreConfig() {
      return $("#customScoreSelect").val();
    }

    function fillGroupSelect(dataset) {
      if (dataset.info.type === "matrix") {
        var groupSelect = $("#groupSelect");
        groupSelect.empty();
        groupSelect.append("<option value='_all'>All groups</option>");
        groupSelect.val("_all");

        Object.keys(dataset.groups).forEach(function (group) {
          groupSelect.append("<option value='" + group + "'>" + group + "</option>");
        });
      }
    }

    function fillAttributeSelect(dataset) {
      if (dataset.info.type === "table") {
        var attributeSelect = $("#attributeSelect");
        attributeSelect.empty();

        dataset.info.columns.forEach(function (col) {
          if (col.value.type === "real") {
            attributeSelect.append("<option value='" + col.name + "'>" + col.name + "</option>");
          }
        });

      }
    }

    function updateToDatasetSelection(datasetId) {
      var dataset = dataStore.getDataSet(datasetId);
      if (dataset.info.type === "matrix") {
        $("#matrixDatasetWidgets").css("display", "inline-block");
        $("#tableDatasetWidgets").css("display", "none");
        fillGroupSelect(dataset);
      } else {
        $("#matrixDatasetWidgets").css("display", "none");
        $("#tableDatasetWidgets").css("display", "inline-block");
        fillAttributeSelect(dataset);
      }
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
        $("#referencePathScoreRadio").click(function () {
          updateWidgetVisibility();
          //$("#rankScriptConfirm").toggleEnabled(validateDataBasedSortingConfig());
          $("#rankConfigConfirm").prop("disabled", !validateRefPathSortingConfig());
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
          updateToDatasetSelection($(this).val());
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

        $("#attributeSelect").on("change", function () {
          $("#rankConfigConfirm").prop("disabled", !validateDataBasedSortingConfig());
        });

        $("#attributeStatSelect").on("change", function () {
          $("#rankConfigConfirm").prop("disabled", !validateDataBasedSortingConfig());
        });

        $("#referencePathScoreSelect").on("change", function () {
          $("#rankConfigConfirm").prop("disabled", !validateRefPathSortingConfig());
        });

        $("#customScoreSelect").on("change", function () {
          $("#rankConfigConfirm").prop("disabled", !validateCustomScoreConfig());
        });

        //$("#configureRanking").click(function () {
        //
        //});

        $("#addRanking").click(function () {
          $("#scriptText").val("var getScore = function(path, referencePath, datasets, getSetsForNode, getMatrixDataForNode, getMatrixStatsForNode, getTableAttributeForNode) {\n" +
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

          //var getScoreInfo = function (path, datasets, getSetsForNode, getMatrixDataForNode, getMatrixStatsForNode) {
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
          datasetSelect.append("<option value='" + dataset.info.id + "'>" + dataset.info.name + "</option>");
          if (i === 0) {
            datasetSelect.val(dataset.info.id);
            updateToDatasetSelection(dataset.info.id);
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

          $("#rankConfigConfirm").off("click");

          var useDiffToReferencePath = $("#diffToReferencePath").prop("checked");
          var sortingStrategy = 0;

          if ($("#pathLengthRadio").prop("checked")) {
            sortingStrategy = sortingStrategies.pathLength;
          } else if ($("#setConnectionStrengthRadio").prop("checked")) {
            var setType = $("#setTypeSelect").val();
            var stat = $("#setStatSelect").val();
            var label = stat === "mean" ? "Average set connection strength" : (statisticsUtil.getHumanReadableStat(stat, true) + " set connection strength");
            sortingStrategy = setType === "all" ? new SetConnectionStrengthSortingStrategy(stat, label) : new SetConnectionStrengthSortingStrategy(stat, label, setType);

          } else if ($("#nodePropertyRadio").prop("checked")) {
            var property = $("#propertySelect").val();
            var stat = $("#propertyStatSelect").val();
            var label = stat === "mean" ? "Average " + property : (statisticsUtil.getHumanReadableStat(stat, true) + " " + property);
            sortingStrategy = new NumericalNodePropertySortingStrategy(stat, label, property);
          } else if ($("#dataBasedScoreRadio").prop("checked")) {
            var datasetId = $("#datasetSelect").val();

            var dataset = dataStore.getDataSet(datasetId);
            if (dataset.info.type === "matrix") {
              var stat = $("#statisticSelect").val();
              var group = $("#groupSelect").val();
              var method = "stat"; //$("#methodSelect").val();
              var scope = $("#scopeSelect").val();
              if (group === "_all") {
                sortingStrategy = dataStore.getSortingStrategy(datasetId, stat, method, scope);
              } else {
                sortingStrategy = dataStore.getSortingStrategy(datasetId, stat, method, scope, group);
              }
            } else {
              var attribute = $("#attributeSelect").val();
              var stat = $("#attributeStatSelect").val();
              var label = stat === "mean" ? "Average " + attribute : (statisticsUtil.getHumanReadableStat(stat, true) + " " + attribute);
              sortingStrategy = new NumericalTableAttributeSortingStrategy(datasetId, stat, label, attribute);

            }
          } else if ($("#referencePathScoreRadio").prop("checked")) {

            switch ($("#referencePathScoreSelect").val()) {
              case "commonNodes":
                sortingStrategy = new CommonNodesWithRefPathSortingStrategy();
                break;
              case "commonSets":
                sortingStrategy = new CommonSetsWithRefPathSortingStrategy();
                break;
            }

          } else if ($("#customScoreRadio").prop("checked")) {
            var sortingStrategyId = $("#customScoreSelect").val();
            for (var i = 0; i < that.customSortingStrategies.length; i++) {
              var strategy = that.customSortingStrategies[i];
              if (strategy.id === sortingStrategyId) {
                sortingStrategy = strategy;
              }
            }
          }

          callback(useDiffToReferencePath ? new ReferencePathDifferenceSortingStrategy(sortingStrategy) : sortingStrategy);


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

      NumericalNodePropertySortingStrategy: NumericalPerNodeSortingStrategy
    }

  }
)
;
