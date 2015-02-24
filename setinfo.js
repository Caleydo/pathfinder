/**
 * Created by Christian on 24.02.2015.
 */
define(['./listeners'], function(listeners) {
  return {
    sets: {},

    get: function(setId) {
      //temporary solution
      return this.sets["path:"+setId];
    },

    fetch: function(setIds) {
      var that = this;
      $.ajax({
        type: 'POST',
        url: '/api/pathway/setinfo',
        accepts: 'application/json',
        contentType: 'application/json',
        data: JSON.stringify(setIds),
        success: function (response) {
          that.sets = JSON.parse(response);
          listeners.notify(that.sets, listeners.updateType.SET_INFO_UPDATE);
        }
      });
    }
  }
})
