/**
 * Created by Christian on 23.02.2015.
 */
define(['jquery', 'd3', './pathlist', '../view', './pathsorting', '../listeners', './aggregation/aggregatesorting', './aggregation/noaggregationlist', './aggregation/setcombinations', './aggregation/nodetypecombinations', '../ranking/rankconfigview'],
  function ($, d3, pathList, view, pathSorting, listeners, aggregateSorting, NoAggregationList, SetComboList, NodeTypeComboList, RankConfigView) {

    var listView = new view("#pathlist");

    function ListView() {
      view.call(this, "#pathlist");
      this.paths = [];
      this.aggregateList = new NoAggregationList();
    }

    ListView.prototype = Object.create(view.prototype);


    ListView.prototype.init = function () {
      var that = this;
      return new Promise(function (resolve, reject) {
        $('#listViewWidgets').load('list/view.html', function () {
          that.initImpl();
          resolve(true);
        });
        // or
        // reject ("Error!");
      });
    };

    ListView.prototype.initImpl = function () {
      view.prototype.init.call(this);
      var svg = d3.select("#pathlist svg");
      svg.append("marker")
        .attr("id", "arrowRight")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", "0")
        .attr("refY", "5")
        .attr("markerUnits", "strokeWidth")
        .attr("markerWidth", "4")
        .attr("markerHeight", "3")
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z");
      svg.append("clipPath")
        .attr("id", "SetLabelClipPath")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 90)
        .attr("height", 20);


      var initialPathSortingStrategies = Object.create(pathSorting.sortingManager.currentStrategyChain);
      initialPathSortingStrategies.splice(pathSorting.sortingManager.currentStrategyChain.length - 1, 1);
      var pathRankConfigView = new RankConfigView("#pathRankConfig",
        [pathSorting.sortingStrategies.pathQueryStrategy, pathSorting.sortingStrategies.selectionSortingStrategy, pathSorting.sortingStrategies.pathLength, pathSorting.sortingStrategies.setCountEdgeWeight]
        , initialPathSortingStrategies);
      pathRankConfigView.addUpdateListener(function(view) {
        var chain = view.getStrategyChain();
        chain.push(pathSorting.sortingStrategies.pathId);
        pathSorting.sortingManager.setStrategyChain(chain);
        listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
      });
      pathRankConfigView.init();
      d3.select("#pathRankConfig svg").style({"vertical-align": "bottom"})

      var initialPathSortingStrategies = Object.create(aggregateSorting.sortingManager.currentStrategyChain);
      initialPathSortingStrategies.splice(aggregateSorting.sortingManager.currentStrategyChain.length - 1, 1);
      var aggregateRankConfigView = new RankConfigView("#aggregateRankConfig",
        [aggregateSorting.sortingStrategies.numPaths]
        , initialPathSortingStrategies);
      aggregateRankConfigView.addUpdateListener(function(view) {
        var chain = view.getStrategyChain();
        chain.push(aggregateSorting.sortingStrategies.aggregateId);
        aggregateSorting.sortingManager.setStrategyChain(chain);
        listeners.notify(aggregateSorting.updateType, aggregateSorting.sortingManager.currentComparator);
      });
      aggregateRankConfigView.init();
      d3.select("#aggregateRankConfig svg").style({"vertical-align": "bottom"})


      var that = this;


      $("#aggregationType").on("change", function () {
        if (this.value == '0' && !(that.aggregateList instanceof NoAggregationList)) {
          changeAggregation(NoAggregationList);
        }
        if (this.value == '1' && !(that.aggregateList instanceof SetComboList)) {
          changeAggregation(SetComboList);
        }
        if (this.value == '2' && !(that.aggregateList instanceof NodeTypeComboList)) {
          changeAggregation(NodeTypeComboList);
        }
      });

      function changeAggregation(constructor) {
        that.aggregateList.destroy();
        aggregateSorting.sortingManager.reset();
        that.aggregateList = new constructor();
        that.aggregateList.init();
        that.aggregateList.addUpdateListener(function (list) {
          that.updateViewSize();
        });
        that.render(that.paths);
      }


      //$("#pathSortingOptions").on("change", function () {
      //  if (this.value == '0') {
      //    pathSorting.sortingManager.setStrategyChain([pathSorting.sortingStrategies.setCountEdgeWeight, pathSorting.sortingStrategies.pathId]);
      //    listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
      //  }
      //  if (this.value == '1') {
      //    pathSorting.sortingManager.setStrategyChain([pathSorting.sortingStrategies.pathLength, pathSorting.sortingStrategies.pathId]);
      //    listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
      //  }
      //});
      //
      //$("#reversePathSorting").on("click", function () {
      //  pathSorting.sortingManager.ascending = !this.checked;
      //  listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
      //});

      $("#hideNonRelSets").on("click", function () {
        listeners.notify("UPDATE_NODE_SET_VISIBILITY", !this.checked);
      });

      //$("#reverseAggregateSorting").on("click", function () {
      //  aggregateSorting.sortingManager.ascending = !this.checked;
      //  listeners.notify(aggregateSorting.updateType, aggregateSorting.sortingManager.currentComparator);
      //});

      this.aggregateList.init();
      this.aggregateList.addUpdateListener(function (list) {
        that.updateViewSize();
      });

    };

    ListView.prototype.getMinSize = function () {
      if (typeof this.aggregateList === "undefined") {
        return view.prototype.getMinSize.call(this);
      }

      return this.aggregateList.getSize();
    };


    ListView.prototype.render = function (paths) {
      this.paths = paths;
      var svg = d3.select("#pathlist svg");
      this.aggregateList.setPaths(paths);
      this.aggregateList.render(svg);
      this.updateViewSize();
    };


    ListView.prototype.addPath = function (path) {
      this.paths.push(path);
      this.aggregateList.addPath(path);
      var svg = d3.select("#pathlist svg");
      this.aggregateList.render(svg);
      this.updateViewSize();
    };

    ListView.prototype.reset = function () {
      //var svg = d3.select("#pathlist svg");
      this.aggregateList.removePaths();
      this.paths = [];
    };


    return new ListView();

  })
;
