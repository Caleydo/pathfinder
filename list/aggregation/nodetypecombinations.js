define(['jquery', 'd3', '../../config', '../pathlist', './aggregate', '../../selectionutil'], function ($, d3, config, PathList, a, selectionUtil) {

  var CombinationAggregate = a.CombinationAggregate;


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

  function NodeTypePresenceSortingStrategy() {
    a.ComboNodeSelectionSortingStrategy.call(this, "Selected node types");
  }

  NodeTypePresenceSortingStrategy.prototype = Object.create(a.ComboNodeSelectionSortingStrategy.prototype);

  var nodeTypePresenceSortingStrategy = new NodeTypePresenceSortingStrategy();


  function NodeTypeCombinationList() {
    a.CombinationAggregateList.call(this);
  }

  NodeTypeCombinationList.prototype = Object.create(a.CombinationAggregateList.prototype);


  NodeTypeCombinationList.prototype.addAggregateForPath = function (path) {

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
        that.updateAggregateList();
      }));
    }
  };


  NodeTypeCombinationList.prototype.getComboNodeIDType = function () {
    return "nodeType";
  };

  NodeTypeCombinationList.prototype.getComboNodeText = function (d) {
    return d.id;
  };

  NodeTypeCombinationList.prototype.getNodeSelectionSortingStrategy = function () {
    return nodeTypePresenceSortingStrategy;
  };


  return NodeTypeCombinationList;

})
;
