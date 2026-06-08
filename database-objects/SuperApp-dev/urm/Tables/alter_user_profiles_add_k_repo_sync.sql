-- Add K repo sync configuration columns to urm.user_profiles
ALTER TABLE [urm].[user_profiles]
    ADD [k_repo_url]             NVARCHAR(500)  NULL,
        [k_repo_branch]          NVARCHAR(100)  DEFAULT ('K') NULL,
        [k_repo_pat]             NVARCHAR(500)  NULL,
        [k_repo_last_push_sha]   NVARCHAR(100)  NULL,
        [k_repo_last_push_at]    DATETIME2(7)   NULL,
        [k_repo_last_check_at]   DATETIME2(7)   NULL,
        [k_repo_last_remote_sha] NVARCHAR(100)  NULL,
        [k_repo_status_code]     NVARCHAR(20)   DEFAULT ('idle') NULL,
        [k_repo_content_hash]    NVARCHAR(100)  NULL;
