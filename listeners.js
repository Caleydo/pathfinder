/**
 * Created by Christian on 19.02.2015.
 */
define(function () {
  return {

    updateType: {
      SET_INFO_UPDATE: "SET_INFO_UPDATE",
      QUERY_UPDATE : 'QUERY_UPDATE',
      REMOVE_FILTERED_PATHS_UPDATE: 'REMOVE_FILTERED_PATHS_UPDATE'
    },

    add: function (listener, type) {

      if (typeof this[type] === "undefined") {
        this[type] = [];
      }

      this[type].push(listener);
    },

    notify: function (type, updatedObject) {

      if (typeof this[type] !== "undefined") {
        this[type].forEach(function (listener) {
          listener(updatedObject);
        });
      }
    },

    remove: function(listener, type) {
      if (typeof this[type] === "undefined") {
        return;
      }
      var index =  this[type].indexOf(listener);
      if (index > -1) {
        this[type].splice(index, 1);
      }
    },

    clear: function (type) {
      if (typeof this[type] !== "undefined") {
        this[type] = [];
      }
    }
  }
});
