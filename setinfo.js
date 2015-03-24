/**
 * Created by Christian on 24.02.2015.
 */
define(['d3', './listeners'], function (d3, listeners) {

  var scale = d3.scale.category10();
  var numTypes = -1;

  return {
    setTypeInfos: {},
    setInfos: {},
    currentlyLoading : {},

    addToType: function (setType, setId) {
      var t = this.setTypeInfos[setType];
      if (typeof t === "undefined") {
        numTypes++;
        t = {type: setType, sets: [setId], color: scale(numTypes)};
        this.setTypeInfos[setType] = t;
      } else {
        if (t.sets.indexOf(setId) === -1)
          t.sets.push(setId);
      }
    },

    getSetTypeInfo: function (type) {
      return this.setTypeInfos[type];
    },

    get: function (setId) {
      return this.setInfos[setId];
    },

    fetch: function (setIds) {
      var that = this;
      //reduce to still unknown setsIds

      var lookup = setIds.filter(function(id) { return !(id in that.setInfos); });

      if (lookup.length === 0) { //all already loaded
        listeners.notify(listeners.updateType.SET_INFO_UPDATE, that);
        return;
      }

      //not currently loading
      lookup = setIds.filter(function(id) { return !(id in that.currentlyLoading); });

      if (lookup.length === 0) {
        return; // another callback will fire
      }

      //mark all as being catched
      lookup.forEach(function(d) { that.currentlyLoading[d] = true});
      $.getJSON('/api/pathway/setinfo', {
        sets : lookup
      }).then(function (data) {
        //integrate the map
        Object.keys(data).map(function(id) {
          var key = id;
          that.setInfos[key] = data[id];
          delete that.currentlyLoading[key];
        });
        listeners.notify(listeners.updateType.SET_INFO_UPDATE, that);
      });
    }
  }
});
