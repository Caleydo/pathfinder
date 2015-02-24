/**
 * Created by Christian on 19.02.2015.
 */
define(function () {
  return {

    updateType: {
      PATH_SELECTION: "PATH_SELECTION",
      SET_INFO_UPDATE: "SET_INFO_UPDATE"
    },

    add: function (listener, type) {

      if (typeof this[type] === "undefined") {
        this[type] = [];
      }

      this[type].push(listener);
    },

    notify: function (updatedObject, type) {

      if (typeof this[type] !== "undefined") {
        this[type].forEach(function (listener) {
          listener(updatedObject);
        });
      }
    },

    clear: function (type) {
      if (typeof this[type] !== "undefined") {
        this[type] = [];
      }
    }
  }
});
