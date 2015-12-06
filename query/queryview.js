define(['jquery', 'd3', '../view', './querymodel', '../list/pathsorting', '../listeners', '../listoverlay', '../../pathfinder_graph/search', './pathquery', '../uiutil', '../config', 'jquery-ui'],
  function ($, d3, View, q, pathSorting, listeners, ListOverlay, ServerSearch, pathQuery, uiUtil, config) {

    var listOverlay = new ListOverlay();

    var lastAutoCompleteResult = [];


    var DEFAULT_OVERLAY_BUTTON_SIZE = 16;
    var OR_BUTTON_WIDTH = 24;
    var AND_BUTTON_WIDTH = 38;
    var NOT_BUTTON_WIDTH = 38;
    var CAPTION_SIZE = 10;
    var POSITION_LABEL_WIDTH = 40;
    var POSITION_LABEL_HEIGHT = 10;

    $.widget("custom.typedAutocomplete", $.ui.autocomplete, {
      _renderItem: function (ul, item) {

        return $("<li>")
          .append($("<a>").text(item.label + " (" + item.type + ")"))
          .appendTo(ul);
        //return $( "<li>" )
        //  .attr( "data-value", item.value )
        //  .css("color", item.color)
        //  .append( item.label )
        //  .appendTo( ul );
      },

      _renderMenu: function (ul, items) {
        var that = this;
        items.sort(function (a, b) {
          return d3.ascending(a.category, b.category);
        });

        //var currentCategory = 0;
        $.each(items, function (index, item) {

          //if (item.category !== currentCategory) {
          //
          //  $("<a>").text(item.category)
          //    .css({
          //      "font-style": "italic",
          //      "font-weight": "bold",
          //      "font-size": 11
          //    })
          //    .appendTo(ul);
          //  currentCategory = item.category;
          //}
          that._renderItemData(ul, item);
        });
      }


      // _renderItem: function (ul, item) {
      //
      //  return $("<li>")
      //    .append($("<a>").text(item.label))
      //    .appendTo(ul);
      //  //return $( "<li>" )
      //  //  .attr( "data-value", item.value )
      //  //  .css("color", item.color)
      //  //  .append( item.label )
      //  //  .appendTo( ul );
      //},
      //
      //_renderMenu: function (ul, items) {
      //  var that = this;
      //  items.sort(function (a, b) {
      //    return d3.ascending(a.category, b.category);
      //  });
      //
      //  var currentCategory = 0;
      //  $.each(items, function (index, item) {
      //
      //    if (item.category !== currentCategory) {
      //
      //      $("<a>").text(item.category)
      //        .css({
      //          "font-style": "italic",
      //          "font-weight": "bold",
      //          "font-size": 11
      //        })
      //        .appendTo(ul);
      //      currentCategory = item.category;
      //    }
      //    that._renderItemData(ul, item);
      //  });
      //}
    });


    function addAddButton(parent, callback, x, y) {

      var button = uiUtil.addOverlayButton(d3.select("#queryOverlay"), parent.translate.x + x, parent.translate.y + y, DEFAULT_OVERLAY_BUTTON_SIZE, DEFAULT_OVERLAY_BUTTON_SIZE, "\uf067", DEFAULT_OVERLAY_BUTTON_SIZE / 2, DEFAULT_OVERLAY_BUTTON_SIZE - 1, "green", true);

      button.on("click", callback);
      return button;
    }

    function addAddButtonWithListOptions(parent, data, x, y) {
      return addAddButton(parent, function () {
        listOverlay.setItems(data);
        listOverlay.show(d3.select("#queryOverlay"), parent.translate.x + x, parent.translate.y + y);
      }, x, y);
    }

    function addPositionButton(parent, callBack, x, y) {
      var button = uiUtil.addOverlayButton(d3.select("#queryOverlay"), parent.translate.x + x, parent.translate.y + y, DEFAULT_OVERLAY_BUTTON_SIZE, DEFAULT_OVERLAY_BUTTON_SIZE, "\uf13d", DEFAULT_OVERLAY_BUTTON_SIZE / 2, DEFAULT_OVERLAY_BUTTON_SIZE - 1, "black", true);

      button.on("click", callBack);
      return button;
    }

    function addAndButton(parent, callBack, x, y) {

      var button = uiUtil.addOverlayButton(d3.select("#queryOverlay"), parent.translate.x + x, parent.translate.y + y, AND_BUTTON_WIDTH, DEFAULT_OVERLAY_BUTTON_SIZE, "AND", AND_BUTTON_WIDTH / 2, DEFAULT_OVERLAY_BUTTON_SIZE - 2, "orange", true);

      button.on("click", callBack);
      return button;
    }

    function addNotButton(parent, callBack, x, y) {

      var button = uiUtil.addOverlayButton(d3.select("#queryOverlay"), parent.translate.x + x, parent.translate.y + y, NOT_BUTTON_WIDTH, DEFAULT_OVERLAY_BUTTON_SIZE, "NOT", NOT_BUTTON_WIDTH / 2, DEFAULT_OVERLAY_BUTTON_SIZE - 2, "red", true);

      button.on("click", callBack);
      return button;
    }

    function addOrButton(parent, callBack, x, y) {

      var button = uiUtil.addOverlayButton(d3.select("#queryOverlay"), parent.translate.x + x, parent.translate.y + y, OR_BUTTON_WIDTH, DEFAULT_OVERLAY_BUTTON_SIZE, "OR", OR_BUTTON_WIDTH / 2, DEFAULT_OVERLAY_BUTTON_SIZE - 2, "lightblue", true);

      button.on("click", callBack);
      return button;
    }

    function addBooleanButtonsWithListOptions(parent, x, y, andData, orData, notCallBack) {
      addAndButton(parent, function () {
        listOverlay.setItems(andData);
        listOverlay.show(d3.select("#queryOverlay"), parent.translate.x + x, parent.translate.y + y);
      }, x, y);
      addOrButton(parent, function () {
        listOverlay.setItems(orData);
        listOverlay.show(d3.select("#queryOverlay"), parent.translate.x + x, parent.translate.y + y);
      }, x + AND_BUTTON_WIDTH, y);
      addNotButton(parent, notCallBack, x + AND_BUTTON_WIDTH + OR_BUTTON_WIDTH, y);
    }

    function addBooleanButtons(parent, x, y, andCallback, orCallback, notCallBack) {
      addAndButton(parent, andCallback, x, y);
      addOrButton(parent, orCallback, x + AND_BUTTON_WIDTH, y);
      addNotButton(parent, notCallBack, x + AND_BUTTON_WIDTH + OR_BUTTON_WIDTH, y);
    }


    function addRemoveButton(element, x, y) {

      var button = uiUtil.addOverlayButton(d3.select("#queryOverlay"), element.translate.x + x, element.translate.y + y, DEFAULT_OVERLAY_BUTTON_SIZE, DEFAULT_OVERLAY_BUTTON_SIZE, "\uf00d", DEFAULT_OVERLAY_BUTTON_SIZE / 2, DEFAULT_OVERLAY_BUTTON_SIZE - 3, "red", true);

      button.on("click", function () {
          var parent = element.parent;
          parent.removeChild(parent.children.indexOf(element));


          if (parent instanceof PathContainer) {

            if (parent.children.length === 2) {
              parent.insert(1, new SequenceFiller(parent));
            }
          } else if (parent instanceof SequenceContainer) {
            parent.correctSequence();
          } else {

            while (typeof parent !== "undefined" && (((parent instanceof AndContainer || parent instanceof OrContainer) && parent.children.length <= 1)
            || (parent instanceof NotContainer && parent.children.length <= 0))) {

              var grandParent = parent.parent;
              var parentIndex = grandParent.children.indexOf(parent);

              if (typeof grandParent !== "undefined") {
                parent.children.forEach(function (child) {
                  grandParent.children.splice(parentIndex, 0, child);
                  child.parent = grandParent;
                  $(grandParent.childDomElements[0]).append($(child.rootElement[0]));
                });

                grandParent.removeChild(grandParent.children.indexOf(parent));
              }

              parent = grandParent;
            }
          }

          if (parent instanceof PathContainer && parent.children.length === 2) {
            parent.insert(1, new SequenceFiller(parent));
          }


          d3.select("#queryOverlay").selectAll("g.overlayButton")
            .remove();
          queryView.updateQuery();
          //pathQuery.setQuery(queryView.container.getPathQuery(), false);

        }
      );

      return button;
    }

    function replaceWithContainer(currentElement, ContainerConstructor, isContainerHorizontal, ElementConstructor) {
      var container = new ContainerConstructor(currentElement.parent, isContainerHorizontal);
      currentElement.parent.replace(currentElement, container);
      currentElement.parent = container;

      container.children.push(currentElement);
      $(container.childDomElements[0]).append($(currentElement.rootElement[0]));
      if (typeof  ElementConstructor !== "undefined") {
        var el = new ElementConstructor(container)
        container.add(el);
        queryView.updateQuery();
        return el;
      } else {
        container.updateParent();
      }

      queryView.updateQuery();
      //pathQuery.setQuery(queryView.container.getPathQuery(), false);

    }

    //-----------------------------------------

    function BaseGUIElement(parent) {
      this.parent = parent;
      this.translate = {x: 0, y: 0};
      this.fillHorizontal = true;
      this.fillVertical = true;
      this.isInitialized = false;
    }

    BaseGUIElement.prototype = {
      init: function (domParent) {
        var that = this;
        this.rootElement = domParent.append("g")
          .classed("queryElement", true);

        this.myDomElements = this.rootElement.append("g")
          .classed("myDomElements", true);

        $(this.myDomElements[0]).mouseenter(function () {

          d3.select("#queryOverlay").selectAll("g.overlayButton")
            .remove();

          if (that.showRemoveButton()) {
            var size = that.getSize();

            var button = addRemoveButton(that, size.width - DEFAULT_OVERLAY_BUTTON_SIZE, 0);

          }
        });

        $(this.myDomElements[0]).mouseleave(function () {
          if (!e) var e = window.event;
          var relTarg = e.relatedTarget || e.toElement;
          if (!relTarg) {
            return;
          }

          var classname = relTarg.parentNode.className;

          if (classname.baseVal !== "overlayButton") {
            d3.select("#queryOverlay").selectAll("g.overlayButton")
              .remove();
          }
        });
        this.isInitialized = true;
      },

      getSize: function () {
        return {width: 80, height: 30};
      },
      update: function () {

      },

      updateParent: function () {
        var currentElement = this;
        while (typeof currentElement.parent != "undefined") {
          currentElement = currentElement.parent;
        }
        currentElement.update();
      },

      showRemoveButton: function () {
        return (typeof this.parent != "undefined");
      },

      getPathQuery: function () {
        return new q.PathQuery();
      },

      remove: function () {
        this.rootElement.remove();
      }
    };

    //------------------------------------------

    function ElementContainer(parent, horizontal) {
      BaseGUIElement.call(this, parent);
      this.children = [];
      this.horizontal = horizontal;
      this.hPadding = 5;
      this.vPadding = 5;
      this.elementSpacing = 5;
    }

    ElementContainer.prototype = Object.create(BaseGUIElement.prototype);

    ElementContainer.prototype.init = function (domParent) {
      BaseGUIElement.prototype.init.call(this, domParent);

      this.childDomElements = this.rootElement.append("g")
        .classed("childDomElements", true);

    };

    ElementContainer.prototype.add = function (childElement) {
      this.children.push(childElement);
      childElement.init(this.childDomElements);
      this.updateParent();
    };

    ElementContainer.prototype.insert = function (index, childElement) {
      this.children.splice(index, 0, childElement);
      childElement.init(this.childDomElements);
      this.updateParent();
    };

    ElementContainer.prototype.replace = function (child, newChild) {
      var index = this.children.indexOf(child);

      if (index !== -1) {

        this.children[index] = newChild;
        child.remove();
        newChild.init(this.childDomElements);
        this.updateParent();
      }
    };

    ElementContainer.prototype.removeChild = function (index) {
      var child = this.children[index];
      child.remove();
      this.children.splice(index, 1);
      this.updateParent();
    };

    ElementContainer.prototype.update = function () {
      if (typeof this.parent === "undefined") {
        queryView.updateViewSize();
      }
      this.updateMyDomElements();
      this.updateChildren(this.hPadding, this.vPadding);

    };

    ElementContainer.prototype.updateMyDomElements = function () {
    };

    ElementContainer.prototype.updateChildren = function (baseTranslateX, baseTranslateY) {

      var posX = baseTranslateX;
      var posY = baseTranslateY;
      var maxSize = 0;
      var that = this;

      this.children.forEach(function (child) {
        var childSize = child.getSize();
        if (that.horizontal) {
          if (childSize.height > maxSize) {
            maxSize = childSize.height;
          }
        } else {
          if (childSize.width > maxSize) {
            maxSize = childSize.width;
          }
        }
      });

      this.children.forEach(function (child) {
        var childSize = child.getSize();
        if (that.horizontal) {
          posY = baseTranslateY + (maxSize - childSize.height) / 2;
        } else {
          posX = baseTranslateX + (maxSize - childSize.width) / 2;
        }

        child.rootElement.attr("transform", "translate(" + posX + ", " + posY + ")");
        child.translate.x = that.translate.x + posX;
        child.translate.y = that.translate.y + posY;
        child.update();
        if (that.horizontal) {
          posX += childSize.width + that.elementSpacing;
        } else {
          posY += childSize.height + that.elementSpacing;
        }
      });
    };

    ElementContainer.prototype.getMinSize = function () {
      return {width: 80, height: 38};
    };

    ElementContainer.prototype.getSize = function () {

      var minSize = this.getMinSize();
      var childSize = this.calcChildSize();

      return {
        width: Math.max(childSize.width, minSize.width) + this.hPadding * 2,
        height: Math.max(childSize.height, minSize.height) + this.vPadding * 2
      };
    };

    ElementContainer.prototype.calcChildSize = function () {
      var width = this.horizontal ? Math.max(0, this.elementSpacing * (this.children.length - 1)) : 0;
      var height = !this.horizontal ? Math.max(0, this.elementSpacing * (this.children.length - 1)) : 0;
      var that = this;

      this.children.forEach(function (child) {
        var childSize = child.getSize();
        if (that.horizontal) {
          width += childSize.width;
          if (height < childSize.height) {
            height = childSize.height;
          }
        } else {
          height += childSize.height;
          if (width < childSize.width) {
            width = childSize.width;
          }
        }
      });

      return {width: width, height: height};
    };

    ElementContainer.prototype.getPathQuery = function () {
      if (this.children.length <= 0) {
        return new q.PathQuery();
      }
      return this.children[0].getPathQuery();
    };

    //--------------------------

    function BoxContainer(parent, fillColor, strokeColor, horizontal) {
      ElementContainer.call(this, parent, horizontal);
      this.fillColor = fillColor;
      this.strokeColor = strokeColor;
    }

    BoxContainer.prototype = Object.create(ElementContainer.prototype);

    BoxContainer.prototype.init = function (domParent) {
      ElementContainer.prototype.init.call(this, domParent);

      var size = this.getSize();

      this.myDomElements.append("rect")
        .classed("boxContainerBg", true)
        .attr({
          x: 0,
          y: 0,
          rx: 3,
          ry: 3,
          width: size.width,
          height: size.height,
          fill: this.fillColor,
          stroke: this.strokeColor
        });
    };

    BoxContainer.prototype.renderCaption = function (domParent) {
      this.myDomElements.append("text")
        .attr({
          x: 0,
          y: CAPTION_SIZE
        })
        .text(this.caption);
    };

    BoxContainer.prototype.updateMyDomElements = function () {
      ElementContainer.prototype.updateMyDomElements.call(this);

      var size = this.getSize();
      this.myDomElements.select("rect.boxContainerBg")
        .transition()
        .attr({
          width: size.width,
          height: size.height
        });
    };

    //------------------------------------------

    function CaptionContainer(parent, caption, fillColor, strokeColor, horizontal) {
      BoxContainer.call(this, parent, fillColor, strokeColor, horizontal);
      this.caption = caption;
    }

    CaptionContainer.prototype = Object.create(BoxContainer.prototype);

    CaptionContainer.prototype.init = function (domParent) {
      BoxContainer.prototype.init.call(this, domParent);

      var size = this.getSize();

      this.myDomElements.append("text")
        .attr({
          x: 2,
          y: CAPTION_SIZE
        })
        .text(this.caption);
    };

    CaptionContainer.prototype.update = function () {
      this.updateMyDomElements();
      this.updateChildren(this.hPadding, this.vPadding + CAPTION_SIZE);

    };

    CaptionContainer.prototype.getSize = function () {

      var minSize = this.getMinSize();
      var childSize = this.calcChildSize();

      return {
        width: Math.max(childSize.width, minSize.width) + this.hPadding * 2,
        height: Math.max(childSize.height, minSize.height) + this.vPadding * 2 + CAPTION_SIZE
      };
    };

    //------------------------------------------

    function ConstraintElement(parent) {
      BaseGUIElement.call(this, parent);
    }

    ConstraintElement.prototype = Object.create(BaseGUIElement.prototype);

    ConstraintElement.prototype.addInput = function (domParent, initialText) {

      var size = this.getSize();

      domParent.append("defs")
        .append("clipPath")
        .attr("id", "captionLabelClipPath")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 30)
        .attr("height", 20);

      domParent.append("rect")
        .attr({
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          fill: "rgba(255,255,255,0.5)"
        });

      domParent.append("text")
        .attr({
          x: 5,
          y: 14,
          "clip-path": "url(#captionLabelClipPath)"
        }).text(initialText)
        .classed("caption", true);

      domParent.append("foreignObject")
        .attr({
          x: 35,
          y: 2,
          width: 90,
          height: 20
        }).append("xhtml:div")
        .style("font", "10px 'Arial'")
        .html('<input type="text" placeholder="' + initialText + '" size="5px" width="5px" class="queryConstraint">');
      $(this.myDomElements[0]).find("input").width(90);

    };

    ConstraintElement.prototype.getText = function () {
      return $(this.myDomElements[0]).find("input").val();
    };

    ConstraintElement.prototype.setText = function (text) {
      return $(this.myDomElements[0]).find("input").val(text);
    };

    ConstraintElement.prototype.setCaption = function (text) {
      $(this.myDomElements[0]).find("text.caption").text(text);
    };

    ConstraintElement.prototype.getSize = function () {
      return {width: 130, height: 24};
    };

    //------------------------------------------

    function MultiConstraintElement(parent) {
      ConstraintElement.call(this, parent);
      this.autoCompleteSource = [];
    }

    MultiConstraintElement.prototype = Object.create(ConstraintElement.prototype);

    MultiConstraintElement.prototype.init = function (domParent) {
      ConstraintElement.prototype.init.call(this, domParent);

      this.addInput(this.myDomElements, "");

      var that = this;
    };


    MultiConstraintElement.prototype.addInput = function (domParent, initialText) {
      ConstraintElement.prototype.addInput.call(this, domParent, initialText);

      var that = this;
      var input = $(this.myDomElements[0]).find("input");
      input.typedAutocomplete({
        minLength: 3,
        source: that.autoCompleteSource,
        select: function (event, ui) {

          that.onSelect(ui);
          //that.id = ui.item.value;
          //pathQuery.setQuery(queryView.container.getPathQuery(), false);
          return false; // Prevent the widget from inserting the value.
        },
        focus: function (event, ui) {
          //input.val(ui.item.label);
          //that.id = ui.item.value;
          return false; // Prevent the widget from inserting the value.
        },
        autoFocus: true
      });

      input.on("input", function (e) {
        that.setCaption("");
        delete that.info;
      });
    };

    MultiConstraintElement.prototype.onSelect = function (ui) {
      this.setInfo(ui.item);
    };

    MultiConstraintElement.prototype.setInfo = function (info, updateSimpleUINodes) {
      if (!info) {
        delete this.info;
        this.setCaption("");
        //$(this.myDomElements[0]).find("input").val("");
      } else {
        this.info = info;
        $(this.myDomElements[0]).find("input").val(info.label);
        this.setCaption(info.type);
      }
      queryView.updateQuery(typeof updateSimpleUINodes === "undefined" ? true : false);
      //pathQuery.setQuery(queryView.container.getPathQuery(), false);
    };


    //-------------------------------------------

    function EdgeConstraintElement(parent) {
      MultiConstraintElement.call(this, parent);
      this.autoCompleteSource = function (request, response) {
        var term = request.term;
        var setNodeLabels = config.getSetNodeLabels();
        if (setNodeLabels.length > 0) {
          fetchSetsOfType(term, 0, [], setNodeLabels, response);
        } else {
          lastAutoCompleteResult = [];
          response([]);
        }
      }
    }

    EdgeConstraintElement.prototype = Object.create(MultiConstraintElement.prototype);

    EdgeConstraintElement.prototype.addInput = function (domParent, initialText) {
      MultiConstraintElement.prototype.addInput.call(this, domParent, initialText);

      var that = this;

      $(domParent[0]).mouseenter(function () {
        addEdgeConstraintBooleanButtons(that);
      });
    };

    function addEdgeConstraintBooleanButtons(element) {
      var size = element.getSize();

      addBooleanButtons(element, (size.width - AND_BUTTON_WIDTH - OR_BUTTON_WIDTH - NOT_BUTTON_WIDTH) / 2, size.height - 5,
        function () {
          replaceWithContainer(element, AndContainer, true, EdgeConstraintElement);
        },
        function () {
          replaceWithContainer(element, OrContainer, false, EdgeConstraintElement);
        }, function () {
          replaceWithContainer(element, NotContainer, false);
        }
      );
    }

    EdgeConstraintElement.prototype.getPathQuery = function () {
      var el = this.myDomElements.select("input");
      var val = $(el[0]).val();

      if (typeof this.info === "undefined" || val === "") {
        return new q.Constraint();
      }
      if (this.info.category === "Set") {
        return new q.EdgeSetPresenceConstraint(this.info.id, config.getSetProperty(this.info.setNodeLabel));
      }
      return q.Constraint();

    };


//----------------------------------------

    function fetchSetsOfType(term, index, results, setNodeLabels, response) {
      var label = setNodeLabels[index];
      var nameProperty = config.getSetNamePropertyOfType(label);
      ServerSearch.search(term, nameProperty, label).then(function (setResults) {
        setResults.forEach(function (element) {
          element.category = "Set";
          element.setNodeLabel = label;
          element.type = config.getSetTypeFromLabel(label);
        });
        results = results.concat(setResults);
        if (index + 1 < setNodeLabels.length) {
          fetchSetsOfType(term, index + 1, results, setNodeLabels, response);
        } else {
          lastAutoCompleteResult = results;
          response(results);
        }
      });
    }


    function nodeAutoCompleteSource(request, response) {
      var term = request.term;
      ServerSearch.search(term, 'name', '_Network_Node').then(function (nameResults) {
        nameResults.forEach(function (element) {
          element.category = "Name";

          var type = "";
          for (var i = 0; i < element.labels.length; i++) {
            var label = element.labels[i];
            if (config.isNodeLabel(label)) {
              type = label;
              break;
            }
          }
          element.type = type;
        });

        var nodeTypes = config.getNodeTypes();
        nodeTypes = nodeTypes.filter(function (type) {
          var res = type.search(new RegExp(term, "i"));
          return res !== -1;
        });
        var typeResults = nodeTypes.map(function (type) {
          return {
            label: type,
            value: type,
            category: "Type",
            type: "Type"
          }
        });

        var setNodeLabels = config.getSetNodeLabels();
        if (setNodeLabels.length > 0) {
          fetchSetsOfType(term, 0, nameResults.concat(typeResults), setNodeLabels, response);
        } else {
          lastAutoCompleteResult = nameResults.concat(typeResults);
          response(lastAutoCompleteResult);
        }

      });
    }

    function NodeConstraintElement(parent) {
      MultiConstraintElement.call(this, parent);
      this.autoCompleteSource = nodeAutoCompleteSource;

    }

    NodeConstraintElement.prototype = Object.create(MultiConstraintElement.prototype);

    NodeConstraintElement.prototype.addInput = function (domParent, initialText) {
      MultiConstraintElement.prototype.addInput.call(this, domParent, initialText);

      var that = this;

      $(domParent[0]).mouseenter(function () {
        addNodeConstraintBooleanButtons(that);
      });

      //$(this.myDomElements.select("input")[0]).on("input.sync", function () {
      //    setSimpleQueryUINodeText(this.value, that);
      //})
    };

    function addNodeConstraintBooleanButtons(element) {
      var size = element.getSize();

      addBooleanButtons(element, (size.width - AND_BUTTON_WIDTH - OR_BUTTON_WIDTH - NOT_BUTTON_WIDTH) / 2, size.height - 5,
        function () {
          replaceWithContainer(element, AndContainer, true, NodeConstraintElement);
        },
        function () {
          replaceWithContainer(element, OrContainer, false, NodeConstraintElement);
        }, function () {
          replaceWithContainer(element, NotContainer, false);
        }
      );
    }

    NodeConstraintElement.prototype.isEmpty = function () {
      var el = this.myDomElements.select("input");
      var val = $(el[0]).val();

      return (typeof this.info === "undefined" || val === "");
    }

    NodeConstraintElement.prototype.getPathQuery = function () {
      var el = this.myDomElements.select("input");
      var val = $(el[0]).val();

      if (typeof this.info === "undefined" || val === "") {
        return new q.Constraint();
      }
      if (this.info.category === "Name") {
        return new q.NodeNameConstraint(this.info.label);
      } else if (this.info.category === "Set") {
        return new q.NodeSetPresenceConstraint(this.info.id, config.getSetProperty(this.info.setNodeLabel));
      }
      return new q.NodeTypeConstraint(this.info.label);
    };

    NodeConstraintElement.prototype.onSelect = function (ui) {
      MultiConstraintElement.prototype.onSelect.call(this, ui);
      setSimpleQueryUINodeText($(this.myDomElements.select("input")[0]).val(), this);
    };

    function setSimpleQueryUINodeText(text, c) {
      var constraint = queryView.findUnambiguousPathNodeConstraint(true);
      if (constraint && constraint === c) {
        $("#startNode").val(text);
      } else {
        constraint = queryView.findUnambiguousPathNodeConstraint(false);
        if (constraint && constraint === c) {
          $("#endNode").val(text);
        }
      }
    }


//--------------------------------------

    function BooleanContainer(parent, caption, fillColor, borderColor, horizontal) {
      CaptionContainer.call(this, parent, caption, fillColor, borderColor, horizontal || false);
      //ElementContainer.call(this, parent, horizontal || false);
      //this.vPadding = 0;
    }

    BooleanContainer.prototype = Object.create(CaptionContainer.prototype);

    BooleanContainer.prototype.init = function (domParent) {
      CaptionContainer.prototype.init.call(this, domParent);


      var that = this;

      $(this.myDomElements[0]).mouseenter(function () {

        var closestParentContainer = findClosestParentContainer();

        if (closestParentContainer instanceof NodeContainer) {
          addNodeConstraintBooleanButtons(that);
        } else if (closestParentContainer instanceof EdgeContainer) {
          addEdgeConstraintBooleanButtons(that);
        } else if (closestParentContainer instanceof PathContainer) {
          addContainerBooleanButtons(that);
        }
      });


      function findClosestParentContainer() {

        var parent = that.parent;
        while (typeof parent !== "undefined") {
          if (parent instanceof NodeContainer || parent instanceof EdgeContainer || parent instanceof PathContainer) {
            return parent;
          }
          parent = parent.parent;
        }
      }


    };

//--------------------------------------

    function AndContainer(parent, horizontal) {
      BooleanContainer.call(this, parent, "AND", "#fed9a6", "black", true);
      //ElementContainer.call(this, parent, horizontal || false);
      //this.vPadding = 0;
    }

    AndContainer.prototype = Object.create(BooleanContainer.prototype);

    AndContainer.prototype.getMinSize = function () {
      return {width: 40, height: 20};
    };

    AndContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.And(new q.PathQuery(), new q.PathQuery());
      } else if (this.children.length == 1) {
        return new q.And(this.children[0].getPathQuery(), new q.PathQuery());
      }
      return new q.And(this.children[0].getPathQuery(), this.children[1].getPathQuery());
    };

    //----------------------------------------

    function NotContainer(parent, horizontal) {
      BooleanContainer.call(this, parent, "NOT", "#fbb4ae", "black", horizontal || false);
      //ElementContainer.call(this, parent, horizontal || false);
      //this.vPadding = 0;
    }

    NotContainer.prototype = Object.create(BooleanContainer.prototype);

    NotContainer.prototype.getMinSize = function () {
      return {width: 40, height: 20};
    };

    NotContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.Not(new q.PathQuery());
      }
      return new q.Not(this.children[0].getPathQuery());
    };


    //--------------------------

    function OrContainer(parent, horizontal) {
      BooleanContainer.call(this, parent, "OR", "#b3cde3", "black", horizontal || false);
      //ElementContainer.call(this, parent, horizontal || false);
      //this.vPadding = 0;
    }

    OrContainer.prototype = Object.create(BooleanContainer.prototype);


    OrContainer.prototype.getMinSize = function () {
      return {width: 40, height: 20};
    };

    OrContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.Or(new q.PathQuery(), new q.PathQuery());
      } else if (this.children.length == 1) {
        return new q.Or(this.children[0].getPathQuery(), new q.PathQuery());
      }
      return new q.Or(this.children[0].getPathQuery(), this.children[1].getPathQuery());
    };


