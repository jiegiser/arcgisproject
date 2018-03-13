/// <reference path="../jsapi_vsdoc12_v38.js" />

//添加 render 由于直接加载动态图层速度太慢，考虑是有SVG来绘制点与线，同时又一个动态过程的加载，

/*
    2014/8/27   9.24 添加 render 由于直接加载动态图层速度太慢，考虑是有SVG来绘制点与线，
                     同时又一个动态过程的加载(如车辆路径的行走过程以及自来水管道的流动)，还没有具体的过程，

    8/31        18.53 完成render line with SVG style with css ,use Attributes class break different feature(line)
                      根据相同过程可以对点以及面进行绘制。同时保证应用逻辑与事件逻辑的分离（方便工具，编辑等模块的调用）

    9/2         2.30  基本完成facilities waterworks pipe area  render  下面需要添加infowindow 
*/

define([
         "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/on",
         "dojo/dom",

         "esri/layers/FeatureLayer",

], function (
         declare,
         lang,
         on,
         dom,

         FeatureLayer
    ) {
    var myRender = declare(null, {
        options: {
            map:null,
            
            pointLayer: null,
            polylineLayer: null,
            waterworksLayer: null,
            areaLayer: null,

        },
        pointBreaks:[],
        lineBreaks: [],
        areaBreaks: [],

        pointClick: 0,
        polylineClick: 0,
        waterworksClick: 0,
        areaClick: 0,

        constructor: function (options) {
            var defaults = lang.mixin({}, this.options, options);
            this.options.map = defaults.map;
            this.options.pointLayer = defaults.pointLayer;
            this.options.polylineLayer = defaults.polylineLayer;
            this.options.waterworksLayer = defaults.waterworksLayer;
            this.options.areaLayer = defaults.areaLayer;

           
            // this.options.polylineLayer = new FeatureLayer("http://localhost:6080/arcgis/rest/services/guandao/FeatureServer/1",
            // {
            //        id: "polylineLayer",
            //        styling: false,
            //        dataAttributes: ["guanjing"]
            //  })
            // this.options.map.addLayer(this.options.polylineLayer);

            this.pointBreaks = [
                {
                    attribute:"pointBreak0",
                    value: "阀门",
                },
                {
                    attribute:"pointBreak1",
                    value: "管道井门",      
                },
                {
                    attribute:"pointBreak2",
                    value: "增压泵",
                },
            ];
            this.lineBreaks = [
                {
                    attribute:"lineBreak0",
                    value:100,      
                },
                {
                    attribute: "lineBreak1",
                    value: 200,
                },
                {
                    attribute: "lineBreak2",
                    value: 300,
                },
                {
                    attribute: "lineBreak3",
                    value: 500,
                },  
            ];

            this.areaBreaks = [
                {
                    attribute: "areaBreak0",
                    value:"武汉城区",
                },
                {
                    attribute: "areaBreak1",
                    value: "蔡甸区",
                },
                {
                    attribute: "areaBreak2",
                    value: "黄陂区",
                },
                {
                    attribute: "areaBreak3",
                    value: "新洲区",
                },
                {
                    attribute: "areaBreak4",
                    value: "汉南区",
                },
                {
                    attribute: "areaBreak5",
                    value: "东西湖区",
                },
                {
                    attribute: "areaBreak6",
                    value: "江夏区",
                },
          ]

           
            //this.polylineLayer = new FeatureLayer
        },
        startup: function () {
            on(dom.byId("pointLayer"), "click", lang.hitch(this, function () {
                if (this.pointClick === 0) {
                    this._addPoint();
                    this.pointClick = 1;
                } else if (this.pointClick === 1) {
                    this._removePoint();
                    this.pointClick = 0;
                }
                
            }));
            on(dom.byId("polylineLayer"), "click", lang.hitch(this, function () {
                if (this.polylineClick === 0) {
                    this._addPolyline();
                    this.polylineClick = 1;
                } else if (this.polylineClick === 1) {
                    this._removePolyline();
                    this.polylineClick = 0;
                }
                   
            }));
            on(dom.byId("waterworksLayer"), "click", lang.hitch(this, function () {
                if (this.waterworksClick === 0) {
                    this._addWaterworks();
                    this.waterworksClick = 1;
                } else if (this.waterworksClick === 1) {
                    this._removeWaterworks();
                    this.waterworksClick = 0;
                }
                
            }));
            on(dom.byId("areaLayer"), "click", lang.hitch(this, function () {
                if (this.areaClick === 0) {
                    this._addArea();
                    this.areaClick = 1;
                } else if (this.areaClick === 1) {
                    this._removeArea();
                    this.areaClick = 0;
                }
                
            }));


            
        },

        _addPoint: function () {
            if (this.options.pointLayer.surfaceType === "svg") {
                
                on(this.options.pointLayer, "graphic-draw", lang.hitch(this, function (evt) {
              
                    var tableAttr = evt.graphic.attributes.type;
                    var category;
                    //alert(tableAttr + ",," + this.pointBreaks[0].value);
                    if (tableAttr === this.pointBreaks[0].value) {
                        category = this.pointBreaks[0].attribute;
                    } else if (tableAttr === this.pointBreaks[1].value) {
                        category = this.pointBreaks[1].attribute;
                    } else if (tableAttr === this.pointBreaks[2].value) {
                        category = this.pointBreaks[2].attribute;
                    }  else {
                        category = this.pointBreaks[0].attribute;
                    }
                    //alert(category);
                    //evt.graphic.attributes.SIZE = 
                    evt.node.setAttribute("data-classbreak", category);
                }));
                this.options.map.addLayer(this.options.pointLayer);
            } else {
                alert("Your browser does not support SVG.\nPlease user a modern web browser that supports SVG.");
                //dom.byId("legend").innerHTML = "Your browser does not support SVG.";
            }
        },

        _addPolyline: function () {

            if (this.options.polylineLayer.surfaceType === "svg") {
            //alert(this.options.polylineLayer.name);
            on(this.options.polylineLayer, "graphic-draw", lang.hitch(this, function (evt) {
                //alert(this.options.polylineLayer.name);
                var tableAttr = evt.graphic.attributes.guanjing;
                //alert(this.lineBreaks[0].value);
                var category;
                if (tableAttr === this.lineBreaks[0].value) {
                    category = this.lineBreaks[0].attribute;
                } else if (tableAttr === this.lineBreaks[1].value) {
                    category = this.lineBreaks[1].attribute;
                } else if (tableAttr === this.lineBreaks[2].value) {
                    category = this.lineBreaks[2].attribute;
                } else if (tableAttr === this.lineBreaks[3].value) {
                    category = this.lineBreaks[3].attribute;
                }  else {
                    category = this.lineBreaks[0].attribute;
                }
                //alert(category);
                evt.node.setAttribute("data-classbreak", category);
            }));
            this.options.map.addLayer(this.options.polylineLayer);
            } else {
                alert("Your browser does not support SVG.\nPlease user a modern web browser that supports SVG.");
                //dom.byId("legend").innerHTML = "Your browser does not support SVG.";
            }

        },

        _addWaterworks: function () {
            if (this.options.waterworksLayer.surfaceType === "svg") {
                //alert(this.options.polylineLayer.name);
                on(this.options.waterworksLayer, "graphic-draw", lang.hitch(this, function (evt) {

                    evt.node.setAttribute("data-classbreak", "waterworks");

                }));
                this.options.map.addLayer(this.options.waterworksLayer);
            } else {
                alert("Your browser does not support SVG.\nPlease user a modern web browser that supports SVG.");
                //dom.byId("legend").innerHTML = "Your browser does not support SVG.";
            }

        },

        _addArea: function () {
           
            if (this.options.areaLayer.surfaceType === "svg") {
               
                on(this.options.areaLayer, "graphic-draw", lang.hitch(this, function (evt) {
                    
                    var tableAttr = evt.graphic.attributes.区名;
                    // alert(tableAttr+",,"+this.areaBreaks[0].value);
                    var category;
                    if (tableAttr === this.areaBreaks[0].value) {
                        category = this.areaBreaks[0].attribute;
                    } else if (tableAttr === this.areaBreaks[1].value) {
                        category = this.areaBreaks[1].attribute;
                    } else if (tableAttr === this.areaBreaks[2].value) {
                        category = this.areaBreaks[2].attribute;
                    } else if (tableAttr === this.areaBreaks[3].value) {
                        category = this.areaBreaks[3].attribute;
                    } else if (tableAttr === this.areaBreaks[4].value) {
                        category = this.areaBreaks[4].attribute;
                    } else if (tableAttr === this.areaBreaks[5].value) {
                        category = this.areaBreaks[5].attribute;
                    } else if (tableAttr === this.areaBreaks[6].value) {
                        category = this.areaBreaks[6].attribute;
                    } else {
                        category = this.areaBreaks[0].attribute;
                    }
                    //alert(category);
                    evt.node.setAttribute("data-classbreak", category);
                }));
                this.options.map.addLayer(this.options.areaLayer);
            } else {
                alert("Your browser does not support SVG.\nPlease user a modern web browser that supports SVG.");
                //dom.byId("legend").innerHTML = "Your browser does not support SVG.";
            }

        },
        _removePoint: function () {
            this.options.map.removeLayer(this.options.pointLayer);
        },

        _removePolyline: function () {
            this.options.map.removeLayer(this.options.polylineLayer);
        },

        _removeArea: function () {

            this.options.map.removeLayer(this.options.areaLayer);
        },
        _removeWaterworks: function () {

            this.options.map.removeLayer(this.options.waterworksLayer);
        }

    })
    return myRender;
})