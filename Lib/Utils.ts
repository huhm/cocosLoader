
export function isRemoteUrl(url: string) {// http: https:
    url = trim(url);
    if (url[4] === ':' || url[5] === ':') {
        return true;
    } else {
        return false;
    }
}

//#region trim
export function trim(str: string) {
    if (!str) {
        return str;
    }
    return str.replace(/(^\s*)|(\s*$)/g, "");
}
export function lTrim(str: string) {
    if (!str) {
        return str;
    }
    return str.replace(/(^\s*)/g, "");
}
export function rTrim(str: string) {
    if (!str) {
        return str;
    }
    return str.replace(/(\s*$)/g, "");
}
//#endregion


/**
 * cc.log 记录错误堆栈信息
 * @param str 
 * @param err 
 */
export function loggerError(str:string, err: any) {
    let list = [str];
    try {
        if (err) {
            list.push(err.name || err.code);
            list.push(err.message || err.errorMsg);
            if (!cc.sys.isNative) {
                if (err.stack) {
                    list.push(err.stack);
                }
                list.push(err);
            }
        }
    } catch (ex) {
        list.push(ex.toString());
    }
    cc.log.apply(this, list);
}