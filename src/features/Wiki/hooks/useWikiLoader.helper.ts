import { useWikiStore } from "../store/useWiki.store";
import { wikiService } from "../service/wiki.service";

export const useWikiLoader = () => {
    const { setKeywords, setInfos, setIsLoading } = useWikiStore();

    const loadAll = async () => {
        setIsLoading(true);
        try {
            const { keywords, infos } = await wikiService.getAll();
            setKeywords(keywords);
            setInfos(infos);
        } finally {
            setIsLoading(false);
        }
    };

    return { loadAll };
};
