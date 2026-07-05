-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "page" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkScheme" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "total_marks" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarkScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkSchemeQuestion" (
    "id" TEXT NOT NULL,
    "mark_scheme_id" TEXT NOT NULL,
    "question_number" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "max_marks" INTEGER NOT NULL,
    "marking_type" TEXT NOT NULL DEFAULT 'rubric',
    "method_marks" INTEGER,
    "answer_marks" INTEGER,
    "accepted_answers" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "MarkSchemeQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "mark_scheme_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "total_marks_awarded" INTEGER,
    "total_marks_possible" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptAnswer" (
    "id" TEXT NOT NULL,
    "script_id" TEXT NOT NULL,
    "question_number" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "max_marks" INTEGER NOT NULL,
    "marking_type" TEXT,
    "accepted_answers" TEXT NOT NULL DEFAULT '[]',
    "method_marks" INTEGER,
    "answer_marks" INTEGER,
    "ocr_text" TEXT NOT NULL,
    "ocr_confidence" DOUBLE PRECISION NOT NULL,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "image_path" TEXT,

    CONSTRAINT "ScriptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiResult" (
    "id" TEXT NOT NULL,
    "script_answer_id" TEXT NOT NULL,
    "marks_awarded" INTEGER NOT NULL,
    "max_marks" INTEGER NOT NULL,
    "method_awarded" INTEGER,
    "answer_awarded" INTEGER,
    "feedback" TEXT NOT NULL,
    "ai_confidence" DOUBLE PRECISION NOT NULL,
    "evidence" TEXT NOT NULL,
    "flag_reason" TEXT,
    "needs_attention" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "override_marks" INTEGER,
    "override_note" TEXT,
    "final_marks" INTEGER NOT NULL,

    CONSTRAINT "AiResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE INDEX "MarkScheme_teacher_id_idx" ON "MarkScheme"("teacher_id");

-- CreateIndex
CREATE INDEX "MarkSchemeQuestion_mark_scheme_id_idx" ON "MarkSchemeQuestion"("mark_scheme_id");

-- CreateIndex
CREATE INDEX "Script_teacher_id_idx" ON "Script"("teacher_id");

-- CreateIndex
CREATE INDEX "Script_mark_scheme_id_idx" ON "Script"("mark_scheme_id");

-- CreateIndex
CREATE INDEX "ScriptAnswer_script_id_idx" ON "ScriptAnswer"("script_id");

-- CreateIndex
CREATE UNIQUE INDEX "AiResult_script_answer_id_key" ON "AiResult"("script_answer_id");

-- AddForeignKey
ALTER TABLE "MarkScheme" ADD CONSTRAINT "MarkScheme_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkSchemeQuestion" ADD CONSTRAINT "MarkSchemeQuestion_mark_scheme_id_fkey" FOREIGN KEY ("mark_scheme_id") REFERENCES "MarkScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_mark_scheme_id_fkey" FOREIGN KEY ("mark_scheme_id") REFERENCES "MarkScheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptAnswer" ADD CONSTRAINT "ScriptAnswer_script_id_fkey" FOREIGN KEY ("script_id") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiResult" ADD CONSTRAINT "AiResult_script_answer_id_fkey" FOREIGN KEY ("script_answer_id") REFERENCES "ScriptAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

