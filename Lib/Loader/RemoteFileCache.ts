
import { md5 } from "../../Third/js-md5";
import { loggerError, trim } from "../../Lib/Utils"; 
import { ErrorCode, IErrorData } from "../ErrorModel";

type LoadCallback<T> = (err, resource: T, path: string)=>void
export class RemoteFileCache {
    //#region 存储路径
    /**
     * 默认的存储文件夹
     */
    private dirPath: string;

    private writablePath: string;

    getDirPath() {
        return this.dirPath;
    }
    //#endregion

    /**
     * 
     * @param dirPath 默认的存储文件夹(xxx/) path=writablePath+dirPath
     */
    constructor(dirPath) {
        if (cc.sys.isNative) {
            this.writablePath = jsb.fileUtils.getWritablePath();
            this.dirPath = this.writablePath + dirPath;
            cc.log('[JsbWritablePath]', this.writablePath);
        }
    }

    private getImageType(url: string){
        let endExtDotIdx=url.lastIndexOf('.');
        if(endExtDotIdx>=0){
            let endExt = url.substr(endExtDotIdx+1,3);
            if(endExt==='jpg'){
                return "jpeg";
            }else if (endExt==='jpe' && url[endExtDotIdx+4]==='g'){
                return "jpeg";
            }
        }
        return "png";
    }

    loadImage(url: string, callback:LoadCallback<cc.Texture2D>) {
        let imageType=this.getImageType(url);
        return this.loadFile<cc.Texture2D>(url, imageType, callback);
    }

    loadMp4(url: string, callback:LoadCallback<any>) {
        return this.loadFile(url, "mp4",callback);
    }

    loadResource<T>(url: string,type:string, callback:LoadCallback<T>) {
        return this.loadFile(url, type, callback);
    }

    /**
     * 预加载文件到本地(ForNative)
     * @param url 
     */
    preloadFileForNative(url: string, _remoteLoadedCb?: (err?) => void) {
        url = trim(url);
        if (!cc.sys.isNative) {// TODO
            return false;
        }
        this.loadFileForNative(url, null, _remoteLoadedCb);
        return true;
    }
    /**
     * 
     * @param url 远程访问地址
     * @param type 
     * @param callback 
     * @param toDirPartPath  xxxx/
     */
    private loadFile<T>(url: string, type: string, callback: LoadCallback<T>) {
        url = trim(url);
        if (!cc.sys.isNative) {//web环境直接用loader加载，可以释放，重新加载不会再从服务端下载
            return this.loadFileByLoader(url, type, callback);
        }
        return this.loadFileForNative(url, {
            type: type,
            callback: callback
        });
    }



    /**
     * 判断extName
     * @param url 
     * @param extName  mp4
     */
    private isExtName(url: string,extName:string) {
        let endExtDotIdx=url.lastIndexOf('.');
        if(endExtDotIdx>=0){
            let endExt = url.substr(endExtDotIdx+1,extName.length);
            if(endExt===extName){
                return true;
            }
        }
        return false;
    }
    private loadFileForNative<T>(url: string, loadOption?: {
        type: string,
        callback: LoadCallback<T>
    },_remoteLoadCb?:(err?)=>void) {
        let fileName = this.convertUrlToFilePath(url);
        // 判断是否存在
        let dirPath = this.dirPath;
        // if (toDirPartPath) {
        //     dirPath = this.writablePath + toDirPartPath;
        // }
        dirPath = this.normalizeDirPath(dirPath);
        let filePath = this.getFilePath(dirPath, fileName);
        if (jsb.fileUtils.isFileExist(filePath)) {
            if (loadOption) {
                this.loadFileByLoader(filePath, loadOption.type, loadOption.callback);
            }
            if (_remoteLoadCb) {
                _remoteLoadCb();
            }
        } else {
            cc.log("[RemoteLoader] 文件不存在，网络加载文件", url);
            this.downloadAndSave(url, filePath, dirPath, fileName, (err:IErrorData, savePath:string) => {
                if (err) {
                    if (loadOption) {
                        loadOption.callback(err, null, null);
                    }
                    if (_remoteLoadCb) {
                        _remoteLoadCb(err);
                    }
                } else {
                    if (loadOption) {
                        this.loadFileByLoader(savePath, loadOption.type, loadOption.callback);
                    }
                    if (_remoteLoadCb) {
                        _remoteLoadCb();
                    }
                }
            });
        }
    }

