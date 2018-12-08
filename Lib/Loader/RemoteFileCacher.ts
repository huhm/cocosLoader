import { RemoteFileCache } from "./RemoteFileCache";


/**
 * 远程资源管理（优先使用本地资源）
 */
export class RemoteFileCacher{
    /**
     * 程序运行期间保存
     */
    private static _RuntimeInstance:RemoteFileCache;

    // private static _StaticInstance;

    /**
     * 静态资源（重装应用会更新）
     */
    private static _StaticInstance:RemoteFileCache;


    static get  StaticRemoteCacher() {
        return RemoteFileCacher._StaticInstance;
    }
    static get RuntimeRemoteCacher() {
        return RemoteFileCacher._RuntimeInstance;
    }

    static tryInitRuntimeInstance() {
        if (!RemoteFileCacher._RuntimeInstance) {
            let cacher = new RemoteFileCache("tmpFile/");
            if (cc.sys.isNative) {
                let dirPath = cacher.getDirPath();
                jsb.fileUtils.removeDirectory(dirPath);
            }
            RemoteFileCacher._RuntimeInstance = cacher;
        }
        return RemoteFileCacher._RuntimeInstance;
    }


    static tryInitStaticInstance() {
        if (!RemoteFileCacher._StaticInstance) {
            let cacher = new RemoteFileCache("static/");
            RemoteFileCacher._StaticInstance = cacher;
        }
        return RemoteFileCacher._StaticInstance;
    }

    private constructor() {
        
    }
}
//jsb.fileUtils.removeDirectory(path) 



