/**
 * Created by Christian on 23.02.2015.
 */
define(function() {

  function SortingStrategy(type) {
    this.type = type;
  }

  SortingStrategy.prototype = {
    STRATEGY_TYPES: {
      ID: 0,
      WEIGHT: 1,
      PRESENCE: 2,
      UNKNOWN: 3
    },
    compare: function (a, b) {
      return 0;
    }
  }

  function IdSortingStrategy(sortingManager) {
    SortingStrategy.call(this, SortingStrategy.prototype.STRATEGY_TYPES.ID);
    this.compare = function (a, b) {
      if (sortingManager.ascending) {
        return d3.ascending(a.id, b.id);
      }
      return d3.descending(a.id, b.id);
    }
  }

  IdSortingStrategy.prototype = Object.create(SortingStrategy.prototype);

  function SortingManager(ascending, strategyChain) {
    this.ascending = ascending || true;
    this.currentStrategyChain = strategyChain || [new SortingStrategy(SortingStrategy.prototype.STRATEGY_TYPES.UNKNOWN)];
    this.currentComparator = getChainComparator(this.currentStrategyChain);
  }

  SortingManager.prototype = {
    clearStrategy: function () {
      this.currentStrategyChain = [];
      this.currentComparator = undefined;
    },

    setStrategyChain: function (chain) {
      this.currentStrategyChain = chain;
      this.currentComparator = getChainComparator(this.currentStrategyChain)
    },

    // Replaces the first occurrence of an existing strategy of the same strategy type in the chain, or adds it to the
    // front, if no such strategy exists.
    addOrReplace: function (strategy) {

      var replaced = false;
      for (var i = 0; i < this.currentStrategyChain.length; i++) {
        var currentStrategy = this.currentStrategyChain[i];
        if (currentStrategy.type == strategy.type) {
          this.currentStrategyChain[i] = strategy;
          replaced = true;
        }
      }
      if (!replaced) {
        this.currentStrategyChain.unshift(strategy);
      }
      this.setStrategyChain(this.currentStrategyChain);
    },

    sort: function ( data, parent, selector, transformFunction, strategyChain) {
      this.setStrategyChain(strategyChain || this.currentStrategyChain);

      data.sort(this.currentComparator);

      parent.selectAll(selector)
        .sort(this.currentComparator)
        .transition()
        .attr("transform", transformFunction);
    }
  }

  function getChainComparator(strategies) {
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

  return { SortingStrategy: SortingStrategy,
    SortingManager: SortingManager,
    IdSortingStrategy: IdSortingStrategy
  }


});