    private loadFileByLoader<T>(filePath: string, type: string, callback:LoadCallback<T>) { 
        cc.loader.load({
            url: filePath,
            type: type
        }, function (err, tex) {
            callback(err, tex, filePath);
        });
    }

    private convertUrlToFilePath(url: string) {
        let fileName = md5(url);
        return fileName;
    }  

    //#region 资源下载处理
    private _downloadMap: { [url: string]: ((err, data:Uint8Array,md5:string) => void)[] } = {};
    
    private fileDataVerify(data: Uint8Array, etag: string) {
        let lowerEtag = etag;
        // if (lowerEtag) {
        //     lowerEtag = etag.toLowerCase();
        // }
        let strMd5=md5(data);
        if(strMd5===lowerEtag){
            return true;
        }else{
            return false;
        }
    }
    
    /**
     * 获取文件Md5(overidable)
     * @returns 32位小写md5值
     */
    private getFileMd5ByXhr(xhr:XMLHttpRequest) {
        let etag = xhr.getResponseHeader('ETag');// aliyun oss 的文件md5
        if (etag) {
            etag = trim(etag);
            etag = etag.replace(/\"/g, "");
            etag = etag.toLowerCase();
        }
        return etag;
    }
    /**
     * 校验文件md5
     * @param url 
     * @param filePath 
     * @param strMd5 
     * @returns 0:校验成功
     */
    private _checkFileMd5(url:string,filePath:string,strMd5:string) {
        try {
            cc.log(`[RemoteLoader] 文件保存成功:url=${url},filePath=${filePath}`);
            //重新读取校验md5
            let uIntData = jsb.fileUtils.getDataFromFile(filePath);
            let strMd52 = md5(uIntData);
            if (strMd5) {
                if (strMd52 !== strMd5) {
                    cc.log(`[RemoteLoader] 文件saveFile出问题md5: ${strMd52},${strMd5}`);
                    // loggerErrorRemote('RemoteLoader', `saveFile 文件校验错误 ${url},${strMd52},${strMd5}`);
                    jsb.fileUtils.removeFile(filePath);
                    return 1;
                }
            }
            cc.log('[RemoteLoader] 文件md5:' + strMd52);
        } catch (ex) {
            loggerError('[RemoteLoader] 文件md5检查出错', ex);
            // loggerErrorRemote('RemoteLoader 校验出错', ex);
            return 2;
        }
        return 0;
    }


    private downloadAndSave(url: string, filePath: string, dirPath: string, fileName: string, callback: (err: IErrorData, savePath: string) => void) {
        this.download(url, (err, data, strMd5:string) => {
            if (err) {
                if (callback) {
                    callback(err, null);
                }
                return;
            }
            if (!data) {
                cc.log("[Warning] 数据为空");
                callback( {
                    code: ErrorCode.DataError,
                    errorMsg: "数据为空"
                }, null);
                return;
            }
            if (data) {
                let savePath = this.saveFile(data, dirPath, fileName);
                if (!savePath) {//saveFile failed
                    if (jsb.fileUtils.isFileExist(filePath)) {// TODO Test
                        cc.log("[RemoteLoader] saveFile失败，文件存在");
                        jsb.fileUtils.removeFile(filePath);
                    }
                    callback({
                        code: ErrorCode.VerifyError,
                        errorMsg: "保存失败"
                    }, null);
                    return;
                }
               
                // if (vv.debugConfig.debugMp4) {
                // 校验mp4文件
                if (this.isExtName(url, 'mp4')) {
                    let retCode = this._checkFileMd5(url, filePath, strMd5);
                    if (retCode !== 0) {
                        callback( {
                            code: ErrorCode.VerifyError,
                            errorMsg: `保存失败（${retCode}）`
                        }, null);
                    }
                }
                // 保存成功
                callback(null, savePath);
            }
        });
    }

    private download(url:string, callback: (err:IErrorData, data:Uint8Array,strMd5:string) => void) {
        var that = this;
        var cbList = this._downloadMap[url];
        if (cbList) {
            cbList.push(callback);
            return;
        }
        cbList = [callback];
        this._downloadMap[url] = cbList;

        function dealCallback(err:IErrorData, data, etag:string) {
            if (!(cbList && cbList.length > 0)) {
                return;
            }
            let uInt8ArrayData=null;
            if(!err &&　typeof data !=='undefined'){
                uInt8ArrayData=new Uint8Array(data);
                if(etag){
                    // 校验
                    let dt = new Date().getTime();
                    let isOk = that.fileDataVerify(uInt8ArrayData, etag);
                    let dtSpan = new Date().getTime() - dt;
                    if (isOk) {
                        cc.log(`[RemoteLoader] 校验md5成功,url=${url},dtSpan=${dtSpan}ms`);
                    } else {
                        cc.log(`[RemoteLoader] 校验md5失败,url=${url},dtSpan=${dtSpan}ms,etag=${etag}`); 
                        err = {
                            code: ErrorCode.VerifyError,
                            errorMsg: "下载出错（校验失败）"
                        };
                        uInt8ArrayData = null;
                    }
                }
            }
            // 回调
            cbList.forEach(cb => {
                if (cb) {
                    try {
                        cb(err, uInt8ArrayData,etag);
                    } catch (ex) {
                        cc.log("download Cb Throw ex", ex);
                    }
                }
            });

            cbList.splice(0,cbList.length);
            that._downloadMap[url] = null;
            delete that._downloadMap[url];
        }
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    let etag = that.getFileMd5ByXhr(xhr);
                    dealCallback(null,xhr.response,etag);
                } else {
                    let ex: IErrorData = {
                        code: xhr.status,
                        errorMsg: "下载出错"
                    };
                    if (ex.code == 0) {
                        ex.code = ErrorCode.HttpError;
                    }
                    dealCallback(ex,null,null);
                }
            }
        }
        xhr.onerror = function () {
            let ex: IErrorData = {
                code: ErrorCode.HttpError,
                errorMsg: "下载出错"
            };
            dealCallback(ex,null,null);
        }
        xhr.ontimeout = function () {
            let ex: IErrorData = {
                code: ErrorCode.Timeout,
                errorMsg: "请求超时"
            };
            dealCallback(ex,null,null);
        }
        xhr.responseType = "arraybuffer";
        xhr.open("GET", url, true);
        xhr.send();
    }
    //#endregion

    /**
     *  保存本地
     * @param data 
     * @param completePath writablePath/xxx/xx/
     * @param fileName 
     * @returns 成功的保存地址
     */
    private saveFile(data:Uint8Array, completePath: string, fileName: string) {
        try {
            if (!jsb.fileUtils.isDirectoryExist(completePath)) {
                jsb.fileUtils.createDirectory(completePath);
            }
            let filePath = completePath + fileName;
            if (jsb.fileUtils.writeDataToFile(data, filePath)) {
                return filePath;
            }
        } catch (ex) {
            loggerError("saveRemoteFile", ex);
            return null;
        }
    }

    private getFilePath(dirPath: string, fileName) {
        return this.normalizeDirPath(dirPath) + fileName;
    }

    private normalizeDirPath(dirPath: string) {
        if (dirPath) {
            if (dirPath.charAt(dirPath.length - 1) !== "/") {
                return dirPath + "/";
            }
        }
        return dirPath;
    }
}