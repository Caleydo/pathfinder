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
    },

    getNodeSetTypes: function (node) {

      var setTypes = [];
      var that = this;

      Object.keys(node.properties).forEach(function (key) {
        if (that.isNodeSetProperty(key)) {
          setTypes.add(key);
        }
      });

      return setTypes;
    },

    getEdgeSetTypes: function (edge) {

      var setTypes = [];
      var that = this;

      Object.keys(edge.properties).forEach(function (key) {
        if (that.isEdgeSetProperty(key)) {
          setTypes.add(key);
        }
      });

      return setTypes;
    },

    forEachNodeSet: function (node, callBack) {
      var that = this;

      Object.keys(node.properties).forEach(function (key) {
        if (that.isNodeSetProperty(key)) {
          that.forEachNodeSetOfType(node, key, callBack);
        }
      });
    },

    forEachNodeSetOfType: function (node, setType, callBack) {
      var property = node.properties[setType];
      if (property instanceof Array) {
        property.forEach(function (setId) {
          callBack(setType, setId);
        });
      } else {
        callBack(setType, property);
      }
    },

    forEachEdgeSet: function (edge, callBack) {
      var that = this;

      Object.keys(edge.properties).forEach(function (key) {
        if (that.isEdgeSetProperty(key)) {
          that.forEachEdgeSetOfType(edge, key, callBack);
        }
      });
    },

    forEachEdgeSetOfType: function (edge, setType, callBack) {
      var property = edge.properties[setType];
      if (property instanceof Array) {
        property.forEach(function (setId) {
          callBack(setType, setId);
        });
      } else {
        callBack(setType, property);
      }
    }
  }
});
