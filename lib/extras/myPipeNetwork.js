/// <reference path="myTools.js" />
/// <reference path="../jsapi_vsdoc12_v38.js" />

/*


*/

define([
         "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/_base/Color",
         "dojo/_base/array",
         "dojo/on",

         "dojo/dom",
         "dojo/dom-construct",
         "dojo/number",
         "dgrid/Grid",

         "esri/lang",
         "esri/units",
         "esri/urlUtils",
         "esri/graphic",
         "esri/layers/FeatureLayer",
         "esri/layers/GraphicsLayer",
         "esri/renderers/SimpleRenderer",

         "esri/geometry/Point",
         "esri/geometry/Polyline",
         "esri/geometry/Polygon",
         "esri/symbols/PictureMarkerSymbol",
         "esri/symbols/SimpleMarkerSymbol",
         "esri/symbols/SimpleLineSymbol",
         "esri/symbols/SimpleFillSymbol",


         "esri/toolbars/draw",
         "esri/tasks/FeatureSet",
         "esri/tasks/RouteTask",
         "esri/tasks/RouteParameters",

         "esri/tasks/ServiceAreaTask",
         "esri/tasks/ServiceAreaParameters",

         "esri/tasks/ClosestFacilityTask",
         "esri/tasks/ClosestFacilityParameters",

         "esri/tasks/GeometryService",
         "esri/tasks/AreasAndLengthsParameters",
         "esri/tasks/LengthsParameters",

         "dijit/registry",
         "dijit/layout/BorderContainer",
         "dijit/layout/ContentPane",
         "dijit/form/HorizontalRule",
         "dijit/form/HorizontalRuleLabels",
         "dijit/form/HorizontalSlider",
], function (
         declare,
         lang,
         Color,
         arrayUtils,
         on,

         dom,
         domConstruct,
         number,
         Grid,

         esriLang,
         esriUnits,
         urlUtils,
         Graphic,
         FeatureLayer,
         GraphicsLayer,
         SimpleRenderer,

         Point,
         Polyline,
         Polygon,
         PictureMarkerSymbol,
         SimpleMarkerSymbol,
         SimpleLineSymbol,
         SimpleFillSymbol,

         Draw,
         FeatureSet,
         RouteTask,
         RouteParameters,

         ServiceAreaTask,
         ServiceAreaParameters,

         ClosestFacilityTask,
         ClosestFacilityParameters,

         GeometryService,
         AreasAndLengthsParameters,
         LengthsParameters,


         registry
    ) {

    var myTools = declare(null, {
        options: {
            map: null,
            geometryService: null,
            pointLayer: null,
            gpointLayer: null,
            render: null,
           
        },
        FuncID: null,
        infoTemplate: null,
        drawToolbar: null,
        inputPoints: [],
        routeTask: null,
        stopSymbol: null,
        barrierSymbol: null,
        routeParams: null,
        saParams: null,
        directionFeatures: null,
        routeData: [],
        routeGrid: null,
        routesGrid: null,
        segmentGraphic: null,
        //featurePoint: null,
        //featureSPoints: null,
        routeGraphicLayer: null,
        closestFacilityTask: null,

        constructor: function (options) {
            var defaults = lang.mixin({}, this.options, options);
            this.options.map = defaults.map;
            this.options.pointLayer = defaults.pointLayer;
            this.options.gpointLayer = defaults.gpointLayer;
            this.options.render = defaults.render;
            

            this.drawToolbar = new Draw(this.options.map);

            this.routeTask = new RouteTask("http://localhost:6080/arcgis/rest/services/pipeNetwork/NAServer/route");

            this.serviceAreaTask = new ServiceAreaTask("http://localhost:6080/arcgis/rest/services/pipeNetwork/NAServer/serverArea");

            this.closestFacilityTask = new ClosestFacilityTask("http://localhost:6080/arcgis/rest/services/pipeNetwork/NAServer/closest");

            this.stopSymbol = new PictureMarkerSymbol({
                "angle": 0,
                "xoffset": 0,
                "yoffset": 10,
                "type": "esriPMS",
                "url": "../../src/resource/images/routeStop1.png",
                "width": 24,
                "height": 24
            });

            this.barrierSymbol = new PictureMarkerSymbol({
                "angle": 0,
                "xoffset": 0,
                "yoffset": 12,
                "type": "esriPMS",
                "url": "../../src/resource/images/routeStop2.png",
                "width": 24,
                "height": 24
            });

        },

        startup: function () {
     



            dojo.connect(this.drawToolbar, "onDrawEnd", lang.hitch(this, function (geometry) {
                //alert("drawEnd");
                //this._clear();
                //this._measurement(geometry);

                //显示
                if (geometry.type === "polygon") {
                    var polygonSymbol = new SimpleFillSymbol(
                         SimpleFillSymbol.STYLE_SOLID,
                         new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 1),
                         new Color([255, 255, 0, 0.25])
                    );
                    var barrierPolygon = this.options.map.graphics.add(new Graphic(geometry, polygonSymbol));

                    if (this.FuncID === 5) {
                        this.routeParams.polygonBarriers.features.push(barrierPolygon);
                    }

                }
                if (geometry.type === "polyline") {
                    var lineSymbol = new SimpleLineSymbol();
                    lineSymbol.style = SimpleLineSymbol.STYLE_SHORTDOT;
                    lineSymbol.setColor(new Color([255, 0, 0]));
                    lineSymbol.setWidth(5);
                    var barrierPolyline = this.options.map.graphics.add(new Graphic(geometry, lineSymbol));
                    if (this.FuncID === 4) {
                        this.routeParams.polylineBarriers.features.push(barrierPolyline);
                    }
                }
                if (geometry.type === "point" && this.FuncID === 3) {
                    //alert("pointBarrier2");
                    var that = this.barrierSymbol
                    var barrier = this.options.map.graphics.add(new Graphic(geometry, that));
                    this.routeParams.barriers.features.push(barrier);
                }

            }));

            on(this.options.map, "click", lang.hitch(this, function (evt) {


                if (this.FuncID === 2) {
                    //显示
                    this.drawToolbar.deactivate();
                    var stop = this.options.map.graphics.add(new Graphic(evt.mapPoint, this.stopSymbol));
                    this.routeParams.stops.features.push(stop);

                    if (this.routeParams.stops.features.length >= 2) {
                        this.routeTask.solve(this.routeParams, lang.hitch(this, lang.hitch(this, function (e) { this._showRoute(e.routeResults[0].directions) })), lang.hitch(this, this._routeError));
                        
                        this.lastStop = this.routeParams.stops.features.splice(0, 1)[0];
                    }
                }

                //服务区
                if (this.FuncID === 6) {

                    this.inputPoints.push(evt.mapPoint);
                    this._serverArea(this.inputPoints);
                }

                if (this.FuncID === 7) {
                    this.options.map.graphics.clear();
                    this.routeGraphicLayer.clear();
                    this._closetFacility(evt.mapPoint);
                }

            }));


            // Measurement End

            // route task
            on(dom.byId("piperouteTask"), "click", lang.hitch(this, function () {
                dom.byId("query").style.display = "none";
                dom.byId("serviceArea").style.display = "none";
                dom.byId("closestFacility").style.display = "none";
                dom.byId("network").style.display = "none";
                dom.byId("pipeserviceArea").style.display = "none";
                dom.byId("pipeclosestFacility").style.display = "none";
                dom.byId("pipenetwork").style.display = "block";


                //RouteParameters
                this.routeParams = new RouteParameters();
                this.routeParams.stops = new FeatureSet();
                this.routeParams.barriers = new FeatureSet();
                this.routeParams.polylineBarriers = new FeatureSet();
                this.routeParams.polygonBarriers = new FeatureSet();
                this.routeParams.returnDirections = true;
                this.routeParams.directionsLengthUnits = esriUnits.METERS;
                this.routeParams.outSpatialReference = { "wkid": 102100 };
                //表格
                this.routeGrid = new Grid({
                    renderRow: this._renderList,
                    showHeader: false
                }, "piperouteGrid");

            }));

            on(dom.byId("addpipePoint"), "click", lang.hitch(this, function () {
                this.FuncID = 2;

            }));

            on(dom.byId("clearPipeNW"), "click", lang.hitch(this, function () {
                this._clear();
            }));

            on(dom.byId("pipePoint"), "click", lang.hitch(this, function () {
                this.FuncID = 3;
                this.drawToolbar.activate(Draw.POINT);
            }));

            on(dom.byId("pipeLine"), "click", lang.hitch(this, function () {
                this.FuncID = 4;
                this.drawToolbar.activate(Draw.POLYLINE)
            }));

            on(dom.byId("pipePolygon"), "click", lang.hitch(this, function () {
                this.FuncID = 5;
                this.drawToolbar.activate(Draw.POLYGON)
                //alert(dom.byId("polygonBarrier").innerHTML);
            }));

  
            on(dom.byId("pipeserviceAreaTask"), "click", lang.hitch(this, function () {
                dom.byId("query").style.display = "none";
                dom.byId("network").style.display = "none";
                dom.byId("closestFacility").style.display = "none";
                dom.byId("serviceArea").style.display = "none";
                
                dom.byId("pipeclosestFacility").style.display = "none";
                dom.byId("pipenetwork").style.display = "none";
                dom.byId("pipeserviceArea").style.display = "block";
                //this.options.render._addWaterworks();
                this.options.map.addLayer(this.options.gpointLayer);
                //ServiceAreaParameters
                this.saParams = new ServiceAreaParameters();
                this.saParams.facilities = new FeatureSet();
                this.saParams.defaultBreaks = [1000];
                this.saParams.outSpatialReference = this.options.map.spatialReference;
                this.saParams.impedanceAttribute = "distance"
                //this.saParams.trimPolygonDistanceUnits
                this.saParams.returnFacilities = false;
            }))

            on(dom.byId("pipeServerPoint"), "click", lang.hitch(this, function () {
                this.FuncID = 6;
            }))
            //获取水厂点坐标
            on(dom.byId("pipeServerM"), "click", lang.hitch(this, function () {

                for (var i = 0; i < this.options.gpointLayer.graphics.length; i++) {

                    this.inputPoints.push(this.options.gpointLayer.graphics[i].geometry);
                }

                //this.saParams.facilities.features = this.featurePoint.graphics;
                this._serverArea(this.inputPoints)
            }))

            //ServiceAreaTask
            on(registry.byId("pipehslider"), "change", lang.hitch(this, function () {
                var hSlider = registry.byId("pipehslider");
                var label = dom.byId("pipetime");
                // Update label
                label.innerHTML = hSlider.get("value");
                this.saParams.defaultBreaks = [hSlider.value];

                if (typeof this.inputPoints !== undefined) {
                    //alert(this.inputPoints[0].spatialReference.wkid);
                    this._serverArea(this.inputPoints);
                };
            }))

            on(dom.byId("clearpipeService"), "click", lang.hitch(this, function () {
                this._clear();

            }))
            on(dom.byId("clearpipeCfTask"), "click", lang.hitch(this, function () {
                //this._clear();
                if (this.pipesGrid) {
                    this.pipesGrid.refresh();
                }
                //this.routesGrid = null;
                this.cfParams = null;
                this.routeGraphicLayer.clear();
                this.options.map.graphics.clear();

            }))
            on(dom.byId("pipeclosestFacilityTask"), "click", lang.hitch(this, function () {

                this.FuncID = 7;
                dom.byId("query").style.display = "none";
                dom.byId("network").style.display = "none";
                dom.byId("serviceArea").style.display = "none";
                dom.byId("closestFacility").style.display = "none";
                dom.byId("pipenetwork").style.display = "none";
                dom.byId("pipeserviceArea").style.display = "none";
                dom.byId("pipeclosestFacility").style.display = "block";


                this.pipesGrid = new Grid({
                    renderRow: this._renderList,
                    showHeader: false
                }, "pipesGrid");

                this.cfParams = new ClosestFacilityParameters();
                this.cfParams.impedenceAttribute = "distance";
                //this.cfParams.defaultCutoff = 100.0;
                this.cfParams.returnIncidents = false;
                this.cfParams.returnFacilities = true;
                this.cfParams.returnRoutes = true;
                this.cfParams.returnDirections = true;
                this.cfParams.outSpatialReference = this.options.map.spatialReference;
                this.cfParams.facilities = new FeatureSet();
                this.cfParams.incidents = new FeatureSet();

                var facilityPointSymbol = new SimpleMarkerSymbol(
                   SimpleMarkerSymbol.STYLE_SQUARE,
                   20,
                   new SimpleLineSymbol(
                     SimpleLineSymbol.STYLE_SOLID,
                     new Color([89, 95, 35]), 2
                   ),
                   new Color([130, 159, 83, 0.40])
                 );


                this.routeGraphicLayer = new GraphicsLayer();

                var routePolylineSymbol = new SimpleLineSymbol(
                  SimpleLineSymbol.STYLE_SOLID,
                  new Color([89, 95, 35]),
                  4.0
                );
                var routeRenderer = new SimpleRenderer(routePolylineSymbol);
                this.routeGraphicLayer.setRenderer(routeRenderer);
                this.options.map.addLayer(this.routeGraphicLayer);

                //alert(this.options.pointLayer.graphics.length);
                for (var i = 0; i < this.options.pointLayer.graphics.length; i++) {
                    var location = new Graphic(this.options.pointLayer.graphics[i].geometry);
                    this.cfParams.facilities.features.push(location);
                }
            }))

            on(registry.byId("pipenumLocations"), "change", lang.hitch(this, function () {
                this.cfParams.defaultTargetFacilityCount = registry.byId("pipenumLocations").value;
   
            }))


        },

       
        _clear: function () {
            this.drawToolbar.deactivate();
            this.inputPoints = [];
            this.FuncID = null;
            if (this.options.map.graphics != null) {
                this.options.map.graphics.clear();
            }
            this.routeData = [];
            if (this.routeGrid) {
                this.routeGrid.refresh();
            }
            this.routeParams.stops = new FeatureSet();
            this.routeParams.barriers = new FeatureSet();
            this.routeParams.polylineBarriers = new FeatureSet();
            this.routeParams.polygonBarriers = new FeatureSet();
        },

        _showRoute: function (directions) {

            if (this.routeGrid) {
                this.routeGrid.refresh();
            }

            var directions = directions;
            this.directionFeatures = directions.features;
            var routeSymbol = new SimpleLineSymbol().setColor(new Color([255, 0, 0, 0.5])).setWidth(4);

            this.options.map.setExtent(directions.mergedGeometry.getExtent(), true);
            var routeGraphic = new Graphic(directions.mergedGeometry, routeSymbol);
            this.options.map.graphics.add(routeGraphic);

            var directionsInfo = directions.features;
            var totalDistance = number.format(directions.totalLength);
            var totalLength = number.format(directions.totalTime);
            var data = arrayUtils.map(directionsInfo, function (feature, index) {
                return {
                    "detail":   "已经连通管线",//feature.attributes.text,
                    "distance": number.format(feature.attributes.length, { places: 2 }),
                    //"time": number.format(feature.attributes.time, { places: 2 }),
                    "index": index
                }
            });
            this.routeData = this.routeData.concat(data);
            this.routeGrid.renderArray(this.routeData);
            this.routeGrid.on(".dgrid-row:click", lang.hitch(this, function (e) { this._zoomToSegment(e) }));

        },

        _renderList: function (obj, options) {
            var template = "<div class='detail'><div style='float:left;'>${detail}</div><span style='float:right;' class='distance'>${distance}米</span></div>";
            return domConstruct.create("div", { innerHTML: esriLang.substitute(obj, template) });
        },

        _routeError: function (err) {
            alert("An error occured\n" + err.message + "\n"); //+err.details.join("\n")

            //this.routeParams.stops.features.splice(0, 0, lastStop);
            //map.graphics.remove(this.routeParams.stops.features.splice(1, 1)[0]);
        },

        _zoomToSegment: function (e) {
            var index = this.routeGrid.row(e).id;
            var segment = this.directionFeatures[index];
            var segmentSymbol = new SimpleLineSymbol().setColor(new Color([255, 0, 0, 0.5])).setWidth(8);

            this.options.map.setExtent(segment.geometry.getExtent(), true);
            if (!this.segmentGraphic) {
                this.segmentGraphic = this.options.map.graphics.add(new Graphic(segment.geometry, segmentSymbol));
            } else {
                this.segmentGraphic.setGeometry(segment.geometry);
            }
        },



        _serverArea: function (points) {

            this.options.map.graphics.clear();
            //添加点
            for (var i = 0; i < points.length ; i++) {
                var location = new Graphic(points[i], this.barrierSymbol)
                this.options.map.graphics.add(location);
                this.saParams.facilities.features.push(location);

            }

            this.serviceAreaTask.solve(this.saParams, lang.hitch(this, function (solveResult) {
                var polygonSymbol = new SimpleFillSymbol(
                  "solid",
                  new SimpleLineSymbol("solid", new Color([232, 104, 80]), 2),
                  new Color([232, 104, 80, 0.25])
                );

                arrayUtils.forEach(solveResult.serviceAreaPolygons, lang.hitch(this, function (serviceArea) {
                    serviceArea.setSymbol(polygonSymbol);
                    this.options.map.graphics.add(serviceArea);
                }));

            }), function (err) {
                console.log(err.message);
            });
        },

        _closetFacility: function (point) {
            var location = new Graphic(point, this.stopSymbol)
            this.routeGraphicLayer.add(location);
            if (this.cfParams.incidents.features) {
                this.cfParams.incidents.features = [];
            }
            this.cfParams.incidents.features.push(location);

            this.options.map.graphics.enableMouseEvents();

            this.routeGraphicLayer.on("mouse-over", lang.hitch(this, function (evt) {
                //clear existing directions and highlight symbol
                this.options.map.graphics.clear();
                //dom.byId("directionsDiv").innerHTML = "Hover over the route to view directions";

                var highlightSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255], 0.25), 4.5);
                var highlightGraphic = new Graphic(evt.graphic.geometry, highlightSymbol);


                this.options.map.graphics.add(highlightGraphic);
                //dom.byId("directionsDiv").innerHTML = esriLang.substitute(evt.graphic.attributes, "${*}");

                if (this.pipesGrid) {
                    this.pipesGrid.refresh();
                }
                this.pipesGrid.renderArray(evt.graphic.attributes);

            }));
            //this.routeGraphicLayer.on("mouse-out", lang.hitch(this, function (evt) {

            //    this.options.map.graphics.remove(new Graphic(evt.graphic.geometry));
            //}));


            //solve 
            this.closestFacilityTask.solve(this.cfParams, lang.hitch(this, function (solveResult) {
                //var directions = solveResult.directions;
                //alert(solveResult.routes.length);
                arrayUtils.forEach(solveResult.routes, lang.hitch(this, function (route, index) {
                    var data = arrayUtils.map(solveResult.directions[index].features, function (feature, index) {
                        return {
                            "detail": "已连通管道",//feature.attributes.text,
                            "distance": number.format(feature.attributes.length, { places: 2 }),
                            //"time": number.format(feature.attributes.time, { places: 2 }),
                            "index": index
                        };
                        //lang.hitch(this, function (data) { this.routeData.push(data) });
                    });
                    // build an array of route info
                    // var attr = array.map(solveResult.directions[index].features, function (feature) {
                    //    return feature.attributes.text;
                    // });

                    //var infoTemplate = new InfoTemplate("Attributes", "${*}");
                    //route.setInfoTemplate(infoTemplate);
                    route.setAttributes(data);
                    // add routes to routesLayer
                    this.routeGraphicLayer.add(route);

                    //dom.byId("directionsDiv").innerHTML = "Hover over the route to view directions";
                }));
                /*
                想要把查出来的目标也显示出来。但是这里return的facilities是全部，不是查询出来的
                //alert(solveResult.facilities);
                //arrayUtils.forEach(solveResult.facilities, lang.hitch(this, function (facilitie, index) {
                //    //add facilities
                //    alert(facilitie.type);
                //    this.routeGraphicLayer.add(new Graphic(facilitie, this.barrierSymbol));
                //}))
                 */
                //display any messages
            }), function (error) {
                alert(error.message);
                // dom.byId("directionsDiv").innerHTML = "<b>Error:</b> " + solveResult.messages[0];
            });

        }


    });
    return myTools;

})