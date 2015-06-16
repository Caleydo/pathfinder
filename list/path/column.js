define(["jquery", "d3", "./settings", "../../listeners", "../../uiutil"], function ($, d3, s, listeners, uiUtil) {

  //var DEFAULT_COLUMN_WIDTH = 80;
  var COLUMN_SPACING = 5;
  var BAR_SIZE = 12;


  var RANK_CRITERION_SELECTOR_WIDTH = 100;
  var COLUMN_ELEMENT_SPACING = 5;
  var STRATEGY_SELECTOR_START = 20;
  var DEFAULT_COLUMN_WIDTH = STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 2 * COLUMN_ELEMENT_SPACING + 2 * 16 + 5;
  //var RANK_CRITERION_ELEMENT_HEIGHT = 22;

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


  function RankColumnHeader(rankConfigView, selectedStrategyIndex) {
    this.priority = 0;
    //this.rankConfigView = rankConfigView;
    this.selectedStrategyIndex = selectedStrategyIndex || 0;

  }

  RankColumnHeader.prototype = {

    setPriority: function (priority) {
      this.priority = priority;
      if (typeof this.rootDomElement !== "undefined") {
        this.rootDomElement.select("text.priority")
          .text(this.priority.toString() + ".")
      }
    },

    init: function (parent) {

      this.rootDomElement = parent.append("g")
        .classed("rankCriterionElement", true);

      this.rootDomElement.append("rect")
        .attr({
          x: 0,
          y: 0,
          rx: 5,
          ry: 5,
          width: DEFAULT_COLUMN_WIDTH,
          height: s.COLUMN_HEADER_HEIGHT
        })
        .style({
          fill: "lightgray"
        });

      this.rootDomElement.append("text")
        .classed("priority", true)
        .attr({
          x: 5,
          y: s.COLUMN_HEADER_HEIGHT / 2 + 5
        })
        .style({
          "font-size": "12px"
        })
        .text(this.priority.toString() + ".");

      this.rootDomElement.append("foreignObject")
        .attr({
          x: STRATEGY_SELECTOR_START,
          y: 2,
          width: DEFAULT_COLUMN_WIDTH - STRATEGY_SELECTOR_START - 2,
          height: s.COLUMN_HEADER_HEIGHT - 4
        }).append("xhtml:div")
        .style("font", "12px 'Arial'")
        .html('<select class="strategySelector"></select>');


      var that = this;
      var selector = this.rootDomElement.select("select.strategySelector");

      //this.rankConfigView.selectableSortingStrategies.forEach(function (strategy, i) {
      //  selector.append("option")
      //    .attr({
      //      value: i
      //    })
      //    .text(strategy.label);
      //});

      selector.append("title")
        .text(function () {
          return $(selector[0]).text;
        });


      $(selector[0]).width(RANK_CRITERION_SELECTOR_WIDTH);
      $(selector[0]).val(this.selectedStrategyIndex);


      var sortingOrderButton = uiUtil.addOverlayButton(this.rootDomElement, STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 5, 3, 16, 16, that.orderButtonText(), 16 / 2, 16 - 3, "rgb(30,30,30)", false);

      sortingOrderButton
        .classed("sortOrderButton", true)
        .on("click", function () {
          //that.rankConfigView.selectableSortingStrategies[that.selectedStrategyIndex].ascending = !that.rankConfigView.selectableSortingStrategies[that.selectedStrategyIndex].ascending;
          //that.rankConfigView.updateSortOrder();
          //that.rankConfigView.notify();
        });

      $(selector[0]).on("change", function () {
        that.selectedStrategyIndex = this.value;
        //that.rankConfigView.updateSortOrder();
        //that.rankConfigView.notify();
      });

      var removeButton = uiUtil.addOverlayButton(this.rootDomElement, STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 10 + 16, 3, 16, 16, "\uf00d", 16 / 2, 16 - 3, "red", true);

      removeButton.attr("display", "none");

      removeButton.on("click", function () {
        //var index = that.rankConfigView.rankElements.indexOf(that);
        //if (index !== -1) {
        //  that.rankConfigView.rankElements.splice(index, 1);
        //  that.rootDomElement.remove();
        //  that.rankConfigView.update();
        //  that.rankConfigView.notify();
        //}
      });

      $(this.rootDomElement[0]).mouseenter(function () {
        removeButton.attr("display", "inline");
      });

      $(this.rootDomElement[0]).mouseleave(function () {
        removeButton.attr("display", "none");
      });
    },

    orderButtonText: function () {
      return "\uf160";
      //return this.rankConfigView.selectableSortingStrategies[this.selectedStrategyIndex].ascending ? "\uf160" : "\uf161";
    },

    updateSortOrder: function () {
      this.rootDomElement.select("g.sortOrderButton").select("text").text(this.orderButtonText());
    }
  };

  function Column(pathList) {
    this.pathList = pathList;
    this.id = currentColumnID++;
  }

  Column.prototype = {
    render: function (parent, pathWrappers) {
      this.renderHeader(pathWrappers);
      this.renderBackground(parent, pathWrappers);

      var that = this;

      var allColumnItems = parent.selectAll("g.columnItem" + this.id)
        .data(pathWrappers, function (d) {
          return d.path.id
        });

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

      columnItem.each(function (pathWrapper, index) {

        var item = d3.select(this);

        //item.append("rect")
        //  .classed("background", true)
        //  .attr({
        //    x: 0,
        //    y: 0,
        //    width: that.getWidth(),
        //    height: pathWrapper.getHeight(),
        //    fill: "rgb(230,230,230)"
        //  });

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
        //item.select("rect.background")
        //  .transition()
        //  .attr({
        //    width: that.getWidth(),
        //    height: function (d) {
        //      return pathWrapper.getHeight()
        //    }
        //  });

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

        var columnHeader = new RankColumnHeader();
        columnHeader.init(this.header);
        //
        //this.header.append("rect")
        //  .attr({
        //    x: 0,
        //    y: 0,
        //    rx: 5,
        //    ry: 5,
        //    width: that.getWidth(),
        //    height: s.COLUMN_HEADER_HEIGHT,
        //    fill: "gray"
        //  })
      }

      this.header.transition()
        .attr({
          transform: "translate(" + translateX + ",0)"
        });

    },

    renderBackground: function (parent, pathWrappers) {

      var that = this;

      if (!this.bgRoot) {
        this.bgRoot = parent.insert("g", ":first-child")
          .classed("columnBackground" + this.id, true);
      }


      var bgDataLeft = [];
      var bgDataRight = [];

      for (var i = 0, j = pathWrappers.length - 1; i < pathWrappers.length && j >= 0; i++, j--) {

        var translateX = getColumnItemTranlateX(that, pathWrappers, i);
        var translateY = s.getPathContainerTranslateY(pathWrappers, i);

        bgDataLeft.push({
          x: translateX,
          y: translateY
        });
        bgDataLeft.push({
          x: translateX,
          y: translateY + pathWrappers[i].getHeight()
        });

        translateX = getColumnItemTranlateX(that, pathWrappers, j);
        translateY = s.getPathContainerTranslateY(pathWrappers, j);

        bgDataRight.push({
          x: translateX + that.getWidth(),
          y: translateY + pathWrappers[i].getHeight()
        });
        bgDataRight.push({
          x: translateX + that.getWidth(),
          y: translateY
        });

      }

      var bgData = bgDataLeft.concat(bgDataRight);

      var allBg = this.bgRoot.selectAll("path")
        .data([bgData]);

      var line = d3.svg.line()
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
        .interpolate("linear");

      allBg.enter()
        .append("path")
        .attr({
          //stroke: "black",
          fill: "rgb(240,240,240)",
          d: function (d) {
            return line(d)+"Z";
          }
        });

      allBg.transition()
        .attr({
          d: function (d) {
            return line(d)+"Z";
          }
        });

      allBg.exit().remove();


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
