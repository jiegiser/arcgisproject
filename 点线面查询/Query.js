var map, tb, statesTask, riversTask, citiesTask;
var statesInfoTemplate, riversInfoTemplate, citiesInfoTemplate;
var pointSym, lineSym, polygonSym;

require(["dojo/parser", "dijit/registry", "esri/map", "esri/layers/ArcGISTiledMapServiceLayer", "esri/toolbars/draw",
    "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "esri/Color",
    "esri/tasks/QueryTask", "esri/tasks/query", 
    "dijit/form/Button", "dojo/domReady!"],
    function (parser, registry, Map, ArcGISTiledMapServiceLayer, Draw,
        SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Color,
        QueryTask, Query) {
        parser.parse();
        map = new Map("mapDiv");
        var url = "http://192.168.1.88:6080/arcgis/rest/services/JYG1/JCDL/MapServer";
        var agoLayer = new ArcGISTiledMapServiceLayer(url);
        map.addLayer(agoLayer);

        var tb = new Draw(map);
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
        query = new esri.tasks.Query();
        query.returnGeometry = true;

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
        //给图层选择框添加事件
        function doQuery(evt) {
            query.geometry = evt.geometry;
            //获取到选择框id
            var taskName = document.getElementById("task").value;
            var queryTask;
            if (taskName === "statesTask") {
                queryTask = statesTask;
                //查询输出要素的形式
                query.outFields = ["BSM", "YSDM"];
            }
            else (taskName === "riversTask")
            {
                queryTask = riversTask;
                query.outFields = ["XZQMC", "BSM"];
            }
            //执行查询，并调用回调函数进行将查询到的结果高亮显示
            queryTask.execute(query, showResults);
        }
        //回调函数，用于高亮显示查询到的结果
        function showResults(featureSet) {
            // 清除上一次的高亮显示
            map.graphics.clear();
            //设置高亮显示的颜色及形状
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
