define(['jquery', 'd3', '../pathlist', './aggregatesorting', '../../listeners', '../../selectionutil'], function ($, d3, PathList, a, listeners, selectionUtil) {

  var currentAggregateId = 0;


  var COLLAPSE_BUTTON_SPACING = 28;
  var AGGREGATE_CONTAINER_SPACING = 10;

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


  function getTransformFunction(aggregates) {
    return function (d, i) {

      var posY = 0;

      for (var index = 0; index < i; index++) {

        posY += AGGREGATE_CONTAINER_SPACING + d.getSize().height;

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

  return {
    AggregateList: AggregateList,
    Aggregate: Aggregate,
    getKey: getKey
  };

});
