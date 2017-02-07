define(['d3', './queryview', '../listoverlay', '../uiutil', '../setinfo', '../config'], function (d3, queryView, ListOverlay, uiUtil, setInfo, config) {

  //var listOverlay = new ListOverlay();

  return {
    getFilterOverlayItems: function (constraintType, text, type) {
      function getConstraintInfo() {
        switch (constraintType) {
          case "name":
            return {label: text, value: text, category: "Name", type: type};
            break;
          case "type":
            return {label: text, value: text, category: "Type", type: type || "Type"};
            break;
          case "set":
            return {
              label: setInfo.getSetLabel(text),
              value: text,
              id: text,
              setNodeLabel: config.getSetNodeLabel(setInfo.get(text)),
              category: "Set",
              type: type || config.getSetNodeLabel(setInfo.get(text))
            };
            break;
          default:
            return;
        }
      }

      return [
        {
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
        },
        {
          text: "As start",
          icon: "\uf0b0",
          callback: function () {
            queryView.asBoundingNode(getConstraintInfo(), true);
          }
        },
        {
          text: "As end",
          icon: "\uf0b0",
          callback: function () {
            queryView.asBoundingNode(getConstraintInfo(), false);
          }
        }
      ]
    }
  }
});
