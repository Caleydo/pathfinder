define(["jquery", "d3", "./settings", "../../listeners", "../../uiutil", "../pathsorting", "../../datastore", "../../config"],
  function ($, d3, s, listeners, uiUtil, pathSorting, dataStore, config) {

    //var DEFAULT_COLUMN_WIDTH = 80;
    var COLUMN_SPACING = 5;
    var BAR_SIZE = 12;
    var SMALL_BAR_SIZE = 8;


    //var RANK_CRITERION_SELECTOR_WIDTH = 50;
    //var COLUMN_ELEMENT_SPACING = 5;
    //var STRATEGY_SELECTOR_START = 5;

    var HEADER_ELEMENT_SPACING = 5;
    var HEADER_BUTTON_SIZE = 16;

    var BAR_COLUMN_WIDTH = 90;
    var HEATMAP_COLUMN_WIDTH = 40;
    var TEXT_COLUMN_WIDTH = 40;
    //var RANK_CRITERION_ELEMENT_HEIGHT = 22;

    var currentColumnID = 0;
    //var allColumns = [];

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


    function RankColumnHeader(priority, column, columnManager, sortingStrategy) {
      this.priority = priority;
      this.column = column;
      this.columnManager = columnManager;
      this.sortingStrategy = sortingStrategy;
      //this.selectedStrategyIndex = selectedStrategyIndex || 0;
    }

    RankColumnHeader.prototype = {

      setPriority: function (priority) {
        this.priority = priority;
      },

      init: function (parent) {

        var that = this;
        var columnWidth = that.column.getWidth();

        this.rootDomElement = parent.append("g")
          .classed("rankCriterionElement", true);

        this.rootDomElement.append("rect")
          .classed("colBg", true)
          .attr({
            x: 0,
            y: s.COLUMN_HEADER_HEIGHT / 2,
            width: columnWidth,
            height: "100%"
          })
          .style({
            fill: "rgb(240,240,240)"
          });

        var columnGroup = this.rootDomElement.append("g");

        var headerBackground = columnGroup.append("rect")
          .classed("headerBg", true)
          .attr({
            x: 0,
            y: 0,
            rx: 5,
            ry: 5,
            width: columnWidth,
            height: s.COLUMN_HEADER_HEIGHT
          })
          .style({
            fill: "lightgray"
          });


        this.rootDomElement.on("mouseover", function () {
          headerBackground.style({
            fill: "rgb(180,180,180)"
          });
        })
          .on("mouseout", function () {
            headerBackground.style({
              fill: "lightgray"
            });
          });

        this.rootDomElement.append("clipPath")
          .attr("id", "columnHeaderClipPath" + this.column.id)
          .append("rect")
          .attr("x", 3)
          .attr("y", 0)
          .attr("width", columnWidth - (3 * HEADER_ELEMENT_SPACING + HEADER_BUTTON_SIZE))
          .attr("height", s.COLUMN_HEADER_HEIGHT);

        var tooltip = columnGroup.append("title")
          .text(this.sortingStrategy.label);


        var label = columnGroup.append("text")
          .attr({
            x: HEADER_ELEMENT_SPACING,
            y: s.COLUMN_HEADER_HEIGHT / 2 + 4,
            "clip-path": "url(#columnHeaderClipPath" + this.column.id + ")"
          })
          .style({font: "12px 'Arial'"})
          .text(this.sortingStrategy.label);

        columnGroup.on("click.openOptions", function () {

          uiUtil.showListOverlay([{
            text: "Rank by...",
            icon: "",
            callback: function () {
              pathSorting.openConfigureSortingDialog(function (sortingStrategy) {
                label.text(sortingStrategy.label);
                tooltip.text(sortingStrategy.label);
                that.sortingStrategy = sortingStrategy;
                that.column.setSortingStrategy(sortingStrategy);
                that.columnManager.updateSortOrder();
                that.columnManager.notify();
              });
            }
          },
            {
              text: "Show as Bars",
              icon: "",
              callback: function () {
                d3.selectAll("g.columnItem" + that.column.id).remove();
                that.column.itemRenderer.setScoreRepresentation(new BarRepresentation());
                that.updateWidth();
                that.columnManager.notify();
              }
            },
            {
              text: "Show as Heatmap",
              icon: "",
              callback: function () {
                d3.selectAll("g.columnItem" + that.column.id).remove();
                that.column.itemRenderer.setScoreRepresentation(new HeatmapRepresentation());
                that.updateWidth();
                that.columnManager.notify();
              }
            },
            {
              text: "Show as Text",
              icon: "",
              callback: function () {
                d3.selectAll("g.columnItem" + that.column.id).remove();
                that.column.itemRenderer.setScoreRepresentation(new TextRepresentation());
                that.updateWidth();
                that.columnManager.notify();
              }
            },
            {
              text: "Sort ascending",
              icon: "\uf160",
              callback: function () {
                updateSortOrder(true);
              }
            },
            {
              text: "Sort descending",
              icon: "\uf161",
              callback: function () {
                updateSortOrder(false);
              }
            },
            {
              text: "Remove column",
              icon: "\uf00d",
              callback: function () {
                that.columnManager.removeColumn(that.column);
              }
            }

          ]);


        });

        function updateSortOrder(ascending) {
          that.sortingStrategy.ascending = ascending;
          that.columnManager.updateSortOrder();
          that.columnManager.notify();
        }


        that.sortingOrderButton = uiUtil.addOverlayButton(this.rootDomElement, columnWidth - HEADER_ELEMENT_SPACING - HEADER_BUTTON_SIZE, 3,
          HEADER_BUTTON_SIZE, HEADER_BUTTON_SIZE, that.orderButtonText(), 16 / 2, 16 - 3, "rgb(30,30,30)", false);

        that.sortingOrderButton
          .classed("sortOrderButton", true)
          .on("click", function () {
            updateSortOrder(!that.sortingStrategy.ascending);
          }).append("title")
          .text("Toggle sort order");


        //var removeButton = uiUtil.addOverlayButton(this.rootDomElement, STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 10 + 16, 3, 16, 16, "\uf00d", 16 / 2, 16 - 3, "red", true);
        //
        //
        //removeButton.attr("display", "none");
        //
        //removeButton.on("click", function () {
        //  that.columnManager.removeColumn(that.column);
        //});
        //
        //
        //$(this.rootDomElement[0]).mouseenter(function () {
        //  removeButton.attr("display", "inline");
        //});
        ////
        //$(this.rootDomElement[0]).mouseleave(function () {
        //  removeButton.attr("display", "none");
        //});
      },

      orderButtonText: function () {
        return this.sortingStrategy.ascending ? "\uf160" : "\uf161";
      },

      updateSortOrder: function () {
        this.rootDomElement.select("g.sortOrderButton").select("text").text(this.orderButtonText());
      },


      updateWidth: function () {

        var width = this.column.getWidth();

        this.rootDomElement.select("rect.colBg")
          .transition()
          .attr({
            width: width
          });

        this.rootDomElement.select("rect.headerBg")
          .transition()
          .attr({
            width: width
          });

        this.rootDomElement.select("#columnHeaderClipPath" + this.column.id).select("rect")
          .transition()
          .attr("width", width - (3 * HEADER_ELEMENT_SPACING + HEADER_BUTTON_SIZE));

        this.sortingOrderButton
          .transition()
          .attr({
            transform: "translate(" + (width - HEADER_BUTTON_SIZE - HEADER_ELEMENT_SPACING) + "," + (3) + ")"
          });
      }

    };

    function Column(columnManager, sortingStrategy, priority) {
      this.columnManager = columnManager;
      this.pathList = columnManager.pathList;
      this.id = currentColumnID++;
      this.header = new RankColumnHeader(priority, this, columnManager, sortingStrategy);
      this.setSortingStrategy(sortingStrategy);
    }

    Column.prototype = {
      setSortingStrategy: function (sortingStrategy) {
        if (this.itemRenderer) {
          this.itemRenderer.destroy(this);
        }
        d3.selectAll("g.columnItem" + this.id).remove();
        this.sortingStrategy = sortingStrategy;
        this.itemRenderer = this.columnManager.getItemRenderer(sortingStrategy, this);
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
        return this.itemRenderer.getWidth();
      }
    };

    function PathItemRenderer(column, scoreRepresentation) {
      this.scoreRepresentation = scoreRepresentation || new BarRepresentation();
      this.column = column;
    }

    PathItemRenderer.prototype = {
      enter: function (item, pathWrapper, index, pathWrappers) {

      },

      setScoreRepresentation: function (scoreRepresentation) {
        this.destroy();
        this.scoreRepresentation = scoreRepresentation;
        this.init();
      },

      update: function (item, pathWrapper, index, pathWrappers) {

      },

      init: function () {

      },

      destroy: function () {

      },

      getWidth: function () {
        return this.scoreRepresentation.getWidth();
      }
    };

    function getScoreValueRange(pathWrappers, sortingStrategy) {
      var max = Number.NEGATIVE_INFINITY;
      var min = Number.POSITIVE_INFINITY;

      pathWrappers.forEach(function (pathWrapper) {
        var score = sortingStrategy.getScore(pathWrapper.path);
        if (score > max) {
          max = score;
        }
        if (score < min) {
          min = score;
        }
      });

      return {min: min, max: max};
    }

    function SimplePathScoreRenderer(column, scoreRepresentation) {
      PathItemRenderer.call(this, column, scoreRepresentation);
    }

    SimplePathScoreRenderer.prototype = Object.create(PathItemRenderer.prototype);

    SimplePathScoreRenderer.prototype.enter = function (item, pathWrapper, index, pathWrappers, column) {

      var valueRange = getScoreValueRange(pathWrappers, column.sortingStrategy);

      var score = column.sortingStrategy.getScore(pathWrapper.path);

      this.scoreRepresentation.setValueRange(valueRange);
      this.scoreRepresentation.appendScore(item, score, s.PATH_HEIGHT);


      item.append("title")
        .text(column.sortingStrategy.label + ": " + score);
    };

    SimplePathScoreRenderer.prototype.update = function (item, pathWrapper, index, pathWrappers, column) {
      var valueRange = getScoreValueRange(pathWrappers, column.sortingStrategy);

      var score = column.sortingStrategy.getScore(pathWrapper.path);
      this.scoreRepresentation.setValueRange(valueRange);
      this.scoreRepresentation.updateScore(item, score, s.PATH_HEIGHT);
    };

    function getPathDataScoreValueRange(pathWrappers, dataset, sortingStrategy) {
      var max = Number.NEGATIVE_INFINITY;
      var min = Number.POSITIVE_INFINITY;

      pathWrappers.forEach(function (pathWrapper) {
        var score = sortingStrategy.getScoreInfo(pathWrapper.path, dataset.id).score;
        if (score > max) {
          max = score;
        }
        if (score < min) {
          min = score;
        }
        if (sortingStrategy.supportsScoresPerGroup) {
          dataset.children.forEach(function (group) {
            var score = sortingStrategy.getScoreInfo(pathWrapper.path, dataset.id, group.name).score;
            if (score > max) {
              max = score;
            }
            if (score < min) {
              min = score;
            }
          })
        }

      });

      return {min: min, max: max};
    }

    function ScoreRepresentation() {
    }

    ScoreRepresentation.prototype = {

      setValueRange: function (valueRange) {
        this.scale = d3.scale.linear().domain([Math.min(0, valueRange.min), Math.max(0, valueRange.max)]).range([0, this.getWidth()]);
      },

      getWidth: function () {
      },

      appendScore: function (parent, score, maxHeight, color) {
      },

      updateScore: function (parent, score, maxHeight, color) {

      }
    };


    function BarRepresentation(color) {
      ScoreRepresentation.call(this);
      this.color = color || "gray";
    }

    BarRepresentation.prototype = Object.create(ScoreRepresentation.prototype);

    BarRepresentation.prototype.setValueRange = function (valueRange) {
      this.scale = d3.scale.linear().domain([Math.min(0, valueRange.min), Math.max(0, valueRange.max)]).range([0, this.getWidth()]);
    };

    BarRepresentation.prototype.getWidth = function () {
      return BAR_COLUMN_WIDTH;
    };

    BarRepresentation.prototype.appendScore = function (parent, score, maxHeight, color) {
      var height = Math.min(BAR_SIZE, maxHeight);
      var that = this;
      parent.append("rect")
        .classed("score", true)
        .attr({
          x: score < 0 ? that.scale(score) : that.scale(0),
          y: (maxHeight - height) / 2,
          fill: color || that.color,
          width: Math.abs(that.scale(0) - that.scale(score)),
          height: height
        });
    };

    BarRepresentation.prototype.updateScore = function (parent, score, maxHeight, color) {
      var height = Math.min(BAR_SIZE, maxHeight);
      var that = this;
      parent.select("rect.score")
        .transition()
        .attr({
          x: score < 0 ? that.scale(score) : that.scale(0),
          y: (maxHeight - height) / 2,
          fill: color || that.color,
          width: Math.abs(that.scale(0) - that.scale(score)),
          height: height
        });
    };

//---------------------------------------

    function HeatmapRepresentation(size) {
      ScoreRepresentation.call(this);
      this.size = size || 12;
    }

    HeatmapRepresentation.prototype = Object.create(ScoreRepresentation.prototype);

    HeatmapRepresentation.prototype.setValueRange = function (valueRange) {
      this.scale = d3.scale.linear().domain([Math.min(0, valueRange.min), Math.max(0, valueRange.max)]).range(["black", "white"]);
    };

    HeatmapRepresentation.prototype.getWidth = function () {
      return HEATMAP_COLUMN_WIDTH;
    };

    HeatmapRepresentation.prototype.appendScore = function (parent, score, maxHeight) {
      var size = Math.min(this.size, maxHeight);
      var that = this;
      parent.append("rect")
        .classed("score", true)
        .attr({
          x: (that.getWidth() - that.size) / 2,
          y: (maxHeight - size) / 2,
          fill: that.scale(score),
          stroke: "black",
          width: size,
          height: size
        });
    };

    HeatmapRepresentation.prototype.updateScore = function (parent, score, maxHeight) {
      var size = Math.min(this.size, maxHeight);
      var that = this;
      parent.select("rect.score")
        .transition()
        .attr({
          x: (that.getWidth() - that.size) / 2,
          y: (maxHeight - size) / 2,
          fill: that.scale(score),
          stroke: "black",
          width: size,
          height: size
        });
    };


    //---------------------------------------

    function TextRepresentation() {
      ScoreRepresentation.call(this);
    }

    TextRepresentation.prototype = Object.create(ScoreRepresentation.prototype);

    TextRepresentation.prototype.getWidth = function () {
      return TEXT_COLUMN_WIDTH;
    };

    TextRepresentation.prototype.appendScore = function (parent, score, maxHeight) {
      var size = Math.min(this.size, maxHeight);
      var that = this;
      parent.append("text")
        .classed("score", true)
        .attr({
          x: 5,
          y: maxHeight / 2 + 4
        })
        .text(uiUtil.formatNumber(score));
    };

    TextRepresentation.prototype.updateScore = function (parent, score, maxHeight) {
      var size = Math.min(this.size, maxHeight);
      var that = this;
      parent.select("text.score")
        .transition()
        .attr({
          x: 5,
          y: maxHeight / 2 + 4
        })
        .text(uiUtil.formatNumber(score));
    };


//------------------------------
    function StatRenderer(column, scoreRepresentation, tooltipTextAccessor) {
      PathItemRenderer.call(this, column, scoreRepresentation);
      this.tooltipTextAccessor = tooltipTextAccessor;
    }

    StatRenderer.prototype = Object.create(PathItemRenderer.prototype);

    StatRenderer.prototype.enter = function (item, pathWrapper, index, pathWrappers, column) {

      var datasetId = column.sortingStrategy.datasetId;
      var groupId = column.sortingStrategy.groupId;
      var dataset = 0;
      var dsIndex = 0;
      for (var i = 0; i < pathWrapper.datasets.length; i++) {
        var d = pathWrapper.datasets[i];
        if (d.id === datasetId) {
          dataset = d;
          dsIndex = i;
          break;
        }
      }

      var valueRange = getPathDataScoreValueRange(pathWrappers, dataset, column.sortingStrategy);
      this.scoreRepresentation.setValueRange(valueRange);
      //var barScale = d3.scale.linear().domain([Math.min(0, valueRange.min), Math.max(0, valueRange.max)]).range([0, column.getWidth()]);

      var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path, dataset.id);
      var score = scoreInfo.score;

      var posY = 0;
      var datasetWrappers = pathWrapper.datasets;
      var that = this;

      for (var j = 0; j < dsIndex; j++) {
        var datasetWrapper = datasetWrappers[j];
        if (datasetWrapper.canBeShown()) {
          posY += datasetWrapper.getHeight();
        }
      }

      var datasetGroup = item.append("g")
        .classed("dataset", true)
        .attr({
          transform: "translate(0," + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + posY) + ")"
        })
        .on("dblclick", function () {
          if (column.sortingStrategy.groupId) {
            s.decStickyDataGroupOwners(dataset.id, column.sortingStrategy.groupId);
          }
          delete column.sortingStrategy.groupId;
          listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
        });

      this.scoreRepresentation.appendScore(datasetGroup, score, dataset.getBaseHeight(), (typeof groupId === "undefined") ? dataset.color : d3.hsl(dataset.color).brighter(1).toString());

      //var bar = datasetGroup.append("rect")
      //  .classed("datasetScore", true)
      //  .attr({
      //    x: score < 0 ? barScale(score) : barScale(0),
      //    y: (dataset.getBaseHeight() - BAR_SIZE) / 2,
      //    fill: (typeof groupId === "undefined") ? "gray" : "rgb(180, 180,180)",
      //    width: Math.abs(barScale(0) - barScale(score)),
      //    height: BAR_SIZE
      //  })


      datasetGroup.append("title")
        .text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));

    };

    StatRenderer.prototype.update = function (item, pathWrapper, index, pathWrappers, column) {

      var that = this;
      var datasetId = column.sortingStrategy.datasetId;
      var groupId = column.sortingStrategy.groupId;
      var dataset = 0;
      var dsIndex = 0;
      for (var i = 0; i < pathWrapper.datasets.length; i++) {
        var d = pathWrapper.datasets[i];
        if (d.id === datasetId) {
          dataset = d;
          dsIndex = i;
          break;
        }
      }

      var valueRange = getPathDataScoreValueRange(pathWrappers, dataset, column.sortingStrategy);
      this.scoreRepresentation.setValueRange(valueRange);
      var barScale = d3.scale.linear().domain([Math.min(0, valueRange.min), Math.max(0, valueRange.max)]).range([0, column.getWidth()]);

      var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path, dataset.id);
      var score = scoreInfo.score;

      var posY = 0;
      var datasetWrappers = pathWrapper.datasets;

      for (var j = 0; j < dsIndex; j++) {
        var datasetWrapper = datasetWrappers[j];
        if (datasetWrapper.canBeShown()) {
          posY += datasetWrapper.getHeight();
        }
      }

      var datasetPosY = s.PATH_HEIGHT + pathWrapper.getSetHeight() + posY;

      var datasetGroup = item.select("g.dataset")
        .attr({
          transform: "translate(0," + datasetPosY + ")"
        });

      this.scoreRepresentation.updateScore(datasetGroup, score, dataset.getBaseHeight(), (typeof groupId === "undefined") ? dataset.color : d3.hsl(dataset.color).brighter(1).toString());
      //
      //datasetGroup.select("rect.datasetScore")
      //  .transition()
      //  .attr({
      //    x: score < 0 ? barScale(score) : barScale(0),
      //    y: (dataset.getBaseHeight() - BAR_SIZE) / 2,
      //    fill: (typeof groupId === "undefined") ? "gray" : "rgb(180, 180,180)",
      //    width: Math.abs(barScale(0) - barScale(score))
      //  });


      if (column.sortingStrategy.supportsScoresPerGroup) {
        var allGroups = item.selectAll("g.group")
          .data(dataset.getVisibleChildren(), function (d) {
            return d.name
          });

        allGroups.enter()
          .append("g")
          .classed("group", true)
          .each(function (group, index) {

            var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path, dataset.id, group.name);
            var score = scoreInfo.score;

            var posY = dataset.getBaseHeight();
            var groups = dataset.getVisibleChildren();

            for (var j = 0; j < index; j++) {
              var g = groups[j];
              posY += g.getHeight();
            }


            d3.select(this).attr({
              //x: score < 0 ? barScale(score) : barScale(0),
              //y: (group.getBaseHeight() - SMALL_BAR_SIZE) / 2,
              //fill: groupId === group.name ? "gray" : "rgb(180, 180,180)",
              //width: Math.abs(barScale(0) - barScale(score)),
              //height: SMALL_BAR_SIZE,
              transform: "translate(0," + (datasetPosY + posY) + ")"
            })
              .on("dblclick", function () {
                if (column.sortingStrategy.groupId) {
                  s.decStickyDataGroupOwners(dataset.id, column.sortingStrategy.groupId);
                }
                s.incStickyDataGroupOwners(dataset.id, group.name);
                column.sortingStrategy.groupId = group.name;
                listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
              });

            that.scoreRepresentation.appendScore(d3.select(this), score, group.getBaseHeight(), (groupId === group.name) ? dataset.color : d3.hsl(dataset.color).brighter(1).toString());

            d3.select(this).append("title")
              .text(that.tooltipTextAccessor(column.sortingStrategy, scoreInfo));

          });

        allGroups.each(function (group, index) {
          var scoreInfo = column.sortingStrategy.getScoreInfo(pathWrapper.path, dataset.id, group.name);
          var score = scoreInfo.score;

          var posY = dataset.getBaseHeight();
          var groups = dataset.getVisibleChildren();

          for (var j = 0; j < index; j++) {
            var g = groups[j];
            posY += g.getHeight();
          }


          d3.select(this).attr({
            //x: score < 0 ? barScale(score) : barScale(0),
            //y: (group.getBaseHeight() - SMALL_BAR_SIZE) / 2,
            //fill: groupId === group.name ? "gray" : "rgb(180, 180,180)",
            //width: Math.abs(barScale(0) - barScale(score)),
            transform: "translate(0," + (datasetPosY + posY) + ")"
          });

          that.scoreRepresentation.updateScore(d3.select(this), score, group.getBaseHeight(), (groupId === group.name) ? dataset.color : d3.hsl(dataset.color).brighter(1).toString());
        });

        allGroups.exit().remove();
      }
    };

    StatRenderer.prototype.init = function () {
      if (this.column.sortingStrategy.groupId) {
        s.incStickyDataGroupOwners(this.column.sortingStrategy.datasetId, this.column.sortingStrategy.groupId);
      }
    };

    StatRenderer.prototype.destroy = function () {
      if (this.column.sortingStrategy.groupId) {
        s.decStickyDataGroupOwners(this.column.sortingStrategy.datasetId, this.column.sortingStrategy.groupId);
      }
    };

