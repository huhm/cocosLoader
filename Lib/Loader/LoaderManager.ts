import { RemoteFileCacher } from "./RemoteFileCacher";
import LoaderWithResident from "./LoaderWithResident";
import LoaderKeeper from "./LoaderKeeper";
import { RemoteFileCache } from "./RemoteFileCache";
import { isRemoteUrl, trim } from "../Utils"; 
import { ErrorCode, IErrorData } from "../ErrorModel";

export interface ILoaderResult<T extends cc.Asset>{
    isLocal: boolean,
    resource: T,
    type:{prototype: T},
    setAutoRelease: (node: cc.Node) => LoaderKeeper,
    release: () => void
}
// type GetResoucePromise = Promise<{
// }>;

/**
 * cc.loader内存管理
 */
export default class LoaderManager{

    private static Instance: LoaderManager;
    constructor() {
        RemoteFileCacher.tryInitStaticInstance();
        setTimeout(() => {
            RemoteFileCacher.tryInitRuntimeInstance();
        }, 0.5);
    }
    static initInstance() {
        if (!this.Instance) {
            this.Instance = new LoaderManager;
        }
        return this.Instance;
    }

    static getInstance() {
        return this.Instance;
    }
    
    //#region Auto
    /**
     * 获取远程（Static）或本地图片
     * @param url 
     */
    getSpriteFrame(url: string) {
        let isRemote = isRemoteUrl(url);
        if (isRemote) {
            return this.getRemoteStaticSpriteFrame(url);
        } else {
            return this.getResSpriteFrame(url);
        }
    }
    /**
     * 获取静态图片
     * @param url 
     */
    getSpriteFrame2(url: string,hostNode:cc.Node) {
        return this.getSpriteFrame(url).then(resItem => {
            if (!cc.isValid(hostNode)) {
                resItem.release();
                throw new Error("hostNode is released");
            }
            return resItem;
        });
    }
    //#endregion

    //#region 远程静态资源

    /**
     * 预加载文件到本地（注:不保存到cc.loader中）
     * @param url (url会判断是否远程)
     */
    preloadStaticFile(url: string, _remoteLoadedCb?: (err?) => void) {
        let isRemote = isRemoteUrl(url);
        if (isRemote) {
            return RemoteFileCacher.StaticRemoteCacher.preloadFileForNative(url,_remoteLoadedCb);
        } else {
            if (cc.sys.isNative) {
                if (_remoteLoadedCb) {
                    // 判断本地是否存在
                    if (jsb.fileUtils.isFileExist(url)) {
                        _remoteLoadedCb();
                    } else {
                        let err: IErrorData = {
                            code:ErrorCode.NotFindInLocal,
                            errorMsg:"本地文件不存在"
                        };
                        _remoteLoadedCb(err);
                    }
                }
                return true;
            }
            return false;
        }
    }


    /**
     * 预加载文件到本地（注:不保存到cc.loader中）
     * @param url
     */
    preloadRemoteStaticFile(url: string, _remoteLoadedCb?: (err?) => void) {
        let isRemote = isRemoteUrl(url);
        if (isRemote) {
            return RemoteFileCacher.StaticRemoteCacher.preloadFileForNative(url,_remoteLoadedCb);
        } else {
            return false;
        }
    }

    /**
     * 获取远程临时图片（默认retain一次）
     */
    getRemoteRuntimeSpriteFrame(url: string) {
        return this._getRemoteSpriteFramePromise(url, RemoteFileCacher.RuntimeRemoteCacher);
    }

    /**
     * 获取远程临时图片（默认retain一次）
     * @param 如果加载远程图片失败，使用backupResUrl
     */
    getRemoteRuntimeSpriteFrameWithBackup(url: string, backupResUrl: string) {
        return this._getRemoteSpriteFramePromise(url, RemoteFileCacher.RuntimeRemoteCacher,backupResUrl);
    }
    /**
     * 获取远程静态图片(默认retain一次)
     * @param url 
     */
    private getRemoteStaticSpriteFrame(url: string) {
        return this._getRemoteSpriteFramePromise(url, RemoteFileCacher.StaticRemoteCacher);
    }

