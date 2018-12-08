
import LoaderWithResident from "./LoaderWithResident";


const { ccclass } = cc._decorator;

/**
 * 需要自动管理资源的Prefab
 */
@ccclass
export default class LoaderKeeper extends cc.Component{

    // private _loader: Loader = null
    
    // get loader ():Loader {
    //   return this._loader
    // }
    private _loaderUUidList: string[] = [];
    addUUid(uuid: string) {
        this._loaderUUidList.push(uuid);
    //   this._loader = loader
    }

    addUUidList(uuidList: string[]) {
        uuidList.forEach(uuid => {
            this._loaderUUidList.push(uuid);
        });
    }
  
    onDestroy() {
        // super.onDestroy();
        LoaderWithResident.Instance.releaseByUUidList(this._loaderUUidList);
        this._loaderUUidList = null;
    }
}