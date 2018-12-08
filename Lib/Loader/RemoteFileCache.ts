
import { md5 } from "../../Third/js-md5";
import { loggerError, trim } from "../../Lib/Utils"; 
import { IErrorData, ErrorCode } from "../ErrorModel";
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



    loadImage(url: string, callback:LoadCallback<cc.Texture2D>) {
        return this.loadFile<cc.Texture2D>(url, "png", callback);
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
            cc.log("[RemoteLoader] 文件不存在，网络加载文件",url);
            this.download(url, (err, data) => {
                if (err) {
                    if (loadOption) {
                        loadOption.callback(err,null,null);
                    }
                    if (_remoteLoadCb) {
                        _remoteLoadCb(err);
                    }
                } else {
                    if (data) {
                        let savePath = this.saveFile(data, dirPath, fileName);
                        if (savePath && loadOption) {
                            this.loadFileByLoader(savePath, loadOption.type, loadOption.callback);
                            return;
                        }
                        if (_remoteLoadCb) {
                            _remoteLoadCb();
                        }
                    } else {
                        cc.log("[Warning] 数据为空");
                        if (_remoteLoadCb) {
                            _remoteLoadCb();
                        }
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
    private _downloadMap: { [url: string]: ((err, data?) => void)[] } = {};

    private download(url, callback: (err, data?) => void) {
        var cbList = this._downloadMap[url];
        if (cbList) {
            cbList.push(callback);
            return;
        }
        cbList = [callback];
        this._downloadMap[url] = cbList;

        function dealCallback(err, data?) {
            cbList.forEach(cb => {
                if (cb) {
                    cb(err, data);
                }
            })
        }
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    dealCallback(null,xhr.response);
                } else {
                    let ex: IErrorData = {
                        code: xhr.status,
                        errorMsg: "下载出错"
                    };
                    if (ex.code == 0) {
                        ex.code = ErrorCode.HttpError;
                    }
                    dealCallback(ex);
                }
            }
        }
        xhr.onerror = function () {
            let ex: IErrorData = {
                code: ErrorCode.HttpError,
                errorMsg: "下载出错"
            };
            dealCallback(ex);
        }
        xhr.ontimeout = function () {
            let ex: IErrorData = {
                code: ErrorCode.Timeout,
                errorMsg: "请求超时"
            };
            dealCallback(ex);
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
    private saveFile(data, completePath: string, fileName: string) {
        if (typeof data !== 'undefined') {
            try {
                if (!jsb.fileUtils.isDirectoryExist(completePath)) {
                    jsb.fileUtils.createDirectory(completePath);
                }
                let filePath = completePath + fileName;
                if (jsb.fileUtils.writeDataToFile(new Uint8Array(data), filePath)) {
                    return filePath;
                }
            } catch (ex) {
                loggerError("saveRemoteFile", ex);
                return null;
            }
        }
        return null;
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