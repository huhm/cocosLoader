
const doResidentLog = false;
const doResAddLog = false;
const doResResCounterLog = false;
const doResReleaseLog = false;
export default class LoaderWithResident {
    static Instance: LoaderWithResident;

    /**
     * 初始化Loader并且，将cc.loader._cache资源常驻化
     */
    static tryInitInstance() {
        LoaderWithResident.Instance = new LoaderWithResident();
        let uuidList = [];
        let i = 0;
        for (let key in cc.loader._cache) {
            if (doResidentLog) {
                cc.log("[Loader] Resident:", ++i, key); 
            }
            uuidList.push(key);
        }
        LoaderWithResident.Instance.addResidentResource(uuidList);
        return LoaderWithResident.Instance;
    }
    private node: cc.Node;
    private comp: cc.Component;
    private constructor() {
        this.node = new cc.Node("LoaderWithResident");
        this.comp = this.node.addComponent(cc.Component);
    }

    //#region 常驻资源
    
    private _residentResources: { [uuid: string]: boolean } = {};


    /**
     * 添加常驻资源（注:会忽略js类型资源）
     * @param keyList 
     */
    addResidentResource(uuidList:string[]) {
        if (uuidList) {
            uuidList.forEach(uuid => {
                this._residentResources[uuid] = true;
            })
        }
    }

    private isResidentResource(uuid: string) {
        return this._residentResources[uuid];
    }
    //#endregion

    //#region 资源计数管理

    /**
     * 可release的资源列表
     */
    private _resources: { [uuid: string]: number } = {};

    private _addResource(uuid: string) {
        let cnt = this._resources[uuid] || 0;
        cnt++;
        this._resources[uuid] = cnt;
        if (doResResCounterLog) {
            cc.log(`[Loader] 资源计数+:${cnt}/${cc.loader.getResCount()} ${uuid}`);
        } else if(cnt===1 && doResAddLog) {
            cc.log(`[Loader] 资源新增:${cnt}/${cc.loader.getResCount()} ${uuid}`);
        }
    }
    private _delResource(uuid: string) {
        let cnt = this._resources[uuid] || 0;
        if (cnt > 0) {
            cnt--;
        }
        if (cnt > 0) {
            this._resources[uuid] = cnt;
            if (doResResCounterLog) {
                cc.log(`[Loader] 资源计数-:${cnt}/${cc.loader.getResCount()} ${uuid}`);
            }
            return cnt;
        } else {
            delete this._resources[uuid];
            cc.loader.release(uuid);// 释放资源
            if (doResReleaseLog) {
                cc.log(`[Loader] 资源释放:${cc.loader.getResCount()} ${uuid}`);
            }
            return 0;
        }
    }

    private tryAddResource(uuid: string) {
        if (!this.isResidentResource(uuid)) {//不是常驻资源
            this._addResource(uuid);
            return true;
        } 
        return false;
    }
    // private tryDelResource(uuid: string) {
    //     if (!this.isResidentResource(uuid)) {
    //         this._delResource(uuid);
    //         return true;
    //     }
    //     return false;
    // }

    /**
     * 异步释放资源
     * @param uuidList 
     */
    private tryDelResourceList(uuidList: string[]) {
        // 异步释放
        this.comp.scheduleOnce(() => {
            uuidList.forEach(uuid => {
                if (!this.isResidentResource(uuid)) {
                    this._delResource(uuid);
                }
            });
        }, 1);
        // callInNextTick((uuidList) => {
        //     uuidList.forEach(uuid => {
        //         if (!this.isResidentResource(uuid)) {
        //             this._delResource(uuid);
        //         }
        //     });
        // }, uuidList);
    }

    //#endregion

    //#region 网络资源

    /**
     * 远程网络资源(纹理或mp3,mp4)
     * @param res 
     */
    retainRemoteResource(url: string) {
        this.tryAddResource(url);
    }

    /**
     * 释放资源(纹理或mp3,mp4)
     * @param res 
     */
    releaseByUUidList(urls: string[]) {
        if (!urls) {
            cc.log('[Warning] [Loader] releaseList is null')
            return;
        }
        this.tryDelResourceList(urls);
    }


    //#endregion

    //#region Res资源

    /**
     * 获取资源
     * @param res 
     */
    retainRes(assetOrUrlOrUuid: cc.Asset|cc.RawAsset|String) {
        let uuidList = cc.loader.getDependsRecursively(assetOrUrlOrUuid);
        let newUUidList = [];
        uuidList.forEach(uuid => {
            if (this.tryAddResource(uuid)) {
                newUUidList.push(uuid);
            }
        });
        return newUUidList;
    }

    /**
     * 释放资源
     * @param res 
     */
    releaseRes(assetOrUrlOrUuid: cc.Asset|cc.RawAsset|String) {
        let uuidList = cc.loader.getDependsRecursively(assetOrUrlOrUuid);
        this.tryDelResourceList(uuidList);
    }

    //#endregion
}