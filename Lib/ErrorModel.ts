
export const ErrorCode = {
    /**
     * 连接服务器失败
     */
    ConnectFail: -1000,

    /**
     * Socket连接还未准备好（1号消息还没回包）
     */
    ConnectNotReady: -1001,

    /**
     * 客户端已知问题，errorMsg可显示
     */
    KonwnError: -1002,
    /**
     * 返回数据错误
     */
    DataError:-1003,
    /**
     * 发送失败
     */
    SendFail: -1004,
    /**
     * 超时
     */
    Timeout: -1005,


    /**
     * 针对具体问题的错误编号
     */
    ErrorReason1:-1006,


    /**
     * 针对具体问题的错误编号
     */
    ErrorReason2: -1007,
    
    /**
     * 参数错误
     */
    ParamError:-1008,
    NotFindInLocal:-1009,
    OK:0,


    Error404: 404,
    
    HttpError:500
};



export interface IErrorData {
    /**
     * 错误码
     */
    code : number;

    /**
     * 错误消息
     */
    errorMsg: string;
    
    
}