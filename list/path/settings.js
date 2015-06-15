define(["../../listeners"], function (listeners) {

  var alignPathNodes = false;
  var tiltAttributes = false;
  var alignColumns = false;


  return {
    NODE_START: 90,
    SET_TYPE_INDENT: 10,
    NODE_WIDTH: 50,
    NODE_HEIGHT: 20,
    V_SPACING: 5,
    PATH_HEIGHT: 30,
    EDGE_SIZE: 50,
    SET_HEIGHT: 10,
    SET_TYPE_HEIGHT: 14,
    PATH_SPACING: 15,

    pathListUpdateTypes: {
      ALIGN_PATH_NODES: "ALIGN_PATH_NODES",
      ALIGN_COLUMNS: "ALIGN_COLUMNS",
      TILT_ATTRIBUTES: "TILT_ATTRIBUTES",
      COLLAPSE_ELEMENT_TYPE: "COLLAPSE_ELEMENT_TYPE"
    },

    alignPathNodes: function (align) {
      alignPathNodes = align;
      listeners.notify(this.pathListUpdateTypes.ALIGN_PATH_NODES, align);
    },

    isAlignPathNodes: function () {
      return alignPathNodes;
    },

    tiltAttributes: function (tilt) {
      tiltAttributes = tilt;
      listeners.notify(this.pathListUpdateTypes.TILT_ATTRIBUTES, tilt);
    },

    isTiltAttributes: function () {
      return tiltAttributes;
    },

    alignColumns: function (align) {
      alignColumns = align;
      listeners.notify(this.pathListUpdateTypes.ALIGN_COLUMNS, align);
    },

    isAlignColumns: function () {
      return alignColumns;
    },

    getPathContainerTranslateY: function (pathWrappers, pathIndex) {
      var posY = 0;
      for (var index = 0; index < pathIndex; index++) {
        posY += pathWrappers[index].getHeight() + this.PATH_SPACING;
      }
      return posY;
    }


  };

})
;
