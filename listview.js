/**
 * Created by Christian on 23.02.2015.
 */
define(['jquery', 'd3', './pathlist', './setlist'],
  function ($, d3, pathList, setList) {

    return {

      paths: [],
      pathList: new pathList(),
      setList: new setList(),


      init: function () {
        this.currentView = this.pathList;
        this.currentView.init();
        var svg = d3.select("#pathlist").append("svg");
        svg.attr("width", "100%")
          .attr("height", 800);
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

        $(window).on('resize', function (e) {
          that.updateViewSize();
        });

        var viewTypeDiv = d3.select("#listView").insert("div", ":first-child");
        var that = this;

        var pathListWidgetDiv = viewTypeDiv.append("div");

        pathListWidgetDiv.append("input")
          .attr({
            type: "radio",
            name: "viewTypeGroup",
            value: "Path List"
          })
          .property("checked", true)
          .on("click", function () {

            if (that.currentView != that.pathList) {
              that.currentView.destroy();
              that.currentView = that.pathList;
              that.currentView.init();
              that.render(that.paths);
            }

          });
        pathListWidgetDiv.append("label").text("Path List");

        this.pathList.appendWidgets(pathListWidgetDiv);
        this.pathList.addUpdateListener(function (list) {
          that.updateViewSize();
        });
        this.setList.addUpdateListener(function (list) {
          that.updateViewSize();
        });

        var setListWidgetDiv = viewTypeDiv.append("div");

        setListWidgetDiv.append("input")
          .attr({
            type: "radio",
            name: "viewTypeGroup",
            value: "Set Combination List"
          })
          .on("click", function () {

            if (that.currentView != that.setList) {
              that.currentView.destroy();
              that.currentView = that.setList;
              that.currentView.init();
              that.render(that.paths);
            }

          });
        ;
        setListWidgetDiv.append("label").text("Set Combination List");

        that.setList.appendWidgets(setListWidgetDiv);

      },

      updateViewSize: function () {

        var svg = d3.select("#pathlist svg");
        var minViewSize = this.currentView.getSize();
        var parent = $("#pathlist");
        var parentWidth = document.getElementById("pathlist").offsetWidth;
        svg.attr("width", parentWidth > minViewSize.width ? "100%" : minViewSize.width);
        svg.attr("height", minViewSize.height);
      },

      render: function (paths) {
        this.paths = paths;
        var svg = d3.select("#pathlist svg");
        this.currentView.setPaths(paths);
        this.currentView.render(svg);
        this.updateViewSize();
      },

      addPath: function (path) {
        this.paths.push(path);
        this.currentView.addPath(path);
        var svg = d3.select("#pathlist svg");
        this.currentView.render(svg);
        this.updateViewSize();
      },

      reset: function () {
        //var svg = d3.select("#pathlist svg");
        this.currentView.removePaths();
        this.paths = [];
      }
    }

  });
