## cocosLoader

### Description
主要是为了解决单场景项目，资源全部是挂载在场景上，导致内存越来越大的问题，可以基于现有项目一点点将资源改造成自动加载请求。
前期查找了cocos论坛上各种实现方式，没找到可以基于现有项目改造的资源请求的方式，只能自己动手写一个了
有以下两个模块：
1. 资源的自动加载和释放管理  LoaderManager
2. 远程资源的本地缓存（For 原生） RemoteFileCacher

目前只在1.8.2的android平台和web平台测试过


### RemoteFileCacher
默认有两个RemoteFileCache容器
+ 静态资源容器：StaticRemoteCacher
    + 内容只有安装包重装才会删除
+ 临时资源容器： RuntimeRemoteCacher
    + 内容在每次打开应用会将前一次的

单独使用该类，需要自己管理资源的释放
```
import { RemoteFileCacher } from "./RemoteFileCacher";
//1.初始化
RemoteFileCacher.tryInitRuntimeInstance();
RemoteFileCacher.tryInitStaticInstance();

//2.Load
RemoteFileCacher.StaticRemoteCacher.loadImage("https://xxxx",(err,resource,path)=>{
    if(!err){
        // resource 为 cc.Texture2D 资源,path为资源的assetid
    }
})
```


### LoaderManager
单例模式，默认请求的远程资源使用的是RemoteFileCacher.StaticRemoteCacher，
如果是临时性的资源请使用：LoaderManager.getInstance().getRemoteRuntimeSpriteFrame

```
import LoaderManager from "./Lib/LoaderManager";
// 1.加载场景后将已有的cache记录下来，不进行管理
LoaderManager.initInstance();


// 2.加载Prefab(Local),请求本地resouces下的资源
LoaderManager.getInstance().getResPrefab("xxx/xx").then(resItem=>{
    if(!cc.isValid(this.node)){
        resItem.release();//直接释放
        return;
    }
    let pNode=cc.instantiate(resItem.resource);
    resItem.setAutoRelease(pNode);// 资源会在pNode被destroy的时候自动释放
    pNode.parent=this.node;
});

// 3.加载SpriteFrame
let url="xxx/xx";// 也可以是网络资源,将缓存在本地，路径不变经常更新的图片请不要用这种方式获取
LoaderManager.getInstance().getSpriteFrame(url).then(resItem=>{
    if(!cc.isValid(this.node)){
        resItem.release();//直接释放
        return;
    }
    this.node.getComponent(cc.Sprite).spriteFrame=resItem.resource;
    resItem.setAutoRelease(this.node);// 资源会在pNode被destroy的时候自动释放
});

LoaderManager.getInstance().getRemoteRuntimeSpriteFrameWithBackup("http://xxx.xxx/xxx.png","localBackup.png").then(resItem=>{
    ...
});

// 4.加载临时性的图片资源
LoaderManager.getInstance().getRemoteRuntimeSpriteFrame(url).then(resItem=>{
    //...
})

```