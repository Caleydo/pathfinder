define(['jquery', 'd3', '../view', './querymodel', '../pathsorting', '../listeners', '../listoverlay'], function ($, d3, View, q, pathSorting, listeners, ListOverlay) {

    var listOverlay = new ListOverlay();

    var DEFAULT_OVERLAY_BUTTON_SIZE = 16;
    var OR_BUTTON_WIDTH = 24;
    var AND_BUTTON_WIDTH = 38;
    var CAPTION_SIZE = 10;

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

    function addAndButton(parent, data, x, y) {

      var button = addOverlayButton(parent, x, y, AND_BUTTON_WIDTH, DEFAULT_OVERLAY_BUTTON_SIZE, "AND", x + AND_BUTTON_WIDTH / 2, y + DEFAULT_OVERLAY_BUTTON_SIZE - 2, "orange");

      button.on("click", function () {
          listOverlay.show(d3.select("#queryOverlay"), data, parent.translate.x + x, parent.translate.y + y);
        }
      );
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

    function addRemoveButton(parent, x, y) {

      var button = addOverlayButton(parent, x, y, DEFAULT_OVERLAY_BUTTON_SIZE, DEFAULT_OVERLAY_BUTTON_SIZE, "\uf00d", x + DEFAULT_OVERLAY_BUTTON_SIZE / 2, y + DEFAULT_OVERLAY_BUTTON_SIZE - 3, "red");

      button.on("click", function () {
          parent.parent.removeChild(parent.parent.children.indexOf(parent));
          d3.select("#queryOverlay").selectAll("g.overlayButton")
            .remove();
        }
      );

      return button;
    }

    function BaseGUIElement(parent) {
      this.parent = parent;
      this.translate = {x: 0, y: 0};
      this.fillHorizontal = true;
      this.fillVertical = true;
    }

    BaseGUIElement.prototype = {
      init: function (domParent) {
        var that = this;
        this.rootElement = domParent.append("g")
          .classed("queryElement", true);

        this.myDomElements = this.rootElement.append("g")
          .classed("myDomElements", true);

        $(this.myDomElements[0]).mouseenter(function () {
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
      },

      getSize: function () {
        return {width: 100, height: 100};
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

      var posX = this.hPadding;
      var posY = this.vPadding;
      var that = this;

      this.children.forEach(function (child) {
        var childSize = child.getSize();
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
      return {width: 100, height: 100};
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

    //------------------------------------------

    function CaptionContainer(parent, caption, horizontal) {
      ElementContainer.call(this, parent, horizontal);
      this.caption = caption;
    }

    CaptionContainer.prototype = Object.create(ElementContainer.prototype);

    CaptionContainer.prototype.renderCaption = function (domParent) {
      this.myDomElements.append("text")
        .attr({
          x: 0,
          y: CAPTION_SIZE
        })
        .text(this.caption);
    };

    CaptionContainer.prototype.update = function () {

      var posX = this.hPadding;
      var posY = this.vPadding + CAPTION_SIZE;
      var that = this;

      this.children.forEach(function (child) {
        var childSize = child.getSize();
        child.rootElement.attr("transform", "translate(" + posX + ", " + posY + ")");
        child.translate.x = that.translate.x + posX;
        child.translate.y = that.translate.y + posY;
        child.update();
        if (that.horizontal) {
          posX += childSize.width + that.elementSpacing;
          ;
        } else {
          posY += childSize.height + that.elementSpacing;
          ;
        }
      });
    };

    CaptionContainer.prototype.getSize = function () {

      var minSize = this.getMinSize();
      var childSize = this.calcChildSize();

      return {
        width: Math.max(childSize.width, minSize.width) + this.hPadding * 2,
        height: Math.max(childSize.height, minSize.height) + this.vPadding * 2 + CAPTION_SIZE
      };
    };

    //-------------------------------------------

    function NodeConstraintElement(parent) {
      BaseGUIElement.call(this, parent);
    }

    NodeConstraintElement.prototype = Object.create(BaseGUIElement.prototype);

    NodeConstraintElement.prototype.addInput = function (domParent, initialText) {

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

      var that = this;

      function replaceWithContainer(ContainerConstructor, isContainerHorizontal, ElementConstructor) {
        var container = new ContainerConstructor(that.parent, isContainerHorizontal);
        that.parent.replace(that, container)
        that.parent = container;
        container.add(that);
        container.add(new ElementConstructor(container))
      }

      $(domParent[0]).mouseenter(function () {


        addAndButton(that, [{
          text: "Add Node Name", callback: function () {
            replaceWithContainer(AndContainer, true, NodeNameElement);
          }
        },
          {
            text: "Add Set", callback: function () {
            replaceWithContainer(AndContainer, true, NodeSetElement);
          }
          },
          {
            text: "Add Node Type", callback: function () {
            replaceWithContainer(AndContainer, true, NodeTypeElement);
          }
          }], size.width - AND_BUTTON_WIDTH, size.height - 5);

        addOrButton(that, [{
          text: "Add Node Name", callback: function () {
            replaceWithContainer(OrContainer, false, NodeNameElement);
          }
        },
          {
            text: "Add Set", callback: function () {
            replaceWithContainer(OrContainer, false, NodeSetElement);
          }
          },
          {
            text: "Add Node Type", callback: function () {
            replaceWithContainer(OrContainer, false, NodeTypeElement);
          }
          }], (size.width - OR_BUTTON_WIDTH) / 2, size.height - 5);


      });


      //$(domParent[0]).mouseleave(function () {
      //
      //  d3.select("#queryOverlay").selectAll("g.overlayButton")
      //    .remove();
      //});
    }

    NodeConstraintElement.prototype.getSize = function () {
      return {width: 92, height: 24};
    };

//----------------------------------------

    function NodeNameElement(parent) {
      NodeConstraintElement.call(this, parent);
    }

    NodeNameElement.prototype = Object.create(NodeConstraintElement.prototype);

    NodeNameElement.prototype.init = function (domParent) {
      NodeConstraintElement.prototype.init.call(this, domParent);

      this.addInput(this.myDomElements, "Name");
    };

    NodeNameElement.prototype.getPathQuery = function () {
      var el = this.myDomElements.select("input");
      var val = $(el[0]).val();

      return new q.NodeNameConstraint(val);
    };


//-----------------------------------

    function NodeSetElement(parent) {
      NodeConstraintElement.call(this, parent);
    }

    NodeSetElement.prototype = Object.create(NodeConstraintElement.prototype);

    NodeSetElement.prototype.init = function (domParent) {
      NodeConstraintElement.prototype.init.call(this, domParent);

      this.addInput(this.myDomElements, "Set");
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

//--------------------------------------

    function AndContainer(parent, horizontal) {
      CaptionContainer.call(this, parent, "AND", horizontal || false);
      //ElementContainer.call(this, parent, horizontal || false);
      //this.vPadding = 0;
    }

    AndContainer.prototype = Object.create(CaptionContainer.prototype);

    AndContainer.prototype.init = function (domParent) {
      CaptionContainer.prototype.init.call(this, domParent);

      var that = this;

      var size = this.getSize();

      this.myDomElements.append("rect")
        .classed("andContainerBg", true)
        .attr({
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          fill: "orange",
          stroke: "black"
        });

      this.renderCaption(this.myDomElements);
    };

    AndContainer.prototype.getMinSize = function () {
      return {width: 40, height: 40};
    }

    AndContainer.prototype.update = function () {
      CaptionContainer.prototype.update.call(this);

      var size = this.getSize();
      this.myDomElements.select("rect.andContainerBg")
        .transition()
        .attr({
          width: size.width,
          height: size.height
        });
    };

    AndContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.And(new q.PathQuery(), new q.PathQuery());
      } else if (this.children.length == 1) {
        return new q.And(this.children[0].getPathQuery(), new q.PathQuery());
      }
      return new q.And(this.children[0].getPathQuery(), this.children[1].getPathQuery());
    };


    //--------------------------

    function OrContainer(parent, horizontal) {
      CaptionContainer.call(this, parent, "OR", horizontal || false);
      //ElementContainer.call(this, parent, horizontal || false);
      //this.vPadding = 0;
    }

    OrContainer.prototype = Object.create(CaptionContainer.prototype);

    OrContainer.prototype.init = function (domParent) {
      CaptionContainer.prototype.init.call(this, domParent);

      var that = this;

      var size = this.getSize();

      this.myDomElements.append("rect")
        .classed("orContainerBg", true)
        .attr({
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          fill: "lightblue",
          stroke: "black"
        });

      this.renderCaption(this.myDomElements);
    };

    OrContainer.prototype.getMinSize = function () {
      return {width: 40, height: 40};
    }

    OrContainer.prototype.update = function () {
      CaptionContainer.prototype.update.call(this);

      var size = this.getSize();
      this.myDomElements.select("rect.orContainerBg")
        .transition()
        .attr({
          width: size.width,
          height: size.height
        });
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
      ElementContainer.call(this, parent, true);
    }

    NodeContainer.prototype = Object.create(ElementContainer.prototype);

    NodeContainer.prototype.init = function (domParent) {
      ElementContainer.prototype.init.call(this, domParent);

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

        addAddButton(that, [{
          text: "Add Node", callback: function () {
            var index = that.parent.children.indexOf(that);
            that.parent.insert(index + 1, new NodeContainer(that.parent));
            that.parent.insert(index + 1, new SequenceFiller(that.parent));
          }
        }, {
          text: "Add Edge", callback: function () {
            var index = that.parent.children.indexOf(that);

            if (index < that.parent.children.length - 1) {
              var nextChild = that.parent.children[index + 1];
              if (!(nextChild instanceof SequenceFiller)) {
                that.parent.insert(index + 1, new SequenceFiller(that.parent));
              }
            }
            that.parent.insert(index + 1, new EdgeContainer(that.parent));
          }
        }], size.width - DEFAULT_OVERLAY_BUTTON_SIZE, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);
      });


      //$(this.myDomElements[0]).mouseleave(function () {
      //  d3.select("#queryOverlay").selectAll("g.overlayButton")
      //    .remove();
      //});

      var size = this.getSize();

      this.myDomElements.append("rect")
        .classed("nodeContainerBg", true)
        .attr({
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          fill: "gray",
          stroke: "black"
        });
    };


    NodeContainer.prototype.update = function () {
      ElementContainer.prototype.update.call(this);

      var size = this.getSize();
      this.myDomElements.selectAll("rect.nodeContainerBg")
        .transition()
        .attr({
          width: size.width,
          height: size.height
        });
    };

    NodeContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.NodeMatcher(new q.Constraint());
      }
      return new q.NodeMatcher(this.children[0].getPathQuery());
    };

    //---------------------------------------------

    function EdgeContainer(parent) {
      ElementContainer.call(this, parent, true);
    }

    EdgeContainer.prototype = Object.create(ElementContainer.prototype);

    EdgeContainer.prototype.init = function (domParent) {
      ElementContainer.prototype.init.call(this, domParent);

      var that = this;

      var size = this.getSize();

      this.myDomElements.append("rect")
        .classed("nodeContainerBg", true)
        .attr({
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          fill: "white",
          stroke: "black"
        });

      this.myDomElements.append("line")
        .attr({
          x1: 5,
          y1: size.height / 2,
          x2: size.width - 5,
          y2: size.height / 2,
          "stroke-width": "5px",
          stroke: "black"
        });

      $(this.myDomElements[0]).mouseenter(function () {

        addAddButton(that, [{
          text: "Add Node", callback: function () {
            var index = that.parent.children.indexOf(that);

            if (index < that.parent.children.length - 1) {
              var nextChild = that.parent.children[index + 1];
              if (!(nextChild instanceof SequenceFiller)) {
                that.parent.insert(index + 1, new SequenceFiller(that.parent));
              }
            }
            that.parent.insert(index + 1, new NodeContainer(that.parent));
          }
        }, {
          text: "Add Edge", callback: function () {
            var index = that.parent.children.indexOf(that);

            that.parent.insert(index + 1, new EdgeContainer(that.parent));
            that.parent.insert(index + 1, new SequenceFiller(that.parent));
          }
        }], size.width - DEFAULT_OVERLAY_BUTTON_SIZE, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);

      });

      //$(this.myDomElements[0]).mouseleave(function () {
      //  d3.select("#queryOverlay").selectAll("g.overlayButton")
      //    .remove();
      //});
    };

    EdgeContainer.prototype.update = function () {
      ElementContainer.prototype.update.call(this);

      var size = this.getSize();
      this.myDomElements.selectAll("rect.nodeContainerBg")
        .transition()
        .attr({
          width: size.width,
          height: size.height
        });
    };

    EdgeContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.EdgeMatcher(new q.Constraint());
      }
      return new q.EdgeMatcher(this.children[0].getPathQuery());
    };


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
          fill: "white",
          stroke: "black"
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

        addAddButton(that, [{
          text: "Add Node", callback: function () {
            var index = that.parent.children.indexOf(that);

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

    function SequenceContainer(parent) {
      ElementContainer.call(this, parent, true);
    }

    SequenceContainer.prototype = Object.create(ElementContainer.prototype);

    SequenceContainer.prototype.init = function (parent) {
      ElementContainer.prototype.init.call(this, parent);
      this.add(new NodeContainer(this));
      this.add(new SequenceFiller(this));
      this.add(new NodeContainer(this));
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

      ElementContainer.prototype.update.call(this);
    }
    ;

    SequenceContainer.prototype.getPathQuery = function () {
      if (this.children.length === 0) {
        return new g.PathQuery();
      } else if (this.children.length === 1) {
        return this.children[0].getPathQuery();
      }

      var prevQuery = 0;
      var prevChild = 0;

      for (var i = 0; i < this.children.length; i++) {
        var child = this.children[i];
        if (!(child instanceof SequenceFiller)) {
          var currentQuery = child.getPathQuery();

          if (prevQuery != 0) {

            if (prevChild instanceof SequenceFiller) {
              prevQuery = new q.QueryMatchRegionRelation(prevQuery, currentQuery, q.MatchRegionRelations.greater);
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


    function QueryView(selector) {
      View.call(this, selector);
      this.grabHSpace = false;
      this.grabVSpace = false;
    }

    QueryView.prototype = Object.create(View.prototype);

    QueryView.prototype.getMinSize = function () {
      return {width: 800, height: 200};
    };

    QueryView.prototype.init = function () {
      View.prototype.init.call(this);
      var svg = d3.select(this.parentSelector + " svg");
      d3.select(this.parentSelector).append("button")
        .text("Update")
        .on("click", function () {
          var pathQuery = container.getPathQuery();
          pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getPathQueryStrategy(pathQuery));
          listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
          listeners.notify(listeners.updateType.QUERY_UPDATE, pathQuery);
        });

      var container = new SequenceContainer();
      container.init(svg);
      container.update();

      svg.append("g")
        .attr("id", "queryOverlay")
    };

    return QueryView;

  }
)
;
