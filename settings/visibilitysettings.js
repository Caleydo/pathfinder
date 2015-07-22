define(["./../listeners"], function (listeners) {
  var showNonEdgeSets = false;

  return {
    updateTypes: {
      UPDATE_NODE_SET_VISIBILITY: "UPDATE_SET_VISIBILITY"
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

