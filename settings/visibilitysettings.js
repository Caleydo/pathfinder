define(["./../listeners"], function (listeners) {
  var showNonEdgeSets = false;
  var showSetsInList = true;
  var showAttributesInList = true;
  var showDatasetsInList = true;

  return {
    updateTypes: {
      UPDATE_NODE_SET_VISIBILITY: "UPDATE_SET_VISIBILITY",
      UPDATE_LIST_VISIBILITY: "UPDATE_LIST_VISIBILITY"
    },

    showSetsInList: function(show) {
      showSetsInList = show;
      listeners.notify(this.updateTypes.UPDATE_LIST_VISIBILITY, show);
    },

    isShowSetsInList: function () {
      return showSetsInList;
    },

    showAttributesInList: function(show) {
      showAttributesInList = show;
      listeners.notify(this.updateTypes.UPDATE_LIST_VISIBILITY, show);
    },

    isShowAttributesInList: function () {
      return showAttributesInList;
    },

    showDatasetsInList: function(show) {
      showDatasetsInList = show;
      listeners.notify(this.updateTypes.UPDATE_LIST_VISIBILITY, show);
    },

    isShowDatasetsInList: function () {
      return showDatasetsInList;
    },

    showNonEdgeSets: function (show) {
      showNonEdgeSets = show;
      listeners.notify(this.updateTypes.UPDATE_NODE_SET_VISIBILITY, show);
    },

    isShowNonEdgeSets: function () {
      return showNonEdgeSets;
    }
  };
});

