define(["d3", "jquery", "./listoverlay"], function (d3, $, ListOverlay) {


    var listOverlay = new ListOverlay();

    return {

        NORMAL_BUTTON_SIZE: 16,
        SMALL_BUTTON_SIZE: 10,

        getClampedText: function (text, maxLength) {
            if (text.length > maxLength) {
                return text.substring(0, maxLength);
            }
            return text;
        },

        formatNumber: function (num, maxDecimals) {

            maxDecimals = maxDecimals === 0 ? 0 : (maxDecimals || 4);


            var match = ('' + num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
            if (!match) {
                return 0;
            }
            var decimals = Math.max(
                0,
                // Number of digits right of decimal point.
                (match[1] ? match[1].length : 0)
                    // Adjust for scientific notation.
                - (match[2] ? +match[2] : 0));

            var formatter = d3.format("." + Math.min(decimals, maxDecimals) + "f");
            return formatter(num);
        },


        createTemporalOverlayButton: function (parent, callBack, text, x, y, small, isPermanentBehavior, tooltip) {
            var that = this;

            var onMouseLeave = function () {
                //FIXME assumes only one overlayButton for the parent
                parent.selectAll("g.overlayButton").remove();
            };

            var onMouseEnter = function () {
                var button = that.addOverlayButton(parent, x, y, small ? that.SMALL_BUTTON_SIZE : that.NORMAL_BUTTON_SIZE, small ? that.SMALL_BUTTON_SIZE : that.NORMAL_BUTTON_SIZE, text, 7, small ? that.SMALL_BUTTON_SIZE : that.NORMAL_BUTTON_SIZE, "rgb(30, 30, 30)", false, tooltip);
                var isPermanent = false;

                button.classed("smallButton", small)
                    .on("click.overlay", function () {

                        if (isPermanentBehavior) {
                            callBack(isPermanent);
                            isPermanent = !isPermanent;
                            if (!isPermanent) {
                                button.remove();
                                $(parent[0]).on("mouseenter.overlay", onMouseEnter);
                                $(parent[0]).on("mouseleave.overlay", onMouseLeave);
                            } else {
                                $(parent[0]).off("mouseenter.overlay");
                                $(parent[0]).off("mouseleave.overlay");
                            }
                        } else {
                            callBack();
                            button.remove();
                        }


                        d3.event.stopPropagation();
                    });

            }

            $(parent[0]).on("mouseenter.overlay", onMouseEnter);
            $(parent[0]).on("mouseleave.overlay", onMouseLeave);
        },

        createTemporalMenuOverlayButton: function (parent, x, y, small, items) {
            this.createTemporalOverlayButton(parent, function () {

                if (typeof items === "function") {
                    listOverlay.setItems(items());
                } else {
                    listOverlay.setItems(items);
                }

                listOverlay.show();
                //listOverlay.show(svg, coordinates[0], coordinates[1]);
            }, "\uf013", x, y, small);
        },

        showListOverlay: function (items) {
            if (typeof items === "function") {
                listOverlay.setItems(items());
            } else {
                listOverlay.setItems(items);
            }

            listOverlay.show();
        },

        addOverlayButton: function (parent, x, y, width, height, buttonText, textX, textY, color, showBg, tooltip) {

            var button = parent.append("g")
                .classed("overlayButton", true)
                .attr({
                    transform: "translate(" + (x) + "," + (y) + ")"
                });

            if (showBg) {
                button.append("rect")
                    .attr({
                        x: 0,
                        y: 0,
                        width: width,
                        height: height
                    });
            }

            button.append("text")
                .attr({
                    x: textX,
                    y: textY
                })
                .style({
                    fill: color
                })
                .text(buttonText);

            if (typeof tooltip !== "undefined") {
                button.append("title").text((typeof tooltip === "function") ? tooltip() : tooltip.toString());
            }

            return button;
        },

        appendBars: function (parent, values, scale, barHeight, color, name, addAxis, addBackground) {

            var that = this;
            var vals = values instanceof Array ? values : [values];
            var posY = 0;

            if (addBackground) {
                parent.append("rect")
                    .classed("valueBg", true)
                    .attr({
                        x: 0,
                        y: -5,
                        width: scale.range()[1],
                        height: vals.length * barHeight + 10
                    })
                    .style({
                        fill: "white"
                    });
            }

            vals.forEach(function (value) {
                var bar = parent.append("g")
                    .classed("bar", true);
                bar.append("rect")
                    .classed("valueBg", true)
                    .attr({
                        x: 0,
                        y: posY,
                        width: scale.range()[1],
                        height: barHeight
                    })
                    .style({
                        fill: "white"
                    });

                var x = (0 < scale.domain()[0] || 0 > scale.domain[1]) ? scale(scale.domain()[0]) : (value < 0 ? scale(value) : scale(0));
                var width = Math.abs((0 < scale.domain()[0] ? scale(scale.domain()[0]) : (0 > scale.domain()[1] ? scale(scale.domain()[1]) : scale(0))) - scale(value));

                bar.append("rect")
                    .classed("value", true)
                    .attr({
                        x: x,
                        y: posY,
                        fill: color,
                        width: width,
                        height: barHeight
                    });

                bar.append("rect")
                    .classed("valueFrame", true)
                    .attr({
                        x: 0,
                        y: posY,
                        width: scale.range()[1],
                        height: barHeight
                    })
                    .style({
                        "shape-rendering": "crispEdges",
                        fill: "rgba(0,0,0,0)",
                        stroke: "rgb(80,80,80)"
                    });

                bar.append("line")
                    .classed("zero", true)
                    .attr({
                        x1: scale(0),
                        y1: posY - 4,
                        x2: scale(0),
                        y2: posY + barHeight + 4
                    })
                    .style({
                        "opacity": (scale.domain()[0] < 0 && scale.domain()[1] > 0) ? 1 : 0,
                        "shape-rendering": "crispEdges",
                        stroke: "rgb(80,80,80)"
                    });

                bar.append("title").text(name + ": " + that.formatNumber(value));

                posY += barHeight;
            });

            if (addAxis) {
                var xAxis = d3.svg.axis()
                    .scale(scale)
                    .orient("bottom")
                    .tickValues([scale.domain()[0], scale.domain()[1]])
                    //.tickFormat(d3.format(".2f"))
                    .tickSize(3, 3);
                parent
                    .append("g")
                    .classed("barAxis", true)
                    .attr({
                        transform: "translate(" + 0 + "," + posY + ")"
                    })
                    .call(xAxis);
            }
        }


    }
});
