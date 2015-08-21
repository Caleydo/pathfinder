define(['d3', './queryview', '../listoverlay', '../uiutil', '../setinfo', '../config'], function (d3, queryView, ListOverlay, uiUtil, setInfo, config) {

  //var listOverlay = new ListOverlay();

  return {
    getFilterOverlayItems: function (constraintType, text) {
      function getConstraintInfo() {
        switch (constraintType) {
          case "name":
            return {label: text, value: text, category: "Name"};
            break;
          case "type":
            return {label: text, value: text, category: "Type"};
            break;
          case "set":
            return {
              label: setInfo.getSetLabel(text),
              value: text,
              id: text,
              setNodeLabel: config.getSetNodeLabel(setInfo.get(text)),
              category: "Set"
            };
            break;
          default:
            return;
        }
      }

      return [{
        text: "Must contain",
        icon: "\uf0b0",
        callback: function () {
          queryView.addNodeFilter(getConstraintInfo(), false);
        }
      },
        {
          text: "Must not contain",
          icon: "\uf0b0",
          callback: function () {
            queryView.addNodeFilter(getConstraintInfo(), true);
          }
        }
      ]
    }
  }
});