//------------------------------------------------------
    function NodeContainer(parent, hasInitialConstraint) {
      CaptionContainer.call(this, parent, "", "rgb(200, 200, 200)", "rgb(30, 30, 30)", false);
      this.hasPosition = false;
      this.hasInitialConstraint = hasInitialConstraint;
    }

    NodeContainer.prototype = Object.create(CaptionContainer.prototype);

    NodeContainer.prototype.init = function (domParent) {
      CaptionContainer.prototype.init.call(this, domParent);

      var that = this;


      //Use jquery mouseenter and mouseleave to prevent flickering of add button
      $(this.myDomElements[0]).mouseenter(function () {
        var size = that.getSize();
        if (that.children.length <= 0) {

          addAddButton(that, function () {
            that.add(new NodeConstraintElement(that));
            d3.select(this).remove();
            queryView.updateQuery();
            //pathQuery.setQuery(queryView.container.getPathQuery(), false);
          }, (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);

        }

        if (!that.hasPosition && !(that.parent instanceof UnorderedContainer)) {
          addPositionButton(that, function () {
            that.showPositionDialog();
            queryView.updateQuery();
            //pathQuery.setQuery(queryView.container.getPathQuery(), false);
          }, (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, 0);
        }

        if (!(that.hasPosition && (that.index === 0 || that.index === -1))) {
          addAddButtonWithListOptions(that, [{
            text: "Add Node", callback: function () {
              var index = that.parent.children.indexOf(that);
              that.parent.insert(index + 1, new NodeContainer(that.parent, true));
              if (that.parent instanceof SequenceContainer) {
                that.parent.insert(index + 1, new SequenceFiller(that.parent));
              }
              queryView.updateQuery();
              //pathQuery.setQuery(queryView.container.getPathQuery(), false);
            }
          }, {
            text: "Add Edge", callback: function () {
              var index = that.parent.children.indexOf(that);

              if (that.parent instanceof SequenceContainer) {
                if (index < that.parent.children.length - 1) {
                  var nextChild = that.parent.children[index + 1];
                  if (!(nextChild instanceof SequenceFiller)) {
                    that.parent.insert(index + 1, new SequenceFiller(that.parent));
                  }
                }
              }
              that.parent.insert(index + 1, new EdgeContainer(that.parent));
              queryView.updateQuery();
              //pathQuery.setQuery(queryView.container.getPathQuery(), false);
            }
          }], size.width - DEFAULT_OVERLAY_BUTTON_SIZE, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);
        }
      });

      if (this.hasInitialConstraint) {
        this.add(new NodeConstraintElement(that));
      }
    };

    NodeContainer.prototype.showPositionDialog = function () {
      var that = this;

      $("#startOffsetInput").val(1);
      $("#endOffsetInput").val(1);

      if (!this.hasPosition) {
        $("#noPositionButton").prop("checked", true);
      } else if (this.index > 0) {
        $("#startOffsetButton").prop("checked", true)
        $("#startOffsetInput").val(this.index);
      } else {
        $("#endOffsetButton").prop("checked", true)
        $("#endOffsetInput").val(Math.abs(this.index + 1));
      }

      $("#positionConfirm").click(function () {
        if ($("#startOffsetButton").prop("checked")) {
          that.setPosition(parseInt($("#startOffsetInput").val(), 10));
        } else if ($("#endOffsetButton").prop("checked")) {
          that.setPosition(-(1 + parseInt($("#endOffsetInput").val(), 10)));
        } else {
          that.removePosition();
        }
        $("#positionConfirm").off("click");
      });

      $("#myModal").modal("show");
    };

    NodeContainer.prototype.showRemoveButton = function () {
      if (this.hasPosition && (this.index === 0 || this.index === -1)) {
        return false;
      }
      return CaptionContainer.prototype.showRemoveButton.call(this);
    },

      NodeContainer.prototype.setPosition = function (index) {
        this.hasPosition = true;
        this.index = index;
        var that = this;
        var text = "";
        if (index === 0) {
          text = "Start";
        } else if (index > 0) {
          text = "Start+" + index;
        } else if (index === -1) {
          text = "End";
        } else {
          text = "End-" + Math.abs((index + 1));
        }

        var size = this.getSize();
        if (this.isInitialized) {
          var g = this.myDomElements.append("g")
            .classed("positionGroup", true)
            .on("dblclick", function () {
              if (that.index !== 0 && that.index !== -1) {
                that.showPositionDialog();
              }
            });

          g.append("rect")
            .attr({
              x: (size.width - POSITION_LABEL_WIDTH) / 2,
              y: 1,
              width: POSITION_LABEL_WIDTH,
              height: POSITION_LABEL_HEIGHT,
              fill: "white"
            });

          g.append("text")
            .attr({
                x: size.width / 2,
                y: 9,
                "text-anchor": "middle"
              }
            ).text(text);

        }
      };

    NodeContainer.prototype.removePosition = function () {
      this.hasPosition = false;

      if (this.isInitialized) {
        this.myDomElements.selectAll("g.positionGroup").remove();
      }
    };

    NodeContainer.prototype.updateMyDomElements = function () {
      CaptionContainer.prototype.updateMyDomElements.call(this);

      var size = this.getSize();

      this.myDomElements.select("g.positionGroup rect")
        .transition()
        .attr({
          x: (size.width - POSITION_LABEL_WIDTH) / 2
        });

      this.myDomElements.select("g.positionGroup text")
        .transition()
        .attr({
            x: size.width / 2
          }
        );
    };

    NodeContainer.prototype.getPathQuery = function () {

      var constraint = this.children.length === 0 ? new q.Constraint() : this.children[0].getPathQuery();

      if (this.hasPosition) {

        var i = (this.index < 0) ? Math.abs((this.index + 1)) : this.index;
        var n = new q.NodeMatcher(constraint);
        if (this.index === 0) {
          n.setStartNode(true);
        } else if (this.index === -1) {
          n.setEndNode(true);
        }

        return new q.RegionMatcher(n, new q.MatchRegion(i, i), this.index < 0, q.MatchRegionRelations.equal);
      }

      return new q.NodeMatcher(constraint);
    };

//---------------------------------------------

    function EdgeContainer(parent) {
      CaptionContainer.call(this, parent, "", "white", "black", true);
    }

    EdgeContainer.prototype = Object.create(CaptionContainer.prototype);

    EdgeContainer.prototype.init = function (domParent) {
      CaptionContainer.prototype.init.call(this, domParent);

      var that = this;

      var size = this.getSize();

      this.myDomElements.append("line")
        .classed("edgeLine", true)
        .attr({
          x1: 5,
          y1: size.height / 2,
          x2: size.width - 5,
          y2: size.height / 2,
          "stroke-width": "5px",
          stroke: "black"
        });

      $(this.myDomElements[0]).mouseenter(function () {

        var size = that.getSize();

        if (that.children.length <= 0) {

          addAddButton(that, function () {
            that.add(new EdgeConstraintElement(that));
            d3.select(this).remove();
            queryView.updateQuery();
            //pathQuery.setQuery(queryView.container.getPathQuery(), false);
          }, (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);

        }

        addAddButtonWithListOptions(that, [{
          text: "Add Node", callback: function () {
            var index = that.parent.children.indexOf(that);

            if (that.parent instanceof SequenceContainer) {
              if (index < that.parent.children.length - 1) {
                var nextChild = that.parent.children[index + 1];
                if (!(nextChild instanceof SequenceFiller)) {
                  that.parent.insert(index + 1, new SequenceFiller(that.parent));
                }
              }
            }
            that.parent.insert(index + 1, new NodeContainer(that.parent));
            queryView.updateQuery();
            //pathQuery.setQuery(queryView.container.getPathQuery(), false);
          }
        }, {
          text: "Add Edge", callback: function () {
            var index = that.parent.children.indexOf(that);

            that.parent.insert(index + 1, new EdgeContainer(that.parent));
            if (that.parent instanceof SequenceContainer) {
              that.parent.insert(index + 1, new SequenceFiller(that.parent));
            }
            queryView.updateQuery();
            //pathQuery.setQuery(queryView.container.getPathQuery(), false);
          }
        }], size.width - DEFAULT_OVERLAY_BUTTON_SIZE, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);

      });

      //$(this.myDomElements[0]).mouseleave(function () {
      //  d3.select("#queryOverlay").selectAll("g.overlayButton")
      //    .remove();
      //});
    };

    EdgeContainer.prototype.update = function () {
      CaptionContainer.prototype.update.call(this);

      var size = this.getSize();
      var that = this;
      this.myDomElements.selectAll("line.edgeLine")
        .transition()
        .attr({
          x1: 5,
          y1: that.children.length === 0 ? size.height / 2 : 8,
          x2: size.width - 5,
          y2: that.children.length === 0 ? size.height / 2 : 8
        });
    };

    EdgeContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.EdgeMatcher(new q.Constraint());
      }
      return new q.EdgeMatcher(this.children[0].getPathQuery());
    };

//---------------------------------------------

    function UnorderedContainer(parent) {
      CaptionContainer.call(this, parent, "Unordered", "#ccebc5", "black", true);
    }

    UnorderedContainer.prototype = Object.create(CaptionContainer.prototype);

    UnorderedContainer.prototype.init = function (domParent) {
      CaptionContainer.prototype.init.call(this, domParent);

      var that = this;

      $(this.myDomElements[0]).mouseenter(function () {

        var size = that.getSize();
        if (that.children.length <= 0) {
          addAddButtonWithListOptions(that, [{
            text: "Add Node", callback: function () {
              that.add(new NodeContainer(that, true));
              queryView.updateQuery();
              //pathQuery.setQuery(queryView.container.getPathQuery(), false);
            }
          }, {
            text: "Add Edge", callback: function () {
              that.add(new EdgeContainer(that));
              queryView.updateQuery();
              //pathQuery.setQuery(queryView.container.getPathQuery(), false);
            }
          }], (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);
        }

        addContainerBooleanButtons(that);

      });

    };

    function addContainerBooleanButtons(element) {
      var size = element.getSize();

      addBooleanButtonsWithListOptions(element, (size.width - AND_BUTTON_WIDTH - OR_BUTTON_WIDTH - NOT_BUTTON_WIDTH) / 2, size.height - 5,
        [{
          text: "Add Unordered", callback: function () {
            replaceWithContainer(element, AndContainer, false, UnorderedContainer);
          }
        },
          {
            text: "Add Sequence", callback: function () {
            replaceWithContainer(element, AndContainer, false, SequenceContainer);
          }
          }],
        [{
          text: "Add Unordered", callback: function () {
            replaceWithContainer(element, OrContainer, false, UnorderedContainer);
          }
        },
          {
            text: "Add Sequence", callback: function () {
            replaceWithContainer(element, OrContainer, false, SequenceContainer);
          }
          }],
        function () {
          replaceWithContainer(element, NotContainer, false);
        }
      );
    }

    UnorderedContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.PathQuery();
      }

      var nodeMatchers = 0;
      var edgeMatchers = 0;

      var prevQuery = 0;

      this.children.forEach(function (child) {
        var currentQuery = getPathBoundedQuery(child);

        if (child instanceof NodeContainer) {
          if (nodeMatchers != 0) {
            nodeMatchers = new q.QueryMatchRegionRelation(nodeMatchers, currentQuery, q.MatchRegionRelations.unequal);
          } else {
            nodeMatchers = currentQuery;
          }
        } else {
          if (edgeMatchers != 0) {
            edgeMatchers = new q.QueryMatchRegionRelation(edgeMatchers, currentQuery, q.MatchRegionRelations.unequal);
          } else {
            edgeMatchers = currentQuery;
          }
        }
      });
      if (nodeMatchers === 0) {
        return edgeMatchers;
      }

      if (edgeMatchers === 0) {
        return nodeMatchers;
      }

      return new q.And(nodeMatchers, edgeMatchers);
    };

