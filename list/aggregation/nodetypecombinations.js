define(['../../config', '../pathlist', './aggregate'], function (config, PathList, aggregate) {

  function NodeTypeCombination(typeCombo) {
    aggregate.Aggregate.call(this);
    this.typeCombo = typeCombo;
  }

  NodeTypeCombination.prototype = Object.create(aggregate.Aggregate.prototype);

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

  var nodeTypeCombinations = [];

  function addPath(path) {

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

    for (var i = 0; i < nodeTypeCombinations.length; i++) {
      var combination = nodeTypeCombinations[i];
      if (combination.isCombo(combo)) {
        combination.addPath(path);
        added = true;
      }
    }

    if (!added) {
      nodeTypeCombinations.push(new NodeTypeCombination(combo));
    }

  }

});
