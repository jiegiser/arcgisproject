/// <reference path="myTools.js" />
/// <reference path="../jsapi_vsdoc12_v38.js" />

/*
    8/15    21.40 准备添加测量等工具     
    8/17    16.15 完成距离测量与面积测量，
            1, 每点击一下都会出现测量结果、而不是把一个geometry drawEnd 才会出现测量结果；
            2，实现过程：on 监听click 事件 激活编辑控件（与实际测量无关）->监听地图click事件根据funcid来区分测量距离与面积
            ->把click获取的mapPoint push into inputPoints -> create polyline or polygon form inputPoints 
            ->this._measurement  ->监听 drawEnd 显示画出的图形 -> clear() when infoWindow hide (监听)

            get : geometryService.lengths(LengthsParameters,callback,error)
                  geometryService.areasAndLengths(AreasAndLengthsParameters,callback,error)

                  polyline.paths是一个三维数组，[path]，[point], [0:x 1:y]   addpaths()
                  polygon.rings       三维数组, [ring], [point], [0:x 1:y]   addrings()

    8/18    15.11 准备网络分析 包括 最短路径 临近设施 服务区分析三个功能同时用来做道路与自来水的管道
            1，整个过程：生成网络数据集 ->添加相应的分析图层（最短路径网络图层，临近设施网络图层和服务区分析网络图层）
            -> 发布服务 -> 代码实现？

    8/19    16.40 代码实现了路径分析的功能，只是在地图上显示出来最短路径，还需要进行输出结果框显示路程以及时间
            计划同时完成临近设施与服务区的实现。
            
            21.19 完成路径分析结果显示
            当为路线任务建立了RouteParameters，可以指定返回路线里面是否包含指示信息:routeParams.returnDirections = true;
            路线指示通过RouteResults.directions返回，返回的是一个DirectionsFeatureSet。DirectionsFeatureSet里面每个要素相当于一段路线。
            本例循环访问路段并创建一个顺序的超链接的列表。每个超链接能在地图上画出一个路段的几何体(用粗的红线)并放大到路段的范围。

    8/21    13.58 开始完善 服务区 与 临近设施
            
            23.13 服务区基本完成，添加两个功能通过添加点来进行服务区的分析，还有通过已有点数据（水厂）进行分析。 

    8/26    20.55 开始Tools 

    8/30    20.17 完成closefacilities 功能，工具基本完善，

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
               pointLayer:null,
               gpointLayer: null,
               render:null,
               
           },
           FuncID: null,
           infoTemplate: null,
           drawToolbar: null,
           inputPoints: [],
           routeTask:null,
           stopSymbol: null,
           barrierSymbol:null,
           routeParams: null,
           saParams:null,
           directionFeatures: null,
           routeData:[],
           routeGrid: null,
           routesGrid: null,
           segmentGraphic: null,
           //featurePoint: null,
           //featureSPoints: null,
           routeGraphicLayer: null,
           closestFacilityTask:null,

           constructor: function (options) {
               var defaults = lang.mixin({}, this.options, options);
               this.options.map = defaults.map;
               this.options.geometryService = defaults.geometryService;
               this.options.pointLayer = defaults.pointLayer;
               this.options.gpointLayer = defaults.gpointLayer;
               this.options.render = defaults.render;
             

               this.drawToolbar = new Draw(this.options.map);

               this.routeTask = new RouteTask("http://localhost:6080/arcgis/rest/services/network/NAServer/route");

               this.serviceAreaTask = new ServiceAreaTask("http://localhost:6080/arcgis/rest/services/network/NAServer/serverArea");

               this.closestFacilityTask = new ClosestFacilityTask("http://localhost:6080/arcgis/rest/services/network/NAServer/closest");
               //this.featurePoint = new FeatureLayer("http://localhost:6080/arcgis/rest/services/guandaoT/FeatureServer/1",
               // {
               //     mode: FeatureLayer.MODE_SNAPSHOT,
               //     outFields: ["*"]
               // });

               //this.featureSPoints = new FeatureLayer("http://localhost:6080/arcgis/rest/services/guandaoT/FeatureServer/1",
               // {
               //     mode: FeatureLayer.MODE_SNAPSHOT,
               //     outFields: ["*"]
               // });


               //this.options.map.addLayer(this..featurePoint); 
               

               this.stopSymbol = new PictureMarkerSymbol({
                   "angle":0,
                   "xoffset":0,
                   "yoffset":10,
                   "type":"esriPMS",
                   "url": "../../src/resource/images/routeStop1.png",
                   //"contentType":"image/png",
                   "width":24,
                   "height":24
               });

               this.barrierSymbol = new PictureMarkerSymbol({
                   "angle": 0,
                   "xoffset": 0,
                   "yoffset": 12,
                   "type": "esriPMS",
                   "url": "../../src/resource/images/routeStop2.png",
                   //"contentType": "image/png",
                   "width": 24,
                   "height": 24
               });

           },

           startup: function () {
               // Measurement
               on(dom.byId("lengthMeasurement"), "click", lang.hitch(this, function () {
                   //alert("lengthMeasurement");
                   this.FuncID = 0;
                   this.options.map.infoWindow.resize(160, 35);
                   //this.inputPoints = [];
                   this.drawToolbar.activate(Draw.POLYLINE)
                   on(this.options.map.infoWindow, "hide", lang.hitch(this, this._clear));
                   
               }));

               on(dom.byId("areaMeasurement"), "click", lang.hitch(this, function () {
                   this.FuncID = 1;
                   this.options.map.infoWindow.resize(190, 55);
                   this.drawToolbar.activate(Draw.POLYGON)
                   on(this.options.map.infoWindow, "hide", lang.hitch(this, this._clear));
                   
               }));

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
                   
                   if (this.FuncID === 0) {
                       this.inputPoints.push(evt.mapPoint)
                       var polyline = new Polyline(this.options.map.spatialReference);
                       if (this.inputPoints.length > 1) {
                           polyline.addPath(this.inputPoints);
                           this._measurement(polyline);
                       }
                   }
                   if (this.FuncID === 1) {
                       this.inputPoints.push(evt.mapPoint);
                       var polygon = new Polygon(this.options.map.spatialReference);
                       if (this.inputPoints.length > 2) {
                           polygon.addRing(this.inputPoints);
                           this._measurement(polygon);   
                       }                  
                   }
                   if (this.FuncID === 2) {
                       //显示
                       this.drawToolbar.deactivate();
                       var stop = this.options.map.graphics.add(new Graphic(evt.mapPoint, this.stopSymbol));
                       this.routeParams.stops.features.push(stop);

                       if (this.routeParams.stops.features.length >= 2) {
                           this.routeTask.solve(this.routeParams, lang.hitch(this,lang.hitch(this,function(e){ this._showRoute(e.routeResults[0].directions)})),lang.hitch(this,this._routeError));
                           //splice(0,1) 删除从0起的一个元素 也就是删除了第一个元素留下了后一个元素 故[0]就是后一个元素
                           this.lastStop = this.routeParams.stops.features.splice(0, 1)[0];
                       }
                   }

                   //if (this.FuncID === 3) {
                   //    var barrier = this.options.map.graphics.add(new Graphic(evt.mapPoint, this.barrierSymbol));
                   //    this.routeParams.barriers.features.push(barrier);
                   //}

                   //if (this.FuncID === 4) {
                   //    //this.inputPoints.push(evt.mapPoint)
                   //    var polyline = new Polyline(this.options.map.spatialReference);

                   //    this.routeParams.barriers.features.push(polyline);
                   //}

                   //if (this.FuncID === 5) {
                   //    this.inputPoints.push(evt.mapPoint);
                   //    var polygon = new Polygon(this.options.map.spatialReference);
                   //    this.routeParams.barriers.features.push(polygon);

                   //}


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
               on(dom.byId("routeTask"), "click", lang.hitch(this, function () {
                   dom.byId("query").style.display = "none";
                   dom.byId("serviceArea").style.display = "none";
                   dom.byId("closestFacility").style.display = "none";
                   dom.byId("pipeclosestFacility").style.display = "none";
                   dom.byId("pipenetwork").style.display = "none";
                   dom.byId("pipeserviceArea").style.display = "none";

                   dom.byId("network").style.display = "block";

                   //RouteParameters
                   this.routeParams = new RouteParameters();
                   this.routeParams.stops = new FeatureSet();
                   this.routeParams.barriers = new FeatureSet();
                   this.routeParams.polylineBarriers = new FeatureSet();
                   this.routeParams.polygonBarriers  = new FeatureSet();
                   this.routeParams.returnDirections = true;
                   this.routeParams.directionsLengthUnits = esriUnits.METERS;
                   this.routeParams.outSpatialReference = { "wkid": 102100 };
                   //表格
                   this.routeGrid = new Grid({
                       renderRow: this._renderList,
                       showHeader: false
                   }, "routeGrid");

               }));

               on(dom.byId("addStops"), "click", lang.hitch(this, function () {
                   this.FuncID = 2;
           
               }));

               on(dom.byId("clearRoute"), "click", lang.hitch(this, function () {
                   this._clear();
               }));

               on(dom.byId("pointBarrier"), "click", lang.hitch(this, function () {
                   this.FuncID = 3;
                   this.drawToolbar.activate(Draw.POINT);                  
               }));

               on(dom.byId("polylineBarrier"), "click", lang.hitch(this, function () {
                   this.FuncID = 4;
                   this.drawToolbar.activate(Draw.POLYLINE)
               }));

               on(dom.byId("polygonBarrier"), "click", lang.hitch(this, function () {
                   this.FuncID = 5;                 
                   this.drawToolbar.activate(Draw.POLYGON)
                   //alert(dom.byId("polygonBarrier").innerHTML);
               }));

               //try {
               //    alert(dom.byId("polygonBarrier").innerHTML);
               //} catch (error) {
               //    alert("dom 错误");
               //}

               on(dom.byId("myquery"), "click", lang.hitch(this, function () {
                   dom.byId("serviceArea").style.display = "none";
                   dom.byId("network").style.display = "none";
                   dom.byId("closestFacility").style.display = "none";
                   dom.byId("pipeclosestFacility").style.display = "none";
                   dom.byId("pipenetwork").style.display = "none";
                   dom.byId("pipeserviceArea").style.display = "none";
                   dom.byId("query").style.display = "block";

               }))

               on(dom.byId("serviceAreaTask"), "click", lang.hitch(this, function () {
                   dom.byId("query").style.display = "none";
                   dom.byId("network").style.display = "none";
                   dom.byId("closestFacility").style.display = "none";
                   dom.byId("pipeclosestFacility").style.display = "none";
                   dom.byId("pipenetwork").style.display = "none";
                   dom.byId("pipeserviceArea").style.display = "none";
                   dom.byId("serviceArea").style.display = "block";

                   //this.options.render._addWaterworks();
                   this.options.map.addLayer(this.options.gpointLayer);
                   //ServiceAreaParameters
                   this.saParams = new ServiceAreaParameters();
                   this.saParams.facilities = new FeatureSet();
                   this.saParams.defaultBreaks = [5];
                   this.saParams.outSpatialReference = this.options.map.spatialReference;
                   this.saParams.impedanceAttribute = "time"
                   //this.saParams.trimPolygonDistanceUnits
                   this.saParams.returnFacilities = false;
               }))

               on(dom.byId("servicePoint"), "click", lang.hitch(this, function () {
                   this.FuncID = 6;
               }))
               //获取水厂点坐标
               on(dom.byId("serviceM"), "click", lang.hitch(this, function () {
                   
                   for (var i = 0; i < this.options.gpointLayer.graphics.length; i++){
     
                       this.inputPoints.push(this.options.gpointLayer.graphics[i].geometry);
                   }
                   
                   //this.saParams.facilities.features = this.featurePoint.graphics;
                   this._serverArea(this.inputPoints)
               }))

               //ServiceAreaTask
               on(registry.byId("hslider"), "change", lang.hitch(this, function () {
                   var hSlider = registry.byId("hslider");
                   var label = dom.byId("decValue");
                   // Update label
                   label.innerHTML = hSlider.get("value");
                   this.saParams.defaultBreaks = [hSlider.value ];

                   if (typeof this.inputPoints !== undefined) {
                       //alert(this.inputPoints[0].spatialReference.wkid);
                       this._serverArea(this.inputPoints);
                   };
               }))

               on(dom.byId("clearService"), "click", lang.hitch(this, function () {
                   this._clear();

               }))
               on(dom.byId("clearCfTask"), "click", lang.hitch(this, function () {
                   //this._clear();
                   if (this.routesGrid) {
                       this.routesGrid.refresh();
                   }
                   //this.routesGrid = null;
                   this.cfParams = null;
                   this.routeGraphicLayer.clear();
                   this.options.map.graphics.clear();

               }))
               on(dom.byId("closestFacilityTask"), "click", lang.hitch(this, function () {


                   this.options.render._addPoint();
                   this.FuncID = 7;
                   dom.byId("query").style.display = "none";
                   dom.byId("network").style.display = "none";
                   dom.byId("serviceArea").style.display = "none";
                   dom.byId("pipeclosestFacility").style.display = "none";
                   dom.byId("pipenetwork").style.display = "none";
                   dom.byId("pipeserviceArea").style.display = "none";

                   dom.byId("closestFacility").style.display = "block";

                   this.routesGrid = new Grid({
                       renderRow: this._renderList,
                       showHeader: false
                   }, "routesGrid");

                   this.cfParams = new ClosestFacilityParameters();
                   this.cfParams.impedenceAttribute = "time";
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

               on(registry.byId("numLocations"), "change", lang.hitch(this, function () {
                   this.cfParams.defaultTargetFacilityCount = registry.byId("numLocations").value;
                   //this._clear();
               }))
               //registry.byId("numLocations").on("change", function () {
               //    params.defaultTargetFacilityCount = this.value;
               //    clearGraphics();
               //});

           },

           _measurement: function (geometry) {
               if (geometry.type === "polygon") {
                   var alParams = new AreasAndLengthsParameters();
                   alParams.polygons = [geometry];
                   alParams.lengthUnit = GeometryService.UNIT_METER;
                   alParams.areaUnit = GeometryService.UNIT_SQUARE_METERS;
                   alParams.calculationType = "geodesic";
                   this.options.geometryService.areasAndLengths(alParams,
                       lang.hitch(this, function (result) {
                           this.options.map.infoWindow.setContent(
                               "面积：<strong>" + parseInt(String(result.areas[0])) + "平方米</strong>" + "<br>"+
                               "周长：<strong>" + parseInt(String(result.lengths[0])) + "米</strong>"
                               );
                           var CurX = geometry.rings[0][geometry.rings[0].length - 1][0];
                           var CurY = geometry.rings[0][geometry.rings[0].length - 1][1];
                           var CurPos = new Point(CurX, CurY, this.options.map.spatialReference);
                           this.options.map.infoWindow.show(CurPos);

                       }),
                       function () { alert("areasAndLengths 失败 ！！"); }
                   );

               }

               if (geometry.type === "polyline") {
          
                       var lengthParams = new LengthsParameters();
                       lengthParams.polylines = [geometry];
                       lengthParams.lengthUnit = GeometryService.UNIT_METER;
                       lengthParams.geodesic = true;
                       lengthParams.calculationType = "geodesic";
                       this.options.geometryService.lengths(lengthParams,
                           lang.hitch(this, function (lenResult) {
                              
                               //this.options.map.infoWindow.setTitle("距离测量");   + "." + parseInt(String(lenResult.lengths[1])) + parseInt(String(lenResult.lengths[2]))
                               this.options.map.infoWindow.setContent("测量长度：<strong>" + parseInt(String(lenResult.lengths[0]))  + "米</strong>");
                           var CurX = geometry.paths[0][geometry.paths[0].length - 1][0];
                           var CurY = geometry.paths[0][geometry.paths[0].length - 1][1];
                           var CurPos = new Point(CurX, CurY, this.options.map.spatialReference);
                           this.options.map.infoWindow.show(CurPos);
                           }),
                           function (error) { alert(error.message +"geometryService.lengths 失败！！"); }
                       );
        

               }

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
               var routeSymbol = new SimpleLineSymbol().setColor(new Color([0, 0, 255, 0.5])).setWidth(4);

               this.options.map.setExtent(directions.mergedGeometry.getExtent(), true);
               var routeGraphic = new Graphic(directions.mergedGeometry, routeSymbol);
               this.options.map.graphics.add(routeGraphic);

               var directionsInfo = directions.features;
               var totalDistance = number.format(directions.totalLength);
               var totalLength = number.format(directions.totalTime);
               var data = arrayUtils.map(directionsInfo, function (feature, index) {
                   return {
                       "detail": feature.attributes.text,
                       "distance": number.format(feature.attributes.length, { places: 2 }),
                       "time": number.format(feature.attributes.time, { places: 2 }),
                       "index": index
                   }
               });
               this.routeData = this.routeData.concat(data);
               this.routeGrid.renderArray(this.routeData);
               this.routeGrid.on(".dgrid-row:click", lang.hitch(this, function (e) { this._zoomToSegment(e) }));

           },

           _renderList : function(obj, options) {
               var template = "<div class='detail'><div style='float:left;'>${detail}</div><span style='float:right;' class='distance'>${distance}米，${time}分钟</span></div>";
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

               this.serviceAreaTask.solve(this.saParams,lang.hitch(this,function(solveResult) {
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
                  
                   if (this.routesGrid) {
                       this.routesGrid.refresh();
                   }
                   this.routesGrid.renderArray(evt.graphic.attributes);

               }));
               //this.routeGraphicLayer.on("mouse-out", lang.hitch(this, function (evt) {

               //    this.options.map.graphics.remove(new Graphic(evt.graphic.geometry));
               //}));


               //solve 
               this.closestFacilityTask.solve(this.cfParams,lang.hitch(this,function (solveResult) {
                   //var directions = solveResult.directions;
                   //alert(solveResult.routes.length);
                   arrayUtils.forEach(solveResult.routes,lang.hitch(this, function (route, index) {
                       var data = arrayUtils.map(solveResult.directions[index].features, function (feature, index) {
                           return {
                               "detail": feature.attributes.text,
                               "distance": number.format(feature.attributes.length, { places: 2 }),
                               "time": number.format(feature.attributes.time, { places: 2 }),
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