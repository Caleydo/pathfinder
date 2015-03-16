define(function () {

  return {
    isNodeSetProperty: function (key) {
      return key !== "id" && key !== "idType" && key !== "name";
    },
    isEdgeSetProperty: function (key) {
      return key.charAt(0) !== '_';
    },
    getNodeType: function (node) {
      for (var i = 0; i < node.labels.length; i++) {
        var currentLabel = node.labels[i];
        if (currentLabel.charAt(0) !== "_") {
          //Assume first valid data label to be node type
          return currentLabel;
        }
      }
      return "Unknown";
    }
  }
});
