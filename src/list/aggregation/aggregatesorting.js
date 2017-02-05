define(['../../sorting', '../../pathutil', '../../query/querymodel', '../../listeners'], function (sorting, pathUtil, q, listeners) {
    var SortingStrategy = sorting.SortingStrategy;

    function NumPathsSortingStrategy() {
      SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.WEIGHT, "Number of paths", "NUM_PATHS");
      this.ascending = false;
    }

    NumPathsSortingStrategy.prototype = Object.create(SortingStrategy.prototype);
    NumPathsSortingStrategy.prototype.compare = function (a, b) {

      if (this.ascending) {
        return d3.ascending(a.paths.length, b.paths.length);
      }
      return d3.descending(a.paths.length, b.paths.length);

    };

    var sortingManager = new sorting.SortingManager(true);

    sortingManager.reset = function () {
      this.currentStrategyChain = [sortingStrategies.numVisiblePaths, sortingStrategies.aggregateId];
      this.currentComparator = sorting.getComparatorFromStrategyChain(this.currentStrategyChain);
    };

    var sortingStrategies = {
      aggregateId: new sorting.IdSortingStrategy(function (aggregate) {
        return aggregate.id
      }, "AGGREGATE_ID"),
      numVisiblePaths: new NumPathsSortingStrategy()
    };


    sortingManager.setStrategyChain([sortingStrategies.numVisiblePaths, sortingStrategies.aggregateId]);


    return {
      selectableSortingStrategies: [sortingStrategies.numVisiblePaths],
      sortingManager: sortingManager,
      sortingStrategies: sortingStrategies,
      updateType: "UPDATE_AGGREGATE_SORTING",
      selectableStrategyUpdateType: "UPDATE_SELECTABLE_AGGREGATE_STRATEGIES"
    }

  }
);
