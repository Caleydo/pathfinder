define(['../../sorting', '../../pathutil', '../../query/querymodel', '../../listeners'], function (sorting, pathUtil, q, listeners) {
    var SortingStrategy = sorting.SortingStrategy;

    function NumPathsSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.WEIGHT, "Number of paths");
    }

    NumPathsSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    NumPathsSortingStrategy.prototype.compare = function (a, b) {
      //reversed for now
      if (sortingManager.ascending) {
        return d3.descending(a.paths.length, b.paths.length);
      }
      return d3.ascending(a.paths.length, b.paths.length);
    };

    var sortingManager = new sorting.SortingManager(true);

    sortingManager.reset = function () {
      this.currentStrategyChain = [sortingStrategies.numPaths, sortingStrategies.aggregateId];
      this.currentComparator = sorting.getComparatorFromStrategyChain(this.currentStrategyChain);
    };

    var sortingStrategies = {
      aggregateId: new sorting.IdSortingStrategy(sortingManager, function (aggregate) {
        return aggregate.id
      }),
      numPaths: new NumPathsSortingStrategy()
    };


    sortingManager.setStrategyChain([sortingStrategies.numPaths, sortingStrategies.aggregateId]);


    return {
      sortingManager: sortingManager,
      sortingStrategies: sortingStrategies,
      updateType: "UPDATE_AGGREGATE_SORTING"
    }

  }
);
