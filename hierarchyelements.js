define(function () {
  function HierarchyElement(parentItem) {
    this.parent = parentItem;
    this.collapsed = false;
    this.children = [];
  }

  HierarchyElement.prototype = {

    getHeight: function () {
      var height = this.getBaseHeight();

      this.getVisibleChildren().forEach(function(child){
        height += child.getHeight();
      });
      return height;
    },

    getVisibleChildren: function() {
      var that = this;
      return this.children.filter(function(child) {
        if(that.collapsed){
          return child.isSticky() && child.canBeShown();
        }
        return child.canBeShown();
      })
    },

    isSticky: function () {
      return false;
    },

    getBaseHeight: function () {
      return 0;
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
      var parent = hierarchyElement.parent;

      var posY = 0;
      if (parent instanceof HierarchyElement) {
        posY = parent.getBaseHeight();
      }
      for (var index = 0; index < i; index++) {
        var element;

        if (parent instanceof HierarchyElement) {
          element = parent.children[index];
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