    /**
     * 
     * @param url 
     * resource=string
     */
    getRemoteStaticMp4(url: string):Promise<ILoaderResult<any>> {
        return new Promise((resolve: any, reject: any)=> {
            if (!url) {
                reject();
                return;
            }
            // cc.log('加载图片', url);
            RemoteFileCacher.StaticRemoteCacher.loadMp4(url, (err,mp4,path:string) => {
                if (!err) {
                    LoaderWithResident.Instance.retainRemoteResource(path);
                    let uuid = path;
                    // TODO 释放
                    let loaderRes: ILoaderResult<any> = {
                        isLocal: false,
                        type:null,
                        resource: uuid,
                        // url: path,
                        setAutoRelease: this._createSetAutoReleaseCallback([uuid]),
                        release: this._createReleaseCallback([uuid])
                    };
                    resolve(loaderRes);
                }else {
                    cc.log(`[Loader] 加载mp4出错,url=${url},err=${err}`);
                    reject();
                }
            });
        });
    }
    /**
     * @param resUrl:本地加载地址
     */
    private _getRemoteSpriteFramePromise(url: string, cacher: RemoteFileCache, backUpResUrl?: string): Promise<ILoaderResult<cc.SpriteFrame>> {
        return new Promise((resolve: any, reject: any)=> {
            if (!url) {
                reject({code:ErrorCode.ParamError,errorMsg:"[Loader]Url不可为空"});
                return;
            }
            // cc.log('加载图片', url);
            cacher.loadImage(url, (err, texture, path: string) => {
                if (!err) {
                    LoaderWithResident.Instance.retainRemoteResource(path);
                    let spriteFrame = new cc.SpriteFrame(texture);
                    let uuid = path;
                    // TODO 释放
                    let loaderRes: ILoaderResult<cc.SpriteFrame> = {
                        isLocal: false,
                        type:cc.SpriteFrame,
                        resource: spriteFrame,
                        // url: path,
                        setAutoRelease: this._createSetAutoReleaseCallback([uuid]),
                        release: this._createReleaseCallback([uuid])
                    };
                    resolve(loaderRes);
                }else {
                    cc.log(`[Loader] 加载图片出错,url=${url},err=${err}`);
                    if (backUpResUrl) {
                        resolve(this.getResSpriteFrame(backUpResUrl));
                    }
                    else {
                        reject(err);
                    }
                }
            });
        });
    }

    //#endregion

    //#region private Utils
    private _createReleaseCallback(uuidList: string[]) {
        return function () {
            LoaderWithResident.Instance.releaseByUUidList(uuidList);
        }
    }

    private _createSetAutoReleaseCallback(uuidList:string[]) {
        return function (node: cc.Node) {
            let loaderKeeper = node.getComponent(LoaderKeeper);
            if (!cc.isValid(loaderKeeper)) {
                loaderKeeper = node.addComponent(LoaderKeeper);
            }
            loaderKeeper.addUUidList(uuidList);
            return loaderKeeper;
        }
    }
    
    //#endregion 

    //#region 获取Res资源
    /**
     * 获取Prefab资源
     * @param path 
     */
    getResPrefab(path) {
        return (this._getRes(path, cc.Prefab) as Promise<ILoaderResult<cc.Prefab>>);
    }

    private getResSpriteFrame(path) {        
        return this._getRes(path, cc.SpriteFrame) as Promise<ILoaderResult<cc.SpriteFrame>>;
    }


    private _getRes<T extends cc.Asset>(path, type:any):Promise<ILoaderResult<T>> {
        return new Promise((resolve, reject) => {
            path=trim(path);
            cc.loader.loadRes(path, type, (err, prefab: cc.Prefab) => {
                if (err) {
                    cc.log('[Loader] NotFound:' + path);
                    reject(err);
                } else {
                    let uuidList = LoaderWithResident.Instance.retainRes(prefab);
                    let res: ILoaderResult<any> = {
                        isLocal: true,
                        resource: prefab,
                        type:type,
                        release: this._createReleaseCallback(uuidList),
                        setAutoRelease: this._createSetAutoReleaseCallback(uuidList)
                    }
                    resolve(res);
                }
            });
        });
    }

    //#endregion
}