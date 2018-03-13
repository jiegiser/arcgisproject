/// <reference path="../jsapi_vsdoc12_v38.js" />

/*

  2014/7/19 19:30
  学习如何 write class 理解实践OO js 基于DOJO AMD规范 arcgis API for javascript   (未完成)
   
  7/30  10.21 （开始着手写在线编辑增加图形功能）

  7/31  20.37 完成 
  get 1, 对于this的上下文理解不足，在监听事件中，传入的函数在所用的变量变成unfettered，
         解决办法："dojo/_base/lang"  使用lang.hitch(this ，function ) 函数来解决
         详见  lang.hitch.doc
  get 2, 如何在dojo中 write class
         详见  http://dojotoolkit.org/documentation/tutorials/1.9/declare/

  8/1    8.50  添加属性修改、geometry修改、删除

  8/1   15.56 添加完成，但是选取有些困难，考虑可以增加使用线选取或面选取（未完成）。接着要做的是查询类
  
*/

define([ "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/_base/event",
         "dojo/on",
         "dojo/dom",

         "esri/toolbars/draw",
         "esri/toolbars/edit",
         "esri/graphic",
         "esri/symbols/SimpleMarkerSymbol",

         "dijit/registry",
         "dijit/Dialog",
         "dojo/parser",
    
],
    function (declare,
              lang,
              event,
              on,
              dom,

              Draw,
              Edit,
              Graphic,
              SimpleMarkerSymbol,

     
              registry,
              Dialog,
              parser
              ) {

 var myDraw = declare(null,{
     options:{
          map: null,
          featureLayer:null,
          formDialog: null,
          formDelete:null,
         

      },
      drawToolbar: null,
      editToolbar:null,
      tempGraphic: null,
      FuncID:null,

      constructor: function (options) {
          // mix in settings and defaults
          var defaults = lang.mixin({}, this.options, options);
          this.options.map = defaults.map;
          this.options.featureLayer = defaults.featureLayer;
          this.options.formDialog = defaults.formDialog;
          this.options.formDelete = defaults.formDelete;
       

          on(this.options.map, "onLoad",lang.hitch(this, this._createToolbar() ) );

         
 
      },
     
      startup: function () {
          on(dom.byId("shEnd"), "click", lang.hitch(this, function () {
              this.FuncID = 0;
          }));

          //管道添加
          on(dom.byId("shAdd"), "click", lang.hitch(this, function () {
              this.FuncID = 1;
              this.drawToolbar.activate(Draw.POINT)

          }));

          on(dom.byId("EditGraphic"), "click", lang.hitch(this, function () {
              this._editGraphic();
          }));
          //添加结束

          on(dom.byId("shProperty"), "click", lang.hitch(this, function () {
              this.FuncID = 2;
          }));

          on(dom.byId("shEdit"), "click", lang.hitch(this, function () {
              this.FuncID = 3;

          }));

          on(dom.byId("shDelete"), "click", lang.hitch(this, function () {
              this.FuncID = 4;

          }));

          on(dom.byId("DeleteGraphic"), "click", lang.hitch(this, function () {
              this._deleteGraphic();
          }));

      },

      _editGraphic: function () {
          if (this.options.featureLayer.isEditable) {

              var Name = dom.byId("txtName").value;
              var type = dom.byId("txtComment").value;

              switch(this.FuncID){
                  case 1:
                      this.tempGraphic.setAttributes({ "name": Name, "type": type });
                      this.options.featureLayer.applyEdits([this.tempGraphic], null, null);
                      break;
                  case 2:
                      this.tempGraphic.attributes["name"] = Name;
                      this.tempGraphic.attributes["type"] = type;
                      this.options.featureLayer.applyEdits(null, [this.tempGraphic], null);
                      break;
              }
              

              this.options.map.graphics.clear();
              this.options.formDialog.hide();

          } else {
              alert("feature不可编辑");
          }
          //alert("编辑完成！");
      },
      
      _deleteGraphic: function () {
          this.options.featureLayer.applyEdits(null, null, [this.tempGraphic]);
          this.options.formDelete.hide();

      },

      _createToolbar: function () {
          
          this.drawToolbar = new Draw(this.options.map);
          dojo.connect(this.drawToolbar, "onDrawEnd", lang.hitch(this, function (geometry) {
              this._addToMap(geometry)
          }));

          this.editToolbar = new Edit(this.options.map);
         
          on(this.options.featureLayer, "click", lang.hitch(this, function (evt) {
              this._featureClick(evt);
          }));

          on(this.options.featureLayer, "onUpdateEnd", lang.hitch(this, function (error) {
              if (this.opions.map.graphics != null)
                  this.optins.map.graphics.clear();

              //this.FuncID = 0;

          }));

          //alert("完成");
      },

      _featureClick: function (evt) {
          //alert("feature onclick");
          dojo.stopEvent(evt);
          //event.stopEvent(evt);
          var Name = evt.graphic.attributes["name"];
          var type = evt.graphic.attributes["type"];

          switch (this.FuncID) {
              case 0:
                  break;
              case 1:
                  //添加
                  break;
              case 2:
                  //属性编辑
                  this.tempGraphic = evt.graphic;
                  dom.byId("txtName").value = Name;
                  dom.byId("txtComment").value = type;
                  this.options.formDialog.show();
                  break;
              case 3:
                  //geometry编辑
                  //alert("geomotry !");
                  var tool = 0;
                  tool = tool | Edit.MOVE;
                  tool = tool | Edit.EDIT_VERTICES;
                  tool = tool | Edit.SCALE;
                  tool = tool | Edit.ROTATE;
                  var options = {
                      allowAddVertices: true,
                      allowDeleteVertices: true
                  };
                  this.editToolbar.activate(tool, evt.graphic, options);
                  //lang.hitch(this, function (evt) {
                  //    alert("geomotry !");
                  //    this._activateToolbar(evt.graphic);
                  //});
                  break;
              case 4:
                  //删除
                  this.tempGraphic = evt.graphic;
                  //var frmDelete = this.options.document.getElementById("formDelete");
                  dom.byId("divDelteInfo").innerHTML = "是否删除要素：<strong>" + Name + "</strong>?";
                  this.options.formDelete.show();
                  break;
          }

          on(this.options.map, "click", lang.hitch(this, function () {
              this.editToolbar.deactivate()
          }));
      },

      _addToMap: function (geometry) {
         this.drawToolbar.deactivate();

        var PointSymbol = new SimpleMarkerSymbol();
        PointSymbol.style = SimpleMarkerSymbol.STYLE_CIRCLE;
        PointSymbol.setSize(12);
        PointSymbol.setColor(new dojo.Color("#FFFFCC"));

        this.tempGraphic = new Graphic(geometry);
        this.options.map.graphics.add(new Graphic(geometry, PointSymbol));

        dom.byId("txtName").value = "";
        dom.byId("txtComment").value = "";
        this.options.formDialog.show();
         
      },
      //_activateToolbar: function (graphic) {
      //    var tool = 0;
      //    tool = tool | Edit.MOVE;
      //    tool = tool | Edit.EDIT_VERTICES;
      //    tool = tool | Edit.SCALE;
      //    tool = tool | Edit.ROTATE;
      //    var options = {
      //        allowAddVertices: true,
      //        allowDeleteVertices: true
      //    };
      //    this.editToolbar.activate(tool, graphic, options);

      //}


 
   });

  return myDraw;

});