import React from "react";
import { WsProvider } from "./useWs.store";
import { WsDetailProvider } from "./useWsDetail.store";

export const WsProviders: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <WsProvider>
        <WsDetailProvider>
            {children}
        </WsDetailProvider>
    </WsProvider>
);
