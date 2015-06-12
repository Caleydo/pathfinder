define(["jquery", "d3", "./settings", "../../listeners"], function ($, d3, s, listeners) {

  var DEFAULT_COLUMN_WIDTH = 80;
  var COLUMN_SPACING = 5;

  var currentColumnID = 0;
  var allColumns = [];

  function getTotalColumnWidth(index) {
    var maxIndex = index || allColumns.length - 1;

    var width = 0;
    for (var i = 0; i < maxIndex; i++) {
      width += allColumns[i].getWidth();
      width += COLUMN_SPACING;
    }

    return width;
  }

  function Column(pathList) {
    this.pathList = pathList;
    this.id = currentColumnID++;
  }

  Column.prototype = {
    //render: function (parent, pathWrappers) {
    //  if (!this.root) {
    //    this.root = parent.append("g")
    //      .classed("column" + this.id, true);
    //  }
    //},

    destroy: function () {
      this.root.remove();
    },

    getWidth: function () {
      return DEFAULT_COLUMN_WIDTH;
    }
  };

  function PathLengthColumn(parent) {
    Column.call(this, parent);
  }

  PathLengthColumn.prototype = Object.create(Column.prototype);

  PathLengthColumn.prototype.render = function (parent, pathWrappers) {
    //Column.prototype.render.call(this, parent, pathWrappers);

    var that = this;

    var allPathLengthGroups = parent.selectAll("g.pathLength" + this.id)
      .data(pathWrappers);

    var pathLengthGroup = allPathLengthGroups.enter()
      .append("g")
      .classed("pathLength" + this.id, true)
      .attr({
        transform: function (d, i) {
          var translateX = that.pathList.getNodePositionX(d, d.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
          translateX += getTotalColumnWidth(allColumns.indexOf(that));
          var translateY = s.getPathContainerTranslateY(pathWrappers, i);
          return "translate(" + translateX + "," + translateY + ")";
        }
      });

    var maxPathLength = 0;

    pathWrappers.forEach(function (p) {
      var l = p.path.nodes.length;
      if (l > maxPathLength) {
        maxPathLength = l;
      }
    });

    var barScale = d3.scale.linear().domain([0, maxPathLength]).range([0, this.getWidth()]);

    var bar = pathLengthGroup.append("rect")
      .attr({
        x: 0,
        y: 0,
        fill: "gray",
        width: function (d) {
          return barScale(d.path.nodes.length);
        },
        height: 14
      });

    bar.append("title")
      .text(function (d) {
        return "Length: " + d.path.nodes.length;
      });

    allPathLengthGroups.transition()
      .attr({
        transform: function (d, i) {
          var translateX = that.pathList.getNodePositionX(d, d.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
          translateX += getTotalColumnWidth(allColumns.indexOf(that));
          var translateY = s.getPathContainerTranslateY(pathWrappers, i);
          return "translate(" + translateX + "," + translateY + ")";
        }
      });

    allPathLengthGroups.each(function (d, i) {

      d3.select(this).select("rect")
        .transition()
        .attr({
          width: function (d) {
            return barScale(d.path.nodes.length);
          }
        })
    });

    allPathLengthGroups.exit().remove();

  };

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
