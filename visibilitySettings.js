define(["./listeners"], function(listeners) {
  var showNonEdgeSets = false;

  return {
    showNonEdgeSets: function(show) {
      showNonEdgeSets = show;
      listeners.notify("UPDATE_SET_VISIBILITY", show);
    },

    isShowNonEdgeSets: function() {
      return showNonEdgeSets;
    }
  }
});

