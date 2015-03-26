define(['jquery', 'd3', '../../config', '../pathlist', './aggregate', '../../selectionutil'], function ($, d3, config, PathList, a, selectionUtil) {

  var Aggregate = a.Aggregate;
  var AggregateList = a.AggregateList;

  var V_SPACING = 10;
  var TYPE_NODE_SPACING = 10;
  var TYPE_NODE_RADIUS_X = 40;
  var TYPE_NODE_RADIUS_Y = 15;
  var NODE_TYPE_COMBO_HEIGHT = 2 * TYPE_NODE_RADIUS_Y + 2 * V_SPACING;

  var TYPE_PATH_HEIGHT = 5;
  var TYPE_PATH_NODE_WIDTH = 80;

  function NodeTypeCombination(typeCombo, pathUpdateListener) {
    Aggregate.call(this, pathUpdateListener);

    var colors = ["gray", "rgb(200,200,200)"];
    var colorIndex = 0;
    this.typeCombo = [];
    var that = this;

    typeCombo.forEach(function (type) {
      colorIndex = colorIndex === 0 ? 1 : 0;
      that.typeCombo.push({type: type, color: colors[colorIndex]});
    });

    this.typePaths = [];
  }

  NodeTypeCombination.prototype = Object.create(Aggregate.prototype);

  NodeTypeCombination.prototype.isCombo = function (combo) {
    if (this.typeCombo.length !== combo.length) {
      return false;
    }

    for (var i = 0; i < combo.length; i++) {
      if (this.typeCombo[i].type !== combo[i]) {
        return false;
      }
    }
    return true;
  };

  NodeTypeCombination.prototype.getSize = function () {
    return {
      width: this.typeCombo.length * 2 * TYPE_NODE_RADIUS_X + (this.typeCombo.length.length - 1) * TYPE_NODE_SPACING,
      height: this.typePaths.length * TYPE_PATH_HEIGHT + NODE_TYPE_COMBO_HEIGHT
    };
  };

  NodeTypeCombination.prototype.addPath = function (path, typePath) {
    Aggregate.prototype.addPath.call(this, path);
    var myTypePath = [];

    var colors = ["gray", "rgb(200,200,200)"];
    var colorIndex = 0;
    var typeIndex = -1;
    var prevType = 0;

    for (var i = 0; i < typePath.length; i++) {

      var type = typePath[i];
      if (type !== prevType) {
        typeIndex++;
        prevType = type;
        colorIndex = colorIndex === 0 ? 1 : 0;
      }
      //var typeIndex = this.getTypeComboIndex(type, i);

      myTypePath.push({type: type, color: colors[colorIndex], typeIndex: typeIndex});
    }

    this.typePaths.push(myTypePath);
    this.typePaths.sort(function (a, b) {
      return d3.ascending(a.length, b.length);
    });


  };

  NodeTypeCombination.prototype.getTypeComboIndex = function (type, minIndex) {
    for (var i = minIndex; i < this.typeCombo.length; i++) {
      if (this.typeCombo[i].type === type) {
        return i;
      }
    }
    return -1;
  }

  function NodeTypeCombinationList() {
    AggregateList.call(this);
  }

  NodeTypeCombinationList.prototype = Object.create(AggregateList.prototype);


  NodeTypeCombinationList.prototype.addPath = function (path) {

    var prevNodeType = 0;
    var combo = [];
    var typePath = [];

    path.nodes.forEach(function (node) {
      var type = config.getNodeType(node);
      if (prevNodeType !== type) {
        combo.push(type);
        prevNodeType = type;
      }
      typePath.push(type);
    });

    var added = false;

    for (var i = 0; i < this.aggregates.length; i++) {
      var combination = this.aggregates[i];
      if (combination.isCombo(combo)) {
        combination.addPath(path, typePath);
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
            return d.type;
          },
          "nodeType"
        );

        var l = selectionUtil.addDefaultListener(d3.select(this), "g.typeNode", function (d, i) {
            return "" + nodeTypeCombination.id + "_" + i;
          },
          "nodeTypeInCombo"
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
            return d.type;
          })
          .attr("x", function (d, i) {
            return (i * ((2 * TYPE_NODE_RADIUS_X) + TYPE_NODE_SPACING)) + TYPE_NODE_RADIUS_X;
          })
          .attr("y", V_SPACING + TYPE_NODE_RADIUS_Y + 4);
        node.append("title")
          .text(function (d) {
            return d.type;
          });

        var allTypePaths = d3.select(this).selectAll("g.typePath")
          .data(nodeTypeCombination.typePaths);

        allTypePaths.exit()
          .remove();

        var typePath = allTypePaths
          .enter()
          .append("g")
          .classed("typePath", true);

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

        var l = selectionUtil.addDefaultListener(d3.select(this), "rect.nodeType", function (d) {
            return "" + nodeTypeCombination.id + "_" + d.typeIndex;
          },
          "nodeTypeInCombo"
        );
        that.selectionListeners.push(l);

      }
    )
    ;


  };


  return NodeTypeCombinationList;

})
;
