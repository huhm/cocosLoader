
// import { md5 } from "../../Third/js-md5";
// import { loggerError } from "../../Lib/Utils";
// import { getJson } from "../HttpRequestUtil";

// type LoadCallback<T> = (err, resource: T, path: string) => void;

// /**
//  * read-->Cache--(未命中)-->PhysicalPath--->Network
//  * refresh-->Network-->Cache--->PhysicalPath
//  *  1.刷新时间戳
//  *  2.Network请求
//  */
// export class RemoteJsonCache {
//     //#region 存储路径
//     /**
//      * 默认的存储文件夹
//      */
//     private dirPath: string;

//     private writablePath: string;

//     getDirPath() {
//         return this.dirPath;
//     }
//     //#endregion

//     /**
//      * 
//      * @param dirPath 默认的存储文件夹(xxx/) path=writablePath+dirPath
//      */
//     constructor(dirPath) {
//         if (cc.sys.isNative) {
//             this.writablePath = jsb.fileUtils.getWritablePath();
//             this.dirPath = this.writablePath + dirPath;
//             cc.log('[JsbWritablePath]', this.writablePath);
//         }
//     }


//     private map: {
//         [url: string]: {
//             isLocal: boolean,
//             data:any
//     } };
//     load(url: string) {
//         return getJson(url).then(res => {
//             this.map[url] = {
//                 isLocal: false,
//                 data: res
//             };
//             if (cc.sys.isNative) {
//                 // 保存到本地

//             }
//         }).catch(ex => {
//             // 接口访问失败

//             return this.map[url];
//         })
//     }


//     private loadFileForNative<T>(url: string, loadOption?: {
//         type: string,
//         callback: LoadCallback<T>
//     }) {
//         let fileName = this.convertUrlToFilePath(url);
//         // 判断是否存在
//         let dirPath = this.dirPath;
//         // if (toDirPartPath) {
//         //     dirPath = this.writablePath + toDirPartPath;
//         // }
//         dirPath = this.normalizeDirPath(dirPath);
//         let filePath = this.getFilePath(dirPath, fileName);
//         if (jsb.fileUtils.isFileExist(filePath)) {
//             if (loadOption) {
//                 this.loadFileByLoader(filePath, loadOption.type, loadOption.callback);
//             }
//         } else {
//             cc.log("[RemoteLoader] 文件不存在，网络加载文件", url);
//             getJson(url).then(res => {
//                 if (res) {
//                     let savePath = this.saveFile(JSON.stringify(res), dirPath, fileName);
//                     if (savePath && loadOption) {
//                         this.loadFileByLoader(savePath, loadOption.type, loadOption.callback);
//                         return;
//                     }
//                 }
//                 if (loadOption) {
//                     loadOption.callback(new Error("下载出错"),null,null);
//                 }
//             });
//         }
//     }

//     private loadFileByLoader<T>(filePath: string, type: string, callback:LoadCallback<T>) { 
//         cc.loader.load({
//             url: filePath,
//             type: type
//         }, function (err, tex) {
//             callback(err, tex,filePath);
//         });
//     }

//     private convertUrlToFilePath(url: string) {
//         let fileName = md5(url);
//         return fileName;
//     }
//     /**
//      *  保持本地
//      * @param data 
//      * @param completePath writablePath/xxx/xx/
//      * @param fileName 
//      * @returns 成功的保存地址
//      */
//     private saveFile(data:string, completePath: string, fileName: string) {
//         if (typeof data !== 'undefined') {
//             try {
//                 if (!jsb.fileUtils.isDirectoryExist(completePath)) {
//                     jsb.fileUtils.createDirectory(completePath);
//                 }
//                 let filePath = completePath + fileName;
//                 if (jsb.fileUtils.writeDataToFile(new Uint8Array(data), filePath)) {
//                     return filePath;
//                 }
//             } catch (ex) {
//                 loggerError("saveRemoteFile", ex);
//                 return null;
//             }
//         }
//         return null;
//     }

//     private getFilePath(dirPath: string, fileName) {
//         return this.normalizeDirPath(dirPath) + fileName;
//     }

//     private normalizeDirPath(dirPath: string) {
//         if (dirPath) {
//             if (dirPath.charAt(dirPath.length - 1) !== "/") {
//                 return dirPath + "/";
//             }
//         }
//         return dirPath;
//     }
// }