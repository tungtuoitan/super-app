/**
 * Project Reflect Helper
 * Rows of the project's Reflect tab are edited locally; Save writes them with a PATCH that touches only
 * `reflectJson` (so no other project field can be overwritten), Discard restores the saved rows.
 * After either, `feedback` tells the Save / Discard bar which confirmation to play.
 */

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/shared";
import { useEditorTabBarHelper } from "@/shell";
import { buildReflectTypeOptions, createReflectRow, isSameReflectRows, parseReflectList, stringifyReflectList } from "@/features/taskDetail";
import type { ReflectField, ReflectRow, SectionFeedback } from "@/features/taskDetail";
import { projectService } from "../service/project.service";
import { useProjectDetailSelector } from "../Selectors/useProjectDetail.selector";
import type { Project } from "../types/project.types";

export const useProjectReflectHelper = () => {
    const { currentTab, selectedProject, isDisabled: projectDisabled } = useProjectDetailSelector();
    const { $user } = useAuthStore();
    const { patchTab } = useEditorTabBarHelper();

    const projectId = selectedProject?.id ?? 0;
    const projectJson = selectedProject?.reflectJson ?? null;
    const isNewProject = projectId <= 0;

    const [rows, setRows] = useState<ReflectRow[]>(() => parseReflectList(projectJson));
    const [feedback, setFeedback] = useState<SectionFeedback | null>(null);
    const savedRef = useRef<ReflectRow[]>(rows);
    const ownStampRef = useRef(`${projectId}:${projectJson}`);
    const feedbackKeyRef = useRef(0);

    const isDirty = !isSameReflectRows(rows, savedRef.current);

    // Reload when the project changes from outside (another project, a reload), not after our own save
    useEffect(() => {
        const stamp = `${projectId}:${projectJson}`;
        if (stamp === ownStampRef.current) return;
        ownStampRef.current = stamp;
        const next = parseReflectList(projectJson);
        savedRef.current = next;
        setRows(next);
        setFeedback(null);
    }, [projectId, projectJson]);

    // Editing again cancels a confirmation that is still playing
    useEffect(() => {
        if (isDirty) setFeedback(null);
    }, [isDirty]);

    const handleFieldChange = (rowId: string, field: ReflectField, value: string) => {
        setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value, updatedAt: new Date().toISOString() } : r)));
    };

    const handleAddRow = () => setRows((prev) => [...prev, createReflectRow()]);

    const save = async () => {
        if (isNewProject) return;
        const json = stringifyReflectList(rows);
        try {
            await projectService.patchProject($user.userToken, projectId, json ? { reflectJson: json } : { clearFields: ["reflectJson"] });
        } catch (error) {
            console.error("Project Reflect save failed", error);
            return; // stay dirty so Save stays lit
        }
        const toSave = parseReflectList(json);
        ownStampRef.current = `${projectId}:${json}`;
        savedRef.current = toSave;
        setRows(toSave);
        if (currentTab?.id) {
            patchTab(currentTab.id, (cur) => ({
                data: { ...(cur.data as Project), reflectJson: json },
                data0: { ...(cur.data0 as Project), reflectJson: json },
            }));
        }
        feedbackKeyRef.current += 1;
        setFeedback({ kind: "saved", key: feedbackKeyRef.current });
    };

    const discard = () => {
        setRows(savedRef.current);
        feedbackKeyRef.current += 1;
        setFeedback({ kind: "discarded", key: feedbackKeyRef.current });
    };

    const clearFeedback = () => setFeedback(null);

    return {
        rows,
        isDirty,
        isNewProject,
        isDisabled: projectDisabled || isNewProject,
        hasProjectChanges: currentTab?.hasUnsavedChanges ?? false,
        typeOptions: buildReflectTypeOptions(rows),
        feedback,
        handleFieldChange,
        handleAddRow,
        save,
        discard,
        clearFeedback,
    };
};
