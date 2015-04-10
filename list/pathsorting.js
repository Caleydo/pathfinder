define(['./../sorting', '../pathutil', '../query/querymodel', '../listeners'], function (sorting, pathUtil, q, listeners) {
    var SortingStrategy = sorting.SortingStrategy;

    //TODO: fetch amount of sets from server
    var totalNumSets = 290;


    function PathLengthSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.WEIGHT);
    }

    PathLengthSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    PathLengthSortingStrategy.prototype.compare = function (a, b) {
      if (sortingManager.ascending) {
        return d3.ascending(a.path.edges.length, b.path.edges.length);
      }
      return d3.descending(a.path.edges.length, b.path.edges.length);
    };


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
    };

    function NodePresenceSortingStrategy(nodeIds) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.PRESENCE);
      this.compare = function (a, b) {
        var numNodesA = 0;
        var numNodesB = 0;
        nodeIds.forEach(function (nodeId) {
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

        //Inverse definition of ascending and descending, as more nodes should be ranked higher
        if (sortingManager.ascending) {
          return d3.descending(numNodesA, numNodesB);
        }
        return d3.ascending(numNodesA, numNodesB);
      }
    }

    NodePresenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

    function PathQuerySortingStrategy(pathQuery) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.FILTER);
      this.pathQuery = pathQuery;
    }

    PathQuerySortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    PathQuerySortingStrategy.prototype.compare = function (a, b) {
      var scoreA = this.pathQuery.match(a.path) === true ? 1 : 0;
      var scoreB = this.pathQuery.match(b.path) === true ? 1 : 0;
      if (sortingManager.ascending) {
        return d3.descending(scoreA, scoreB);
      }
      return d3.ascending(scoreA, scoreB);
    };

    function SetPresenceSortingStrategy(setIds) {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.FILTER);
      this.compare = function (a, b) {
        var setScoreA = 0;
        var setScoreB = 0;
        setIds.forEach(function (setId) {

          //TODO: this score is somewhat awkward as we add node and set occurrences
          var setOccurrencesA = getSetOccurrences(a, setId);
          setScoreA += setOccurrencesA / a.path.nodes.length;
          var setOccurrencesB = getSetOccurrences(b, setId);
          setScoreB += setOccurrencesB / b.path.nodes.length;
        });

        //Inverse definition of ascending and descending, as higher score should be ranked higher
        if (sortingManager.ascending) {
          return d3.descending(setScoreA, setScoreB);
        }
        return d3.ascending(setScoreA, setScoreB);
      };

      function getSetOccurrences(pathWrapper, setId) {
        var numSetOccurrences = 0;
        pathWrapper.path.edges.forEach(function (edge) {

          pathUtil.forEachEdgeSet(edge, function (type, sId) {
            if (sId === setId) {
              numSetOccurrences++;
            }
          });

          //for (var key in edge.properties) {
          //  if (pathUtil.isEdgeSetProperty(key)) {
          //    var property = edge.properties[key];
          //    if (property instanceof Array) {
          //      for (var i = 0; i < property.length; i++) {
          //        if (property[i] === setId) {
          //          numSetOccurrences++
          //        }
          //      }
          //    } else if (property === setId) {
          //      numSetOccurrences++;
          //    }
          //  }
          //}
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
    }

    SetPresenceSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

    var sortingManager = new sorting.SortingManager(true);

    var sortingStrategies = {
      pathLength: new PathLengthSortingStrategy(),

      pathId: new sorting.IdSortingStrategy(sortingManager, function (pathWrapper) {
        return pathWrapper.path.id
      }),

      setCountEdgeWeight: new SetCountEdgeWeightSortingStrategy(),

      getNodePresenceStrategy: function (nodeIds) {
        return new NodePresenceSortingStrategy(nodeIds);
      },

      getSetPresenceStrategy: function (setIds) {
        return new SetPresenceSortingStrategy(setIds);
      },

      getPathQueryStrategy: function (pathQuery) {
        return new PathQuerySortingStrategy(pathQuery);
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


    sortingManager.setStrategyChain([sortingStrategies.setCountEdgeWeight, sortingStrategies.pathId]);


    return {
      init: function () {
        listeners.add(function (query) {
          sortingManager.addOrReplace(sortingStrategies.getPathQueryStrategy(query.getQuery()));
          listeners.notify("UPDATE_PATH_SORTING", sortingManager.currentComparator);
        }, listeners.updateType.QUERY_UPDATE);
      },

      sortingManager: sortingManager,
      sortingStrategies: sortingStrategies,
      updateType: "UPDATE_PATH_SORTING"
    }

  }
);
