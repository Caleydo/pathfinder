define(['jquery', 'd3', '../view', './querymodel', '../pathsorting', '../listeners', '../listoverlay', '../search', './pathquery', 'jquery-ui'],
  function ($, d3, View, q, pathSorting, listeners, ListOverlay, ServerSearch, pathQuery) {

    var listOverlay = new ListOverlay();


    var DEFAULT_OVERLAY_BUTTON_SIZE = 16;
    var OR_BUTTON_WIDTH = 24;
    var AND_BUTTON_WIDTH = 38;
    var NOT_BUTTON_WIDTH = 38;
    var CAPTION_SIZE = 10;
    var POSITION_LABEL_WIDTH = 40;
    var POSITION_LABEL_HEIGHT = 10;

    function addOverlayButton(parent, x, y, width, height, buttonText, textX, textY, color) {

      var button = d3.select("#queryOverlay").append("g")
        .classed("overlayButton", true)
        .attr({
          transform: "translate(" + (parent.translate.x) + "," + (parent.translate.y) + ")"
        });

      button.append("rect")
        .attr({
          x: x,
          y: y,
          width: width,
          height: height
        });

      button.append("text")
        .attr({
          x: textX,
          y: textY,
          fill: color
        })
        .text(buttonText);

      ;
      return button;
    }


    function addAddButton(parent, data, x, y) {

      var button = addOverlayButton(parent, x, y, DEFAULT_OVERLAY_BUTTON_SIZE, DEFAULT_OVERLAY_BUTTON_SIZE, "\uf067", x + DEFAULT_OVERLAY_BUTTON_SIZE / 2, y + DEFAULT_OVERLAY_BUTTON_SIZE - 1, "green");

      button.on("click", function () {
          listOverlay.show(d3.select("#queryOverlay"), data, parent.translate.x + x, parent.translate.y + y);
        }
      );
      return button;
    }

    function addPositionButton(parent, callBack, x, y) {
      var button = addOverlayButton(parent, x, y, DEFAULT_OVERLAY_BUTTON_SIZE, DEFAULT_OVERLAY_BUTTON_SIZE, "\uf13d", x + DEFAULT_OVERLAY_BUTTON_SIZE / 2, y + DEFAULT_OVERLAY_BUTTON_SIZE - 1, "black");

      button.on("click", callBack);
      return button;
    }

    function addAndButton(parent, data, x, y) {

      var button = addOverlayButton(parent, x, y, AND_BUTTON_WIDTH, DEFAULT_OVERLAY_BUTTON_SIZE, "AND", x + AND_BUTTON_WIDTH / 2, y + DEFAULT_OVERLAY_BUTTON_SIZE - 2, "orange");

      button.on("click", function () {
          listOverlay.show(d3.select("#queryOverlay"), data, parent.translate.x + x, parent.translate.y + y);
        }
      );
      return button;
    }

    function addNotButton(parent, callBack, x, y) {

      var button = addOverlayButton(parent, x, y, NOT_BUTTON_WIDTH, DEFAULT_OVERLAY_BUTTON_SIZE, "NOT", x + NOT_BUTTON_WIDTH / 2, y + DEFAULT_OVERLAY_BUTTON_SIZE - 2, "red");

      button.on("click", callBack);
      return button;
    }

    function addOrButton(parent, data, x, y) {

      var button = addOverlayButton(parent, x, y, OR_BUTTON_WIDTH, DEFAULT_OVERLAY_BUTTON_SIZE, "OR", x + OR_BUTTON_WIDTH / 2, y + DEFAULT_OVERLAY_BUTTON_SIZE - 2, "lightblue");

      button.on("click", function () {
          listOverlay.show(d3.select("#queryOverlay"), data, parent.translate.x + x, parent.translate.y + y);
        }
      );
      return button;
    }

    function addBooleanButtons(parent, x, y, andData, orData, notCallBack) {
      addAndButton(parent, andData, x, y);
      addOrButton(parent, orData, x + AND_BUTTON_WIDTH, y);
      addNotButton(parent, notCallBack, x + AND_BUTTON_WIDTH + OR_BUTTON_WIDTH, y);
    }

    function addRemoveButton(element, x, y) {

      var button = addOverlayButton(element, x, y, DEFAULT_OVERLAY_BUTTON_SIZE, DEFAULT_OVERLAY_BUTTON_SIZE, "\uf00d", x + DEFAULT_OVERLAY_BUTTON_SIZE / 2, y + DEFAULT_OVERLAY_BUTTON_SIZE - 3, "red");

      button.on("click", function () {
          var parent = element.parent;
          parent.removeChild(parent.children.indexOf(element));


          if (parent instanceof PathContainer) {

            if (parent.children.length === 2) {
              parent.insert(1, new SequenceFiller(parent));
            }
          } else {

            while (typeof parent !== "undefined" && ((parent instanceof AndContainer || parent instanceof OrContainer && parent.children.length <= 1)
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
        container.add(new ElementConstructor(container))
      } else {
        container.updateParent();
      }

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

          var classname = relTarg.parentNode.className

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

    },

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
          y: 14
        }).text(initialText);

      domParent.append("foreignObject")
        .attr({
          x: 35,
          y: 2,
          width: 52,
          height: 20
        }).append("xhtml:div")
        .style("font", "10px 'Arial'")
        .html('<input type="text" placeholder="' + initialText + '" required="required" size="5px" width="5px" class="queryConstraint">');
    };

    ConstraintElement.prototype.getSize = function () {
      return {width: 92, height: 24};
    };

    //-------------------------------------------

    function EdgeConstraintElement(parent) {
      ConstraintElement.call(this, parent);
    }

    EdgeConstraintElement.prototype = Object.create(ConstraintElement.prototype);

    EdgeConstraintElement.prototype.addInput = function (domParent, initialText) {
      ConstraintElement.prototype.addInput.call(this, domParent, initialText);

      var that = this;

      $(domParent[0]).mouseenter(function () {
        var size = that.getSize();

        addBooleanButtons(that, (size.width - AND_BUTTON_WIDTH - OR_BUTTON_WIDTH - NOT_BUTTON_WIDTH) / 2, size.height - 5, [
            {
              text: "Add Set", callback: function () {
              replaceWithContainer(that, AndContainer, true, EdgeSetElement);
            }
            }],
          [{
            text: "Add Set", callback: function () {
              replaceWithContainer(that, OrContainer, false, EdgeSetElement);
            }
          }], function () {
            replaceWithContainer(that, NotContainer, false);
          }
        );

      });
    };

    //-------------------------------------------

    function NodeConstraintElement(parent) {
      ConstraintElement.call(this, parent);
    }

    NodeConstraintElement.prototype = Object.create(ConstraintElement.prototype);

    NodeConstraintElement.prototype.addInput = function (domParent, initialText) {
      ConstraintElement.prototype.addInput.call(this, domParent, initialText);

      var that = this;

      $(domParent[0]).mouseenter(function () {
        var size = that.getSize();

        addBooleanButtons(that, (size.width - AND_BUTTON_WIDTH - OR_BUTTON_WIDTH - NOT_BUTTON_WIDTH) / 2, size.height - 5, [{
            text: "Add Node Name", callback: function () {
              replaceWithContainer(that, AndContainer, true, NodeNameElement);
            }
          },
            {
              text: "Add Set", callback: function () {
              replaceWithContainer(that, AndContainer, true, NodeSetElement);
            }
            },
            {
              text: "Add Node Type", callback: function () {
              replaceWithContainer(that, AndContainer, true, NodeTypeElement);
            }
            }],
          [{
            text: "Add Node Name", callback: function () {
              replaceWithContainer(that, OrContainer, false, NodeNameElement);
            }
          },
            {
              text: "Add Set", callback: function () {
              replaceWithContainer(that, OrContainer, false, NodeSetElement);
            }
            },
            {
              text: "Add Node Type", callback: function () {
              replaceWithContainer(that, OrContainer, false, NodeTypeElement);
            }
            }], function () {
            replaceWithContainer(that, NotContainer, false);
          }
        );

      });
    };

//----------------------------------------

    function NodeNameElement(parent) {
      NodeConstraintElement.call(this, parent);
    }

    NodeNameElement.prototype = Object.create(NodeConstraintElement.prototype);

    NodeNameElement.prototype.init = function (domParent) {
      NodeConstraintElement.prototype.init.call(this, domParent);

      this.addInput(this.myDomElements, "Name");

      var that = this;

      var inputField = $(this.myDomElements[0]).find("input");
      inputField.autocomplete({
        minLength: 3,
        source: function (request, response) {
          var term = request.term;
          ServerSearch.search(term, 'name', '_Network_Node').then(function (results) {
            response(results);
          })
        },
        select: function (event, ui) {
          inputField.val(ui.item.label);
          that.id = ui.item.value;
          return false; // Prevent the widget from inserting the value.
        },
        focus: function (event, ui) {
          inputField.val(ui.item.label);
          that.id = ui.item.value;
          return false; // Prevent the widget from inserting the value.
        }
      });


      //inputField.on('autocompletechange change', function () {
      //  inputField.text(this.label);
      //  //$('#tagsname').html('You selected: ' + this.value);
      //});
    };

    NodeNameElement.prototype.getPathQuery = function () {
      var el = this.myDomElements.select("input");
      var val = $(el[0]).val();

      return new q.NodeNameConstraint(val);
    };


//-----------------------------------

    function getSetAutoComplete(inputField, element) {
      return {
        minLength: 3,
        source: function (request, response) {
          var term = request.term;
          ServerSearch.search(term, 'name', '_Set_Node').then(function (results) {
            response(results);
          })
        },
        select: function (event, ui) {
          inputField.val(ui.item.id);
          element.id = ui.item.value;
          return false; // Prevent the widget from inserting the value.
        },
        focus: function (event, ui) {
          inputField.val(ui.item.id);
          element.id = ui.item.value;
          return false; // Prevent the widget from inserting the value.
        }
      }
    }


    function NodeSetElement(parent) {
      NodeConstraintElement.call(this, parent);
    }

    NodeSetElement.prototype = Object.create(NodeConstraintElement.prototype);

    NodeSetElement.prototype.init = function (domParent) {
      NodeConstraintElement.prototype.init.call(this, domParent);

      this.addInput(this.myDomElements, "Set");

      var that = this;

      var inputField = $(this.myDomElements[0]).find("input");
      inputField.autocomplete(getSetAutoComplete(inputField, that));
    };

    NodeSetElement.prototype.getPathQuery = function () {
      var el = this.myDomElements.select("input");
      var val = $(el[0]).val();

      return new q.NodeSetPresenceConstraint(val);
    };

//-----------------------------------

    function NodeTypeElement(parent) {
      NodeConstraintElement.call(this, parent);

    }

    NodeTypeElement.prototype = Object.create(NodeConstraintElement.prototype);

    NodeTypeElement.prototype.init = function (domParent) {
      NodeConstraintElement.prototype.init.call(this, domParent);

      this.addInput(this.myDomElements, "Type");
    };

    NodeTypeElement.prototype.getPathQuery = function () {
      var el = this.myDomElements.select("input");
      var val = $(el[0]).val();

      return new q.NodeTypeConstraint(val);
    };

    //-----------------------------------

    function EdgeSetElement(parent) {
      EdgeConstraintElement.call(this, parent);
    }

    EdgeSetElement.prototype = Object.create(EdgeConstraintElement.prototype);

    EdgeSetElement.prototype.init = function (domParent) {
      EdgeConstraintElement.prototype.init.call(this, domParent);

      this.addInput(this.myDomElements, "Set");

      var that = this;

      var inputField = $(this.myDomElements[0]).find("input");
      inputField.autocomplete(getSetAutoComplete(inputField, that));
    };

    EdgeSetElement.prototype.getPathQuery = function () {
      var el = this.myDomElements.select("input");
      var val = $(el[0]).val();

      return new q.EdgeSetPresenceConstraint(val);
    };

//--------------------------------------

    function AndContainer(parent, horizontal) {
      CaptionContainer.call(this, parent, "AND", "#fed9a6", "black", horizontal || false);
      //ElementContainer.call(this, parent, horizontal || false);
      //this.vPadding = 0;
    }

    AndContainer.prototype = Object.create(CaptionContainer.prototype);

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
      CaptionContainer.call(this, parent, "NOT", "#fbb4ae", "black", horizontal || false);
      //ElementContainer.call(this, parent, horizontal || false);
      //this.vPadding = 0;
    }

    NotContainer.prototype = Object.create(CaptionContainer.prototype);

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
      CaptionContainer.call(this, parent, "OR", "#b3cde3", "black", horizontal || false);
      //ElementContainer.call(this, parent, horizontal || false);
      //this.vPadding = 0;
    }

    OrContainer.prototype = Object.create(CaptionContainer.prototype);


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
    function NodeContainer(parent) {
      CaptionContainer.call(this, parent, "", "rgb(200, 200, 200)", "rgb(30, 30, 30)", false);
      this.hasPosition = false;
    }

    NodeContainer.prototype = Object.create(CaptionContainer.prototype);

    NodeContainer.prototype.init = function (domParent) {
      CaptionContainer.prototype.init.call(this, domParent);

      var that = this;


      //Use jquery mouseenter and mouseleave to prevent flickering of add button
      $(this.myDomElements[0]).mouseenter(function () {
        var size = that.getSize();
        if (that.children.length <= 0) {

          addAddButton(that, [{
            text: "Add Node Name", callback: function () {
              that.add(new NodeNameElement(that));
              d3.select(this).remove();
            }
          },
            {
              text: "Add Set", callback: function () {
              that.add(new NodeSetElement(that));
              d3.select(this).remove();
            }
            },
            {
              text: "Add Node Type", callback: function () {
              that.add(new NodeTypeElement(that));
              d3.select(this).remove();
            }
            }], (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);

        }

        if (!that.hasPosition && !(that.parent instanceof UnorderedContainer)) {
          addPositionButton(that, function () {
            that.showPositionDialog();
          }, (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, 0);
        }

        if (!(that.hasPosition && (that.index === 0 || that.index === -1))) {
          addAddButton(that, [{
            text: "Add Node", callback: function () {
              var index = that.parent.children.indexOf(that);
              that.parent.insert(index + 1, new NodeContainer(that.parent));
              if (that.parent instanceof SequenceContainer) {
                that.parent.insert(index + 1, new SequenceFiller(that.parent));
              }
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
            }
          }], size.width - DEFAULT_OVERLAY_BUTTON_SIZE, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);
        }
      });
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

          addAddButton(that, [
            {
              text: "Add Set", callback: function () {
              that.add(new EdgeSetElement(that));
              d3.select(this).remove();
            }
            }
          ], (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);

        }

        addAddButton(that, [{
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
          }
        }, {
          text: "Add Edge", callback: function () {
            var index = that.parent.children.indexOf(that);

            that.parent.insert(index + 1, new EdgeContainer(that.parent));
            if (that.parent instanceof SequenceContainer) {
              that.parent.insert(index + 1, new SequenceFiller(that.parent));
            }
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
          addAddButton(that, [{
            text: "Add Node", callback: function () {
              that.add(new NodeContainer(that));
            }
          }, {
            text: "Add Edge", callback: function () {
              that.add(new EdgeContainer(that));
            }
          }], (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);
        }

        addBooleanButtons(that, (size.width - AND_BUTTON_WIDTH - OR_BUTTON_WIDTH - NOT_BUTTON_WIDTH) / 2, size.height - 5,
          [{
            text: "Add Unordered", callback: function () {
              replaceWithContainer(that, AndContainer, false, UnorderedContainer);
            }
          },
            {
              text: "Add Sequence", callback: function () {
              replaceWithContainer(that, AndContainer, false, SequenceContainer);
            }
            }],
          [{
            text: "Add Unordered", callback: function () {
              replaceWithContainer(that, OrContainer, false, UnorderedContainer);
            }
          },
            {
              text: "Add Sequence", callback: function () {
              replaceWithContainer(that, OrContainer, false, SequenceContainer);
            }
            }],
          function () {
            replaceWithContainer(that, NotContainer, false);
          }
        );

      });

    };

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
          addAddButton(that, [{
            text: "Add Sequence", callback: function () {
              that.parent.replace(that, new SequenceContainer(that.parent));
            }
          }, {
            text: "Add Unordered", callback: function () {
              that.parent.replace(that, new UnorderedContainer(that.parent));
            }
          }], (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);

        } else {
          addAddButton(that, [{
            text: "Add Node", callback: function () {
              var index = that.parent.children.indexOf(that);


              if (index === 0 && that.parent.children.length === 1) {
                that.parent.replace(that, new NodeContainer(that.parent));
                return;
              }

              if (index > 0 && index < that.parent.children.length - 1) {
                var prevChild = that.parent.children[index - 1];
                var nextChild = that.parent.children[index + 1];
                if (prevChild instanceof EdgeContainer && nextChild instanceof EdgeContainer) {
                  that.parent.replace(that, new NodeContainer(that.parent));
                  return;
                }
              }

              that.parent.insert(index, new NodeContainer(that.parent));
              that.parent.insert(index, new SequenceFiller(that.parent));
            }
          }, {
            text: "Add Edge", callback: function () {
              var index = that.parent.children.indexOf(that);

              if (index === 0 && that.parent.children.length === 1) {
                that.parent.replace(that, new EdgeContainer(that.parent));
                return;
              }

              if (index > 0 && index < that.parent.children.length - 1) {
                var prevChild = that.parent.children[index - 1];
                var nextChild = that.parent.children[index + 1];
                if (prevChild instanceof NodeContainer && nextChild instanceof NodeContainer) {
                  that.parent.replace(that, new EdgeContainer(that.parent));
                  return;
                }
              }

              that.parent.insert(index, new EdgeContainer(that.parent));
              that.parent.insert(index, new SequenceFiller(that.parent));
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

        addBooleanButtons(that, (size.width - AND_BUTTON_WIDTH - OR_BUTTON_WIDTH - NOT_BUTTON_WIDTH) / 2, size.height - 5,
          [{
            text: "Add Unordered", callback: function () {
              replaceWithContainer(that, AndContainer, false, UnorderedContainer);
            }
          }],
          [{
            text: "Add Unordered", callback: function () {
              replaceWithContainer(that, OrContainer, false, UnorderedContainer);
            }
          },
            {
              text: "Add Sequence", callback: function () {
              replaceWithContainer(that, OrContainer, false, SequenceContainer);
            }
            }],
          function () {
            replaceWithContainer(that, NotContainer, false);
          }
        );

      });
    };

    SequenceContainer.prototype.update = function () {

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

      CaptionContainer.prototype.update.call(this);
    }
    ;

    SequenceContainer.prototype.getPathQuery = function () {
      if (this.children.length === 0) {
        return new g.PathQuery();
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

      var nc1 = new NodeContainer(this);
      var nc2 = new NodeContainer(this);

      this.add(nc1);
      this.add(new SequenceFiller(this));
      this.add(nc2);
      nc1.setPosition(0);
      nc2.setPosition(-1);

      var that = this;

      $(this.myDomElements[0]).mouseenter(function () {
        var size = that.getSize();

        addOrButton(that, [{
          text: "Add Path", callback: function () {
            replaceWithContainer(that, OrContainer, false, PathContainer);
          }
        }], (size.width - OR_BUTTON_WIDTH) / 2, size.height - 5);

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
    }

    QueryView.prototype = Object.create(View.prototype);

    QueryView.prototype.getMinSize = function () {
      if (typeof this.container === "undefined") {
        return {width: 200, height: 100};
      }
      var containerSize = this.container.getSize();
      return {width: containerSize.width + 80, height: containerSize.height + 20};
    };

    QueryView.prototype.init = function () {
      //load content first
      $('#query_interface').load('query/view.html', this.initImpl.bind(this));
    };
    QueryView.prototype.initImpl = function () {
      View.prototype.init.call(this);
      var svg = d3.select(this.parentSelector + " svg");

      this.container = new ElementContainer();
      this.container.init(svg);
      this.container.add(new PathContainer(this.container));
      var that = this;

      svg.append("g")
        .attr("id", "queryOverlay");


      $('#filter_query').click(function () {
          var query = that.container.getPathQuery();

          pathQuery.set(query);
          return false;
        }
      );

      ServerSearch.on('query_done', function () {
        $('#query_interface button[type="submit"] i').attr('class', 'fa fa-search');
      });

      $('#query_interface form').on('submit', function (event) {
        event.stopPropagation();
        event.preventDefault();

        var k = +$('#at_most_k').val();
        var maxDepth = +$('#longest_path').val();
        var query = that.container.getPathQuery();

        $('#query_interface button[type="submit"] i').attr('class', 'fa fa-spinner fa-pulse');
        ServerSearch.loadQuery(query, k, maxDepth);

        return false;
      });
    };

    QueryView.prototype.updateViewSize = function () {

      var minSize = this.getMinSize();
      var viewParent = $("#pathQueryView");
      if (viewParent.height() < minSize.height && viewParent.height() < 300) {
        viewParent.height(Math.min(minSize.height + 10, 300));
      }
      View.prototype.updateViewSize.call(this);
    };

    var queryView = new QueryView();

    return queryView;

  }
)
;
