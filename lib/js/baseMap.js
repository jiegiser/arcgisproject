var map, tb, statesTask, riversTask, citiesTask;
var statesInfoTemplate, riversInfoTemplate, citiesInfoTemplate;
var pointSym, lineSym, polygonSym;
//引入一些基本的功能库
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
        //进行小部件的解析
        parser.parse();
        //实例化map对象
        map = new Map("mapDiv");
        var url = "http://192.168.1.88:6080/arcgis/rest/services/JYG1/JCDL/MapServer";
        //实例化瓦片图层
        var agoLayer = new ArcGISTiledMapServiceLayer(url);
        //将图层添加到地图容器中
        map.addLayer(agoLayer);
        /*----------------------------------属性查询-----------------------------*/
        //id为btn的对象，添加click事件
        query("#btn").on("click", function () {
            //获得输入的名称
            var name = query(".nm")[0].value;
            //实例化查询参数（此数据对象用作FindTask.execute方法的findParameters参数。它指定查找操作的搜索条件。）
            var findParams = new FindParameters();
            //如果“true”，结果集包含与每个结果关联的几何图形。
            findParams.returnGeometry = true;
            //要执行查找操作的图层。
            findParams.layerIds = [1];
            //要搜索的图层的字段的名称。
            findParams.searchFields = ["XZQMC"];
            //在图层和searchFields参数中指定的图层和字段中搜索的搜索字符串文本。也就是需要我们输入的文本
            findParams.searchText = name;
            /*实例化查询对象FindTask，该类可以搜索在单个图层的单个字段上，图层的许多字段上或许多图层的许多字段上进行。
             其中的url表示地图服务的ArcGIS Server REST资源的URL。            
            */
            var findTask = new FindTask("http://192.168.1.88:6080/arcgis/rest/services/JYG1/JCDL/MapServer");
            /*进行查询
             	发送到ArcGIS REST地图服务资源的请求执行基于该搜索FindParameters在findParameters参数中指定。
            */
            findTask.execute(findParams, showFindResult)
        });
        //dojo 中的on事件，其中包含 元素  事件名称  处理函数。
        //有关lang.hitch方法的说明，可以查看自己的csdn
        on(dom.byId("clearQuery"), "click", lang.hitch(this, function () {
            //异步调用map对象
            this.map.graphics.clear();
            //点击清除查询。清除查询框中的内容
            dom.byId("queryGrid").innerHTML = "";
            dom.byId("num").innerHTML = "";
        }));
        //显示查询结果函数
        function showFindResult(queryResult) {
            //判断查询到的结果的长度
            if (queryResult.length == 0) {
                //没有查询到结果，弹出没有该元素
                alert("没有该元素");
                return;
            }
            //通过for循环读取查询到的结果
            for (var i = 0; i < queryResult.length; i++) {
                //获得该图形的形状
                var feature = queryResult[i].feature;
                //获取到图形的图形。
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
        /*------------------------------------------属性查询结束-----------------------------*/
        /*------------------------------------------空间查询---------------------------------**/
        //实例化绘图控件 
        var tb = new Draw(map);
        //绘图结束后实现查询，on的这种使用是同归对象调用on方法，不需要传入元素这个参数。当绘图结束时进行查询
        tb.on("draw-end", doQuery);

        //registry也是通过id获取元素，不过他获取到的知识通过dojo小部件渲染的对象
        registry.forEach(function (d) {
            //判断是否为button，给每一个button添加click事件，激活绘图控件，也就是调用activateTool方法
            if (d.declaredClass === "dijit.form.Button") {
                d.on("click", activateTool);
            }
        });

        // 实例化查询任务类，对地图服务的图层资源执行查询操作
        //其中的url	表示服务中的图层的ArcGIS Server REST资源的URL
        statesTask = new esri.tasks.QueryTask(url + "/0");
        riversTask = new esri.tasks.QueryTask(url + "/1");
        // 实例化查询参数类,查询输入到QueryTask。并非所有查询属性都需要执行QueryTask。查询定义需要以下属性之一：queryGeometry，text或where。可选属性包括outFields，outSpatialReference和returnGeometry。
        var query1 = new esri.tasks.Query();
        //如果“true”，FeatureSet中的每个要素都包含几何。
        query1.returnGeometry = true;
        // 实例化信息模板类
        statesInfoTemplate = new esri.InfoTemplate("属性信息", "BSM ：${BSM}<br/> <br/>YSDM：${YSDM}");
        riversInfoTemplate = new esri.InfoTemplate("属性信息", "XZQMC：${XZQMC}<br/><br/>BSM：${BSM}");
        //dom.byId("queryGrid").innerHTML = statesInfoTemplate.toJSON();
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
        //绘图控件的激活
        function activateTool() {
            var tool = null;
            //通过获取到button对象，读取到label属性，也就是内容
            if (this.label == "取消查询") {
                //注销绘图控件
                tb.deactivate();
            } else {
                //通过Switch语句判断是点击了哪一个按钮，来进行绘制相应的图形
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
                //进行激活绘图控件，进行绘图
                tb.activate(Draw[tool]);
                //map影藏缩放控件
                //map.hideZoomSlider();
            }
        }
        //该函数首先判断用户选择的是针对哪个图层进行查询，从而设置查询任务对象。最后调用execute执行，显示结果
        function doQuery(evt) {
            //将绘制的几何形状传值给查询的几何形状
            query1.geometry = evt.geometry;
            //通过id获取元素的value
            var taskName = document.getElementById("task").value;
            var queryTask;
            if (taskName === "statesTask") {
                queryTask = statesTask;
                //查询要包含在FeatureSet中的属性字段。，
                query.outFields = ["BSM", "YSDM"];
            }
            else (taskName === "riversTask")
            {
                queryTask = riversTask;
                query1.outFields = ["XZQMC", "BSM"];
            }

            queryTask.execute(query1, showResults);
        }
        //点线面查询显示结果，首先根据用户选择是哪个图层，设置信息模板与符号变量，然后对返回的地理特征进行循环，
        //将他们实例化为图形对象，并加入到地图的图形图层中。
        function showResults(featureSet) {
            // 清除上一次的高亮显示
            map.graphics.clear();

        /*-----------将查询结果显示在信息窗口中------------------*/
            var symbol, infoTemplate;
            var taskName = document.getElementById("task").value;
            //判断查询的要素集是为空
            if (featureSet.features.length == 0) {
                dom.byId("queryGrid").innerHTML = "";
                return;
            }
            var htmls = "";
            //改用if语句进行判断
            if (taskName == "riversTask") {
                symbol = lineSym;
                infoTemplate = riversInfoTemplate;
                //将查询结果显示在查询结果框中
                htmls = htmls + "<table style=\"width: 100%\">";
                htmls = htmls + "<tr><td>行政区名称：</td></tr>";
                for (var i = 0; i < featureSet.features.length; i++) {
                    //获得图形graphic
                    var graphic = featureSet.features[i];
                    //获得查询的名称（此处是和shp属性表对应的）
                    var ptName = graphic.attributes["XZQMC"];
                    //this.map.setExtent(featureSet.geometry.getExtent(), true);
                    //if (i % 2 == 0)
                    //    htmls = htmls + "<tr>";
                    //else {
                        htmls = htmls + "<tr bgcolor=\"#F0F0F0\">";
                        htmls = htmls + "<td><a href=\"#\" \">" + ptName + "</a></td>";
                        htmls = htmls + "</tr>";
                    //}

                }
                //var td1 = document.getElementById('ac');
                //var a = td1.childNodes.item(0);
                //var lis = a.childNodes;
                //for (var i = 0; i < lis.length; i++) {
                //    alert("Item " + i + ": " + lis.item(i).innerHTML);
                //}
                htmls = htmls + "</table>";
                //将属性绑定在divShowResult上面
                dom.byId("queryGrid").innerHTML = htmls;
                dom.byId("num").innerHTML = i
            }
            else {
                symbol = polygonSym;
                infoTemplate = statesInfoTemplate;
                //将查询结果显示在查询结果框中
                htmls = htmls + "<table style=\"width: 100%\">";
                htmls = htmls + "<tr><td>标识码：</td></tr>";
                for (var i = 0; i < featureSet.features.length; i++) {
                    //获得图形graphic
                    var graphic = featureSet.features[i];
                    //赋予相应的符号
                    //graphic.setSymbol(fill);
                    //将graphic添加到地图中，从而实现高亮效果
                    //map.graphics.add(graphic);
                    //获得教学楼名称（此处是和shp属性表对应的）
                    var ptName = graphic.attributes["BSM"];
                    //if (i % 2 == 0)
                    //    htmls = htmls + "<tr>";
                    //else {
                        htmls = htmls + "<tr bgcolor=\"#F0F0F0\">";
                        htmls = htmls + "<td><a href=\"#\" \">" + ptName + "</a></td>";
                        htmls = htmls + "</tr>";
                    //}
                        //htmls = htmls + "<td><a onclick='this.map.setExtent(graphic.geometry.getExtent(), true);' href=\"#\" \">" + ptName + "</a></td>";
                    
                }
                dom.byId("num").innerHTML = i;
                htmls = htmls + "</table>";
                //将属性绑定在divShowResult上面
                dom.byId("queryGrid").innerHTML = htmls;
                
            }
            //switch (taskName) {
            //    case "riversTask":
            //        symbol = lineSym;
            //        infoTemplate = riversInfoTemplate;
            //        //alert(riversInfoTemplate);
            //        //dom.byId("queryGrid").innerHTML = infoTemplate.toJSON();
            //        //alert(infoTemplate.content);
            //        break;
            //    case "statesTask":
            //        symbol = polygonSym;
            //        infoTemplate = statesInfoTemplate;
            //        break;
            //}
            /*-----------设置查询结果几何图形的形状以及给每一个查询到的几何图形设置点击他显示的信息窗口------------------*/

            //if (featureSet.features.length >= 1) {
            //    htmls = htmls + "<table style=\"width: 100%\">";
            //    htmls = htmls + "<tr><td>名称</td></tr>";
            //    for (var i = 0; i < featureSet.features.length; i++) {
            //        //获得图形graphic
            //        var graphic = featureSet.features[i];
            //        //赋予相应的符号
            //        //graphic.setSymbol(fill);
            //        //将graphic添加到地图中，从而实现高亮效果
            //        //map.graphics.add(graphic);
            //        //获得查询到的名称（此处是和shp属性表对应的）
            //        var ptName = graphic.attributes["XZQMC"];
            //        if (i % 2 == 0)
            //            htmls = htmls + "<tr>";
            //        else
            //            htmls = htmls + "<tr bgcolor=\"#F0F0F0\">";
            //        htmls = htmls + "<td><a href=\"#\" \">" + ptName + "</a></td>";
            //        htmls = htmls + "</tr>";
            //    }
            //    htmls = htmls + "</table>";
            //    //将属性绑定在divShowResult上面
            //    dom.byId("queryGrid").innerHTML = htmls;
            //}

            var resultFeatures = featureSet.features;
            for (var i = 0, il = resultFeatures.length; i < il; i++) {
                // 从featureSet中得到当前地理特征
                // 地理特征就是一图形对象
                var graphic = resultFeatures[i];
                graphic.setSymbol(symbol);
                
                // 设置信息模板
                graphic.setInfoTemplate(infoTemplate);
                //alert(infoTemplate.content);
                // 在地图的图形图层中增加图形
                map.graphics.add(graphic);

            }
            
        }
    });