//--------------------------------


    function SequenceFiller(parent) {
      BaseGUIElement.call(this, parent, true);
    }

    SequenceFiller.prototype = Object.create(BaseGUIElement.prototype);

    SequenceFiller.prototype.init = function (domParent) {
      BaseGUIElement.prototype.init.call(this, domParent);

      var size = this.getSize();

      this.myDomElements.append("rect")
        .attr({
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          fill: "white"
        });

      this.myDomElements.append("line")
        .attr({
          x1: 5,
          y1: size.height / 2,
          x2: size.width - 5,
          y2: size.height / 2,
          "stroke-width": "5px",
          "stroke-linecap": "round",
          "stroke-dasharray": "1, 20",
          stroke: "black"
        });

      var that = this;

      //Use jquery mouseenter and mouseleave to prevent flickering of add button
      $(this.myDomElements[0]).mouseenter(function () {
        var size = that.getSize();

        if (that.parent instanceof PathContainer) {
          addAddButtonWithListOptions(that, [{
            text: "Add Sequence", callback: function () {
              that.parent.replace(that, new SequenceContainer(that.parent));
              queryView.updateQuery();
              //pathQuery.setQuery(queryView.container.getPathQuery(), false);
            }
          }, {
            text: "Add Unordered", callback: function () {
              that.parent.replace(that, new UnorderedContainer(that.parent));
              queryView.updateQuery();
              //pathQuery.setQuery(queryView.container.getPathQuery(), false);
            }
          }], (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);

        } else {
          addAddButtonWithListOptions(that, [{
            text: "Add Node", callback: function () {
              var index = that.parent.children.indexOf(that);


              if (index === 0 && that.parent.children.length === 1) {
                that.parent.replace(that, new NodeContainer(that.parent, true));
                queryView.updateQuery();
                //pathQuery.setQuery(queryView.container.getPathQuery(), false);
                return;
              }

              if (index > 0 && index < that.parent.children.length - 1) {
                var prevChild = that.parent.children[index - 1];
                var nextChild = that.parent.children[index + 1];
                if (prevChild instanceof EdgeContainer && nextChild instanceof EdgeContainer) {
                  that.parent.replace(that, new NodeContainer(that.parent, true));
                  queryView.updateQuery();
                  //pathQuery.setQuery(queryView.container.getPathQuery(), false);
                  return;
                }
              }

              that.parent.insert(index, new NodeContainer(that.parent, true));
              that.parent.insert(index, new SequenceFiller(that.parent));
              queryView.updateQuery();
              //pathQuery.setQuery(queryView.container.getPathQuery(), false);
            }
          }, {
            text: "Add Edge", callback: function () {
              var index = that.parent.children.indexOf(that);

              if (index === 0 && that.parent.children.length === 1) {
                that.parent.replace(that, new EdgeContainer(that.parent));
                queryView.updateQuery();
                //pathQuery.setQuery(queryView.container.getPathQuery(), false);
                return;
              }

              if (index > 0 && index < that.parent.children.length - 1) {
                var prevChild = that.parent.children[index - 1];
                var nextChild = that.parent.children[index + 1];
                if (prevChild instanceof NodeContainer && nextChild instanceof NodeContainer) {
                  that.parent.replace(that, new EdgeContainer(that.parent));
                  queryView.updateQuery();
                  //pathQuery.setQuery(queryView.container.getPathQuery(), false);
                  return;
                }
              }

              that.parent.insert(index, new EdgeContainer(that.parent));
              that.parent.insert(index, new SequenceFiller(that.parent));
              queryView.updateQuery();
              //pathQuery.setQuery(queryView.container.getPathQuery(), false);
            }
          }], (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);
        }

      });

      //$(this.rootElement[0]).mouseleave(function () {
      //  d3.select("#queryOverlay").selectAll("g.overlayButton")
      //    .remove();
      //});
    };

    SequenceFiller.prototype.showRemoveButton = function () {
      var show = BaseGUIElement.prototype.showRemoveButton.call(this)
      if (show) {
        var index = this.parent.children.indexOf(this);
        if (index > 0 && index < this.parent.children.length - 1) {
          var prevChild = this.parent.children[index - 1];
          var nextChild = this.parent.children[index + 1];
          if ((prevChild instanceof EdgeContainer && nextChild instanceof EdgeContainer) ||
            (prevChild instanceof NodeContainer && nextChild instanceof NodeContainer)) {
            return false;
          }
        }
        if (index === 0 && this.parent.children.length === 1) {
          return false;
        }
      }
      return show;
    };

//--------------------------------------

    function getPathBoundedQuery(element) {
      if (element instanceof NodeContainer) {

        var greaterStart = new q.RegionMatcher(element.getPathQuery(), new q.MatchRegion(0, 0), false, q.MatchRegionRelations.greater);
        return new q.RegionMatcher(greaterStart, new q.MatchRegion(0, 0), true, q.MatchRegionRelations.less);

      } else if (element instanceof EdgeContainer) {
        var greaterStart = new q.RegionMatcher(element.getPathQuery(), new q.MatchRegion(0, 0), false, q.MatchRegionRelations.greater);
        var greaterOrEqualStart = new q.Or(greaterStart, new q.RegionMatcher(element.getPathQuery(), new q.MatchRegion(0, 0), false, q.MatchRegionRelations.equal));
        return new q.RegionMatcher(greaterOrEqualStart, new q.MatchRegion(0, 0), true, q.MatchRegionRelations.less);
      }
      return element.getPathQuery();
    }

    function SequenceContainer(parent) {
      CaptionContainer.call(this, parent, "Sequence", "white", "black", true);
    }


    SequenceContainer.prototype = Object.create(CaptionContainer.prototype);

    SequenceContainer.prototype.init = function (parent) {
      CaptionContainer.prototype.init.call(this, parent);

      this.add(new SequenceFiller(this));

      var that = this;

      $(this.myDomElements[0]).mouseenter(function () {
        var size = that.getSize();

        addContainerBooleanButtons(that);

      });
    };

    SequenceContainer.prototype.correctSequence = function () {

      var sequenceOk = false;

      while (!sequenceOk) {
        var prevChild = 0;
        sequenceOk = true;
        for (var i = 0; i < this.children.length; i++) {
          var child = this.children[i];
          if (prevChild != 0) {
            if ((prevChild instanceof EdgeContainer && child instanceof EdgeContainer) ||
              (prevChild instanceof NodeContainer && child instanceof NodeContainer)) {
              this.insert(i, new SequenceFiller(this));
              sequenceOk = false;
              break;
            }

            if ((prevChild instanceof SequenceFiller && child instanceof SequenceFiller)) {
              this.removeChild(i);
              sequenceOk = false;
              break;
            }
          }
          prevChild = child;
        }
      }
    };

    //SequenceContainer.prototype.update = function () {
    //
    //  var sequenceOk = false;
    //
    //  while (!sequenceOk) {
    //    var prevChild = 0;
    //    sequenceOk = true;
    //    for (var i = 0; i < this.children.length; i++) {
    //      var child = this.children[i];
    //      if (prevChild != 0) {
    //        if ((prevChild instanceof EdgeContainer && child instanceof EdgeContainer) ||
    //          (prevChild instanceof NodeContainer && child instanceof NodeContainer)) {
    //          this.insert(i, new SequenceFiller(this));
    //          sequenceOk = false;
    //          break;
    //        }
    //
    //        if ((prevChild instanceof SequenceFiller && child instanceof SequenceFiller)) {
    //          this.removeChild(i);
    //          sequenceOk = false;
    //          break;
    //        }
    //      }
    //      prevChild = child;
    //    }
    //  }
    //
    //
    //  CaptionContainer.prototype.update.call(this);
    //}
    //;

    SequenceContainer.prototype.getPathQuery = function () {
      if (this.children.length === 0) {
        return new q.PathQuery();
      } else if (this.children.length === 1) {
        return getPathBoundedQuery(this.children[0]);
      }

      var prevQuery = 0;
      var prevChild = 0;

      for (var i = 0; i < this.children.length; i++) {
        var child = this.children[i];
        if (!(child instanceof SequenceFiller)) {
          var currentQuery = getPathBoundedQuery(child);

          if (prevQuery != 0) {

            if (prevChild instanceof SequenceFiller) {
              prevQuery = new q.QueryMatchRegionRelation(prevQuery, currentQuery, q.MatchRegionRelations.less);
            } else {
              if (prevChild instanceof NodeContainer && child instanceof EdgeContainer) {
                prevQuery = new q.QueryMatchRegionRelation(prevQuery, currentQuery, q.MatchRegionRelations.max1EqualsMin2);
              } else {
                prevQuery = new q.QueryMatchRegionRelation(prevQuery, currentQuery, q.MatchRegionRelations.subsequent);
              }
            }
          } else {
            prevQuery = currentQuery;
          }
        }

        prevChild = child;

      }

      return prevQuery;
    };

//---------------------------
    function PathContainer(parent) {
      BoxContainer.call(this, parent, "white", "black", true);
    }


    PathContainer.prototype = Object.create(BoxContainer.prototype);

    PathContainer.prototype.init = function (parent) {
      BoxContainer.prototype.init.call(this, parent);

      var nc1 = new NodeContainer(this, true);
      var nc2 = new NodeContainer(this, true);

      this.add(nc1);
      this.add(new SequenceFiller(this));
      this.add(nc2);
      nc1.setPosition(0);
      nc2.setPosition(-1);

      var that = this;

      $(this.myDomElements[0]).mouseenter(function () {
        var size = that.getSize();

        addOrButton(that, function () {
          replaceWithContainer(that, OrContainer, false, PathContainer);
        }, (size.width - OR_BUTTON_WIDTH) / 2, size.height - 5);

      });
    };

    PathContainer.prototype.showRemoveButton = function () {
      if (typeof this.parent.parent === "undefined") {
        return false;
      }
      return BoxContainer.prototype.showRemoveButton.call(this);
    };

    PathContainer.prototype.getPathQuery = function () {
      if (this.children.length < 3) {
        return new g.PathQuery();
      }

      var prevQuery = 0;

      this.children.forEach(function (child) {
        var currentQuery = child.getPathQuery();

        if (!(child instanceof SequenceFiller)) {
          if (prevQuery === 0) {
            prevQuery = currentQuery;
          }
          else {
            prevQuery = new q.And(prevQuery, currentQuery);
          }
        }
      });

      return prevQuery;
    };

//----------------------

    function QueryView() {
      View.call(this, "#pathQuery");
      this.grabHSpace = false;
      this.grabVSpace = false;
      this.advancedMode = false;
    }

    QueryView.prototype = Object.create(View.prototype);

    QueryView.prototype.updateQuery = function (updateSimpleUINodes) {
      var that = this;
      pathQuery.setQuery(this.container.getPathQuery(), false);
      if (updateSimpleUINodes || typeof updateSimpleUINodes === "undefined") {
        updateSimpleUINodeText(true);
        updateSimpleUINodeText(false);
      }

      $("#complexQueryLabel").css("display", that.isComplexQuery() ? "inline" : "none");

      function updateSimpleUINodeText(isStartNode) {
        var constraint = that.findUnambiguousPathNodeConstraint(isStartNode);
        if (constraint) {
          var input = $(isStartNode ? "#startNode" : "#endNode");
          input.val(constraint.getText());
          input.prop("disabled", false);

        } else {
          var input = $(isStartNode ? "#startNode" : "#endNode");
          input.val("Advanced definition");
          input.prop("disabled", true);
        }
      }
    };

    QueryView.prototype.getMinSize = function () {
      if (typeof this.container === "undefined") {
        return {width: 200, height: 100};
      }
      var containerSize = this.container.getSize();
      return {width: containerSize.width + 80, height: containerSize.height + 10};
    };

    QueryView.prototype.init = function () {
      //load content first
      $('#query_interface').load('query/view.html', this.initImpl.bind(this));
    };
    QueryView.prototype.initImpl = function () {
      View.prototype.init.call(this);

      $("#sets_as_edges_group").css({display: config.isSetEdgesOnly() ? "none" : "inline-block"});

      //var $progress = $('.progress-bar');
      //ServerSearch.on({
      //    query_start: function () {
      //        $progress.css('width', '0%');
      //    },
      //    query_path: function (event, data) {
      //        var k = data.query.k;
      //        var i = data.i;
      //        d3.select($progress[0]).transition().duration(100).style('width', d3.round(i / k * 100, 0) + '%');
      //    },
      //    query_done: function () {
      //        d3.select($progress[0]).transition().duration(100).style('width', '100%');
      //        $progress.parent();
      //    }
      //});

      var svg = d3.select(this.parentSelector + " svg");

      this.container = new ElementContainer();
      this.container.init(svg);
      this.container.add(new PathContainer(this.container));
      var that = this;

      svg.append("g")
        .attr("id", "queryOverlay");


      //$('#filter_query').click(function () {
      //    //that.addNodeFilter("type", "Compound", true);
      //
      //    that.updateQuery();
      //    //var query = that.container.getPathQuery();
      //    //
      //    //pathQuery.setQuery(query, false);
      //    return false;
      //  }
      //);

      $("#swap_start_end").click(function () {
        var pathContainers = [];
        that.findPathContainers(that.container, pathContainers);
        pathContainers.forEach(function (pathContainer) {
          var startNodeContainer = pathContainer.children[0];
          var endNodeContainer = pathContainer.children[pathContainer.children.length - 1];
          pathContainer.children[0] = endNodeContainer;
          pathContainer.children[pathContainer.children.length - 1] = startNodeContainer;

          $(startNodeContainer.rootElement[0]).insertBefore($(endNodeContainer.rootElement[0]));

          //var a = startNodeContainer.rootElement[0];
          //var b = endNodeContainer.rootElement[0];
          //var aparent = a.parentNode;
          //var asibling = a.nextSibling === b ? a : a.nextSibling;
          //b.parentNode.insertBefore(a, b);
          //aparent.insertBefore(b, asibling);
          endNodeContainer.setPosition(0);
          startNodeContainer.setPosition(-1);
          pathContainer.updateParent();
          that.updateQuery(true);
        });
      });


      $("#toggleQueryMode").click(function () {
        that.advancedMode = !that.advancedMode;
        $(this).toggleClass("btn-active");
        $(this).toggleClass("btn-default");

        if (that.advancedMode) {
          //$("#advancedQueryWidgets").show(500, "linear", function(){
          $("#advancedQueryWidgets").css({display: "inline-block"});
          //});
          //$("#pathQueryView").show(500, "linear", function(){
          $("#pathQueryView").css({display: "inline-block"});
          //});
          $("#simpleQueryWidgets").hide();


          //$("#simpleQueryWidgets").css({display: "none"});
        } else {
          $("#advancedQueryWidgets").css({display: "none"});
          $("#pathQueryView").css({display: "none"});
          $("#simpleQueryWidgets").css({display: "inline-block"});
        }
      });


      var startInput = $("#startNode");
      startInput.typedAutocomplete({
        minLength: 3,
        source: nodeAutoCompleteSource,
        select: function (event, ui) {
          startInput.val(ui.item.label);
          setNodeInfo(true, ui.item);

          return false; // Prevent the widget from inserting the value.
        },
        focus: function (event, ui) {
          return false; // Prevent the widget from inserting the value.
        },
        autoFocus: true
      });

      //startInput.keypress(function (event) {
      //
      //  if (event.keyCode === 13) {
      //    var info = getNodeInfo(true);
      //    if(info && info.label !== startInput.val()){
      //      if(lastAutoCompleteResult.length > 0) {
      //        startInput.autocomplete( "close" );
      //        var item = lastAutoCompleteResult[0];
      //        startInput.val(item.label);
      //        setNodeInfo(true, item);
      //      }
      //    }
      //  }
      //
      //});

      startInput.on("blur", function () {
        if (lastAutoCompleteResult.length > 0) {

        }

        //startInput.val(ui.item.label);
        //  setNodeInfo(true, ui.item);
      });

      //startInput.on("input", function (e) {
      //    var constraint = that.findUnambiguousPathNodeConstraint(true);
      //    if (constraint) {
      //        constraint.setText(this.value);
      //        constraint.setInfo(null, false);
      //    }
      //});


      var endInput = $("#endNode");
      endInput.typedAutocomplete({
        minLength: 3,
        source: nodeAutoCompleteSource,
        select: function (event, ui) {
          endInput.val(ui.item.label);
          setNodeInfo(false, ui.item);
          return false; // Prevent the widget from inserting the value.
        },
        focus: function (event, ui) {
          return false; // Prevent the widget from inserting the value.
        },
        autoFocus: true
      });

      //endInput.on("input", function (e) {
      //    var constraint = that.findUnambiguousPathNodeConstraint(false);
      //    if (constraint) {
      //        constraint.setText(this.value);
      //        constraint.setInfo(null, false);
      //    }
      //});

      function setNodeInfo(isStartNode, info) {
        var constraint = that.findUnambiguousPathNodeConstraint(isStartNode);
        if (constraint) {
          constraint.setText(info.label);
          constraint.setInfo(info);
        }
      }

      function getNodeInfo(isStartNode) {
        var constraint = that.findUnambiguousPathNodeConstraint(isStartNode);
        if (constraint) {
          return constraint.info;
        }
      }


      $('#remove_filtered_paths').click(function () {
          pathQuery.setRemoveFilteredPaths(!($('#remove_filtered_paths').prop("checked")));
        }
      );

      $('#sets_as_edges').click(function () {
        pathQuery.setJustNetworkEdges(that.isJustNetworkEdges());
      });

      ServerSearch.on('query_done', function () {
        $('#submitQuery i').attr('class', 'fa fa-search');
      });

      ServerSearch.on('found_done', function () {
        $('#submitQuery i').attr('class', 'fa fa-search');
      });

      $('#submitQuery').click(function (event) {
        event.stopPropagation();
        event.preventDefault();

        that.submitQuery();


        return false;
      });
    };

    QueryView.prototype.isJustNetworkEdges = function () {
      return !(config.isSetEdgesOnly() || ($('#sets_as_edges').is(':checked')));
    };

    QueryView.prototype.submitQuery = function () {
      var k = +$('#at_most_k').val();
      var maxDepth = +$('#longest_path').val();
      //var justNetworkEdges = $('#just_network_edges').is(':checked');
      var startNodeMatcher = this.findSingleStartNodeMatcher();
      var query = this.container.getPathQuery();

      pathQuery.setQuery(query, true);

      $('#submitQuery i').attr('class', 'fa fa-spinner fa-pulse');
      if (startNodeMatcher) {
        ServerSearch.find(query, k);
      } else {
        ServerSearch.loadQuery(query, k, maxDepth, this.isJustNetworkEdges());
      }
    };

    QueryView.prototype.setSimpleQuery = function (startNodeInfo, endNodeInfo) {
      this.reset();
      this.asBoundingNode(startNodeInfo, true);
      this.asBoundingNode(endNodeInfo, false);
    };

    QueryView.prototype.reset = function () {
      var svg = d3.select(this.parentSelector + " svg");

      svg.select("#queryOverlay").remove();
      svg.select("g.queryElement").remove();
      this.container = new ElementContainer();
      this.container.init(svg);
      this.container.add(new PathContainer(this.container));

      svg.append("g")
        .attr("id", "queryOverlay");
    };

    /**
     * Finds the unambiguous start or end node constraint in the path query if it exists.
     * @param isStartNode
     * @returns {NodeConstraintElement}
     */
    QueryView.prototype.findUnambiguousPathNodeConstraint = function (isStartNode) {
      var pathContainers = [];
      this.findPathContainers(this.container, pathContainers);
      if (pathContainers.length === 1) {
        var pathContainer = pathContainers[0];
        var startNodeContainer = pathContainer.children[isStartNode ? 0 : pathContainer.children.length - 1];
        var constraint = startNodeContainer.children[0];
        if (constraint && constraint instanceof NodeConstraintElement) {
          return constraint;
        }
      }
    };

    //QueryView.prototype.findStartNodeMatcher = function (isStartNode) {
    //      var pathContainers = [];
    //      this.findPathContainers(this.container, pathContainers);
    //      if (pathContainers.length === 1) {
    //          var pathContainer = pathContainers[0];
    //          var startNodeContainer = pathContainer.children[isStartNode ? 0 : pathContainer.children.length - 1];
    //          var constraint = startNodeContainer.children[0];
    //          if (constraint && constraint instanceof NodeConstraintElement) {
    //              return constraint;
    //          }
    //      }
    //  };

    /**
     *
     * @returns {True, if there is anything defined other than a single lane of start and end nodes}
     */
    QueryView.prototype.isComplexQuery = function () {

      var pathContainers = [];
      this.findPathContainers(this.container, pathContainers);
      if (pathContainers.length > 1) {
        return true;
      }

      var pathContainer = pathContainers[0];
      if (pathContainer.children.length === 3 && pathContainer.children[1] instanceof SequenceFiller) {
        return false;
      }
      return true;
    };

    QueryView.prototype.findSingleStartNodeMatcher = function () {

      var pathContainers = [];
      this.findPathContainers(this.container, pathContainers);
      if (pathContainers.length === 1) {
        var pathContainer = pathContainers[0];
        if (pathContainer.children.length === 3 && pathContainer.children[1] instanceof SequenceFiller) {


          var endNodeContainer = pathContainer.children[pathContainer.children.length - 1];
          var child = endNodeContainer.children[0];
          if (!child || (child instanceof NodeConstraintElement && child.isEmpty())) {
            return pathContainer.children[0];
          }
        }
      }

    };

    QueryView.prototype.findPathContainers = function (parent, pathContainers) {

      if (parent instanceof ElementContainer) {

        var that = this;
        parent.children.forEach(function (child) {
          if (child instanceof PathContainer) {
            pathContainers.push(child);
          } else {
            that.findPathContainers(child, pathContainers);
          }
        });
      }

    };

    QueryView.prototype.addNodeFilter = function (constraintInfo, isNot) {

      var pathContainers = [];
      this.findPathContainers(this.container, pathContainers);

      pathContainers.forEach(function (pathContainer) {
        var refElement = pathContainer.children[1];
        var unorderedContainer = 0;
        if (refElement instanceof SequenceFiller) {
          var unorderedContainer = new UnorderedContainer(refElement.parent);
          refElement.parent.replace(refElement, unorderedContainer);
          addNodeConstraint(unorderedContainer);
        } else {
          var unorderedContainer = replaceWithContainer(refElement, AndContainer, false, UnorderedContainer);
          addNodeConstraint(unorderedContainer);

        }

        if (isNot) {
          replaceWithContainer(unorderedContainer, NotContainer, false);
        }

      });

      function addNodeConstraint(unorderedContainer) {
        var nodeContainer = new NodeContainer(unorderedContainer, false)
        unorderedContainer.add(nodeContainer);

        var constraintElement = new NodeConstraintElement(nodeContainer);

        nodeContainer.add(constraintElement);
        constraintElement.setInfo(constraintInfo);
      }

      //var query = this.container.getPathQuery();
      //pathQuery.setQuery(query, false);

    };

    QueryView.prototype.asBoundingNode = function (constraintInfo, isStartNode) {
      var pathContainers = [];
      this.findPathContainers(this.container, pathContainers);

      pathContainers.forEach(function (pathContainer) {
        var nodeContainer = pathContainer.children[isStartNode ? 0 : pathContainer.children.length - 1];

        if (nodeContainer instanceof NodeContainer) {
          if (nodeContainer.children.length > 0) {
            nodeContainer.removeChild(0);
          }

          var constraintElement = new NodeConstraintElement(nodeContainer);
          nodeContainer.add(constraintElement);
          constraintElement.setInfo(constraintInfo);
        }
      });
    };


    QueryView.prototype.updateViewSize = function () {

      var minSize = this.getMinSize();
      var viewParent = $("#pathQueryView");
      if (viewParent.height() < minSize.height && viewParent.height() < 300 || viewParent.height() > minSize.height + 10) {
        viewParent.height(Math.min(minSize.height + 10, 300));
      }
      View.prototype.updateViewSize.call(this);
    };

    var queryView = new QueryView();

    return queryView;

  }
)
;
