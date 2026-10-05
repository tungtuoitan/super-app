import { getLinkDialogState } from "./linkDialog.store";
import { _normalizeUrl, _validateLinkForm } from "./link.utils";
import type { LinkDialogOptions } from "./link.types";

/**
 * Global "add / edit link" dialog (task #1477). Any feature opens it with an onSubmit callback;
 * the dialog validates (http/https only) and stays open with the error if onSubmit throws.
 */
export const useLinkDialogHelper = () => {
    const openLinkDialog = (options: LinkDialogOptions) => {
        const { setOptions, setName, setUrl, setErrors, setIsSubmitting, setIsOpen } = getLinkDialogState();
        setOptions(options);
        setName(options.initial?.name ?? "");
        setUrl(options.initial?.url ?? "");
        setErrors({});
        setIsSubmitting(false);
        setIsOpen(true);
    };

    // options are kept until the next open so the closing animation keeps its title/fields
    const closeLinkDialog = () => {
        const { setIsOpen } = getLinkDialogState();
        setIsOpen(false);
    };

    const submitLinkDialog = async () => {
        const { options, name, url, isSubmitting, setErrors, setIsSubmitting } = getLinkDialogState();
        if (!options || isSubmitting) return;

        const showUrl = options.showUrl !== false;
        const errors = _validateLinkForm(name, url, showUrl);
        setErrors(errors);
        if (errors.name || errors.url) return;

        setIsSubmitting(true);
        try {
            await options.onSubmit({ name: name.trim(), url: showUrl ? _normalizeUrl(url) : "" });
            closeLinkDialog();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not save the link";
            setErrors({ url: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return { openLinkDialog, closeLinkDialog, submitLinkDialog };
};
