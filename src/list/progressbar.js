/**
 * Created by Christian on 02.11.2015.
 */
define(["jquery", "d3", "../datastore", "../view", "../listeners", "../query/pathquery", '../../pathfinder_graph/search'], function ($, d3, dataStore, view, listeners, query, ServerSearch) {

  var ITEM_WIDTH = 50;
  var ITEM_HEIGHT = 20;
  var ITEM_SPACING = 2;


  function ProgressBar() {
    view.call(this, "#pathProgress");
    this.lengthHistogram = {};
    this.maxLength = 0;
  }

  ProgressBar.prototype = Object.create(view.prototype);

  ProgressBar.prototype.init = function () {
    var that = this;
    //view.prototype.init.call(this);
    //var that = this;
    //ServerSearch.on({
    //    query_start: function () {
    //        //reset();
    //        that.reset();
    //    },
    //    query_path: function (event, data) {
    //        that.update(data.path);
    //        //dataStore.addPath(data.path);
    //        //console.log("added path " +(x++))
    //    },
    //    query_done: function () {
    //        that.render(-1);
    //    }
    //});

    //var svg = d3.select

    listeners.add(function () {
      that.reset();
    }, listeners.updateType.QUERY_UPDATE);

    listeners.add(function () {
      that.reset();
    }, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);

  };


  ProgressBar.prototype.getMinSize = function () {
    return {width: this.maxLength * ITEM_WIDTH + (this.maxLength - 1) * ITEM_SPACING, height: ITEM_HEIGHT + 10};
  };

  ProgressBar.prototype.reset = function () {
    var that = this;
    var allPaths = dataStore.getPaths();
    this.lengthHistogram = {};
    this.maxLength = 0;
    allPaths.forEach(function (p) {
      that.lengthHistogram[p.edges.length.toString()] = that.lengthHistogram[p.edges.length.toString()] || {
          length: p.edges.length,
          numVisiblePaths: 0,
          totalNumPaths: 0
        };
      that.lengthHistogram[p.edges.length.toString()].totalNumPaths++;
      if (!(query.isRemoveFilteredPaths() && query.isPathFiltered(p.id))) {
        that.lengthHistogram[p.edges.length.toString()].numVisiblePaths++;
      }
      if (that.maxLength < p.edges.length) {
        that.maxLength = p.edges.length;
      }
    });

    this.fillHistogram();

    this.render(-1);
  };

  ProgressBar.prototype.fillHistogram = function () {
    var that = this;
    for (var i = 0; i < (that.maxLength < 1 ? 1 : that.maxLength); i++) {
      that.lengthHistogram[i.toString()] = that.lengthHistogram[i.toString()] || {
          length: i,
          totalNumPaths: 0,
          numVisiblePaths: 0
        };
    }
  };

  ProgressBar.prototype.update = function (paths, addedPaths) {

    var that = this;
    var currentMaxLength = 0;
    paths.forEach(function (path) {

      that.lengthHistogram[path.edges.length.toString()] = that.lengthHistogram[path.edges.length.toString()] || {
          length: path.edges.length,
          numVisiblePaths: 0,
          totalNumPaths: 0
        };
      if (path.edges.length > currentMaxLength) {
        currentMaxLength = path.edges.length;
      }
      if (addedPaths.indexOf(path) !== -1) {
        that.lengthHistogram[path.edges.length.toString()].totalNumPaths++;
        if (!(query.isRemoveFilteredPaths() && query.isPathFiltered(path.id))) {
          that.lengthHistogram[path.edges.length.toString()].numVisiblePaths++;
        }
        if (path.edges.length > that.maxLength) {
          that.maxLength = path.edges.length;
          that.fillHistogram();
        }
      }

    });


    this.render(currentMaxLength);
  };


  ProgressBar.prototype.render = function (progressIndex) {
    var that = this;
    var svg = d3.select("#pathProgress");

    var data = Object.keys(that.lengthHistogram).map(function (key) {
      return that.lengthHistogram[key];
    });


    var allItems = svg.selectAll("div.progressBarItem").data(data);

    var items = allItems.enter().append("div")
      .classed({
        progressBarItem: true,
        //"bg-primary": true
      });


    items.each(function (data, i) {
      var item = d3.select(this);

      item.append("label")
        .classed("length", true)
        .style({
          "font-style": "italic",
          "font-weight": "normal",
          "text-align": "center",
          display: "block",
          "padding": 0,
          "margin": 0
        })
        //.attr({
        //    x: i * ITEM_WIDTH + (i - 1) * ITEM_SPACING,
        //    y: 12
        //})
        .text(data.length);

      var bar = item.append("div")
        .classed({
          bar: true,
          "bg-primary": true
        });

      //style({width: "100px"});

      var textCont = bar.append("div")
        .style({
          display: "inline-block",
          width: "50px"
        });


      textCont.append("label")
        .classed("numPaths", true)
        .style({
          "font-weight": 600,
          display: "block",
          "text-align": "center",
          "padding": 0,
          "margin": 0
        })
        //.attr({
        //    x: i * ITEM_WIDTH + (i - 1) * ITEM_SPACING,
        //    y: 24
        //})
        .text(data.numVisiblePaths + (data.numVisiblePaths === data.totalNumPaths ? "" : ("/" + data.totalNumPaths)));

      //textCont.append("label")
      // .classed("totalNumPaths", true)
      // .style({
      //   //"font-weight": 400,
      //   "font-size": "10px",
      //   display: "inline-block",
      //   "text-align": "center",
      //   "padding": 0,
      //   "margin": 0
      // })
      // //.attr({
      // //    x: i * ITEM_WIDTH + (i - 1) * ITEM_SPACING,
      // //    y: 24
      // //})
      // .text("(888)");
    });

    allItems.each(function (data, i) {
        var item = d3.select(this);

        item.select("label.length")
          .text(data.length);
        item.select("label.numPaths")
          .text(data.numVisiblePaths + (data.numVisiblePaths === data.totalNumPaths ? "" : ("/" + data.totalNumPaths)));

        var bar = item.select("div.bar");


        var spinner = item.select("i");
        if (i == progressIndex) {
          if (spinner.empty()) {
            bar.append("i")
              .attr("class", "fa fa-spin fa-pulse")
              .text("\uf110")
              .style({
                  position: "relative",
                  top: "0px",
                  left: "-10px"
                }
              )
            ;
          }
        }
        else {
          spinner.remove();
        }

      }
    )
    ;

    allItems.exit().remove();

    this.updateViewSize();


  };


  return new ProgressBar();
})
;
