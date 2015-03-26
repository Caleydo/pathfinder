define(['jquery', 'd3', '../pathlist', './aggregatesorting', '../../listeners', '../../selectionutil', '../../pathutil'], function ($, d3, PathList, a, listeners, selectionUtil, pathUtil) {

  var currentAggregateId = 0;


  var TYPE_PATH_HEIGHT = 5;
  var TYPE_PATH_NODE_WIDTH = 80;
  var COLLAPSE_BUTTON_SPACING = 28;
  var AGGREGATE_CONTAINER_SPACING = 10;
  var V_SPACING = 10;
  var TYPE_NODE_SPACING = 10;
  var TYPE_NODE_RADIUS_X = 40;
  var TYPE_NODE_RADIUS_Y = 15;
  var NODE_TYPE_COMBO_HEIGHT = 2 * TYPE_NODE_RADIUS_Y + 2 * V_SPACING;

  function Aggregate(pathUpdateListener) {
    this.id = currentAggregateId++;
    this.collapsed = true;
    this.paths = [];
    this.pathList = new PathList();
    this.pathList.init();
    this.pathList.addUpdateListener(pathUpdateListener);
  }


  Aggregate.prototype = {
    addPath: function (path) {
      this.paths.push(path);
      this.pathList.addPath(path);
    },

    getSize: function () {
      return {width: 10, height: 10};
    }
  };

  function CombinationAggregate(comboIds, pathUpdateListener) {
    Aggregate.call(this, pathUpdateListener);

    var colors = ["gray", "rgb(200,200,200)"];
    var colorIndex = 0;
    this.combo = [];
    var that = this;

    comboIds.forEach(function (id) {
      colorIndex = colorIndex === 0 ? 1 : 0;
      that.combo.push({id: id, color: colors[colorIndex]});
    });

    this.comboPaths = [];
  }


  CombinationAggregate.prototype.addPath = function (path, comboPath) {
    Aggregate.prototype.addPath.call(this, path);
    var myTypePath = [];

    var colors = ["gray", "rgb(200,200,200)"];
    var colorIndex = 0;
    var comboIndex = -1;
    var prevId = 0;

    for (var i = 0; i < comboPath.length; i++) {

      var id = comboPath[i];
      if (id !== prevId) {
        comboIndex++;
        prevId = id;
        colorIndex = colorIndex === 0 ? 1 : 0;
      }
      //var typeIndex = this.getTypeComboIndex(type, i);

      myTypePath.push({id: id, color: colors[colorIndex], comboIndex: comboIndex});
    }

    this.comboPaths.push(myTypePath);
    this.comboPaths.sort(function (a, b) {
      return d3.ascending(a.length, b.length);
    });


  };

  CombinationAggregate.prototype.getSize = function () {
    return {
      width: this.combo.length * 2 * TYPE_NODE_RADIUS_X + (this.combo.length - 1) * TYPE_NODE_SPACING,
      height: this.comboPaths.length * TYPE_PATH_HEIGHT + NODE_TYPE_COMBO_HEIGHT
    };
  };


  function getTransformFunction(aggregates) {
    return function (d, i) {

      var posY = 0;

      for (var index = 0; index < i; index++) {

        posY += AGGREGATE_CONTAINER_SPACING + aggregates[index].getSize().height;

        if (!aggregates[index].collapsed) {
          posY += aggregates[index].pathList.getSize().height;
        }
      }

      return "translate(0," + posY + ")";
    }
  }

//-------------------------

  function AggregateList() {
    this.aggregates = [];
    this.selectionListeners = [];
    this.updateListeners = [];
    var that = this;

    this.sortUpdateListener = function (currentComparator) {
      //sortingManager.sort(that.pathWrappers, that.parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers), sortStrategyChain);

      that.aggregates.sort(currentComparator);

      that.updateDataBinding();

      that.parent.selectAll("g.aggregateContainer")
        .sort(currentComparator)
        .transition()
        .attr("transform", getTransformFunction(that.aggregates));
    }

  }

  AggregateList.prototype = {
    addUpdateListener: function (l) {
      this.updateListeners.push(l);
    },

    notifyUpdateListeners: function () {
      var that = this;
      this.updateListeners.forEach(function (l) {
        l(that);
      })
    },

    updateDataBinding: function () {
      var containers = this.parent.selectAll("g.aggregateContainer")
        .data(this.aggregates, getKey);
      var that = this;

      containers.each(function (aggregate) {
        that.updateAggregateDataBinding(d3.select(this), aggregate);
      });
    },

    updateSetList: function () {

      var setComboContainer = this.parent.selectAll("g.aggregateContainer")
        .transition()
        .each("start", function (d) {
          if (d.collapsed) {
            d3.select(this).selectAll("g.pathListContainer")
              .attr("display", d.collapsed ? "none" : "inline");
          }
        })
        .attr("transform", getTransformFunction(this.aggregates))
        .each("end", function (d) {
          if (!d.collapsed) {
            d3.select(this).selectAll("g.pathListContainer")
              .attr("display", d.collapsed ? "none" : "inline");
          }
        });

      this.notifyUpdateListeners();
    },

    //To be implemented by subclasses
    updateAggregateDataBinding: function (parent, aggregate) {

    },

    getSize: function () {
      var posY = 0;

      var maxWidth = 0;

      for (var index = 0; index < this.aggregates.length; index++) {

        var currentAggregate = this.aggregates[index];
        var aggregateSize = currentAggregate.getSize();

        var comboWidth = COLLAPSE_BUTTON_SPACING + aggregateSize.width;
        if (comboWidth > maxWidth) {
          maxWidth = comboWidth;
        }
        if (!currentAggregate.collapsed) {
          var pathListSize = this.aggregates[index].pathList.getSize();
          if (pathListSize.width > maxWidth) {
            maxWidth = pathListSize.width;
          }
          posY += pathListSize.height;

        }
        posY += AGGREGATE_CONTAINER_SPACING + aggregateSize.height;

      }
      return {width: maxWidth, height: posY};
    },

    clearAggregates: function () {
      var that = this;
      this.aggregates.forEach(function (agg) {
        agg.pathList.destroy();
      });
      this.aggregates = [];
      currentAggregateId = 0;
    },

    removePaths: function () {
      this.clearAggregates();

      this.parent.selectAll("g.aggregateContainer")
        .remove();

      //parent.select("#arrowRight").remove();
      //parent.select("#SetLabelClipPath").remove();
      selectionUtil.removeListeners(this.selectionListeners);
      this.selectionListeners = [];
    },

    init: function () {
      listeners.add(this.sortUpdateListener, a.updateType);
    },

    destroy: function () {
      this.removePaths();
      this.updateListeners = [];
    },


    //To be implemented by subclass
    addPath: function (path) {

    },

    //To be implemented by subclass
    setPaths: function (paths) {

    },

    render: function (parent) {
      this.parent = parent;
      var that = this;

      var allAggregateContainers = that.parent.selectAll("g.aggregateContainer")
        .data(that.aggregates, getKey);

      allAggregateContainers.exit()
        .transition()
        .attr("transform", "translate(0," + 2000 + ")")
        .remove();

      var aggregateContainer = allAggregateContainers
        .enter()
        .append("g")
        .classed("aggregateContainer", true)
        .attr("transform", "translate(0," + that.getSize().height + ")");

      aggregateContainer.append("rect")
        .classed("aggregateContainerBackground", true)
        .attr("fill", "#A1D99B")
        .style("opacity", 0.8)
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", "100%")
        .attr("height", "100%");

      var collapseContainer = aggregateContainer.append("g")
        .classed("aggregateCollapseContainer", true);


      collapseContainer.append("text")
        .attr("class", "collapseIcon")
        .attr("x", 10)
        .attr("y", function (d) {
          return d.getSize().height / 2 + 3;
        })
        .text(function (d) {
          return d.collapsed ? "\uf0da" : "\uf0dd";
        })
        .on("click", function (d) {
          d.collapsed = !d.collapsed;
          d3.select(this).text(d.collapsed ? "\uf0da" : "\uf0dd");

          that.updateSetList();
        });

      var aggregateGroup = collapseContainer.append("g")
        .classed("aggregate", true)
        .attr("transform", "translate(" + COLLAPSE_BUTTON_SPACING + ",0)");

      this.renderAggregate(aggregateGroup);


      var pathListContainer = aggregateContainer.append("g")
        .classed("pathListContainer", true)
        .attr("transform", function (d) {
          return "translate(0," + d.getSize().height + ")"
        })
        .attr("display", function (d) {
          return d.collapsed ? "none" : "inline";
        });


      var allPathListContainers = allAggregateContainers.selectAll("g.pathListContainer");

      allPathListContainers.each(function (d, i) {

        d.pathList.render(d3.select(this));
      });


      this.sortUpdateListener(a.sortingManager.currentComparator);

      this.notifyUpdateListeners();

      aggregateContainer.selectAll("rect.aggregateContainerBackground").transition()
        .duration(800)
        .style("opacity", 0);
    },

    //To be implemented by subclasses
    renderAggregate: function (parent) {

    }

  };

  function getKey(aggregate) {
    return aggregate.id;
  }


  function CombinationAggregateList() {
    AggregateList.call(this);
  }

  CombinationAggregateList.prototype = Object.create(AggregateList.prototype);

  CombinationAggregateList.prototype.renderComboPath = function (parent, combination) {
    var allTypePaths = parent.selectAll("g.comboPath")
      .data(combination.comboPaths);

    allTypePaths.exit()
      .remove();

    var typePath = allTypePaths
      .enter()
      .append("g")
      .classed("comboPath", true);

    allTypePaths.attr("transform", function (d, i) {
      return "translate(0," + (NODE_TYPE_COMBO_HEIGHT + (i * TYPE_PATH_HEIGHT)) + ")";
    });

    var allTypeRects = typePath.selectAll("rect.nodeType")
      .data(function (d) {
        return d;
      });

    allTypeRects.exit()
      .remove();

    allTypeRects.enter()
      .append("rect")
      .classed("nodeType", true)
      .attr({
        x: function (d, i) {
          return i * TYPE_PATH_NODE_WIDTH;
        },
        y: 0,
        width: TYPE_PATH_NODE_WIDTH,
        height: TYPE_PATH_HEIGHT,
        fill: function (d) {
          return d.color;
        }
      });

    var l = selectionUtil.addDefaultListener(parent, "rect.nodeType", function (d) {
        return "" + combination.id + "_" + d.comboIndex;
      },
      "nodeInCombo"
    );
    this.selectionListeners.push(l);
  };


  CombinationAggregateList.prototype.getComboNodeIDType = function () {
    return "unknown";
  };

  CombinationAggregateList.prototype.getComboNodeText = function (d) {
    return "unknown";
  };

  CombinationAggregateList.prototype.updateAggregateDataBinding = function (parent, aggregate) {

    parent.selectAll("g.comboNode")
      .data(function () {
        return aggregate.combo;
      })

  };

  CombinationAggregateList.prototype.renderAggregate = function (parent) {

    var that = this;

    parent.each(function (nodeTypeCombination) {

        var allTypeNodes = d3.select(this).selectAll("g.comboNode")
          .data(nodeTypeCombination.combo);


        var node = allTypeNodes
          .enter()
          .append("g")
          .classed("comboNode", true)
          .on("dblclick", function (d) {
            //sortingManager.addOrReplace(sortingStrategies.getSetNodePrensenceSortingStrategy([d]));
            //listeners.notify(aggregateSorting.updateType, sortingManager.currentComparator);
          });


        var l = selectionUtil.addDefaultListener(d3.select(this), "g.comboNode", function (d, i) {
            return "" + nodeTypeCombination.id + "_" + i;
          },
          "nodeInCombo"
        );


        that.selectionListeners.push(l);

        var l = selectionUtil.addDefaultListener(d3.select(this), "g.comboNode", function (d) {
            return d.id;
          },
          that.getComboNodeIDType()
        );
        that.selectionListeners.push(l);

        node.append("ellipse")
          .attr("cx", function (d, i) {
            return TYPE_NODE_RADIUS_X + (i * ((2 * TYPE_NODE_RADIUS_X) + TYPE_NODE_SPACING));
          })
          .attr("cy", V_SPACING + TYPE_NODE_RADIUS_Y)
          .attr("rx", TYPE_NODE_RADIUS_X)
          .attr("ry", TYPE_NODE_RADIUS_Y)
          .attr("fill", function (d) {
            return d.color;
          });

        node.append("text")
          .text(function (d) {
            return pathUtil.getClampedText(that.getComboNodeText(d), 14);
          })
          .attr("x", function (d, i) {
            return (i * ((2 * TYPE_NODE_RADIUS_X) + TYPE_NODE_SPACING)) + TYPE_NODE_RADIUS_X;
          })
          .attr("y", V_SPACING + TYPE_NODE_RADIUS_Y + 4);
        node.append("title")
          .text(function (d) {
            return that.getComboNodeText(d);
          });

        that.renderComboPath(d3.select(this), nodeTypeCombination);

      }
    )
    ;


  };


  return {
    AggregateList: AggregateList,
    Aggregate: Aggregate,
    CombinationAggregate: CombinationAggregate,
    CombinationAggregateList: CombinationAggregateList,
    getKey: getKey

  };

});
