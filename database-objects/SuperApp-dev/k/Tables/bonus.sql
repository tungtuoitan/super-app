
  -- 1. Bảng mới
  CREATE TABLE k.point_history (
    Id        INT IDENTITY PRIMARY KEY,
    AttemptId INT NOT NULL REFERENCES k.test_attempt(Id) ON DELETE CASCADE,
    QuizId    INT NOT NULL REFERENCES k.quiz(Id),
    UserId    INT NOT NULL,
    Point     INT NOT NULL DEFAULT 0,  -- 0–5
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
  );
  CREATE INDEX IX_kpointhistory_attempt ON k.point_history(AttemptId);

  DROP TABLE k.quiz_node;

  -- 3. Thêm RelativeNodes vào quiz, bỏ Point
  ALTER TABLE k.quiz ADD relative_nodes NVARCHAR(500) NULL;
  ALTER TABLE k.quiz DROP COLUMN point;

  -- 4. Bỏ fields cũ trên quiz_answer
  ALTER TABLE k.quiz_answer DROP COLUMN score;
  ALTER TABLE k.quiz_answer DROP COLUMN score_level;
  ALTER TABLE k.quiz_answer DROP COLUMN ai_feedback;

  -- 5. Bỏ fields cũ trên test_attempt
  ALTER TABLE k.test_attempt DROP COLUMN total_score;
  ALTER TABLE k.test_attempt DROP COLUMN max_score;
  ALTER TABLE k.test_attempt DROP COLUMN ai_feedback;