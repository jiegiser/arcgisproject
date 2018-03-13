var map, tb, statesTask, riversTask, citiesTask;
var statesInfoTemplate, riversInfoTemplate, citiesInfoTemplate;
var pointSym, lineSym, polygonSym;

require(["dojo/_base/lang",
    "dojo/parser",
    "dijit/registry",
    "esri/map",
    "dojo/query",
    "dojo/on",
    "dojo/dom",
    "esri/lang",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/tasks/FindTask",
    "esri/tasks/FindParameters",
    "esri/graphic",
    "esri/toolbars/draw",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/Color",
    "esri/tasks/QueryTask",
    "esri/tasks/query",
    "dijit/form/Button",
    "dojo/domReady!"],
    function (lang, parser, registry, Map, query, on, dom, esriLang, ArcGISTiledMapServiceLayer, FindTask, FindParameters, Graphic, Draw,
        SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Color,
        QueryTask, Query) {
        parser.parse();
        map = new Map("mapDiv");
        var url = "http://192.168.1.88:6080/arcgis/rest/services/JYG1/JCDL/MapServer";
        var agoLayer = new ArcGISTiledMapServiceLayer(url);
        map.addLayer(agoLayer);
        //属性查询
        var uery1=new query();
        query("#btn").on("click", function () {
            //获得输入的名称
            var name = query(".nm")[0].value;
            //实例化查询参数
            var findParams = new FindParameters();
            findParams.returnGeometry = true;
            findParams.layerIds = [1];
            findParams.searchFields = ["XZQMC"];
            findParams.searchText = name;
            //实例化查询对象
            var findTask = new FindTask("http://192.168.1.88:6080/arcgis/rest/services/JYG1/JCDL/MapServer");
            //进行查询
            findTask.execute(findParams, showFindResult)
        });
        on(dom.byId("clearQuery"), "click", lang.hitch(this, function () {
            this.map.graphics.clear();
        }));
        function showFindResult(queryResult) {
            if (queryResult.length == 0) {
                alert("没有该元素");
                return;
            }
            for (var i = 0; i < queryResult.length; i++) {
                //获得该图形的形状
                var feature = queryResult[i].feature;
                var geometry = feature.geometry;
                //定义高亮图形的符号
                //1.定义面的边界线符号
                var outline = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 1);
                //2.定义面符号
                var PolygonSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, outline, new Color([0, 255, 0, 1]));
                //创建客户端图形
                var graphic = new Graphic(geometry, PolygonSymbol);
                //将客户端图形添加到map中
                map.graphics.add(graphic);
            }
        }
        //属性查询结束
        //实例化绘图控件
        var tb = new Draw(map);
        //绘图结束后实现查询
        tb.on("draw-end", doQuery);

        registry.forEach(function (d) {
            if (d.declaredClass === "dijit.form.Button") {
                d.on("click", activateTool);
            }
        });

        // 实例化查询任务类
        statesTask = new esri.tasks.QueryTask(url + "/0");
        riversTask = new esri.tasks.QueryTask(url + "/1");
        //citiesTask = new esri.tasks.QueryTask(url + "/0");

        // 实例化查询参数类
        var query1 = new esri.tasks.Query();
        query1.returnGeometry = true;

        // 实例化信息模板类
        statesInfoTemplate = new esri.InfoTemplate("属性信息", "BSM ：${BSM}<br/> <br/>YSDM：${YSDM}");
        riversInfoTemplate = new esri.InfoTemplate("属性信息", "XZQMC：${XZQMC}<br/><br/>BSM：${BSM}");
        // 实例化符号类
        var redColor = new Color([255, 0, 0]);
        var halfFillYellow = new Color([255, 255, 0, 0.5]);
        pointSym = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_DIAMOND, 10,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, redColor, 1),
                    halfFillYellow);
        lineSym = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, redColor, 2);
        polygonSym = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, redColor, 2),
                    halfFillYellow);

        function activateTool() {
            var tool = null;
            if (this.label == "取消查询") {
                tb.deactivate();
            } else {
                switch (this.label) {
                    case "点":
                        tool = "POINT";
                        break;
                    case "线":
                        tool = "POLYLINE";
                        break;
                    case "多边形":
                        tool = "POLYGON";
                        break;
                }
                tb.activate(Draw[tool]);
                map.hideZoomSlider();
            }
        }

        function doQuery(evt) {
            query1.geometry = evt.geometry;

            var taskName = document.getElementById("task").id;
            var queryTask;
            if (taskName === "statesTask") {
                queryTask = statesTask;
                query.outFields = ["BSM", "YSDM"];
            }
            else (taskName === "riversTask")
            {
                queryTask = riversTask;
                query1.outFields = ["XZQMC", "BSM"];
            }

            queryTask.execute(query1, showResults);
        }

        function showResults(featureSet) {
            // 清除上一次的高亮显示
            map.graphics.clear();

            var symbol, infoTemplate;
            var taskName = document.getElementById("task").value;
            switch (taskName) {
                case "riversTask":
                    symbol = lineSym;
                    infoTemplate = riversInfoTemplate;
                    break;
                case "statesTask":
                    symbol = polygonSym;
                    infoTemplate = statesInfoTemplate;
                    break;
            }

            var resultFeatures = featureSet.features;
            for (var i = 0, il = resultFeatures.length; i < il; i++) {
                // 从featureSet中得到当前地理特征
                // 地理特征就是一图形对象
                var graphic = resultFeatures[i];
                graphic.setSymbol(symbol);

                // 设置信息模板
                graphic.setInfoTemplate(infoTemplate);

                // 在地图的图形图层中增加图形
                map.graphics.add(graphic);
            }
        }
    });
