define(['jquery', 'd3', '../../config', '../pathlist', './aggregate', '../../selectionutil'], function ($, d3, config, PathList, a, selectionUtil) {

  var Aggregate = a.Aggregate;
  var AggregateList = a.AggregateList;
  var CombinationAggregate = a.CombinationAggregate;

  var V_SPACING = 10;
  var TYPE_NODE_SPACING = 10;
  var TYPE_NODE_RADIUS_X = 40;
  var TYPE_NODE_RADIUS_Y = 15;
  var NODE_TYPE_COMBO_HEIGHT = 2 * TYPE_NODE_RADIUS_Y + 2 * V_SPACING;

  var TYPE_PATH_HEIGHT = 5;
  var TYPE_PATH_NODE_WIDTH = 80;

  function NodeTypeCombination(typeCombo, pathUpdateListener) {
    CombinationAggregate.call(this, typeCombo, pathUpdateListener);
  }

  NodeTypeCombination.prototype = Object.create(CombinationAggregate.prototype);

  NodeTypeCombination.prototype.isCombo = function (combo) {
    if (this.combo.length !== combo.length) {
      return false;
    }

    for (var i = 0; i < combo.length; i++) {
      if (this.combo[i].id !== combo[i]) {
        return false;
      }
    }
    return true;
  };

  //NodeTypeCombination.prototype.getSize = function () {
  //  return {
  //    width: this.combo.length * 2 * TYPE_NODE_RADIUS_X + (this.combo.length - 1) * TYPE_NODE_SPACING,
  //    height: this.comboPaths.length * TYPE_PATH_HEIGHT + NODE_TYPE_COMBO_HEIGHT
  //  };
  //};

  //NodeTypeCombination.prototype.addPath = function (path, typePath) {
  //  Aggregate.prototype.addPath.call(this, path);
  //  var myTypePath = [];
  //
  //  var colors = ["gray", "rgb(200,200,200)"];
  //  var colorIndex = 0;
  //  var typeIndex = -1;
  //  var prevType = 0;
  //
  //  for (var i = 0; i < typePath.length; i++) {
  //
  //    var type = typePath[i];
  //    if (type !== prevType) {
  //      typeIndex++;
  //      prevType = type;
  //      colorIndex = colorIndex === 0 ? 1 : 0;
  //    }
  //    //var typeIndex = this.getTypeComboIndex(type, i);
  //
  //    myTypePath.push({type: type, color: colors[colorIndex], typeIndex: typeIndex});
  //  }
  //
  //  this.typePaths.push(myTypePath);
  //  this.typePaths.sort(function (a, b) {
  //    return d3.ascending(a.length, b.length);
  //  });
  //
  //
  //};

  function NodeTypeCombinationList() {
    a.CombinationAggregateList.call(this);
  }

  NodeTypeCombinationList.prototype = Object.create(a.CombinationAggregateList.prototype);


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

  NodeTypeCombinationList.prototype.getComboNodeIDType = function () {
    return "nodeType";
  };

  NodeTypeCombinationList.prototype.getComboNodeText = function (d) {
    return d.id;
  };


  return NodeTypeCombinationList;

})
;
