define(['./sorting'], function (sorting) {
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

        pathWrapper.path.nodes.forEach(function (node) {
          for (var key in node.properties) {
            if (isSetProperty(key)) {
              var property = node.properties[key];
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

        function isSetProperty(key) {
          return key !== "id" && key !== "idType" && key !== "name";
        }

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


    return {
      sortingManager: sortingManager,
      sortingStrategies: sortingStrategies,
      updateType: "UPDATE_PATH_SORTING"
    }

  }
)
