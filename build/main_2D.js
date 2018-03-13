
var dojoConfig = {
    //The location.pathname.replace() logic below may look confusing but all its doing is
    // boostrap 包含dojo boostrap 组件 基于amd 规范 使用时需要把support.js 加入
    paths: {
        extras: location.pathname.replace(/\/[^/]+$/, "") + "/lib/extras",
    },
    //paths: {
    //    bootstrap: location.pathname.replace(/\/[^/]+$/, "") + "//rawgit.com/xsokev/Dojo-Bootstrap/master"
    //
    parseOnLoad: true,

};