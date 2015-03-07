/**
 * Created by Christian on 24.02.2015.
 */
define(['./listeners'], function (listeners) {

  var scale = d3.scale.category10();
  var numTypes = -1;

  return {
    setTypeInfos: {},
    setInfos: {},

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
      $.ajax({
        type: 'POST',
        url: '/api/pathway/setinfo',
        accepts: 'application/json',
        contentType: 'application/json',
        data: JSON.stringify(setIds),
        success: function (response) {
          var setInfos = JSON.parse(response);
          for (var key in setInfos) {

            var tempPWKey = key.substr(5, key.length);
            var localInfo = that.setInfos[tempPWKey];
            var fetchedInfo = setInfos[key];
            if (typeof localInfo !== "undefined") {
              for (var k in fetchedInfo) {
                localInfo[k] = fetchedInfo[k];
              }
            } else {
              that.setInfos[tempPWKey] = fetchedInfo;
            }
          }

          listeners.notify(that, listeners.updateType.SET_INFO_UPDATE);
        }
      });
    }
  }
})
