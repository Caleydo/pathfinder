/**
 * Created by Christian on 23.02.2015.
 */
define(['jquery', 'd3', './pathlist', 'list/aggregation/setlist', '../view', './pathsorting', '../listeners', './aggregation/aggregatesorting'],
  function ($, d3, pathList, setList, view, pathSorting, listeners, aggregateSorting) {

    var listView = new view("#pathlist");

    function ListView() {
      view.call(this, "#pathlist");
      this.paths = [];
      this.pathList = new pathList();
      this.setList = new setList();
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
      this.currentView = this.pathList;
      this.currentView.init();
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


      var that = this;

      $("#pathListViewType").click(function () {

        if (that.currentView != that.pathList) {
          that.currentView.destroy();
          that.currentView = that.pathList;
          that.currentView.init();
          that.render(that.paths);
        }

      });

      $("#pathSortingOptions").on("change", function () {
        if (this.value == '0') {
          pathSorting.sortingManager.setStrategyChain([pathSorting.sortingStrategies.setCountEdgeWeight, pathSorting.sortingStrategies.pathId]);
          listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
        }
        if (this.value == '1') {
          pathSorting.sortingManager.setStrategyChain([pathSorting.sortingStrategies.pathLength, pathSorting.sortingStrategies.pathId]);
          listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
        }
      });

      $("#reversePathSorting").on("click", function () {
        pathSorting.sortingManager.ascending = !this.checked;
        listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
      });


      $("#hideNonRelSets").on("click", function () {
        listeners.notify("UPDATE_NODE_SET_VISIBILITY", !this.checked);
      });

      $("#reverseAggregateSorting").on("click", function () {
        aggregateSorting.sortingManager.ascending = !this.checked;
        listeners.notify(aggregateSorting.updateType, aggregateSorting.sortingManager.currentComparator);
      });

      this.pathList.addUpdateListener(function (list) {
        that.updateViewSize();
      });
      this.setList.addUpdateListener(function (list) {
        that.updateViewSize();
      });

      $("#aggregateViewType").click(function () {

          if (that.currentView != that.setList) {
            that.currentView.destroy();
            that.currentView = that.setList;
            that.currentView.init();
            that.render(that.paths);
          }

        });

    };

    ListView.prototype.getMinSize = function () {
      if (typeof this.currentView === "undefined") {
        return view.prototype.getMinSize.call(this);
      }

      return this.currentView.getSize();
    };


    ListView.prototype.render = function (paths) {
      this.paths = paths;
      var svg = d3.select("#pathlist svg");
      this.currentView.setPaths(paths);
      this.currentView.render(svg);
      this.updateViewSize();
    };


    ListView.prototype.addPath = function (path) {
      this.paths.push(path);
      this.currentView.addPath(path);
      var svg = d3.select("#pathlist svg");
      this.currentView.render(svg);
      this.updateViewSize();
    };

    ListView.prototype.reset = function () {
      //var svg = d3.select("#pathlist svg");
      this.currentView.removePaths();
      this.paths = [];
    };


    return new ListView();

  })
;
