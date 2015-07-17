/**
 * Created by Christian on 23.02.2015.
 */
define(['jquery', 'd3', './path/pathlist', '../view', './pathsorting', '../listeners', './aggregation/aggregatesorting', './aggregation/noaggregationlist',
    './aggregation/setcombinations', './aggregation/nodetypecombinations', '../ranking/rankconfigview', '../config', '../settings/visibilitysettings', './path/settings', '../datastore'],
  function ($, d3, pathList, view, pathSorting, listeners, aggregateSorting, NoAggregationList, SetComboList, NodeTypeComboList, RankConfigView, config, visibilitySettings, pathSettings, dataStore) {

    //var listView = new view("#pathlist");

    function ListView() {
      view.call(this, "#pathlist");
      this.paths = [];
      this.aggregateList = new NoAggregationList(this);
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
      svg.append("clipPath")
        .attr("id", "SetLabelClipPath")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 90)
        .attr("height", 20);

      d3.select("#columnHeaders")
        .style({height: pathSettings.COLUMN_HEADER_HEIGHT + "px"})
        .append("svg")
        .attr({
          width: "100%",
          height: "100%"
        }
      );

      var nodeWidth = config.getNodeWidth();
      var nodeHeight = config.getNodeHeight();

      svg.append("clipPath")
        .attr("id", "pathNodeClipPath")
        .append("rect")
        .attr("x", 3)
        .attr("y", 0)
        .attr("width", nodeWidth - 6)
        .attr("height", nodeHeight);

      this.textSizeDomElement = svg.append("text")
        .attr('class', "textSizeElement")
        .attr("x", 0)
        .attr("y", 0)
        .style("font", "10px sans-serif")
        .style("opacity", 0);


      //var initialPathSortingStrategies = Object.create(pathSorting.sortingManager.currentStrategyChain);
      //initialPathSortingStrategies.splice(pathSorting.sortingManager.currentStrategyChain.length - 1, 1);
      //var selectablePathSortingStrategies = [pathSorting.sortingStrategies.pathQueryStrategy, pathSorting.sortingStrategies.selectionSortingStrategy,
      //  pathSorting.sortingStrategies.pathLength, pathSorting.sortingStrategies.setCountEdgeWeight];
      //selectablePathSortingStrategies = selectablePathSortingStrategies.concat(dataStore.getDataBasedPathSortingStrategies());
      //var pathRankConfigView = new RankConfigView("#pathRankConfig",
      //  selectablePathSortingStrategies
      //  , initialPathSortingStrategies);
      //pathRankConfigView.addUpdateListener(function (view) {
      //  var chain = view.getStrategyChain();
      //  chain.push(pathSorting.sortingStrategies.pathId);
      //  pathSorting.sortingManager.setStrategyChain(chain);
      //  listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
      //});
      //pathRankConfigView.init();
      //d3.select("#pathRankConfig svg").style({"vertical-align": "bottom"});
      //
      //var initialAggregateSortingStrategies = Object.create(aggregateSorting.sortingManager.currentStrategyChain);
      //initialAggregateSortingStrategies.splice(aggregateSorting.sortingManager.currentStrategyChain.length - 1, 1);
      //var aggregateRankConfigView = new RankConfigView("#aggregateRankConfig",
      //  [aggregateSorting.sortingStrategies.numPaths]
      //  , initialAggregateSortingStrategies);
      //aggregateRankConfigView.addUpdateListener(function (view) {
      //  var chain = view.getStrategyChain();
      //  chain.push(aggregateSorting.sortingStrategies.aggregateId);
      //  aggregateSorting.sortingManager.setStrategyChain(chain);
      //  listeners.notify(aggregateSorting.updateType, aggregateSorting.sortingManager.currentComparator);
      //});
      //aggregateRankConfigView.init();
      //d3.select("#aggregateRankConfig svg").style({"vertical-align": "bottom"});
      //
      //d3.select("#aggregateWidgets").style({display: "none"});


      var that = this;


      //$("#aggregationType").on("change", function () {
      //  if (this.value == '0' && !(that.aggregateList instanceof NoAggregationList)) {
      //    changeAggregation(NoAggregationList);
      //    d3.select("#aggregateWidgets").style({display: "none"});
      //  }
      //  if (this.value == '1' && !(that.aggregateList instanceof SetComboList)) {
      //    changeAggregation(SetComboList);
      //    d3.select("#aggregateWidgets").style({display: "block"});
      //    updateAggregateRankConfigView();
      //  }
      //  if (this.value == '2' && !(that.aggregateList instanceof NodeTypeComboList)) {
      //    changeAggregation(NodeTypeComboList);
      //    d3.select("#aggregateWidgets").style({display: "block"});
      //    updateAggregateRankConfigView();
      //  }
      //});
      //
      //function updateAggregateRankConfigView() {
      //  var initialAggregateSortingStrategies = Object.create(aggregateSorting.sortingManager.currentStrategyChain);
      //  initialAggregateSortingStrategies.splice(aggregateSorting.sortingManager.currentStrategyChain.length - 1, 1);
      //  aggregateRankConfigView.reset([that.aggregateList.getNodeSelectionSortingStrategy(), aggregateSorting.sortingStrategies.numPaths], initialAggregateSortingStrategies);
      //}
      //
      //function changeAggregation(constructor) {
      //  that.aggregateList.destroy();
      //  aggregateSorting.sortingManager.reset();
      //  that.aggregateList = new constructor(that);
      //  that.aggregateList.init();
      //  that.aggregateList.addUpdateListener(function (list) {
      //    that.updateViewSize();
      //  });
      //  that.render(that.paths);
      //}


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
        visibilitySettings.showNonEdgeSets(this.checked);
      });

      $("#alignPathNodes").on("click", function () {
        pathSettings.alignPathNodes(this.checked);
        //listeners.notify("ALIGN_PATH_NODES", this.checked);
      });



      $("#alignColumns").on("click", function () {
        pathSettings.alignColumns(this.checked);
        //listeners.notify("TILT_ATTRIBUTES", this.checked);
      });

      $("#horizontalOrientation").click(function () {
        pathSettings.tiltAttributes(false);
        //listeners.notify("TILT_ATTRIBUTES", this.checked);
      });

      $("#verticalOrientation").click( function () {
        pathSettings.tiltAttributes(true);
        //listeners.notify("TILT_ATTRIBUTES", this.checked);
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

    ListView.prototype.getTextWidth = function (string) {

      this.textSizeDomElement
        .text(string);

      return this.textSizeDomElement.node().getBBox().width;
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
