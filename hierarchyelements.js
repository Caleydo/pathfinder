define(function () {
  function HierarchyElement(parentItem) {
    this.parentElement = parentItem;
    this.collapsed = false;
    this.children = [];
  }

  HierarchyElement.prototype = {

    getHeight: function () {
      var height = this.getBaseHeight();
      if (!this.collapsed) {
        this.getChildElements().forEach(function (item) {
          if (item.canBeShown()) {
            height += item.getHeight();
          }
        });
      }
      return height;
    },

    getBaseHeight: function () {
      return 0;
    },

    getChildElements: function () {
      return this.children;
    },
    canBeShown: function () {
      return true;
    },
    isFiltered: function () {
      return false;
    }
  };

  return {
    HierarchyElement: HierarchyElement,

    displayFunction: function (hierarchyElement) {
      if (hierarchyElement.canBeShown()) {
        return "inline";
      }
      return "none";
    },

    transformFunction: function (hierarchyElement, i) {
      var parent = hierarchyElement.parentElement;

      var posY = 0;
      if (parent instanceof HierarchyElement) {
        posY = parent.getBaseHeight();
      }
      for (var index = 0; index < i; index++) {
        var element;

        if (parent instanceof HierarchyElement) {
          element = parent.getChildElements()[index];
        } else if (parent instanceof Array) {
          element = parent[index];
        }
        if (typeof element !== "undefined" && element.canBeShown()) {
          posY += element.getHeight();
        }
      }
      return "translate(0," + posY + ")";
    }
  }

})
;
