import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Dispatch, SetStateAction } from "react";
import { zSetter } from "../zustand-utils";
import type { LinkDialogOptions } from "./link.types";

export interface LinkDialogStoreData {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    options: LinkDialogOptions | null;
    setOptions: Dispatch<SetStateAction<LinkDialogOptions | null>>;
    name: string;
    setName: Dispatch<SetStateAction<string>>;
    url: string;
    setUrl: Dispatch<SetStateAction<string>>;
    errors: { name?: string; url?: string };
    setErrors: Dispatch<SetStateAction<{ name?: string; url?: string }>>;
    isSubmitting: boolean;
    setIsSubmitting: Dispatch<SetStateAction<boolean>>;
}

const _store = create<LinkDialogStoreData>((set, get) => ({
    isOpen: false,
    setIsOpen: zSetter("isOpen", set, get),
    options: null,
    setOptions: zSetter("options", set, get),
    name: "",
    setName: zSetter("name", set, get),
    url: "",
    setUrl: zSetter("url", set, get),
    errors: {},
    setErrors: zSetter("errors", set, get),
    isSubmitting: false,
    setIsSubmitting: zSetter("isSubmitting", set, get),
}));

export const useLinkDialogStore = () => _store(useShallow((s) => s));
export const getLinkDialogState = () => _store.getState();
