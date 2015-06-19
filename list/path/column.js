define(["jquery", "d3", "./settings", "../../listeners", "../../uiutil", "../pathsorting", "../../datastore"], function ($, d3, s, listeners, uiUtil, pathSorting, dataStore) {

  //var DEFAULT_COLUMN_WIDTH = 80;
  var COLUMN_SPACING = 5;
  var BAR_SIZE = 12;
  var SMALL_BAR_SIZE = 8;


  var RANK_CRITERION_SELECTOR_WIDTH = 50;
  var COLUMN_ELEMENT_SPACING = 5;
  var STRATEGY_SELECTOR_START = 5;
  var DEFAULT_COLUMN_WIDTH = STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 2 * COLUMN_ELEMENT_SPACING + 16 + 5;
  //var RANK_CRITERION_ELEMENT_HEIGHT = 22;

  var currentColumnID = 0;
  var allColumns = [];

  function getTotalColumnWidth(columns, index) {

    var maxIndex = (typeof index === "undefined") ? columns.length - 1 : index;

    var width = 0;
    for (var i = 0; i < maxIndex; i++) {
      width += columns[i].getWidth();
      width += COLUMN_SPACING;
    }

    return width;
  }

  function getColumnItemTranlateX(columns, column, pathWrappers, index) {
    var pathWrapper = s.isAlignColumns() ? getMaxLengthPathWrapper(pathWrappers) : pathWrappers[index];
    var translateX = column.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
    translateX += getTotalColumnWidth(columns, columns.indexOf(column));
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


  function RankColumnHeader(priority, column, columnManager, selectedStrategyIndex) {
    this.priority = priority;
    this.column = column;
    this.columnManager = columnManager;
    this.selectedStrategyIndex = selectedStrategyIndex || 0;
  }

  RankColumnHeader.prototype = {

    setPriority: function (priority) {
      this.priority = priority;
      //if (typeof this.rootDomElement !== "undefined") {
      //  this.rootDomElement.select("text.priority")
      //    .text(this.priority.toString() + ".")
      //}
    },

    init: function (parent) {

      this.rootDomElement = parent.append("g")
        .classed("rankCriterionElement", true);

      this.rootDomElement.append("rect")
        .attr({
          x: 0,
          y: 0,
          width: DEFAULT_COLUMN_WIDTH,
          height: s.COLUMN_HEADER_HEIGHT
        })
        .style({
          fill: "rgb(240,240,240)"
        });

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

      this.rootDomElement.append("clipPath")
        .attr("id", "columnHeaderClipPath" + this.column.id)
        .append("rect")
        .attr("x", 3)
        .attr("y", 0)
        .attr("width", RANK_CRITERION_SELECTOR_WIDTH)
        .attr("height", s.COLUMN_HEADER_HEIGHT);

      var tooltip = this.rootDomElement.append("title")
        .text(this.columnManager.selectableSortingStrategies[this.selectedStrategyIndex].label);

      //this.rootDomElement.append("text")
      //  .classed("priority", true)
      //  .attr({
      //    x: 5,
      //    y: s.COLUMN_HEADER_HEIGHT / 2 + 5
      //  })
      //  .style({
      //    "font-size": "12px"
      //  })
      //  .text(this.priority.toString() + ".");

      var label = this.rootDomElement.append("text")
        .attr({
          x: STRATEGY_SELECTOR_START,
          y: s.COLUMN_HEADER_HEIGHT / 2 + 4,
          "clip-path": "url(#columnHeaderClipPath" + this.column.id + ")"
        })
        .style({font: "12px 'Arial'"})
        .text(this.columnManager.selectableSortingStrategies[this.selectedStrategyIndex].label);

      var fo = this.rootDomElement.append("foreignObject")
        .attr({
          x: STRATEGY_SELECTOR_START,
          y: 2,
          width: DEFAULT_COLUMN_WIDTH - STRATEGY_SELECTOR_START - 2,
          height: s.COLUMN_HEADER_HEIGHT - 4
        }).append("xhtml:div")
        .style("font", "12px 'Arial'")
        .style("opacity", 0)
        .html('<select class="strategySelector"></select>');


      var that = this;
      var selector = this.rootDomElement.select("select.strategySelector");

      this.columnManager.selectableSortingStrategies.forEach(function (strategy, i) {
        selector.append("option")
          .attr({
            value: i
          })
          .text(strategy.label);
      });

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
          that.columnManager.selectableSortingStrategies[that.selectedStrategyIndex].ascending = !that.columnManager.selectableSortingStrategies[that.selectedStrategyIndex].ascending;
          that.columnManager.updateSortOrder();
          that.columnManager.notify();
        });

      $(selector[0]).on("change", function () {
        that.selectedStrategyIndex = this.value;
        var sortingStrategy = that.columnManager.selectableSortingStrategies[that.selectedStrategyIndex];
        label.text(sortingStrategy.label);
        tooltip.text(sortingStrategy.label)
        that.column.setSortingStrategy(sortingStrategy);
        that.columnManager.updateSortOrder();
        that.columnManager.notify();
      });

      var removeButton = uiUtil.addOverlayButton(this.rootDomElement, STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 10 + 16, 3, 16, 16, "\uf00d", 16 / 2, 16 - 3, "red", true);


      removeButton.attr("display", "none");

      removeButton.on("click", function () {
        that.columnManager.removeColumn(that.column);
      });

      $(this.rootDomElement[0]).mouseenter(function () {
        removeButton.attr("display", "inline");
        //fo.attr("display", "inline");
        //fo.style("opacity", 1);
        //fo.attr("display", "inline");
        label.attr("display", "none");
        fo.style("opacity", 1);
      });

      $(this.rootDomElement[0]).mouseleave(function () {
        removeButton.attr("display", "none");
        //fo.attr("display", "none");
        //fo.style("opacity", 0);
        //selector.attr("display", "none");
        label.attr("display", "inline");
        fo.style("opacity", 0);
      });
    },

    orderButtonText: function () {
      return this.columnManager.selectableSortingStrategies[this.selectedStrategyIndex].ascending ? "\uf160" : "\uf161";
    },

    updateSortOrder: function () {
      this.rootDomElement.select("g.sortOrderButton").select("text").text(this.orderButtonText());
    },

    addSortingStrategies: function (newStrategies) {
      var selector = this.rootDomElement.select("select.strategySelector");
      var startIndex = this.columnManager.selectableSortingStrategies.length - newStrategies.length;
      newStrategies.forEach(function (strategy, i) {
        selector.append("option")
          .attr({
            value: startIndex + i
          })
          .text(strategy.label);
      });
    }
  };

  function Column(columnManager, sortingStrategy, priority) {
    this.columnManager = columnManager;
    this.pathList = columnManager.pathList;
    this.id = currentColumnID++;
    this.header = new RankColumnHeader(priority, this, columnManager, columnManager.selectableSortingStrategies.indexOf(sortingStrategy));
    this.setSortingStrategy(sortingStrategy);
  }

  Column.prototype = {
    setSortingStrategy: function (sortingStrategy) {
      if (this.itemRenderer) {
        this.itemRenderer.destroy(this);
      }
      d3.selectAll("g.columnItem" + this.id).remove();
      this.sortingStrategy = sortingStrategy;
      this.itemRenderer = this.columnManager.itemRenderers[sortingStrategy.id] || new PathItemRenderer();
      this.itemRenderer.init(this);
    },

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
            return "translate(" + getColumnItemTranlateX(that.columnManager.columns, that, pathWrappers, i) + "," + translateY + ")";
          }
        });

      columnItem.each(function (pathWrapper, index) {
        var item = d3.select(this);
        that.itemRenderer.enter(item, pathWrapper, index, pathWrappers, that);
      });

      allColumnItems.transition()
        .attr({
          transform: function (d, i) {
            var pathWrapper = s.isAlignColumns() ? maxLengthPathWrapper : d;
            var translateX = that.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
            translateX += getTotalColumnWidth(that.columnManager.columns, that.columnManager.columns.indexOf(that));
            var translateY = s.getPathContainerTranslateY(pathWrappers, i);
            return "translate(" + translateX + "," + translateY + ")";
          }
        });

      allColumnItems.each(function (pathWrapper, index) {
        var item = d3.select(this);
        that.itemRenderer.update(item, pathWrapper, index, pathWrappers, that);
      });

      allColumnItems.exit().remove();
    },

    renderHeader: function (pathWrappers) {
      var that = this;
      var translateX = getTotalColumnWidth(that.columnManager.columns, that.columnManager.columns.indexOf(this));
      if (pathWrappers.length !== 0) {
        var pathWrapper = s.isAlignColumns() ? getMaxLengthPathWrapper(pathWrappers) : pathWrappers[0];
        translateX += this.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
      }


      if (!this.headerElement) {
        this.headerElement = d3.select("#columnHeaders svg g.headers").append("g")
          .classed("columnHeader" + this.id, true)
          .attr({
            transform: "translate(" + translateX + ",0)"
          });


        this.header.init(this.headerElement);
      }

      this.headerElement.transition()
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

        var translateX = getColumnItemTranlateX(that.columnManager.columns, that, pathWrappers, i);
        var translateY = s.getPathContainerTranslateY(pathWrappers, i);

        bgDataLeft.push({
          x: translateX,
          y: translateY
        });
        bgDataLeft.push({
          x: translateX,
          y: translateY + pathWrappers[i].getHeight()
        });

        translateX = getColumnItemTranlateX(that.columnManager.columns, that, pathWrappers, j);
        translateY = s.getPathContainerTranslateY(pathWrappers, j);

        bgDataRight.push({
          x: translateX + that.getWidth(),
          y: translateY + pathWrappers[j].getHeight()
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
            return line(d) + "Z";
          }
        });

      allBg.transition()
        .attr({
          d: function (d) {
            return line(d) + "Z";
          }
        });

      allBg.exit().remove();


    },

    //onItemEnter: function ($item, pathWrapper, index, pathWrappers) {
    //
    //},
    //
    //onItemUpdate: function ($item, pathWrapper, index, pathWrappers) {
    //
    //},

    destroy: function () {
      this.itemRenderer.destroy(this);
      if (this.header) {
        this.headerElement.remove();
      }
      if (this.bgRoot) {
        this.bgRoot.remove();
      }
      d3.selectAll("g.columnItem" + this.id).remove();
    },

    getWidth: function () {
      return DEFAULT_COLUMN_WIDTH;
    }
  };

  function PathItemRenderer() {
  }

  PathItemRenderer.prototype = {
    enter: function (item, pathWrapper, index, pathWrappers) {

    },

    update: function (item, pathWrapper, index, pathWrappers) {

    },

    init: function (column) {

    },

    destroy: function (column) {

    }
  };

  function PathLengthRenderer() {
    PathItemRenderer.call(this);
  }

  PathLengthRenderer.prototype = Object.create(PathItemRenderer.prototype);

  PathLengthRenderer.prototype.enter = function (item, pathWrapper, index, pathWrappers, column) {
    var barScale = d3.scale.linear().domain([0, pathWrappers.length > 0 ? getMaxLengthPathWrapper(pathWrappers).path.nodes.length : 1]).range([0, column.getWidth()]);

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

  PathLengthRenderer.prototype.update = function (item, pathWrapper, index, pathWrappers, column) {
    var barScale = d3.scale.linear().domain([0, pathWrappers.length > 0 ? getMaxLengthPathWrapper(pathWrappers).path.nodes.length : 1]).range([0, column.getWidth()]);
    item.select("rect.pathLength")
      .transition()
      .attr({
        width: function (d) {
          return barScale(pathWrapper.path.nodes.length);
        }
      });
  };

  function getPathDatasetStatsValueRange(pathWrappers, dataset, stat) {
    var max = Number.NEGATIVE_INFINITY;
    var min = Number.POSITIVE_INFINITY;

    pathWrappers.forEach(function (pathWrapper) {
      var median = dataStore.getPathDatasetStats(pathWrapper.path, dataset.id)[stat];
      if (median > max) {
        max = median;
      }
      if (median < min) {
        min = median;
      }
      dataset.children.forEach(function (group) {
        var median = dataStore.getPathGroupStats(pathWrapper.path, dataset.id, group.name)[stat];
        if (median > max) {
          max = median;
        }
        if (median < min) {
          min = median;
        }
      })

    });

    return {min: min, max: max};
  }

//------------------------------
  function StatRenderer() {
    PathItemRenderer.call(this);
  }

  StatRenderer.prototype = Object.create(PathItemRenderer.prototype);

  StatRenderer.prototype.enter = function (item, pathWrapper, index, pathWrappers, column) {

    var datasetId = column.sortingStrategy.datasetId;
    var groupId = column.sortingStrategy.groupId;
    var dataset = 0;
    var index = 0;
    for (var i = 0; i < pathWrapper.datasets.length; i++) {
      var d = pathWrapper.datasets[i];
      if (d.id === datasetId) {
        dataset = d;
        index = i;
        break;
      }
    }

    var valueRange = getPathDatasetStatsValueRange(pathWrappers, dataset, column.sortingStrategy.stat);
    var barScale = d3.scale.linear().domain([Math.min(0, valueRange.min), Math.max(0, valueRange.max)]).range([0, column.getWidth()]);

    var stat = dataStore.getPathDatasetStats(pathWrapper.path, dataset.id)[column.sortingStrategy.stat];

    var posY = 0;
    var datasetWrappers = pathWrapper.datasets;

    for (var j = 0; j < index; j++) {
      var datasetWrapper = datasetWrappers[j];
      if (datasetWrapper.canBeShown()) {
        posY += datasetWrapper.getHeight();
      }
    }

    var datasetGroup = item.append("g")
      .classed("dataset", true)
      .attr({
        transform: "translate(0," + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + posY) + ")"
      });

    var bar = datasetGroup.append("rect")
      .classed("datasetMedian", true)
      .attr({
        x: stat < 0 ? barScale(stat) : barScale(0),
        y: (dataset.getBaseHeight() - BAR_SIZE) / 2,
        fill: (typeof groupId === "undefined") ? "gray" : "rgb(180, 180,180)",
        width: Math.abs(barScale(0) - barScale(stat)),
        height: BAR_SIZE
      })
      .on("dblclick", function (d) {
        if (column.sortingStrategy.groupId) {
          s.decStickyDataGroupOwners(dataset.id, column.sortingStrategy.groupId);
        }
        delete column.sortingStrategy.groupId;
        listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
      });

    bar.append("title")
      .text(column.sortingStrategy.stat + ":" + stat);

  };

  StatRenderer.prototype.update = function (item, pathWrapper, index, pathWrappers, column) {

    var datasetId = column.sortingStrategy.datasetId;
    var groupId = column.sortingStrategy.groupId;
    var dataset = 0;
    var index = 0;
    for (var i = 0; i < pathWrapper.datasets.length; i++) {
      var d = pathWrapper.datasets[i];
      if (d.id === datasetId) {
        dataset = d;
        index = i;
        break;
      }
    }

    var valueRange = getPathDatasetStatsValueRange(pathWrappers, dataset, column.sortingStrategy.stat);
    var barScale = d3.scale.linear().domain([Math.min(0, valueRange.min), Math.max(0, valueRange.max)]).range([0, column.getWidth()]);

    var stat = dataStore.getPathDatasetStats(pathWrapper.path, dataset.id)[column.sortingStrategy.stat];

    var posY = 0;
    var datasetWrappers = pathWrapper.datasets;

    for (var j = 0; j < index; j++) {
      var datasetWrapper = datasetWrappers[j];
      if (datasetWrapper.canBeShown()) {
        posY += datasetWrapper.getHeight();
      }
    }

    var datasetGroup = item.select("g.dataset")
      .classed("dataset", true)
      .attr({
        transform: "translate(0," + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + posY) + ")"
      });

    datasetGroup.select("rect.datasetMedian")
      .transition()
      .attr({
        x: stat < 0 ? barScale(stat) : barScale(0),
        y: (dataset.getBaseHeight() - BAR_SIZE) / 2,
        fill: (typeof groupId === "undefined") ? "gray" : "rgb(180, 180,180)",
        width: Math.abs(barScale(0) - barScale(stat))
      });

    //if (dataset.collapsed) {
    //  datasetGroup.selectAll("rect.groupMedian").remove();
    //  return;
    //}

    var allGroupBars = datasetGroup.selectAll("rect.groupMedian")
      .data(dataset.getVisibleChildren(), function (d) {
        return d.name
      });

    allGroupBars.enter()
      .append("rect")
      .classed("groupMedian", true)
      .each(function (group, index) {

        var stat = dataStore.getPathGroupStats(pathWrapper.path, dataset.id, group.name)[column.sortingStrategy.stat];

        var posY = dataset.getBaseHeight();
        var groups = dataset.getVisibleChildren();

        for (var j = 0; j < index; j++) {
          var g = groups[j];
          posY += g.getHeight();
        }

        d3.select(this).attr({
          x: stat < 0 ? barScale(stat) : barScale(0),
          y: (group.getBaseHeight() - SMALL_BAR_SIZE) / 2,
          fill: groupId === group.name ? "gray" : "rgb(180, 180,180)",
          width: Math.abs(barScale(0) - barScale(stat)),
          height: SMALL_BAR_SIZE,
          transform: "translate(0," + posY + ")"
        })
          .on("dblclick", function (d) {
            if (column.sortingStrategy.groupId) {
              s.decStickyDataGroupOwners(dataset.id, column.sortingStrategy.groupId);
            }
            s.incStickyDataGroupOwners(dataset.id, group.name);
            column.sortingStrategy.groupId = group.name;
            listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
          });

        d3.select(this).append("title")
          .text(column.sortingStrategy.stat + ": " + stat);

      });

    allGroupBars.each(function (group, index) {
      var stat = dataStore.getPathGroupStats(pathWrapper.path, dataset.id, group.name)[column.sortingStrategy.stat];

      var posY = dataset.getBaseHeight();
      var groups = dataset.getVisibleChildren();

      for (var j = 0; j < index; j++) {
        var g = groups[j];
        posY += g.getHeight();
      }


      d3.select(this).attr({
        x: stat < 0 ? barScale(stat) : barScale(0),
        y: (group.getBaseHeight() - SMALL_BAR_SIZE) / 2,
        fill: groupId === group.name ? "gray" : "rgb(180, 180,180)",
        width: Math.abs(barScale(0) - barScale(stat)),
        transform: "translate(0," + posY + ")"
      });
    });

    allGroupBars.exit().remove();
  };

  StatRenderer.prototype.init = function (column) {
    if (column.sortingStrategy.groupId) {
      s.incStickyDataGroupOwners(column.sortingStrategy.datasetId, column.sortingStrategy.groupId);
    }
  };

  StatRenderer.prototype.destroy = function (column) {
    if (column.sortingStrategy.groupId) {
      s.decStickyDataGroupOwners(column.sortingStrategy.datasetId, column.sortingStrategy.groupId);
    }
  };

  //----------------------

  function ColumnManager() {
    this.columns = [];
    this.itemRenderers = {};
  }

  ColumnManager.prototype = {

    init: function (pathList) {
      this.pathList = pathList;
      this.itemRenderers[pathSorting.sortingStrategies.pathLength.id] = new PathLengthRenderer();
      this.itemRenderers["OVERALL_STATS"] = new StatRenderer();

      var that = this;
      var initialPathSortingStrategies = Object.create(pathSorting.sortingManager.currentStrategyChain);
      initialPathSortingStrategies.splice(pathSorting.sortingManager.currentStrategyChain.length - 1, 1);

      this.selectableSortingStrategies = [pathSorting.sortingStrategies.pathQueryStrategy, pathSorting.sortingStrategies.selectionSortingStrategy,
        pathSorting.sortingStrategies.pathLength, pathSorting.sortingStrategies.setCountEdgeWeight];
      this.selectableSortingStrategies = this.selectableSortingStrategies.concat(dataStore.getDataBasedPathSortingStrategies());

      this.columns = initialPathSortingStrategies.map(function (sortingStrategy, i) {
        return new Column(that, sortingStrategy, i + 1);
      });

      listeners.add(function () {

        var dataSortingStrategies = dataStore.getDataBasedPathSortingStrategies();
        var newStrategies = dataSortingStrategies.filter(function (strategy) {
          for (var i = 0; i < that.selectableSortingStrategies.length; i++) {
            if (that.selectableSortingStrategies[i].id === strategy.id) {
              return false;
            }
          }
          return true;
        });

        if (newStrategies.length > 0) {
          that.selectableSortingStrategies = that.selectableSortingStrategies.concat(newStrategies);
          that.columns.forEach(function (column) {
            column.header.addSortingStrategies(newStrategies);
          });
        }

      }, listeners.updateType.DATASET_UPDATE);


    },

    getStrategyChain: function () {
      var chain = [];
      var that = this;

      this.columns.forEach(function (column) {
        chain.push(that.selectableSortingStrategies[column.header.selectedStrategyIndex]);
      });

      return chain;
    },

    notify: function () {
      var chain = this.getStrategyChain();
      chain.push(pathSorting.sortingStrategies.pathId);
      pathSorting.sortingManager.setStrategyChain(chain);
      listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
    },

    updateSortOrder: function () {
      this.columns.forEach(function (column) {
        column.header.updateSortOrder();
      });
    },

    removeColumn: function (col) {
      var index = this.columns.indexOf(col);
      if (index !== -1) {
        this.columns.splice(index, 1);
        col.destroy();

        this.columns.forEach(function (column, i) {
          column.header.setPriority(i + 1);
        });
        this.pathList.renderPaths();
      }
    }
    ,

    renderColumns: function (parent, pathWrappers) {

      var svg = d3.select("#columnHeaders svg");
      if (svg.select("g.overlay").empty()) {
        svg.append("g")
          .classed("headers", true);
        svg.append("g")
          .classed("overlay", true);
      }

      if (!this.addColumnButton) {

        var that = this;
        var overlay = svg.select("g.overlay");

        this.addColumnButton = uiUtil.addOverlayButton(overlay, 0, 0, 16, 16, "\uf067", 16 / 2, 16 - 1, "green", true);
        this.addColumnButton
          .attr("display", "none")
          .on("click", function () {
            that.columns.push(new Column(that, that.selectableSortingStrategies[0], that.columns.length + 1));
            that.notify();
          });


        $(svg[0]).mouseenter(function () {
          that.addColumnButton.attr("display", "inline");
        });

        $(svg[0]).mouseleave(function () {
          that.addColumnButton.attr("display", "none");
        });
      }

      this.columns.forEach(function (col) {
        col.render(parent, pathWrappers);
      });

      this.addColumnButton.transition().attr({
        transform: "translate(" + ((this.columns.length > 0 && pathWrappers.length > 0) ? getColumnItemTranlateX(this.columns, this.columns[this.columns.length - 1], pathWrappers, 0) + this.columns[this.columns.length - 1].getWidth() + COLUMN_SPACING + 16 : 0) + ", 3)"
      });
    }
    ,

    getWidth: function () {
      return getTotalColumnWidth(this.columns);
    }

  }
  ;

  return new ColumnManager();

})
;
