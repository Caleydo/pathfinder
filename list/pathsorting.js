define(['./../sorting', '../pathutil', '../query/querymodel', '../listeners', '../query/pathquery'], function (sorting, pathUtil, q, listeners, pathQuery) {
    var SortingStrategy = sorting.SortingStrategy;

    //TODO: fetch amount of sets from server
    var totalNumSets = 290;


    function PathLengthSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.WEIGHT, "Path length");
    }

    PathLengthSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    PathLengthSortingStrategy.prototype.compare = function (a, b) {
      if (this.ascending) {
        return d3.ascending(a.path.edges.length, b.path.edges.length);
      }
      return d3.descending(a.path.edges.length, b.path.edges.length);
    };


    function SetCountEdgeWeightSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ID, "Set count edge weight");
    }

    SetCountEdgeWeightSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    SetCountEdgeWeightSortingStrategy.prototype.compare = function (a, b) {
      function calcWeight(pathWrapper) {
        var totalWeight = 0;

        pathWrapper.path.edges.forEach(function (edge) {
            var numSets = 0;
            pathUtil.forEachEdgeSet(edge, function (type, setId) {
              numSets++;
            });

            totalWeight += (totalNumSets - numSets + 1) / totalNumSets;
          }
        );

        return totalWeight;
      }

      var weightA = calcWeight(a);
      var weightB = calcWeight(b);

      if (this.ascending) {
        return d3.ascending(weightA, weightB);
      }
      return d3.descending(weightA, weightB);
    };

    function NodePresenceSortingStrategy(nodeIds) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE, "Selected nodes");
      this.nodeIds = nodeIds;
      this.ascending = false;
    }

    NodePresenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    NodePresenceSortingStrategy.prototype.setNodeIds = function (nodeIds) {
      this.nodeIds = nodeIds;
    };

    NodePresenceSortingStrategy.prototype.compare = function (a, b) {
      var numNodesA = 0;
      var numNodesB = 0;
      this.nodeIds.forEach(function (nodeId) {
        a.path.nodes.forEach(function (node) {
          if (node.id.toString() === nodeId.toString()) {
            numNodesA++;
          }
        });

        b.path.nodes.forEach(function (node) {
          if (node.id.toString() === nodeId.toString()) {
            numNodesB++;
          }
        });
      });

      if (this.ascending) {
        return d3.ascending(numNodesA, numNodesB);
      }
      return d3.descending(numNodesA, numNodesB);

    };


    function SetPresenceSortingStrategy(setIds) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.FILTER, "Selected sets");
      this.ascending = false;
      this.setIds = setIds;

    }

    SetPresenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    SetPresenceSortingStrategy.prototype.setSetIds = function (setIds) {
      this.setIds = setIds;
    };

    SetPresenceSortingStrategy.prototype.compare = function (a, b) {
      var setScoreA = 0;
      var setScoreB = 0;
      this.setIds.forEach(function (setId) {

        //TODO: this score is somewhat awkward as we add node and set occurrences
        var setOccurrencesA = getSetOccurrences(a, setId);
        setScoreA += setOccurrencesA / a.path.nodes.length;
        var setOccurrencesB = getSetOccurrences(b, setId);
        setScoreB += setOccurrencesB / b.path.nodes.length;
      });

      if (this.ascending) {
        return d3.ascending(setScoreA, setScoreB);
      }
      return d3.descending(setScoreA, setScoreB);

      function getSetOccurrences(pathWrapper, setId) {
        var numSetOccurrences = 0;
        pathWrapper.path.edges.forEach(function (edge) {

          pathUtil.forEachEdgeSet(edge, function (type, sId) {
            if (sId === setId) {
              numSetOccurrences++;
            }
          });
        });

        pathWrapper.path.nodes.forEach(function (node) {

          pathUtil.forEachNodeSet(node, function (type, sId) {
            if (sId === setId) {
              numSetOccurrences++;
            }
          });

        });

        return numSetOccurrences;

      }

    };

    function SelectionSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE, "Selected elements");
      this.nodePresenceStrategy = new NodePresenceSortingStrategy([]);
      this.setPresenceStrategy = new SetPresenceSortingStrategy([]);
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

    SelectionSortingStrategy.prototype.compare = function (a, b) {
      this.currentStrategy.ascending = this.ascending;
      return this.currentStrategy.compare(a, b);
    };


    function PathQuerySortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.FILTER, "Filtered paths");
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

    var sortingManager = new sorting.SortingManager(true);

    var sortingStrategies = {
      pathLength: new PathLengthSortingStrategy(),

      pathId: new sorting.IdSortingStrategy(function (pathWrapper) {
        return pathWrapper.path.id
      }),

      setCountEdgeWeight: new SetCountEdgeWeightSortingStrategy(),

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


    sortingManager.setStrategyChain([sortingStrategies.pathQueryStrategy, sortingStrategies.selectionSortingStrategy, sortingStrategies.pathLength, sortingStrategies.pathId]);


    return {
      init: function () {
        listeners.add(function (query) {
          //sortingStrategies.pathQueryStrategy.setQuery(query.getQuery());
          //sortingManager.addOrReplace(sortingStrategies.getPathQueryStrategy(query.getQuery()));
          listeners.notify("UPDATE_PATH_SORTING", sortingManager.currentComparator);
        }, listeners.updateType.QUERY_UPDATE);
      },

      sortingManager: sortingManager,
      sortingStrategies: sortingStrategies,
      updateType: "UPDATE_PATH_SORTING"
    }

  }
);
