import { useEffect } from "react";
import { useAuthStore } from "@/shared";
import { useKLoader } from "./useK.loader";

export const useKGlobalInit = () => {
    const { $user } = useAuthStore();
    const { loadAllK } = useKLoader();

    useEffect(() => {
        if (!$user.userId) return;
        loadAllK();
    }, [$user.userId, $user.userToken]);
};
