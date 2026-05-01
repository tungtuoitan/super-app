import {useMenuContextStore} from "./MenuContext.store";

export function useMenuContext() {
    const {contextData, contextType, } = useMenuContextStore();
    // const helper = useMenuContextHelper();
    return { contextData, contextType };
}
