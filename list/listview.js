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

      var that = this;
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

      listeners.add(function () {
        svg.select("#pathNodeClipPath rect")
          .attr("width", config.getNodeWidth() - 6);
      }, config.NODE_SIZE_UPDATE);


      $("#hideNonRelSets").on("click", function () {
        visibilitySettings.showNonEdgeSets(this.checked);
      });

      $("#showSetsInList").on("click", function () {
        visibilitySettings.showSetsInList(this.checked);
      });

      $("#showAttributesInList").on("click", function () {
        visibilitySettings.showAttributesInList(this.checked);
      });

      $("#showDatasetsInList").on("click", function () {
        visibilitySettings.showDatasetsInList(this.checked);
      });

      $("#alignPivotNode").on("click", function () {
        pathSettings.alignPathNodes(false);
        //listeners.notify("ALIGN_PATH_NODES", this.checked);
      });

      $("#alignAllNodes").on("click", function () {
        pathSettings.alignPathNodes(true);
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

      $("#verticalOrientation").click(function () {
        pathSettings.tiltAttributes(true);
        //listeners.notify("TILT_ATTRIBUTES", this.checked);
      });

      $("#pathlist").scroll(function () {
        $("#columnHeaders").scrollLeft($("#pathlist").scrollLeft());
      });

      //$("#reverseAggregateSorting").on("click", function () {
      //  aggregateSorting.sortingManager.ascending = !this.checked;
      //  listeners.notify(aggregateSorting.updateType, aggregateSorting.sortingManager.currentComparator);
      //});

      this.aggregateList.init(svg);
      this.aggregateList.addUpdateListener(function (list) {
        that.updateViewSize();

      });
      this.aggregateList.parent = svg;

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

    ListView.prototype.updateViewSize = function () {
      var minSize = this.getMinSize();
      var svg = d3.select(this.parentSelector + " svg");
      //var parent = $(this.parentSelector)[0];
      //var pw = $(this.parentSelector)[0].offsetWidth;
      var p = $(this.parentSelector);
      var p2 = $(this.parentSelector)[0];
      var height = 0;
      if ($(this.parentSelector)[0].offsetHeight > minSize.height && this.grabVSpace) {
        svg.style({
          "-webkit-flex": 1,
          "flex": 1
        });
        svg.attr("height", null);
      } else {
        svg.attr("height", minSize.height);
        //height = minSize.height;
      }


      svg.attr("width", $(this.parentSelector)[0].offsetWidth > minSize.width && this.grabHSpace ? "100%" : minSize.width);
      svg.style("width", $(this.parentSelector)[0].offsetWidth > minSize.width && this.grabHSpace ? "100%" : minSize.width);

      d3.select("#columnHeaders svg").attr("width", minSize.width + 30)
        .style("width", minSize.width + 30);

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
