define(['jquery', 'd3', '../../config', '../pathlist', './aggregate', '../../selectionutil'], function ($, d3, config, PathList, a, selectionUtil) {

  var Aggregate = a.Aggregate;
  var AggregateList = a.AggregateList;

  var V_SPACING = 10;
  var TYPE_NODE_SPACING = 10;
  var TYPE_NODE_RADIUS_X = 40;
  var TYPE_NODE_RADIUS_Y = 15;
  var NODE_TYPE_COMBO_HEIGHT = 2 * TYPE_NODE_RADIUS_Y + 2 * V_SPACING;

  function NodeTypeCombination(typeCombo, pathUpdateListener) {
    Aggregate.call(this, pathUpdateListener);
    this.typeCombo = typeCombo;
  }

  NodeTypeCombination.prototype = Object.create(Aggregate.prototype);

  NodeTypeCombination.prototype.isCombo = function (combo) {
    if (this.typeCombo.length !== combo.length) {
      return false;
    }

    for (var i = 0; i < combo.length; i++) {
      if (this.typeCombo[i] !== combo[i]) {
        return false;
      }
    }
    return true;
  };

  NodeTypeCombination.prototype.getSize = function () {
    return {
      width: this.typeCombo.length * 2 * TYPE_NODE_RADIUS_X + (this.typeCombo.length.length - 1) * TYPE_NODE_SPACING,
      height: NODE_TYPE_COMBO_HEIGHT
    };
  };

  function NodeTypeCombinationList() {
    AggregateList.call(this);
  }

  NodeTypeCombinationList.prototype = Object.create(AggregateList.prototype);


  NodeTypeCombinationList.prototype.addPath = function (path) {

    var prevNodeType = 0;
    var combo = [];

    path.nodes.forEach(function (node) {
      var type = config.getNodeType(node);
      if (prevNodeType !== type) {
        combo.push(type);
        prevNodeType = type;
      }
    });

    var added = false;

    for (var i = 0; i < this.aggregates.length; i++) {
      var combination = this.aggregates[i];
      if (combination.isCombo(combo)) {
        combination.addPath(path);
        added = true;
      }
    }
    var that = this;

    if (!added) {
      this.aggregates.push(new NodeTypeCombination(combo, function (list) {
        that.updateSetList();
      }));
    }
  };


  NodeTypeCombinationList.prototype.setPaths = function (paths) {

    var that = this;
    paths.forEach(function (path) {
      that.addPath(path);
    });

  };

  NodeTypeCombinationList.prototype.updateAggregateDataBinding = function (parent, aggregate) {

    parent.selectAll("g.typeNode")
      .data(function () {
        return aggregate.typeCombo;
      })

  };


  NodeTypeCombinationList.prototype.renderAggregate = function (parent) {

    var that = this;

    parent.each(function (nodeTypeCombination) {

      var allTypeNodes = d3.select(this).selectAll("g.typeNode")
        .data(nodeTypeCombination.typeCombo);


      var node = allTypeNodes
        .enter()
        .append("g")
        .classed("typeNode", true)
        .on("dblclick", function (d) {
          //sortingManager.addOrReplace(sortingStrategies.getSetNodePrensenceSortingStrategy([d]));
          //listeners.notify(aggregateSorting.updateType, sortingManager.currentComparator);
        });

      var l = selectionUtil.addDefaultListener(d3.select(this), "g.typeNode", function (d) {
          return d;
        },
        "nodeType"
      );
      that.selectionListeners.push(l);

      node.append("ellipse")
        .attr("cx", function (d, i) {
          return TYPE_NODE_RADIUS_X + (i * ((2 * TYPE_NODE_RADIUS_X) + TYPE_NODE_SPACING));
        })
        .attr("cy", V_SPACING + TYPE_NODE_RADIUS_Y)
        .attr("rx", TYPE_NODE_RADIUS_X)
        .attr("ry", TYPE_NODE_RADIUS_Y);

      node.append("text")
        .text(function (d) {
          return d;
        })
        .attr("x", function (d, i) {
          return (i * ((2 * TYPE_NODE_RADIUS_X) + TYPE_NODE_SPACING)) + TYPE_NODE_RADIUS_X;
        })
        .attr("y", V_SPACING + TYPE_NODE_RADIUS_Y + 4);
      node.append("title")
        .text(function (d) {
          return d;
        });

    });


  };


  return NodeTypeCombinationList;

});
