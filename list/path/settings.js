define(["../../listeners"], function (listeners) {

  var alignPathNodes = false;
  var tiltAttributes = false;
  var alignColumns = true;

  var stickyDataGroup = {};


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
    COLUMN_HEADER_HEIGHT: 22,
    DEFAULT_BAR_SIZE: 8,
    NODE_PROPERTY_SIDE_SPACING: 8,

    showOnNodeMapping: false,
    onNodeMapper: {},

    pathListUpdateTypes: {
      ALIGN_PATH_NODES: "ALIGN_PATH_NODES",
      ALIGN_COLUMNS: "ALIGN_COLUMNS",
      TILT_ATTRIBUTES: "TILT_ATTRIBUTES",
      COLLAPSE_ELEMENT_TYPE: "COLLAPSE_ELEMENT_TYPE",
      UPDATE_REFERENCE_PATH: "UPDATE_REFERENCE_PATH"

    },

    incStickyDataGroupOwners: function (datasetId, groupId) {
      stickyDataGroup[datasetId] = stickyDataGroup[datasetId] || {};
      stickyDataGroup[datasetId][groupId] = stickyDataGroup[datasetId][groupId] || 0;
      stickyDataGroup[datasetId][groupId]++;
    },

    decStickyDataGroupOwners: function (datasetId, groupId) {
      stickyDataGroup[datasetId] = stickyDataGroup[datasetId] || {};
      stickyDataGroup[datasetId][groupId] = stickyDataGroup[datasetId][groupId] || 0;
      stickyDataGroup[datasetId][groupId] = Math.max(stickyDataGroup[datasetId][groupId] - 1, 0);
    },

    unstickDataGroup: function(datasetId, groupId) {
      stickyDataGroup[datasetId] = stickyDataGroup[datasetId] || {};
      stickyDataGroup[datasetId][groupId] = 0;
    },

    isDataGroupSticky: function (datasetId, groupId) {
      stickyDataGroup[datasetId] = stickyDataGroup[datasetId] || {};
      if (!stickyDataGroup[datasetId][groupId]) {
        return false;
      }
      return stickyDataGroup[datasetId][groupId] > 0;
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
    },

    getSetTypeTranslateY: function (pathWrapper, setTypeIndex) {

      var posY = this.PATH_HEIGHT;
      for (var typeIndex = 0; typeIndex < setTypeIndex; typeIndex++) {
        var setType = pathWrapper.setTypes[typeIndex];
        if (setType.canBeShown()) {
          posY += setType.getHeight();
        }
      }

      return posY;
    },


    getSetTranslateY: function (setType, setIndex) {

      var posY = this.SET_TYPE_HEIGHT;
      var filteredSets = setType.sets.filter(function (s) {
        return s.canBeShown();
      });
      for (var i = 0; i < setIndex; i++) {
        var set = filteredSets[i];
        //if (set.canBeShown()) {
        posY += set.getHeight();
        //}
      }

      return posY;
    }


  };

})
;
