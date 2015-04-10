define(['jquery', 'd3', '../view'], function ($, d3, View) {

  var RANK_CRITERION_ELEMENT_WIDTH = 190;
  var RANK_CRITERION_ELEMENT_HEIGHT = 22;
  var STRATEGY_SELECTOR_START = 20;

  function RankCriterionElement(validStrategies) {
    this.priority = 0;
    this.validStrategies = validStrategies;
  }

  RankCriterionElement.prototype = {

    setPriority: function (priority) {
      this.priority = priority;
    },

    init: function (parent) {

      var group = parent.append("g")
        .classed("rankCriterionElement", true);

      group.append("rect")
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

      group.append("text")
        .attr({
          x: 5,
          y: RANK_CRITERION_ELEMENT_HEIGHT / 2 + 5
        })
        .style({
          "font-size": "12px"
        })
        .text(this.priority.toString() + ".")

      group.append("foreignObject")
        .attr({
          x: STRATEGY_SELECTOR_START,
          y: 2,
          width: RANK_CRITERION_ELEMENT_WIDTH - STRATEGY_SELECTOR_START - 2,
          height: RANK_CRITERION_ELEMENT_HEIGHT - 4
        }).append("xhtml:div")
        .style("font", "12px 'Arial'")
        .html('<select class="strategySelector"></select>');


      var selector = group.select("select.strategySelector");

      this.validStrategies.forEach(function (strategy, i) {
        selector.append("option")
          .attr({
            value: i
          })
          .text(strategy.label);
      });

      $(selector[0]).width(100);

      //selector.attr("width", 50);
      //selector.attr("size", 50);


    }


  };


  function RankConfigView(parentSelector, sortingStrategies) {
    View.call(this, parentSelector);
    this.sortingStrategies = sortingStrategies;
  }

  RankConfigView.prototype = Object.create(View.prototype);

  RankConfigView.prototype.init = function() {
    View.prototype.init.call(this);

    var svg = d3.select(this.parentSelector + " svg");

    var el = new RankCriterionElement(this.sortingStrategies);
    el.init(svg);

  };

  RankConfigView.prototype.getMinSize = function () {
    return {width: 200, height: RANK_CRITERION_ELEMENT_HEIGHT};
  };

  return RankConfigView;
});
