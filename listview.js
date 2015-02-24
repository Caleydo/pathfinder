/**
 * Created by Christian on 23.02.2015.
 */
define(['jquery', 'd3', './pathlist', './setlist'],
  function ($, d3, pathList, setList) {

    return {

      paths: [],
      currentView: pathList,

      init: function () {
        var svg = d3.select("#pathlist").append("svg");
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

            if (that.currentView != pathList) {
              that.currentView.removeGuiElements(svg);
              that.currentView = pathList;
              that.currentView.init(svg);
              that.render(that.paths);
            }

          });
        pathListWidgetDiv.append("label").text("Path List");

        pathList.appendWidgets(pathListWidgetDiv, svg);

        var setListWidgetDiv = viewTypeDiv.append("div");

        setListWidgetDiv.append("input")
          .attr({
            type: "radio",
            name: "viewTypeGroup",
            value: "Set Combination List"
          })
          .on("click", function () {

            if (that.currentView != setList) {
              that.currentView.removeGuiElements(svg);
              that.currentView = setList;
              that.currentView.init(svg);
              that.render(that.paths);
            }

          });
        ;
        setListWidgetDiv.append("label").text("Set Combination List");

        setList.appendWidgets(setListWidgetDiv, svg);

        this.currentView.init(svg);
      },

      render: function (paths) {
        this.paths = paths;
        var svg = d3.select("#pathlist svg");
        this.currentView.render(paths, svg);
      }
    }

  });
