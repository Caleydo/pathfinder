/**
 * Created by Christian on 23.02.2015.
 */
define(['d3'], function(d3) {

  function SortingStrategy(type, label) {
    this.type = type;
    this.priority = type;
    this.label = label;
  }

  SortingStrategy.prototype = {
    STRATEGY_TYPES: {
      ID: 0,
      WEIGHT: 1,
      PRESENCE: 2,
      FILTER: 3,
      UNKNOWN: 4
    },
    compare: function (a, b) {
      return 0;
    }
  };

  function IdSortingStrategy(sortingManager, idAccessor) {
    SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ID, "Id");
    this.compare = function (a, b) {
      if (sortingManager.ascending) {
        return d3.ascending(idAccessor(a), idAccessor(b));
      }
      return d3.descending(idAccessor(a), idAccessor(b));
    }
  }

  IdSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

  function SortingManager(ascending, strategyChain) {
    this.ascending = ascending || true;
    this.currentStrategyChain = strategyChain || [new SortingStrategy(SortingStrategy.prototype.STRATEGY_TYPES.UNKNOWN)];
    this.currentComparator = getComparatorFromStrategyChain(this.currentStrategyChain);
  }

  SortingManager.prototype = {
    clearStrategy: function () {
      this.currentStrategyChain = [];
      this.currentComparator = undefined;
    },

    setStrategyChain: function (chain) {
      this.currentStrategyChain = chain;
      this.currentComparator = getComparatorFromStrategyChain(this.currentStrategyChain)
    },

    // Replaces the first occurrence of an existing strategy of the same strategy type in the chain, or adds it to the
    // front, if no such strategy exists.
    addOrReplace: function (strategy) {

      var replaced = false;
      for (var i = 0; i < this.currentStrategyChain.length; i++) {
        var currentStrategy = this.currentStrategyChain[i];
        if (currentStrategy.type === strategy.type) {
          this.currentStrategyChain[i] = strategy;
          replaced = true;
        }
      }
      if (!replaced) {
        this.currentStrategyChain.unshift(strategy);
        this.currentStrategyChain.sort(function(a, b) {
          return d3.descending(a.priority, b.priority);
        });
      }
      this.setStrategyChain(this.currentStrategyChain);
    },

    reset: function() {
      this.currentStrategyChain = [new SortingStrategy(SortingStrategy.prototype.STRATEGY_TYPES.UNKNOWN)];
      this.currentComparator = getComparatorFromStrategyChain(this.currentStrategyChain);
    }

  };

  function getComparatorFromStrategyChain(strategies) {
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

  function chainComparators(comparators) {
    return function (a, b) {

      for (var i = 0; i < comparators.length; i++) {
        var res = comparators[i](a, b);
        if (res !== 0) {
          return res;
        }
      }
      return 0;
    }
  }

  return { SortingStrategy: SortingStrategy,
    SortingManager: SortingManager,
    IdSortingStrategy: IdSortingStrategy,
    chainComparators: chainComparators,
    getComparatorFromStrategyChain: getComparatorFromStrategyChain
  }


});
