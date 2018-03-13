

define([ "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/_base/event",
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

         "esri/tasks/query",
         "esri/tasks/QueryTask",
         "esri/tasks/BufferParameters",
         "esri/tasks/GeometryService",
         "esri/toolbars/draw",
         "esri/toolbars/edit",
         "esri/graphic",
         "esri/InfoTemplate",
         "esri/symbols/SimpleMarkerSymbol",
         "esri/symbols/SimpleLineSymbol",
         "esri/symbols/SimpleFillSymbol",
         "esri/symbols/TextSymbol",
         "esri/symbols/Font"


    ], function (
         declare,
         lang,
         event,
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

         Query,
         QueryTask,
         BufferParameters,
         GeometryService,
         Draw,
         Edit,
         Graphic,
         InfoTemplate,
         SimpleMarkerSymbol,
         SimpleLineSymbol,
         SimpleFillSymbol,
         TextSymbol,
         Font

        ) {

        var myQuery = declare(null, {
            options: {
                map: null,
                geometryService:null,
                //document:null,
            },
            //font:null,
            infoTemplate:null,
            drawToolbar: null,
            //pointSymbol: null,
            //lineSymbol: null,
            textSybol:null,
            queryID:null,
            queryTask: null,
            queryGrid: null,
            queryData: [],
            segmentGraphic: null,
            //pGeometryService: null,

            constructor: function(options){
                var defaults = lang.mixin({}, this.options, options);
                this.options.map = defaults.map;
                this.options.geometryService = defaults.geometryService;
                //this.options.document = defaults.document;

                this.infoTemplate = new InfoTemplate("${name}", "名称：${name}");

                //字体
                this.font = new Font();
                this.font.setSize("20pt");
                this.font.setFamily("微软雅黑");

            
                this.queryGrid = new Grid({
                    renderRow: this._renderList,
                    showHeader: false
                }, "queryGrid");

                //
        
                //this.pGeometryService = new GeometryService("http://localhost:6080/arcgis/rest/services/Utilities/Geometry/GeometryServer");
                this.drawToolbar = new Draw(this.options.map);
            },

            startup: function () {
                on(dom.byId("queryPoint"), "click", lang.hitch(this, function () {
                    this.queryID = 0;
                    this.queryTask = new QueryTask("http://192.168.1.88:6080/arcgis/rest/services/JYG1/JCDL/MapServer/0");
                }));
                on(dom.byId("queryLine"), "click", lang.hitch(this, function () {
                    this.queryID = 1;
                    this.queryTask = new QueryTask("http://192.168.1.88:6080/arcgis/rest/services/JYG1/JCDL/MapServer/1");
                }));

                on(dom.byId("propertyQuery"), "click", lang.hitch(this, function () {
              
                    this._queryByProperty();
                }));
                on(dom.byId("PolygonQuery"), "click", lang.hitch(this, function () {
                    //alert("go!");
                    this.drawToolbar.activate(Draw.POLYGON);
                }));

                on(dom.byId("PointQuery"), "click", lang.hitch(this, function () {
                    //alert("go!");
                    this.drawToolbar.activate(Draw.POINT);
                }));

                dojo.connect(this.drawToolbar, "onDrawEnd", lang.hitch(this, function (geometry) {
                    //alert("queryByGraphic");
                    this._clearQuery();
                    //this.drawToolbar.deactivate();
                    if (geometry.type === "polygon") {
                        this._queryByPolygon(geometry);
                        this.drawToolbar.deactivate();
                    }
                    if (geometry.type === "point") {
                        //this._queryByPoint(geometry);
                        this.drawToolbar.deactivate();

                        // Point 显示
                        var pointSymbol = new SimpleMarkerSymbol();
                        pointSymbol.style = SimpleMarkerSymbol.STYLE_CIRCLE;
                        pointSymbol.setSize(10);
                        pointSymbol.setColor(new Color([0, 255, 0]));

                        var graphicPoint = new Graphic(geometry, pointSymbol);
                        this.options.map.graphics.add(graphicPoint);

                        // buffer
                        var params = new BufferParameters();
                        params.distances = [500];
                        params.outSpatialReference = this.options.map.SpatialReference;
                        params.bufferSpatialReference = this.options.map.SpatialReference;
                        params.geometries = [geometry];


                        this.options.geometryService.buffer(params,
                            lang.hitch(this, function (geometries) {
                                this._bufferCallback(geometries);
                            }),
                            function () { alert("geometryService buffer 错误！") });
                    }
                    
                }));


                on(dom.byId("clearQuery"), "click", lang.hitch(this, function () {
                    this._clearQuery();
                }));
                
            },

            _renderList: function (obj, options) {
                var template = "<div ><div style='float:left;'>${index} , ${name}</div><span style='float:right;'> ${type} , ${geo} </span></div>";
                return domConstruct.create("div", { innerHTML: esriLang.substitute(obj, template) });
            },

            _zoomToSegment: function (e) {
                var index = this.queryGrid.row(e).id;
                var segment = this.queryData[index];
                var segmentSymbol = new SimpleLineSymbol().setColor(new Color([255, 0, 0, 0.5])).setWidth(8);
                this.options.map.setExtent(segment.geometry.getExtent(), true);
                this.options.map.graphics.add(new Graphic(segment.geometry, segmentSymbol));
               
            },

            _queryByProperty: function () {
                if (this.queryTask == null) {
                    alert("请设置查询物体类别！");
                }
                var queryName = dom.byId("propertyQueryText").value;
                var whereStr = " name like '%" + queryName + "%'";
                var query = new Query();
                query.where = whereStr;
                query.outFields = ["*"];
                query.returnGeometry = true;
                this.queryTask.execute(query, lang.hitch(this, this._showQueryResult));
            },

            _queryByPolygon: function (geometry) {

                if (this.queryTask == null) {
                    alert("请设置查询物体类别！");
                } else {
                    var query = new Query();
                    query.geometry = geometry;
                    query.outFields = ["*"];
                    query.outSpatialReference = this.options.map.spatialReference;
                    query.spatialRelationship = Query.SPATIAL_REL_CONTAINS;
                    query.returnGeometry = true;

                    //alert(this.options.map.id);

                    this.queryTask.execute(query, lang.hitch(this, this._showQueryResult));
                    //ClearGraphic();

                    var polygonSymbol = new SimpleFillSymbol(
                        SimpleFillSymbol.STYLE_SOLID,
                        new SimpleLineSymbol(
                            SimpleLineSymbol.STYLE_DASHDOT,
                            new Color([255, 0, 0]), 1),
                        new Color([255, 255, 0, 0.25])
                    );
                    var graphicPolygon = new Graphic(geometry, polygonSymbol);
                    this.options.map.graphics.add(graphicPolygon);
                }
            },
            _queryByPoint: function (geometry) {
                if (this.queryTask == null) {
                    alert("请设置查询物体类别！");
                } else {
                    var query = new Query();
                    query.geometry = geometry;
                    query.outFields = ["*"];
                    query.outSpatialReference = this.options.map.spatialReference;
                    query.returnGeometry = true;

                    this.queryTask.execute(query, lang.hitch(this, this._showQueryResult));
                }//else  end 

            },

            _bufferCallback: function (geometries) {
                //alert(geometries.length);
                //alert(geometries[0].type);
                if (geometries.length > 0) {
                    var PolygonSymbol = new SimpleFillSymbol(
                        SimpleFillSymbol.STYLE_SOLID,
                        new SimpleLineSymbol(
                            SimpleLineSymbol.STYLE_DASHDOT,
                            new Color([255, 0, 0]), 1),
                            new Color([255, 255, 0, 0.25])
                        );
                    var graphic = new Graphic(geometries[0], PolygonSymbol);
                    this.options.map.graphics.add(graphic);
                    //dojo.forEach(geometries,
                    //    lang.hitch(this,
                    //    function (element, index) {
                    //    var graphic = new Graphic(element, PolygonSymbol);
                    //    this.options.map.graphics.add(graphic);
                    //    })            
                    // );
                    this._queryByPoint(geometries[0]);
                   
                }
                else {
                    alert("没有几何体！");
                }
            },

            _showQueryResult: function (queryResult) {
                alert("获得"+queryResult.features.length+"个结果！");
             
                if (this.queryGrid) {
                    this.queryGrid.refresh();
                }
                this.queryData = queryResult.features;
                if (queryResult.features.length > 0) {
                   
                    switch(this.queryID){
                        case 0:// query point
                            for (var i = 0; i < queryResult.features.length; i++) {

                                var graphic = queryResult.features[i];
                                var geometry = graphic.geometry;
                                var ptPoi = geometry;
                                var ptName = graphic.attributes["name"];

                                graphic.setInfoTemplate(this.infoTemplate);
                                //graphic.setSymbol(PointSymbol);
                                var pointSymbol = new SimpleMarkerSymbol();
                                pointSymbol.style = SimpleMarkerSymbol.STYLE_CIRCLE;
                                pointSymbol.setSize(12);
                                pointSymbol.setColor(new Color("#FFFFCC"));

                                graphic.setSymbol(pointSymbol);
                                this.options.map.graphics.add(graphic);


                                var textSymbol = new TextSymbol(ptName);
                                textSymbol.setColor(new Color([128, 0, 0]));
                                textSymbol.setFont(this.font);
                                textSymbol.setOffset(0, 10);
                                var graphicText = Graphic(geometry, textSymbol);
                                graphicText.setSymbol(textSymbol);
                                this.options.map.graphics.add(graphicText);

                            }

                            var data = arrayUtils.map(queryResult.features, function (feature, index) {
                                return {
                                    "index": index,
                                    "name": feature.attributes.name,
                                    "type": "类型："+ feature.attributes.type, 
                                    "geo":  "linetype" + feature.attributes.linetype,
                                    
                                }
                               
                                //lang.hitch(this, function (data) { this.routeData.push(data) });
                            });
                            //var data = [{
                            //    "name": "test",
                            //    "type": "test",
                            //    "geo": "test",
                            //    "index": "test",
                            //}]
                            
                            break;
                        case 1:  //query line
                            for (var i = 0; i < queryResult.features.length; i++) {

                                var graphic = queryResult.features[i];
                                var geometry = graphic.geometry;
                                //var ptPoi = geometry;
                                var ptName = graphic.attributes["name"];

                                graphic.setInfoTemplate(this.infoTemplate);
                                //graphic.setSymbol(PointSymbol);
                                //alert(ptName);
                                var lineSymbol = new SimpleLineSymbol();
                                lineSymbol.style = SimpleLineSymbol.STYLE_SHORTDOT;
                                lineSymbol.setColor(new Color([255, 0, 0]));
                                lineSymbol.setWidth( 5 );
                                graphic.setSymbol(lineSymbol);
                                this.options.map.graphics.add( graphic );

                                var data = arrayUtils.map(queryResult.features, function (feature, index) {
                                    return {
                                        "index": index,
                                        "name": feature.attributes.name,
                                        "type": "管径：" + feature.attributes.guanjing+"mm",
                                        "geo": "z:" + feature.attributes.z,
                                    }
                                });
                            }
                            break;

                            
                    }  //switch End!
                    
                    this.queryGrid.renderArray(data);
                    this.queryGrid.on(".dgrid-row:click", lang.hitch(this, function (e) { this._zoomToSegment(e) }));
                    }
                   

            },

            _clearQuery: function () {
                this.drawToolbar.deactivate();

                if (this.options.map.graphics != null) {
                    this.options.map.graphics.clear();
                    //this.options.document.getElementById("showResult").innerHTML = null;
                    
                }
                if (this.queryGrid) {
                    this.queryGrid.refresh();
                }
                    
            },
        })// myQuery End;
        return myQuery;
} )