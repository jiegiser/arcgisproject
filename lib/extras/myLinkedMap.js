/// <reference path="../jsapi_vsdoc12_v38.js" />



/*
    2014/9/3    11.35   
                过程：1、主题为一个三维框架，以three.js 为实践过程，
                      2、所要绘制的object3D 通过identity 进行获取
                20.32 成功进行到_create3D use map extent identity line and point

                22.27 从geometry 生成 mesh

    2014/9/8    19.34 完善场景漫游、以及把linkedmap 功能完成

    2014/9/9    13.39 添加建筑模型，通过point图层来进行定位确定加载
                17.54 完成webgl render部分 。测试获取point部分

*/

define([
         "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/_base/array",
         "dojo/_base/Color",
         "dojo/on",
         "dojo/dom",
         "esri/graphic",

         "esri/geometry/Point",
         "esri/geometry/Polygon",
         "esri/geometry/Extent",

         "esri/symbols/SimpleLineSymbol",

         "esri/tasks/IdentifyTask",
         "esri/tasks/IdentifyParameters",

         "esri/layers/FeatureLayer",

], function (
         declare,
         lang,
         arrayUtils,
         Color,
         on,
         dom,
         Graphic,

         Point,
         Polygon,
         Extent,

         SimpleLineSymbol,

         IdentifyTask,
         IdentifyParameters,

         FeatureLayer

        

    ) {

    var myLinkedMap = declare(null, {
        options: {
            map: null,

            pointLayer: null,
            polylineLayer: null,
            waterworksLayer: null,

        },

        THREE:null,
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        clock: new this.THREE.Clock(),

        identifyTask: null,
        identifyParams: null,

        container: null,

        ModelViewer:{
        
        CAMERA_START_Z : 22,
        CAMERA_RADIUS : 20,
        MIN_DISTANCE_FACTOR : 1.1,
        MAX_DISTANCE_FACTOR : 20,
        ROTATE_SPEED : 1.0,
        ZOOM_SPEED : 40,
        PAN_SPEED : 20,//0.2
        DAMPING_FACTOR : 0.3,
        },

        constructor: function (options) {
            var defaults = lang.mixin({}, this.options, options);
            this.options.map = defaults.map;
            this.options.pointLayer = defaults.pointLayer;
            this.options.polylineLayer = defaults.polylineLayer;
            this.options.waterworksLayer = defaults.waterworksLayer;
            this.THREE = defaults.three;
            //this.THREE.FirstPersonControls = defaults.firstPerson;


            this.container = dom.byId("container");
            this.container.style.width = dom.byId("mapDIV1").style.width;
            this.container.style.height = dom.byId("mapDIV1").style.height;

            this.identifyTask = new IdentifyTask("http://localhost:6080/arcgis/rest/services/pipe/MapServer");
            this.identifyParams = new IdentifyParameters();
            this.identifyParams.tolerance = 4;
            this.identifyParams.returnGeometry = true;
            this.identifyParams.layerIds = [0, 2, 4];  //注意需要查询的图层
            this.identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
            //this.identifyParams.width = thismap.width;
            //this.identifyParams.height = map.height;


            this.options.map.on("extent-change", lang.hitch(this, function (evt) {
                this._getIdentifyResult(evt.extent);  //get extent geometry
            }));

            //this.options.map.on("click", lang.hitch(this, function (evt) {
            //    this._buffExtent(evt.mapPoint);

            //}));
        },

        startup: function () {


            this._init3D();

            // 循环绘制
            this._run();

        },

        _init3D: function () {

            //alert(this.THREE);
            //alert(this.container.innerHTML);
            var width = this.container.clientWidth;
            var height = this.container.clientHeight;


            //alert(width+",,"+height);
            ////webgl 支持检测
            //if (!Detector.webgl) {
            //    if (Detector.canvas) {
            //        this.srenderer = new THREE.CanvasRenderer();
            //    }else {
            //        alert('Sorry,您的浏览器不支持3D！')
            //    }
            //} else {
            //}

            this.renderer = new this.THREE.WebGLRenderer({ antialias: true });//开启WebGL抗锯齿  
            this.renderer.setSize(width, height);
            this.renderer.setClearColor(0xffffff); // black

            this.container.appendChild(this.renderer.domElement);


            this.scene = new this.THREE.Scene();
            this.scene.position.y = -10000
            
            this.camera = new this.THREE.PerspectiveCamera(75, width / height, 0.1, 20000);
            //this.camera.position.z = 20;
            this.camera.position.set(0, 500, 400);
            //this.camera.target = this.scene.position;

            //this.camera.lookAt();
            //alert(this.scene.position.x+",,"+this.scene.position.y+",,"+this.scene.position.z);
            this.camera.lookAt(this.scene.position);
            this.camera.updateMatrixWorld();
            //this.camera.lookAt(0, 0, 0);
            //this.pointLight = new this.THREE.PointLight(0xFFFFFF);
            //var light = new this.THREE.DirectionalLight(0xFFFFFF,1.5);
            //light.position.set(this.scene.position);
            //this.scene.add(light);

            var light = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);  //new THREE.AmbientLight(0x404040);
            this.scene.add(light);

            //test
            //var cube = new this.THREE.Mesh(new this.THREE.BoxGeometry(8, 8, 8),
            //    new this.THREE.MeshBasicMaterial({
            //    color: 0xff0000,
            //   // wireframe: true
            //}));
            //this.scene.add(cube);
            //test loadJSON
            //var loader = new this.THREE.JSONLoader();
            var x = 0;
            var y = 0;
            var z = 0;
            var jsonURL = "/data/zgzq/zgzq.js";
            var mtlURL = "/data/zgzq/maps";
            
            //var jsonURL = "/data/facilities/valve3.js";
            //var mtlURL = "/data/001/maps";
            //loader.load(jsonURL, lang.hitch(this, function (geometry, materials) {
            //    this._buildingMesh(geometry, materials, x, y, z);

            //}),mtlURL );
            
            //loader.load(jsonURL, lang.hitch(this, function (geometry, materials) {
            //    this._buildingMesh(geometry,materials, x, y, z);

            //}));

            //添加场景漫游
            //this.controls = new this.THREE.FirstPersonControls(this.camera);
            //this.controls.movementSpeed = 13;
            //this.controls.lookSpeed = 0.02;
            //this.controls.lookVerticla = false;

            //this.clock = ;

            var controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
            var radius = this.ModelViewer.CAMERA_RADIUS;

            controls.rotateSpeed = this.ModelViewer.ROTATE_SPEED;
            controls.zoomSpeed = this.ModelViewer.ZOOM_SPEED;
            controls.panSpeed = this.ModelViewer.PAN_SPEED;
            controls.dynamicDampingFactor = this.ModelViewer.DAMPING_FACTOR;
            controls.noZoom = false;
            controls.noPan = false;
            controls.staticMoving = false;

            controls.minDistance = radius * this.ModelViewer.MIN_DISTANCE_FACTOR;
            controls.maxDistance = radius * this.ModelViewer.MAX_DISTANCE_FACTOR;

            this.controls = controls;


            

        },

        _run: function () {

            this.controls.update();

            this.renderer.render(this.scene, this.camera);
            
            // 重绘
            requestAnimationFrame( lang.hitch(this, this._run) );
        },

        _getIdentifyResult: function (extent) {
            //alert(extent.type + ",," + extent.xmax);

            this.identifyParams.geometry = extent;
            this.identifyParams.mapExtent = extent;

            var centerX = extent.xmax - extent.xmin;
            var centerY = extent.ymax - extent.ymin;
            //alert(centerX + ".." + centerY);
 


            this.identifyTask.execute(this.identifyParams, lang.hitch(this, function (idResults) {
                var center = this.identifyParams.geometry.getCenter();
                this._create3D(idResults, center);
            }));


        },

        _create3D: function (idResults, center) {
            for (i = this.scene.children.length - 1; i >= 0 ; i--) {
                obj = this.scene.children[i];
                if (obj instanceof this.THREE.Mesh) {
                    this.scene.remove(obj);
                }
            }
            arrayUtils.forEach(idResults, lang.hitch(this, function (idResult, index) {


        
                //alert(idResult.layerName);
                //if (idResult.layerName === "sde.sde.pipes") {
                //    var lineSymbol = new SimpleLineSymbol();
                //    lineSymbol.style = SimpleLineSymbol.STYLE_SHORTDOT;
                //    lineSymbol.setColor(new Color([255, 0, 0]));
                //    lineSymbol.setWidth(5);
                //    //graphic.setSymbol(lineSymbol);
                //    this.options.map.graphics.add(new Graphic(idResult.feature.geometry, lineSymbol));
                //}
                if (idResult.layerName === "sde.sde.pipes") {
 
                        var radius = 10;
                        switch (idResult.feature.attributes.guanjing) {
                            case 100:
                                radius = 10;
                                break;
                            case 200:
                                radius = 20;
                                break;
                            case 300:
                                radius = 30;
                                break;
                            case 500:
                                radius = 50;
                                break;
                        }

                        var pntNumber = idResult.feature.geometry.paths[0].length;
                        var firstPnt = idResult.feature.geometry.getPoint(0, 0);
                        var x1 = firstPnt.x - center.x;
                        var y1 = parseFloat(idResult.feature.attributes.z);
                        var z1 = center.y - firstPnt.y;

                        var lastPnt = idResult.feature.geometry.getPoint(0, pntNumber - 1);
                        var x2 = lastPnt.x - center.x;
                        var y2 =  parseFloat(idResult.feature.attributes.z);
                        var z2 = center.y - lastPnt.y;

                        //var color = 0x000000;

                        var mesh = this._pipeMesh(x1, y1, z1, x2, y2, z2, radius);
                        mesh.graphic = idResult.feature;
                        mesh.uniqueId = idResult.feature.attributes.LayerName + idResult.feature.attributes.OBJECTID;
                       
                        this.scene.add(mesh);

                        //alert(this.scene.position.x+",,"+this.scene.position.y+",,"+this.scene.position.z);

                    } else if (idResult.layerName === "sde.sde.facilities") {

                        var x = idResult.feature.geometry.x - center.x;
                        var y = parseFloat(idResult.feature.attributes.z);
                        var z = center.y - idResult.feature.geometry.y;

                        //alert(idResult.feature.attributes.type);
                        var URL = "/data/facilities/valve3.js"
                        switch (idResult.feature.attributes.type) {
                            case "阀门":
                                URL = "/data/facilities/valve3.js";
                                break;
                            case "增压泵":
                                //var URL = "/data/facilities/water.js"
                                break;

                               

                        }

                        var a = 0;
                        var loader = new this.THREE.JSONLoader();
                        loader.load(URL, lang.hitch(this, function (geometry, materials) {
                            //alert(x + ",," + y + ",," + z);
                            this._buildingMesh(geometry, materials, x, y, z,a);
                        }));

                        //createValveModelByGraphic(graphic, center);
                    } else if (idResult.layerName === "sde.sde.waterworks") {

                    } else if (idResult.layerName === "sde.sde.building") {

                        var x = idResult.feature.geometry.x - center.x;
                        var y = idResult.feature.attributes.z;
                        var z = center.y - idResult.feature.geometry.y;
                    
                        //var geometry = idResult.feature.geometry;
                        //alert("sde.sde.building");
                        var buildurl = "/data/" + idResult.feature.attributes.building.toString() + "/" + idResult.feature.attributes.building.toString() + ".js";
                        var buildmtlurl = "/data/" + idResult.feature.attributes.building.toString() + "/maps"
                        var rotateAngle = Math.PI / 5 ;
                        //var buildurl = "/data/zgzq/zgzq.js";
                        //var buildmtlurl = "/data/zgzq/maps";
                        //alert(x + ",," + y + ",," + z);
                        //alert(buildurl + ",," + buildmtlurl);
                        var loader = new this.THREE.JSONLoader();
                        loader.load(buildurl, lang.hitch(this, function (geometry, materials) {
                            this._buildingMesh(geometry, materials, x, y, z, rotateAngle);

                        }),buildmtlurl);
                       

                    }

                //}

            }));


        },
        //
        _buildingMesh: function (geometry, materials, x, y, z, rotateAngle) {


            var mesh = new this.THREE.Mesh(geometry, new this.THREE.MeshFaceMaterial(materials));
            mesh.rotation.y = rotateAngle;
            //alert("test!!")
            mesh.position.set(x, y, z);
            mesh.scale.set(10, 10, 10);
            this.scene.add(mesh);
        },

        _pipeMesh: function (x1,y1,z1,x2,y2,z2,radius) {
            var x0 = (x1 + x2) / 2;
            var y0 = (y1 + y2) / 2;
            var z0 = (z1 + z2) / 2;
            var p1 = new this.THREE.Vector3(x1, y1, z1);
            var length = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2) + (z1 - z2) * (z1 - z2));

            var color = new this.THREE.Color("rgb(90,185,204)")
            var material = new this.THREE.MeshBasicMaterial({ color: color });
            var geometry = new this.THREE.CylinderGeometry(radius, radius, length);
            //geometry.applyMatrix(new this.THREE.Matrix4().setRotationFromEuler(new this.THREE.Vector3(Math.PI / 2, Math.PI, 0)));

            geometry.applyMatrix(new this.THREE.Matrix4().makeRotationFromEuler(new this.THREE.Euler(Math.PI / 2, Math.PI, 0, 'XYZ')));
            var mesh = new this.THREE.Mesh(geometry, material);
            //alert(x0 + ",," + y0 + ",," + z0);
            mesh.position.set(x0, y0, z0);
            mesh.lookAt(p1);
            return mesh;
        },


        _buffPoint: function (geometry) {
            // Point 显示
            var pointSymbol = new SimpleMarkerSymbol();
            pointSymbol.style = SimpleMarkerSymbol.STYLE_CIRCLE;
            pointSymbol.setSize(10);
            pointSymbol.setColor(new Color([0, 255, 0]));

            var graphicPoint = new Graphic(geometry, pointSymbol);
            this.options.map.graphics.add(graphicPoint);

            // buffer
            var params = new BufferParameters();
            params.distances = [10000];
            params.outSpatialReference = this.options.map.SpatialReference;
            params.bufferSpatialReference = this.options.map.SpatialReference;
            params.geometries = [geometry];


            this.options.geometryService.buffer(params,
             lang.hitch(this, function (geometries) {
                 //this._bufferCallback(geometries);
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
                     this._dientifyByPoint(geometries[0],geometry);

                 }
                 else {
                     alert("没有几何体！");
                 }

                }), function () { alert("geometryService buffer 错误！") });




        },

        _dientifyByPoint: function (bufferPolygon,centerPoint) {

            this.identifyParams.geometry = bufferPolygon;
            //this.identifyParams.mapExtent = extent;

            this.identifyTask.execute(this.identifyParams, lang.hitch(this, function (idResults) {

                this._create3D(idResults, centerPoint);
            }));

        },

    });

    return myLinkedMap;

})