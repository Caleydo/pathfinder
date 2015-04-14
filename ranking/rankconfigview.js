define(['jquery', 'd3', '../view', '../uiUtil'], function ($, d3, View, uiUtil) {


  var RANK_CRITERION_SELECTOR_WIDTH = 120;
  var RANK_CRITERION_ELEMENT_SPACING = 5;
  var STRATEGY_SELECTOR_START = 20;
  var RANK_CRITERION_ELEMENT_WIDTH = STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 2 * RANK_CRITERION_ELEMENT_SPACING + 2 * 16 + 5;
  var RANK_CRITERION_ELEMENT_HEIGHT = 22;


  function RankCriterionElement(rankConfigView, selectedStrategyIndex) {
    this.priority = 0;
    this.rankConfigView = rankConfigView;
    this.selectedStrategyIndex = selectedStrategyIndex || 0;

  }

  RankCriterionElement.prototype = {

    setPriority: function (priority) {
      this.priority = priority;
      if (typeof this.rootDomElement !== "undefined") {
        this.rootDomElement.select("text.priority")
          .text(this.priority.toString() + ".")
      }
    },

    init: function (parent) {

      this.rootDomElement = parent.append("g")
        .classed("rankCriterionElement", true);

      this.rootDomElement.append("rect")
        .attr({
          x: 0,
          y: 0,
          rx: 5,
          ry: 5,
          width: RANK_CRITERION_ELEMENT_WIDTH,
          height: RANK_CRITERION_ELEMENT_HEIGHT
        })
        .style({
          fill: "lightgray"
        });

      this.rootDomElement.append("text")
        .classed("priority", true)
        .attr({
          x: 5,
          y: RANK_CRITERION_ELEMENT_HEIGHT / 2 + 5
        })
        .style({
          "font-size": "12px"
        })
        .text(this.priority.toString() + ".");

      this.rootDomElement.append("foreignObject")
        .attr({
          x: STRATEGY_SELECTOR_START,
          y: 2,
          width: RANK_CRITERION_ELEMENT_WIDTH - STRATEGY_SELECTOR_START - 2,
          height: RANK_CRITERION_ELEMENT_HEIGHT - 4
        }).append("xhtml:div")
        .style("font", "12px 'Arial'")
        .html('<select class="strategySelector"></select>');


      var that = this;
      var selector = this.rootDomElement.select("select.strategySelector");

      this.rankConfigView.selectableSortingStrategies.forEach(function (strategy, i) {
        selector.append("option")
          .attr({
            value: i
          })
          .text(strategy.label);
      });


      $(selector[0]).width(RANK_CRITERION_SELECTOR_WIDTH);
      $(selector[0]).val(this.selectedStrategyIndex);


      var sortingOrderButton = uiUtil.addOverlayButton(this.rootDomElement, STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 5, 3, 16, 16, that.orderButtonText(), 16 / 2, 16 - 3, "rgb(30,30,30)", false);

      sortingOrderButton
        .classed("sortOrderButton", true)
        .on("click", function () {
          that.rankConfigView.selectableSortingStrategies[that.selectedStrategyIndex].ascending = !that.rankConfigView.selectableSortingStrategies[that.selectedStrategyIndex].ascending;
          that.rankConfigView.updateSortOrder();
          that.rankConfigView.notify();
        });

      $(selector[0]).on("change", function () {
        that.selectedStrategyIndex = this.value;
        that.rankConfigView.updateSortOrder();
        that.rankConfigView.notify();
      });

      var removeButton = uiUtil.addOverlayButton(this.rootDomElement, STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 10 + 16, 3, 16, 16, "\uf00d", 16 / 2, 16 - 3, "red", true);

      removeButton.attr("display", "none");

      removeButton.on("click", function () {
        var index = that.rankConfigView.rankElements.indexOf(that);
        if (index !== -1) {
          that.rankConfigView.rankElements.splice(index, 1);
          that.rootDomElement.remove();
          that.rankConfigView.update();
          that.rankConfigView.notify();
        }
      });

      $(this.rootDomElement[0]).mouseenter(function () {
        removeButton.attr("display", "inline");
      });

      $(this.rootDomElement[0]).mouseleave(function () {
        removeButton.attr("display", "none");
      });
    },

    orderButtonText: function () {
      return this.rankConfigView.selectableSortingStrategies[this.selectedStrategyIndex].ascending ? "\uf160" : "\uf161";
    },

    updateSortOrder: function () {
      this.rootDomElement.select("g.sortOrderButton").select("text").text(this.orderButtonText());
    }
  };


  function RankConfigView(parentSelector, selectableSortingStrategies, initialSortingStrategies) {
    View.call(this, parentSelector);
    this.grabHSpace = false;
    this.selectableSortingStrategies = selectableSortingStrategies;
    this.initialSortingStrategies = initialSortingStrategies;
    this.updateListeners = [];
    this.rankElements = [];
  }

  RankConfigView.prototype = Object.create(View.prototype);

  RankConfigView.prototype.addUpdateListener = function (listener) {
    this.updateListeners.push(listener);
  };

  RankConfigView.prototype.removeUpdateListener = function (listener) {
    var index = this.updateListeners.indexOf(listener);
    if (index !== -1) {
      this.updateListeners.splice(index, 1);
    }
  };

  RankConfigView.prototype.notify = function () {
    var that = this;
    this.updateListeners.forEach(function (listener) {
      listener(that);
    });
  };

  RankConfigView.prototype.init = function () {
    View.prototype.init.call(this);

    var that = this;


    this.initialSortingStrategies.forEach(function (strat) {
      that.addRankCriterionElement(strat);
    });

    var svg = d3.select(this.parentSelector + " svg");

    this.addRankCriterionButton = uiUtil.addOverlayButton(svg, 0, 0, 16, 16, "\uf067", 16 / 2, 16 - 1, "green", true);
    this.addRankCriterionButton
      .attr("display", "none")
      .on("click", function () {
        that.addRankCriterionElement(that.selectableSortingStrategies[0]);
        that.update();
        that.notify();
      });


    $(svg[0]).mouseenter(function () {
      that.addRankCriterionButton.attr("display", "inline");
    });

    $(svg[0]).mouseleave(function () {
      that.addRankCriterionButton.attr("display", "none");
    });

    this.update();
  };

  RankConfigView.prototype.reset = function (selectableSortingStrategies, initialSortingStrategies) {
    this.rankElements.forEach(function (element) {
      element.rootDomElement.remove();
    });
    this.rankElements = [];

    this.selectableSortingStrategies = selectableSortingStrategies;
    this.initialSortingStrategies = initialSortingStrategies;
    var that = this;

    this.initialSortingStrategies.forEach(function (strat) {
      that.addRankCriterionElement(strat);
    });

    this.update();
  };

  RankConfigView.prototype.updateSortOrder = function () {
    this.rankElements.forEach(function (element) {
      element.updateSortOrder();
    });
  };

  RankConfigView.prototype.getStrategyChain = function () {
    var chain = [];
    var that = this;

    this.rankElements.forEach(function (element) {
      chain.push(that.selectableSortingStrategies[element.selectedStrategyIndex]);
    });

    return chain;
  };

  RankConfigView.prototype.addRankCriterionElement = function (selectedStrategy) {
    var svg = d3.select(this.parentSelector + " svg");
    var el = new RankCriterionElement(this, this.selectableSortingStrategies.indexOf(selectedStrategy));
    el.init(svg);
    this.rankElements.push(el);
  };

  RankConfigView.prototype.update = function () {
    this.rankElements.forEach(function (element, i) {
      element.rootDomElement.attr({
        transform: "translate(" + (i * (RANK_CRITERION_ELEMENT_WIDTH + RANK_CRITERION_ELEMENT_SPACING)) + ", 0)"
      });
      element.setPriority(i + 1);
    });

    this.addRankCriterionButton.attr({
      transform: "translate(" + (this.rankElements.length * (RANK_CRITERION_ELEMENT_WIDTH + RANK_CRITERION_ELEMENT_SPACING)) + ", 3)"
    });

    this.updateViewSize();
  };

  RankConfigView.prototype.getMinSize = function () {
    return {
      width: Math.max(200, (RANK_CRITERION_ELEMENT_WIDTH + RANK_CRITERION_ELEMENT_SPACING) * this.rankElements.length + 16 + 5),
      height: RANK_CRITERION_ELEMENT_HEIGHT
    };
  };

  return RankConfigView;
})
;
