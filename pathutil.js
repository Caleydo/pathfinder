define(["./config"], function (config) {

  return {
    isNodeSetProperty: function (node, key) {

      return config.isNodeSetProperty(node, key);

      //return key !== "id" && key !== "idType" && key !== "name";
    },
    isEdgeSetProperty: function (edge, key) {
      return config.isEdgeSetProperty(edge, key);
      //return key.charAt(0) !== '_';
    },

    getNodeType: function (node) {
      return config.getNodeType(node);
    },

    getNodeSetTypes: function (node) {

      var setTypes = [];
      var that = this;

      Object.keys(node.properties).forEach(function (key) {
        if (that.isNodeSetProperty(node, key)) {
          setTypes.push(key);
        }
      });

      return setTypes;
    },

    getEdgeSetTypes: function (edge) {

      var setTypes = [];
      var that = this;

      Object.keys(edge.properties).forEach(function (key) {
        if (that.isEdgeSetProperty(edge, key)) {
          setTypes.push(key);
        }
      });

      return setTypes;
    },

    forEachNodeSet: function (node, callBack) {
      var that = this;

      Object.keys(node.properties).forEach(function (key) {
        if (that.isNodeSetProperty(node, key)) {
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
        if (that.isEdgeSetProperty(edge, key)) {
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
