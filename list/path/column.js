define(["jquery", "d3", "./settings", "../../listeners"], function ($, d3, s, listeners) {

  var DEFAULT_COLUMN_WIDTH = 80;
  var COLUMN_SPACING = 5;
  var BAR_SIZE = 12;

  var currentColumnID = 0;
  var allColumns = [];

  function getTotalColumnWidth(index) {

    var maxIndex = (typeof index === "undefined") ? allColumns.length - 1 : index;

    var width = 0;
    for (var i = 0; i < maxIndex; i++) {
      width += allColumns[i].getWidth();
      width += COLUMN_SPACING;
    }

    return width;
  }

  function getColumnItemTranlateX(column, pathWrappers, index) {
    var pathWrapper = s.isAlignColumns() ? getMaxLengthPathWrapper(pathWrappers) : pathWrappers[index];
    var translateX = column.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
    translateX += getTotalColumnWidth(allColumns.indexOf(column));
    return translateX;
  }

  function getMaxLengthPathWrapper(pathWrappers) {
    var maxPathLength = 0;
    var maxLengthPathWrapper = 0;

    pathWrappers.forEach(function (p) {
      var l = p.path.nodes.length;
      if (l > maxPathLength) {
        maxPathLength = l;
        maxLengthPathWrapper = p;
      }
    });

    return maxLengthPathWrapper;
  }

  function Column(pathList) {
    this.pathList = pathList;
    this.id = currentColumnID++;
  }

  Column.prototype = {
    render: function (parent, pathWrappers) {
      this.renderHeader(pathWrappers);

      var that = this;

      var allColumnItems = parent.selectAll("g.columnItem" + this.id)
        .data(pathWrappers);

      var maxLengthPathWrapper = getMaxLengthPathWrapper(pathWrappers);
      var columnItem = allColumnItems.enter()
        .append("g")
        .classed("columnItem" + this.id, true)
        .attr({
          transform: function (d, i) {
            var translateY = s.getPathContainerTranslateY(pathWrappers, i);
            return "translate(" + getColumnItemTranlateX(that, pathWrappers, i) + "," + translateY + ")";
          }
        });

      var bgData = [];

      for (var i = 0; i < pathWrappers.length - 1; i++) {
        bgData.push({
          x1: getColumnItemTranlateX(that, pathWrappers, i),
          x2: getColumnItemTranlateX(that, pathWrappers, i + 1),
          top: s.getPathContainerTranslateY(pathWrappers, i) + pathWrappers[i].getHeight(),
          bottom: s.getPathContainerTranslateY(pathWrappers, i + 1)
        });
      }

      var allBgSpaceFillers = parent.selectAll("path.bgSpaceFiller" + this.id)
        .data(bgData);

      var line = d3.svg.line()
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
        .interpolate("linear");

      allBgSpaceFillers.enter()
        .append("path")
        .classed("bgSpaceFiller" + this.id, true)
        .attr({
          fill: "rgb(230,230,230)",
          d: function (d) {
            return line([{x: d.x1, y: d.top}, {x: d.x1 + that.getWidth(), y: d.top},
              {x: d.x2 + that.getWidth(), y: d.bottom}, {x: d.x2, y: d.bottom}]);
          }
        });

      allBgSpaceFillers.transition()
        .attr({
          d: function (d) {
            return line([{x: d.x1, y: d.top}, {x: d.x1 + that.getWidth(), y: d.top},
              {x: d.x2 + that.getWidth(), y: d.bottom}, {x: d.x2, y: d.bottom}]);
          }
        });

      allBgSpaceFillers.exit().remove();


      columnItem.each(function (pathWrapper, index) {

        var item = d3.select(this);

        item.append("rect")
          .classed("background", true)
          .attr({
            x: 0,
            y: 0,
            width: that.getWidth(),
            height: pathWrapper.getHeight(),
            fill: "rgb(230,230,230)"
          });

        that.onItemEnter(item, pathWrapper, index, pathWrappers);
      });

      allColumnItems.transition()
        .attr({
          transform: function (d, i) {
            var pathWrapper = s.isAlignColumns() ? maxLengthPathWrapper : d;
            var translateX = that.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
            translateX += getTotalColumnWidth(allColumns.indexOf(that));
            var translateY = s.getPathContainerTranslateY(pathWrappers, i);
            return "translate(" + translateX + "," + translateY + ")";
          }
        });

      allColumnItems.each(function (pathWrapper, index) {
        var item = d3.select(this);
        item.select("rect.background")
          .transition()
          .attr({
            width: that.getWidth(),
            height: function (d) {
              return pathWrapper.getHeight()
            }
          });

        that.onItemUpdate(item, pathWrapper, index, pathWrappers);
      });

      allColumnItems.exit().remove();
    },

    renderHeader: function (pathWrappers) {
      var that = this;
      var translateX = getTotalColumnWidth(allColumns.indexOf(this));
      if (pathWrappers.length !== 0) {
        var pathWrapper = s.isAlignColumns() ? getMaxLengthPathWrapper(pathWrappers) : pathWrappers[0];
        translateX += this.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
      }


      if (!this.header) {
        this.header = d3.select("#columnHeaders svg").append("g")
          .classed("columnHeader" + this.id, true)
          .attr({
            transform: "translate(" + translateX + ",0)"
          });

        this.header.append("rect")
          .attr({
            x: 0,
            y: 0,
            rx: 5,
            ry: 5,
            width: that.getWidth(),
            height: s.COLUMN_HEADER_HEIGHT,
            fill: "gray"
          })
      }

      this.header.transition()
        .attr({
          transform: "translate(" + translateX + ",0)"
        });

    },

    onItemEnter: function ($item, pathWrapper, index, pathWrappers) {

    },

    onItemUpdate: function ($item, pathWrapper, index, pathWrappers) {

    },

    destroy: function () {
      if (this.header) {
        this.header.remove();
      }
    },

    getWidth: function () {
      return DEFAULT_COLUMN_WIDTH;
    }
  };

  function PathLengthColumn(parent) {
    Column.call(this, parent);
  }

  PathLengthColumn.prototype = Object.create(Column.prototype);

  PathLengthColumn.prototype.onItemEnter = function (item, pathWrapper, index, pathWrappers) {
    var barScale = d3.scale.linear().domain([0, pathWrappers.length > 0 ? getMaxLengthPathWrapper(pathWrappers).path.nodes.length : 1]).range([0, this.getWidth()]);

    var bar = item.append("rect")
      .classed("pathLength", true)
      .attr({
        x: 0,
        y: (s.PATH_HEIGHT - BAR_SIZE) / 2,
        fill: "gray",
        width: barScale(pathWrapper.path.nodes.length),
        height: BAR_SIZE
      });

    bar.append("title")
      .text("Length: " + pathWrapper.path.nodes.length);
  };

  PathLengthColumn.prototype.onItemUpdate = function (item, pathWrapper, index, pathWrappers) {
    var barScale = d3.scale.linear().domain([0, pathWrappers.length > 0 ? getMaxLengthPathWrapper(pathWrappers).path.nodes.length : 1]).range([0, this.getWidth()]);
    item.select("rect.pathLength")
      .transition()
      .attr({
        width: function (d) {
          return barScale(pathWrapper.path.nodes.length);
        }
      });
  };

  //PathLengthColumn.prototype.render = function (parent, pathWrappers) {
  //  //Column.prototype.render.call(this, parent, pathWrappers);
  //  this.renderHeader(pathWrappers);
  //
  //  var that = this;
  //
  //  var allPathLengthGroups = parent.selectAll("g.pathLength" + this.id)
  //    .data(pathWrappers);
  //
  //  var maxLengthPathWrapper = getMaxLengthPathWrapper(pathWrappers);
  //  var pathLengthGroup = allPathLengthGroups.enter()
  //    .append("g")
  //    .classed("pathLength" + this.id, true)
  //    .attr({
  //      transform: function (d, i) {
  //        var pathWrapper = s.isAlignColumns() ? maxLengthPathWrapper : d;
  //        var translateX = that.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
  //        translateX += getTotalColumnWidth(allColumns.indexOf(that));
  //        var translateY = s.getPathContainerTranslateY(pathWrappers, i);
  //        return "translate(" + translateX + "," + translateY + ")";
  //      }
  //    });
  //
  //
  //  allPathLengthGroups.transition()
  //    .attr({
  //      transform: function (d, i) {
  //        var pathWrapper = s.isAlignColumns() ? maxLengthPathWrapper : d;
  //        var translateX = that.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
  //        translateX += getTotalColumnWidth(allColumns.indexOf(that));
  //        var translateY = s.getPathContainerTranslateY(pathWrappers, i);
  //        return "translate(" + translateX + "," + translateY + ")";
  //      }
  //    });
  //
  //  allPathLengthGroups.each(function (d, i) {
  //
  //    d3.select(this).select("rect")
  //      .transition()
  //      .attr({
  //        width: function (d) {
  //          return barScale(d.path.nodes.length);
  //        }
  //      })
  //  });
  //
  //  allPathLengthGroups.exit().remove();
  //
  //};

  return {

    PathLengthColumn: PathLengthColumn,

    addColumn: function (col) {
      allColumns.push(col);
    },

    removeColumn: function (col) {
      var index = allColumns.indexOf(col);
      if (index !== -1) {
        allColumns.splice(index, 1);
        col.destroy();
      }
    },

    renderColumns: function (parent, pathWrappers) {
      allColumns.forEach(function (col) {
        col.render(parent, pathWrappers);
      });
    },

    getWidth: function () {
      return getTotalColumnWidth();
    }

  };

});