//----------------------

    function overallStatsTooltip(strategy, scoreInfo) {
      return strategy.stat + ": " + scoreInfo.score;
    }

    function perNodeStatsTooltip(strategy, scoreInfo) {
      return strategy.stat + ": " + scoreInfo.score + " (Node: " + scoreInfo.node.properties[config.getNodeNameProperty(scoreInfo.node)] + ")";
    }

    function overallBetweenGroupsStatsTooltip(strategy, scoreInfo) {
      return strategy.stat + ": " + scoreInfo.score + " (Groups: " + scoreInfo.group1 + ", " + scoreInfo.group2 + ")";
    }

    function perNodeBetweenGroupsStatsTooltip(strategy, scoreInfo) {
      return strategy.stat + ": " + scoreInfo.score + " (Groups: " + scoreInfo.group1 + ", " + scoreInfo.group2 + ", Node: " + scoreInfo.node.properties[config.getNodeNameProperty(scoreInfo.node)] + ")";
    }

    function ColumnManager() {
      this.columns = [];
      this.itemRenderers = {};
    }

    ColumnManager.prototype = {

      init: function (pathList) {
        this.pathList = pathList;
        this.itemRenderers[pathSorting.sortingStrategies.pathLength.id] = function (column) {
          return new SimplePathScoreRenderer(column, new TextRepresentation());
        };
        this.itemRenderers["OVERALL_STATS"] = function (column) {
          return new StatRenderer(column, new BarRepresentation(), overallStatsTooltip);
        };
        this.itemRenderers["PER_NODE_STATS"] = function (column) {
          return new StatRenderer(column, new BarRepresentation(), perNodeStatsTooltip);
        };
        this.itemRenderers["OVERALL_BETWEEN_GROUPS_STATS"] = function (column) {
          return new StatRenderer(column, new BarRepresentation(), overallBetweenGroupsStatsTooltip);
        };
        this.itemRenderers["PER_NODE_BETWEEN_GROUPS_STATS"] = function (column) {
          return new StatRenderer(column, new BarRepresentation(), perNodeBetweenGroupsStatsTooltip);
        };

        var that = this;
        var initialPathSortingStrategies = Object.create(pathSorting.sortingManager.currentStrategyChain);
        initialPathSortingStrategies.splice(pathSorting.sortingManager.currentStrategyChain.length - 1, 1);

        //this.selectableSortingStrategies = [pathSorting.sortingStrategies.pathQueryStrategy, pathSorting.sortingStrategies.selectionSortingStrategy,
        //  pathSorting.sortingStrategies.pathLength, pathSorting.sortingStrategies.setCountEdgeWeight].concat(pathSorting.customSortingStrategies);
        //this.selectableSortingStrategies = this.selectableSortingStrategies.concat(dataStore.getDataBasedPathSortingStrategies());

        this.columns = initialPathSortingStrategies.map(function (sortingStrategy, i) {
          return new Column(that, sortingStrategy, i + 1);
        });

        //listeners.add(function () {
        //
        //  addNewStrategies(dataStore.getDataBasedPathSortingStrategies());
        //
        //}, listeners.updateType.DATASET_UPDATE);
        //
        //listeners.add(function (customStrategies) {
        //
        //  addNewStrategies(customStrategies);
        //
        //}, "CUSTOM_SORTING_STRATEGY_UPDATE");

        //function addNewStrategies(strategies) {
        //  var newStrategies = strategies.filter(function (strategy) {
        //    for (var i = 0; i < that.selectableSortingStrategies.length; i++) {
        //      if (that.selectableSortingStrategies[i].id === strategy.id) {
        //        return false;
        //      }
        //    }
        //    return true;
        //  });
        //
        //  if (newStrategies.length > 0) {
        //    that.selectableSortingStrategies = that.selectableSortingStrategies.concat(newStrategies);
        //    that.columns.forEach(function (column) {
        //      column.header.addSortingStrategies(newStrategies);
        //    });
        //  }
        //}


      },

      getStrategyChain: function () {
        var chain = [];
        //var that = this;

        this.columns.forEach(function (column) {
          chain.push(column.sortingStrategy);
        });

        return chain;
      }

      ,

      notify: function () {
        var chain = this.getStrategyChain();
        chain.push(pathSorting.sortingStrategies.pathId);
        pathSorting.sortingManager.setStrategyChain(chain);
        listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
      }
      ,

      updateSortOrder: function () {
        this.columns.forEach(function (column) {
          column.header.updateSortOrder();
        });
      }
      ,

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

      getItemRenderer: function (sortingStrategy, column) {
        var factory = this.itemRenderers[sortingStrategy.id];
        if (factory) {
          return factory(column);
        }

        if (sortingStrategy.id.indexOf("CUSTOM") === 0) {
          return new SimplePathScoreRenderer(column, new BarRepresentation());
        }

        return new PathItemRenderer(column);
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
              pathSorting.openConfigureSortingDialog(function (sortingStrategy) {
                that.columns.push(new Column(that, sortingStrategy, that.columns.length + 1));
                that.notify();
              });

            }).append("title").text("Add rank column");


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
          transform: "translate(" + ((this.columns.length > 0 && pathWrappers.length > 0) ? getColumnItemTranlateX(this.columns, this.columns[this.columns.length - 1], pathWrappers, 0) + this.columns[this.columns.length - 1].getWidth() + COLUMN_SPACING : 0) + ", 3)"
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
